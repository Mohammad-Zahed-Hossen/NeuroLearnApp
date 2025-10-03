// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTION_API_BASE_URL = 'https://api.notion.com/v1';

// --- Global Supabase Admin Client (Bypasses RLS) ---
// This client is used to securely fetch the user's private notion_token from the user_profiles table.
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ====================================================================
// 1. Helper Function: Securely Fetch User's Notion Credentials
// ====================================================================
async function getNotionCredentials(userId: string): Promise<{ token: string; dbId: string; logsDbId: string; error: string | null }> {
  const { data: profile, error: profileError } = await adminSupabase
    .from('user_profiles')
    .select('notion_token, notion_db_id, notion_db_id_logs')
    .eq('id', userId)
    .single();

  if (profileError || !profile || !profile.notion_token) {
    return {
      token: '',
      dbId: '',
      logsDbId: '',
      error: 'Notion token not found for user. Please connect Notion in settings.'
    };
  }

  return {
    token: profile.notion_token,
    dbId: profile.notion_db_id || '',
    logsDbId: profile.notion_db_id_logs || '',
    error: null,
  };
}

// ====================================================================
// 2. Handlers: Test, Sync-Up (App -> Notion), Sync-Down (Notion -> App)
// ====================================================================
async function handleTestConnection(userId: string): Promise<Response> {
  const { token, dbId, error } = await getNotionCredentials(userId);

  if (error) {
    return new Response(JSON.stringify({ message: error }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Test 1: Validate the token by fetching user details
    const userResponse = await fetch(`${NOTION_API_BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!userResponse.ok) {
      console.error('Notion Token Test Failed:', await userResponse.text());
      return new Response(JSON.stringify({ message: 'Token is invalid or expired.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Test 2: If a DB ID is provided, test access to the database
    if (dbId) {
      const dbResponse = await fetch(`${NOTION_API_BASE_URL}/databases/${dbId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (!dbResponse.ok) {
        console.warn('Token OK, but DB ID access failed:', await dbResponse.text());
        return new Response(JSON.stringify({ message: 'Token valid, but access to the primary Database ID failed.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ message: 'Connection successful!', user: await userResponse.json() }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('Notion Test Exception:', e.message);
    return new Response(JSON.stringify({ message: `Internal server error during connection test: ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleSyncUp(userId: string): Promise<Response> {
  const { token, dbId, logsDbId, error } = await getNotionCredentials(userId);

  if (error) {
    return new Response(JSON.stringify({ message: error }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // --- PUSH LOGIC (Simplified Example: Pushing unsynced reading sessions to a Logs DB) ---

  // 1. Fetch unsynced reading sessions for the user
  const { data: sessions, error: fetchError } = await adminSupabase
    .from('reading_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('notion_synced_at', null)
    .limit(10);

  if (fetchError) {
    console.error('Failed to fetch sessions for sync-up:', fetchError.message);
    return new Response(JSON.stringify({ message: 'DB fetch failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  if (!sessions || sessions.length === 0) {
    return new Response(JSON.stringify({ message: 'No new sessions to sync.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 2. Map and push sessions to Notion
  if (!logsDbId) {
    return new Response(JSON.stringify({ message: 'No Notion Logs Database ID provided for sync-up.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const pushPromises = sessions.map(async (session: any) => {
    // **IMPORTANT:** Tailor the properties below to match your actual Notion database properties!
    const notionPagePayload = {
      parent: { database_id: logsDbId },
      properties: {
        "Title": {
          title: [{ text: { content: session.source_title || 'Untitled Reading' } }]
        },
        "WPM": {
          number: session.wpm_achieved || 0
        },
        "Duration (min)": {
          number: Math.round((session.duration_seconds || 0) / 60)
        },
        "Comprehension": {
          number: Math.round((session.comprehension_score || 0) * 100) / 100
        },
        "Date": {
          date: { start: new Date(session.created_at).toISOString() }
        },
        "Supabase ID": {
          rich_text: [{ text: { content: session.id } }]
        }
      }
    };

    const response = await fetch(`${NOTION_API_BASE_URL}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(notionPagePayload),
    });

    if (!response.ok) {
      console.error(`Notion API error for session ${session.id}:`, await response.text());
      throw new Error(`Notion push failed for session ${session.id}`);
    }

    // 3. Update the session's notion_synced_at timestamp in Supabase
    const { error: updateError } = await adminSupabase
      .from('reading_sessions')
      .update({ notion_synced_at: new Date().toISOString() })
      .eq('id', session.id);

    if (updateError) {
      console.error('Failed to update sync status:', updateError.message);
    }

    return { id: session.id, notionId: (await response.json()).id };
  });

  const results = await Promise.allSettled(pushPromises);
  interface SyncResultFulfilled {
    status: 'fulfilled';
    value: { id: string; notionId: string };
  }
  interface SyncResultRejected {
    status: 'rejected';
    reason: any;
  }
  type SyncResult = SyncResultFulfilled | SyncResultRejected;

  const succeeded = (results as SyncResult[]).filter(r => r.status === 'fulfilled').length;
  const failed = (results as SyncResult[]).filter(r => r.status === 'rejected').length;

  return new Response(JSON.stringify({
    message: `Sync-up complete. Succeeded: ${succeeded}, Failed: ${failed}`
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function handleSyncDown(userId: string): Promise<Response> {
  const { token, dbId, error } = await getNotionCredentials(userId);

  if (error) {
    return new Response(JSON.stringify({ message: error }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  if (!dbId) {
    return new Response(JSON.stringify({ message: 'No Notion Primary Database ID provided for sync-down.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // --- PULL LOGIC (Simplified Example: Fetching pages from the user's main DB) ---
  try {
    const response = await fetch(`${NOTION_API_BASE_URL}/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      // Add filtering if needed, e.g., to only fetch 'To Read' items
      body: JSON.stringify({
        filter: {
          property: "Status",
          select: {
            equals: "To Read"
          }
        }
      })
    });

    if (!response.ok) {
      console.error('Notion Query Failed:', await response.text());
      return new Response(JSON.stringify({ message: 'Failed to query Notion database.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    // **TODO:** Implement logic here to process 'data.results' and insert/update
    // your 'reading_sessions' or 'tasks' table using the adminSupabase client.

    return new Response(JSON.stringify({ message: `Successfully pulled ${data.results.length} items.`, data: data.results.slice(0, 5) }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('Notion Sync-Down Exception:', e.message);
    return new Response(JSON.stringify({ message: `Internal server error during sync-down: ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ====================================================================
// 3. Main Server Listener
// ====================================================================
serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Missing Authorization header', { status: 401 });
    }
    const userToken = authHeader.replace('Bearer ', '');

    // Validate the user's JWT using the admin/service-role Supabase client.
    // adminSupabase was created with the SUPABASE_SERVICE_ROLE_KEY above and
    // can safely call auth.getUser(token) to decode/validate the JWT.
    const { data: userResult, error: userErr } = await adminSupabase.auth.getUser(userToken);
    if (userErr || !userResult?.user) {
      return new Response('Invalid or expired token', { status: 403 });
    }
    const userId = userResult.user.id;

    // Parse the request body to get syncType
    const body = await req.json();
    const { syncType } = body;

    switch (syncType) {
      case 'test-connection':
        return handleTestConnection(userId);
      case 'sync-up':
        return handleSyncUp(userId);
      case 'sync-down':
        return handleSyncDown(userId);
      default:
        return new Response('Invalid syncType', { status: 400 });
    }

  } catch (error: any) {
    console.error('Global Error in Notion Sync Manager:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});


