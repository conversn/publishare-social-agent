/// <reference lib="deno.ns" />

export type AgenticProvider = "deepseek";

export interface RunAgenticCompletionParams {
  provider: AgenticProvider;
  model: string;
  prompt: string;
  response_format?: "json" | "text";
  temperature?: number;
  max_tokens?: number;
}

function extractJson(text: string): unknown {
  const sanitize = (input: string) =>
    input
      .replace(/\u0000/g, "")
      .replace(/,\s*([}\]])/g, "$1")
      .trim();

  const parseAttempt = (input: string): unknown => JSON.parse(sanitize(input));

  try {
    return parseAttempt(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return parseAttempt(fenced[1]);
      } catch {
        // Continue to bracket extraction fallback.
      }
    }

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return parseAttempt(text.slice(firstBrace, lastBrace + 1));
      } catch {
        // Continue to balanced extraction fallback.
      }
    }

    // Balanced-object extraction to recover from pre/postamble text.
    const starts: number[] = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "{") starts.push(i);
    }

    for (const start of starts) {
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (ch === "\\") {
            escaped = true;
          } else if (ch === '"') {
            inString = false;
          }
          continue;
        }

        if (ch === '"') {
          inString = true;
          continue;
        }
        if (ch === "{") depth++;
        if (ch === "}") {
          depth--;
          if (depth === 0) {
            const candidate = text.slice(start, i + 1);
            try {
              return parseAttempt(candidate);
            } catch {
              // Keep scanning for another balanced candidate.
            }
          }
        }
      }
    }

    throw new Error("No valid JSON found in model output");
  }
}

export async function runAgenticCompletion(
  params: RunAgenticCompletionParams,
): Promise<unknown> {
  if (params.provider !== "deepseek") {
    throw new Error("Unsupported provider");
  }

  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!deepseekApiKey) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const apiUrl = "https://api.deepseek.com/v1/chat/completions";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        {
          role: "system",
          content: params.response_format === "json"
            ? "Return only valid JSON. Do not include markdown fences or commentary."
            : "Return concise, direct output.",
        },
        { role: "user", content: params.prompt },
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 3500,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek API error ${response.status}: ${err.slice(0, 300)}`,
    );
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("LLM output was empty");
  }

  if (params.response_format === "json") {
    try {
      return extractJson(text);
    } catch {
      // One repair pass through the same provider to recover malformed JSON.
      const repairResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          messages: [
            {
              role: "system",
              content:
                "You are a JSON repair tool. Return only valid JSON while preserving values.",
            },
            {
              role: "user",
              content:
                `Fix this invalid JSON and return valid JSON only:\n\n${text}`,
            },
          ],
          temperature: 0,
          max_tokens: params.max_tokens ?? 3500,
        }),
      });

      if (!repairResponse.ok) {
        const err = await repairResponse.text().catch(() => "");
        throw new Error(
          `DeepSeek repair API error ${repairResponse.status}: ${
            err.slice(0, 300)
          }`,
        );
      }

      const repairedPayload = await repairResponse.json();
      const repairedText = repairedPayload?.choices?.[0]?.message?.content;
      if (!repairedText || typeof repairedText !== "string") {
        throw new Error("LLM repair output was empty");
      }
      return extractJson(repairedText);
    }
  }

  return text;
}
