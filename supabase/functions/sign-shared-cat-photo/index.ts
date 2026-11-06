// Phase 10 Edge Function: sign-shared-cat-photo
// Generates a short-lived (15-minute) signed URL for a cat card photo that a user explicitly shared
// via `share_cat_card_to_friends`, after verifying the caller is either the owner or an accepted friend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SIGNED_PHOTO_TTL_SECONDS = 900; // 15 minutes

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      event_id?: string;
    };
    const eventId = body.event_id;
    if (!eventId) {
      return Response.json({ error: 'Missing event_id' }, { status: 400 });
    }

    // Rely on RLS via userClient so only events visible to the caller (self or accepted friend) can be read
    const { data: eventRow, error: eventError } = await userClient
      .from('activity_events')
      .select('id, user_id, type, payload')
      .eq('id', eventId)
      .eq('type', 'cat_card_shared')
      .maybeSingle();

    if (eventError || !eventRow) {
      return Response.json(
        { error: 'Shared cat card event not found or not accessible' },
        { status: 403 }
      );
    }

    const payload = (eventRow.payload ?? {}) as Record<string, unknown>;
    const coverPhotoPath =
      typeof payload.cover_photo_path === 'string'
        ? payload.cover_photo_path
        : null;

    if (!coverPhotoPath) {
      return Response.json({ signedUrl: null }, { status: 200 });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: signedData, error: signError } = await adminClient.storage
      .from('sighting-photos')
      .createSignedUrl(coverPhotoPath, SIGNED_PHOTO_TTL_SECONDS);

    if (signError || !signedData?.signedUrl) {
      return Response.json(
        { error: signError?.message ?? 'Could not sign photo URL' },
        { status: 500 }
      );
    }

    return Response.json({
      signedUrl: signedData.signedUrl,
      expiresIn: SIGNED_PHOTO_TTL_SECONDS,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
});
