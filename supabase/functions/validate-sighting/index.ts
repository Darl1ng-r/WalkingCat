// Supabase Edge Function: `validate-sighting`
// Triggered by a Database Webhook on `public.sightings` INSERT or invoked directly
// by the client (`{ sightingId }`). Idempotent: skips any row whose status != 'pending'.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import {
  computeDHash64FromGrayscale,
  decideSightingValidation,
  DEFAULT_VALIDATION_CONFIG,
  type ValidationConfig,
} from './rules.ts';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

interface VisionAnalysisResult {
  containsCat: boolean;
  catConfidence: number;
  isRealPhoto: boolean;
  isSafe: boolean;
  model: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Decodes the JPEG image, computes a 64-bit perceptual dHash, and prepares
 * a downscaled 512px JPEG buffer for bounded Vision API cost.
 */
async function decodeAndPrepareImage(bytes: Uint8Array): Promise<{
  valid: boolean;
  width: number;
  height: number;
  dhash: string | null;
  visionBytes: Uint8Array;
}> {
  try {
    const decoded = await Image.decode(bytes);
    const width = decoded.width;
    const height = decoded.height;

    const small9x8 = decoded.clone().resize(9, 8);
    const grid9x8: number[] = [];

    for (let y = 1; y <= 8; y += 1) {
      for (let x = 1; x <= 9; x += 1) {
        const pixel = small9x8.getPixelAt(x, y);
        const r = (pixel >> 24) & 0xff;
        const g = (pixel >> 16) & 0xff;
        const b = (pixel >> 8) & 0xff;
        const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        grid9x8.push(luma);
      }
    }

    const dhash = computeDHash64FromGrayscale(grid9x8);

    // Resize longest side to 512 px for the Vision API call to minimize latency & cost
    let visionBytes = bytes;
    const longestSide = Math.max(width, height);
    if (longestSide > 512) {
      const scale = 512 / longestSide;
      const resizedForVision = decoded
        .clone()
        .resize(
          Math.max(1, Math.round(width * scale)),
          Math.max(1, Math.round(height * scale))
        );
      visionBytes = await resizedForVision.encodeJPEG(80);
    }

    return {
      valid: true,
      width,
      height,
      dhash,
      visionBytes,
    };
  } catch {
    return {
      valid: false,
      width: 0,
      height: 0,
      dhash: null,
      visionBytes: bytes,
    };
  }
}

async function callGeminiVisionOnce(
  imageBytes: Uint8Array,
  apiKey: string,
  timeoutMs = 10_000
): Promise<VisionAnalysisResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const model = 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const prompt =
      'Analyze this photo for a stray-cat walking app. Return strict JSON with keys: ' +
      '{"contains_cat": boolean, "confidence": number (0.0 to 1.0), ' +
      '"is_real_photo": boolean (false if photo of a screen, monitor, or printed page), ' +
      '"is_safe": boolean (false if explicit, violent, or unsafe content)}.';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: uint8ToBase64(imageBytes),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API HTTP ${res.status}`);
    }

    const body = await res.json();
    const rawText: string =
      body?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(rawText) as {
      contains_cat?: boolean;
      confidence?: number;
      is_real_photo?: boolean;
      is_safe?: boolean;
    };

    return {
      containsCat: Boolean(parsed.contains_cat),
      catConfidence: Number(parsed.confidence) || 0,
      isRealPhoto: parsed.is_real_photo !== false,
      isSafe: parsed.is_safe !== false,
      model,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callVisionWithRetry(
  imageBytes: Uint8Array
): Promise<VisionAnalysisResult> {
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY secret is not configured');
  }

  try {
    return await callGeminiVisionOnce(imageBytes, geminiKey, 10_000);
  } catch {
    // 1 retry on transient error / timeout
    return await callGeminiVisionOnce(imageBytes, geminiKey, 10_000);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const startTimeMs = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const expectedWebhookSecret = Deno.env.get('VALIDATION_WEBHOOK_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase service configuration' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const incomingSecret = req.headers.get('x-webhook-secret');
    const authHeader = req.headers.get('authorization');

    if (
      expectedWebhookSecret &&
      incomingSecret !== expectedWebhookSecret &&
      !authHeader
    ) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const sightingId: string | undefined =
      payload?.sightingId ?? payload?.record?.id ?? payload?.id;

    if (!sightingId) {
      return new Response(JSON.stringify({ error: 'Missing sightingId' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Load sighting and skip if status != 'pending' (idempotent)
    const { data: sighting, error: fetchError } = await admin
      .from('sightings')
      .select('*')
      .eq('id', sightingId)
      .maybeSingle();

    if (fetchError || !sighting) {
      return new Response(JSON.stringify({ error: 'Sighting not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (sighting.status !== 'pending') {
      return new Response(
        JSON.stringify({
          skipped: true,
          sightingId,
          status: sighting.status,
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Load tunable thresholds from `app_config`
    const { data: configRows } = await admin
      .from('app_config')
      .select('key, value');

    const configMap = new Map<string, unknown>();
    for (const row of configRows ?? []) {
      configMap.set(row.key, row.value);
    }

    const cfg: ValidationConfig = {
      minImageDimensionPx:
        Number(configMap.get('min_image_dimension_px')) ||
        DEFAULT_VALIDATION_CONFIG.minImageDimensionPx,
      dhashMaxHammingDistance:
        Number(configMap.get('dhash_max_hamming_distance')) ||
        DEFAULT_VALIDATION_CONFIG.dhashMaxHammingDistance,
      dhashLookbackDays:
        Number(configMap.get('dhash_lookback_days')) ||
        DEFAULT_VALIDATION_CONFIG.dhashLookbackDays,
      catAcceptThreshold:
        Number(configMap.get('cat_accept_threshold')) ||
        DEFAULT_VALIDATION_CONFIG.catAcceptThreshold,
      catFlagThreshold:
        Number(configMap.get('cat_flag_threshold')) ||
        DEFAULT_VALIDATION_CONFIG.catFlagThreshold,
      dailySubmissionRateLimit:
        Number(configMap.get('daily_submission_rate_limit')) ||
        DEFAULT_VALIDATION_CONFIG.dailySubmissionRateLimit,
      maxValidationRetries:
        Number(configMap.get('max_validation_retries')) ||
        DEFAULT_VALIDATION_CONFIG.maxValidationRetries,
    };

    // 3. Download photo from private storage bucket
    const { data: fileBlob, error: downloadError } = await admin.storage
      .from('sighting-photos')
      .download(sighting.photo_path);

    if (downloadError || !fileBlob) {
      await admin
        .from('sightings')
        .update({
          status: 'rejected',
          reject_reason: 'invalid_image',
          validated_at: new Date().toISOString(),
          validation_meta: {
            error: downloadError?.message ?? 'missing_storage_object',
            duration_ms: Date.now() - startTimeMs,
          },
        })
        .eq('id', sightingId)
        .eq('status', 'pending');

      return new Response(
        JSON.stringify({ status: 'rejected', reason: 'invalid_image' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const rawBytes = new Uint8Array(await fileBlob.arrayBuffer());
    const decoded = await decodeAndPrepareImage(rawBytes);

    if (decoded.dhash) {
      await admin
        .from('sightings')
        .update({ phash: decoded.dhash })
        .eq('id', sightingId);
    }

    // 4. Query user's recent phashes (last 30 days) and 24-hour submission count
    const lookbackIso = new Date(
      Date.now() - cfg.dhashLookbackDays * 24 * 3600 * 1000
    ).toISOString();
    const last24hIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [recentPhashRes, rateLimitRes] = await Promise.all([
      admin
        .from('sightings')
        .select('phash')
        .eq('user_id', sighting.user_id)
        .neq('id', sightingId)
        .not('phash', 'is', null)
        .gte('created_at', lookbackIso),
      admin
        .from('sightings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sighting.user_id)
        .gte('created_at', last24hIso),
    ]);

    const recentPhashes = (recentPhashRes.data ?? [])
      .map((r: { phash: string | null }) => r.phash)
      .filter((h): h is string => Boolean(h));

    const submissionsLast24h = rateLimitRes.count ?? 1;

    // Short-circuit before calling Vision API if image is invalid or near-duplicate
    const preVisionCheck = decideSightingValidation(
      {
        imageValid: decoded.valid,
        width: decoded.width,
        height: decoded.height,
        dhash: decoded.dhash,
        recentPhashes,
        submissionsLast24h,
        containsCat: true,
        catConfidence: 1.0,
      },
      cfg
    );

    if (preVisionCheck.status === 'rejected') {
      await admin
        .from('sightings')
        .update({
          status: preVisionCheck.status,
          reject_reason: preVisionCheck.rejectReason,
          validated_at: new Date().toISOString(),
          validation_meta: {
            width: decoded.width,
            height: decoded.height,
            min_hamming_distance: preVisionCheck.minHammingDistance,
            duration_ms: Date.now() - startTimeMs,
          },
        })
        .eq('id', sightingId)
        .eq('status', 'pending');

      return new Response(
        JSON.stringify({
          status: preVisionCheck.status,
          rejectReason: preVisionCheck.rejectReason,
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Call Vision API with 10s timeout + 1 retry
    let visionResult: VisionAnalysisResult;
    try {
      visionResult = await callVisionWithRetry(decoded.visionBytes);
    } catch (visionErr) {
      const nextAttempts = (Number(sighting.validation_attempts) || 0) + 1;
      const shouldFlag = nextAttempts >= cfg.maxValidationRetries;

      await admin
        .from('sightings')
        .update({
          status: shouldFlag ? 'flagged' : 'pending',
          reject_reason: shouldFlag ? 'validation_error' : null,
          validation_attempts: nextAttempts,
          validation_meta: {
            last_error: String(visionErr),
            attempts: nextAttempts,
            duration_ms: Date.now() - startTimeMs,
          },
        })
        .eq('id', sightingId)
        .eq('status', 'pending');

      return new Response(
        JSON.stringify({
          status: shouldFlag ? 'flagged' : 'pending',
          retryScheduled: !shouldFlag,
        }),
        { status: 202, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Final decision
    const decision = decideSightingValidation(
      {
        imageValid: decoded.valid,
        width: decoded.width,
        height: decoded.height,
        dhash: decoded.dhash,
        recentPhashes,
        submissionsLast24h,
        containsCat: visionResult.containsCat,
        catConfidence: visionResult.catConfidence,
        isRealPhoto: visionResult.isRealPhoto,
        isSafe: visionResult.isSafe,
      },
      cfg
    );

    await admin
      .from('sightings')
      .update({
        status: decision.status,
        reject_reason: decision.rejectReason,
        cat_confidence: decision.catConfidence,
        validated_at: new Date().toISOString(),
        validation_attempts: (Number(sighting.validation_attempts) || 0) + 1,
        validation_meta: {
          model: visionResult.model,
          width: decoded.width,
          height: decoded.height,
          is_real_photo: visionResult.isRealPhoto,
          is_safe: visionResult.isSafe,
          min_hamming_distance: decision.minHammingDistance,
          submissions_24h: submissionsLast24h,
          auto_report: decision.autoReport,
          duration_ms: Date.now() - startTimeMs,
        },
      })
      .eq('id', sightingId)
      .eq('status', 'pending');

    return new Response(
      JSON.stringify({
        sightingId,
        status: decision.status,
        rejectReason: decision.rejectReason,
        catConfidence: decision.catConfidence,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
