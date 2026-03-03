/**
 * Supabase Edge Function: ElevenLabs Audio Generator
 * 
 * Generates voice audio from text using ElevenLabs API.
 * Used for video voiceovers in Creatomate and HeyGen videos.
 * 
 * Request Body:
 * {
 *   text: string (required) - Text to convert to speech
 *   voice_id?: string (optional) - ElevenLabs voice ID (default: '21m00Tcm4TlvDq8ikWAM')
 *   model_id?: string (optional) - ElevenLabs model (default: 'eleven_monolingual_v1')
 *   stability?: number (optional, 0-1, default: 0.5)
 *   similarity_boost?: number (optional, 0-1, default: 0.75)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   audio_url?: string - URL to generated audio file
 *   audio_id?: string - ElevenLabs audio ID
 *   duration_seconds?: number
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ElevenLabsAudioRequest {
  text: string;
  voice_id?: string;
  model_id?: string;
  stability?: number;
  similarity_boost?: number;
  article_id?: string; // Optional: for storage organization
}

// Default ElevenLabs voice (Rachel - professional female voice)
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
const DEFAULT_MODEL_ID = 'eleven_monolingual_v1';

/**
 * Generate audio using ElevenLabs API
 */
async function generateElevenLabsAudio(
  apiKey: string,
  text: string,
  voiceId: string = DEFAULT_VOICE_ID,
  modelId: string = DEFAULT_MODEL_ID,
  stability: number = 0.5,
  similarityBoost: number = 0.75
): Promise<{ audio_url?: string; audio_id?: string; duration_seconds?: number; error?: string }> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: modelId,
          voice_settings: {
            stability: stability,
            similarity_boost: similarityBoost,
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return { error: `ElevenLabs API error: ${response.status} - ${errorText}` };
    }
    
    // ElevenLabs returns audio as binary stream
    const audioBuffer = await response.arrayBuffer();
    
    // Calculate approximate duration (rough estimate: 150 words per minute)
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = Math.ceil((wordCount / 150) * 60);
    
    // Return audio buffer for upload to storage
    return {
      audio_buffer: audioBuffer,
      audio_id: `elevenlabs_${Date.now()}`,
      duration_seconds: estimatedDuration
    };
    
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Upload audio to Supabase Storage and return public URL
 */
async function uploadAudioToStorage(
  supabase: any,
  audioBuffer: ArrayBuffer,
  articleId: string
): Promise<string | null> {
  try {
    const fileName = `audio/${articleId}/${Date.now()}.mp3`;
    
    // Convert ArrayBuffer to Blob for upload
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    
    const { data, error } = await supabase.storage
      .from('video-assets')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: false
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('video-assets')
      .getPublicUrl(fileName);
    
    return urlData?.publicUrl || null;
    
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       'https://vpysqshhafthuxvokwqj.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') ||
                       req.headers.get('apikey') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: ElevenLabsAudioRequest = await req.json();
    
    if (!body.text) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'text is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get ElevenLabs API key
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ELEVENLABS_API_KEY not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎤 Generating audio from text (${body.text.length} chars)`);

    // Generate audio
    const audioResult = await generateElevenLabsAudio(
      elevenLabsApiKey,
      body.text,
      body.voice_id || DEFAULT_VOICE_ID,
      body.model_id || DEFAULT_MODEL_ID,
      body.stability || 0.5,
      body.similarity_boost || 0.75
    );

    if (audioResult.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: audioResult.error
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Upload audio to Supabase Storage for permanent URL
    let audioUrl: string | null = null;
    if (audioResult.audio_buffer && body.article_id) {
      audioUrl = await uploadAudioToStorage(
        supabase,
        audioResult.audio_buffer,
        body.article_id
      );
    }

    // If upload failed or no article_id, return audio buffer info
    // (caller can handle upload separately if needed)
    if (!audioUrl && audioResult.audio_buffer) {
      // For now, return success with note that storage upload is needed
      console.warn('Audio generated but not uploaded to storage (no article_id or upload failed)');
    }

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: audioUrl || null,
        audio_id: audioResult.audio_id,
        duration_seconds: audioResult.duration_seconds,
        note: audioUrl ? undefined : 'Audio generated but not uploaded to storage. Provide article_id for automatic upload.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('ElevenLabs Audio Generator Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

