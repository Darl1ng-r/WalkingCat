import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. List and remove all user photos from private `sighting-photos` storage bucket
    const { data: userFiles } = await adminClient.storage
      .from('sighting-photos')
      .list(user.id);

    if (userFiles && userFiles.length > 0) {
      const pathsToDelete = userFiles.map((f) => `${user.id}/${f.name}`);
      await adminClient.storage
        .from('sighting-photos')
        .remove(pathsToDelete);
    }

    // 2. Delete user account from auth (cascades all profiles, walks, sightings, points, friendships)
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(
      user.id
    );

    if (deleteUserError) {
      return Response.json(
        { error: deleteUserError.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, message: 'Account permanently deleted' });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
});
