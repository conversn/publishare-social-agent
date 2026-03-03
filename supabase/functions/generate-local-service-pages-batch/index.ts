/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type BatchMode = "draft" | "refresh" | "publish";
type BatchReq = {
  site_id: string;
  mode: BatchMode;
  service_slugs?: string[];
  state_codes?: string[];
  city_pairs?: Array<{ city_slug: string; state_code: string }>;
  max_items?: number;
  concurrency?: number;
  force_regenerate?: boolean;
  initiated_by?: string;
  max_attempts?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isBatchMode(value: unknown): value is BatchMode {
  return value === "draft" || value === "refresh" || value === "publish";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return Response.json({ ok: false, error: "unauthorized" }, {
      status: 401,
      headers: corsHeaders,
    });
  }

  const body = (await req.json()) as BatchReq;
  if (!body.site_id || !body.mode || !isBatchMode(body.mode)) {
    return Response.json({ ok: false, error: "missing_required_fields" }, {
      status: 400,
      headers: corsHeaders,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const bearerToken = auth.substring(7);
  const apikeyHeader = req.headers.get("apikey") || "";
  const functionCallKey = bearerToken || apikeyHeader ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const maxItems = Math.min(Math.max(body.max_items ?? 200, 1), 2000);
  const concurrency = Math.min(Math.max(body.concurrency ?? 3, 1), 10);
  const maxAttempts = Math.min(Math.max(body.max_attempts ?? 3, 1), 5);

  let svcQuery = supabase.from("local_service_context").select("service_slug")
    .eq("is_active", true);
  if (body.service_slugs?.length) {
    svcQuery = svcQuery.in("service_slug", body.service_slugs);
  }

  const { data: svcRows, error: svcErr } = await svcQuery;
  if (svcErr) {
    return Response.json({ ok: false, error: svcErr.message }, {
      status: 500,
      headers: corsHeaders,
    });
  }

  const services = (svcRows || []).map((r) => r.service_slug as string);
  if (!services.length) {
    return Response.json({ ok: false, error: "no_services_found" }, {
      status: 404,
      headers: corsHeaders,
    });
  }

  let cityQuery = supabase.from("geo_cities").select("city_slug,state_code").eq(
    "is_active",
    true,
  );
  if (body.state_codes?.length) {
    cityQuery = cityQuery.in(
      "state_code",
      body.state_codes.map((s) => s.toUpperCase()),
    );
  }

  const { data: cityRows, error: cityErr } = await cityQuery;
  if (cityErr) {
    return Response.json({ ok: false, error: cityErr.message }, {
      status: 500,
      headers: corsHeaders,
    });
  }

  let cities = cityRows || [];
  if (body.city_pairs?.length) {
    const allow = new Set(
      body.city_pairs.map((x) =>
        `${x.city_slug}|${x.state_code.toUpperCase()}`
      ),
    );
    cities = cities.filter((c) => allow.has(`${c.city_slug}|${c.state_code}`));
  }

  if (!cities.length) {
    return Response.json({ ok: false, error: "no_cities_found" }, {
      status: 404,
      headers: corsHeaders,
    });
  }

  const targets: Array<
    { service_slug: string; city_slug: string; state_code: string }
  > = [];
  for (const serviceSlug of services) {
    for (const city of cities) {
      targets.push({
        service_slug: serviceSlug,
        city_slug: city.city_slug,
        state_code: city.state_code,
      });
    }
  }
  const finalTargets = targets.slice(0, maxItems);

  const { data: batch, error: batchErr } = await supabase
    .from("local_service_page_batch_jobs")
    .insert({
      site_id: body.site_id,
      status: "queued",
      mode: body.mode,
      request_payload: body,
      total_items: finalTargets.length,
      created_by: body.initiated_by ?? null,
    })
    .select("id")
    .single();

  if (batchErr) {
    return Response.json({ ok: false, error: batchErr.message }, {
      status: 500,
      headers: corsHeaders,
    });
  }

  const batchId = batch.id as string;

  if (finalTargets.length > 0) {
    await supabase.from("local_service_page_batch_items").insert(
      finalTargets.map((t) => ({
        batch_id: batchId,
        site_id: body.site_id,
        ...t,
        status: "queued",
      })),
    );
  }

  await supabase
    .from("local_service_page_batch_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", batchId);

  const queue = [...finalTargets];
  let processed = 0;
  let success = 0;
  let failed = 0;

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;

      await supabase
        .from("local_service_page_batch_items")
        .update({ status: "running", attempts: 1 })
        .eq("batch_id", batchId)
        .eq("service_slug", item.service_slug)
        .eq("city_slug", item.city_slug)
        .eq("state_code", item.state_code);

      let data: any = null;
      let error: { message: string } | null = null;
      let attemptsUsed = 0;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        attemptsUsed = attempt;
        await supabase
          .from("local_service_page_batch_items")
          .update({ attempts: attempt })
          .eq("batch_id", batchId)
          .eq("service_slug", item.service_slug)
          .eq("city_slug", item.city_slug)
          .eq("state_code", item.state_code);

        const invokeResponse = await fetch(
          `${supabaseUrl}/functions/v1/generate-local-service-page`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${functionCallKey}`,
              "apikey": functionCallKey,
            },
            body: JSON.stringify({
              site_id: body.site_id,
              service_slug: item.service_slug,
              city_slug: item.city_slug,
              state_code: item.state_code,
              mode: body.mode,
              force_regenerate: (body.force_regenerate ?? false) || attempt > 1,
              initiated_by: body.initiated_by ?? "batch",
              prompt_iteration: attempt,
              batch_mode: true,
            }),
          },
        );

        data = await invokeResponse.json().catch(() => null);
        error = invokeResponse.ok
          ? null
          : { message: data?.error || `HTTP ${invokeResponse.status}` };

        const hasNonZeroWords = Number(data?.quality?.word_count ?? 0) > 0;
        const isSuccess = !error && data?.ok &&
          (data?.skipped || hasNonZeroWords);
        if (isSuccess) {
          break;
        }
      }

      processed += 1;
      const finalHasNonZeroWords = Number(data?.quality?.word_count ?? 0) > 0;
      const finalSuccess = !error && data?.ok &&
        (data?.skipped || finalHasNonZeroWords);

      if (!finalSuccess) {
        failed += 1;
        await supabase
          .from("local_service_page_batch_items")
          .update({
            status: "failed",
            attempts: attemptsUsed,
            error: error?.message || data?.error || "zero_word_generation",
            response: data ?? null,
          })
          .eq("batch_id", batchId)
          .eq("service_slug", item.service_slug)
          .eq("city_slug", item.city_slug)
          .eq("state_code", item.state_code);
      } else {
        success += 1;
        await supabase
          .from("local_service_page_batch_items")
          .update({
            status: data.skipped ? "skipped" : "completed",
            attempts: attemptsUsed,
            page_id: data.page_id ?? null,
            response: data,
          })
          .eq("batch_id", batchId)
          .eq("service_slug", item.service_slug)
          .eq("city_slug", item.city_slug)
          .eq("state_code", item.state_code);
      }

      await supabase
        .from("local_service_page_batch_jobs")
        .update({
          processed_items: processed,
          success_items: success,
          failed_items: failed,
        })
        .eq("id", batchId);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const finalStatus = failed === 0
    ? "completed"
    : (success > 0 ? "partial" : "failed");
  await supabase
    .from("local_service_page_batch_jobs")
    .update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      processed_items: processed,
      success_items: success,
      failed_items: failed,
    })
    .eq("id", batchId);

  return Response.json(
    {
      ok: true,
      batch_id: batchId,
      status: finalStatus,
      total_items: finalTargets.length,
      processed_items: processed,
      success_items: success,
      failed_items: failed,
    },
    { status: 200, headers: corsHeaders },
  );
});
