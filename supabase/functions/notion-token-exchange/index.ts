/**
 * Supabase Edge Function: notion-token-exchange
 *
 * Exchanges Notion authorization code for an access token server-side using
 * stored SUPABASE_SERVICE_ROLE_KEY and NOTION client secret from environment vars.
 * Deploy: supabase functions deploy notion-token-exchange
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ExchangeRequest {
  code: string;
  redirect_uri?: string;
}

interface ExchangeResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const payload = body as ExchangeRequest;

    if (!payload?.code) {
      return new Response(JSON.stringify({ success: false, error: 'Missing code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const NOTION_CLIENT_ID = Deno.env.get('NOTION_CLIENT_ID');
    const NOTION_CLIENT_SECRET = Deno.env.get('NOTION_CLIENT_SECRET');
    const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
      return new Response(JSON.stringify({ success: false, error: 'Notion client credentials not configured on server' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const redirectUri = payload.redirect_uri || Deno.env.get('NOTION_REDIRECT_URI') || '';

    const response = await fetch(NOTION_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: payload.code,
        redirect_uri: redirectUri,
        client_id: NOTION_CLIENT_ID,
        client_secret: NOTION_CLIENT_SECRET
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: data }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Encrypt the access token before returning
    const accessToken = data.access_token;
    if (accessToken) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && ENCRYPTION_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Encrypt the token using PostgreSQL pgp_sym_encrypt
        const { data: encryptedResult, error: encryptError } = await supabase.rpc('encrypt_token', {
          plain_token: accessToken,
          encryption_key: ENCRYPTION_KEY
        });

        if (!encryptError && encryptedResult) {
          // Return encrypted token instead of plain text
          data.access_token_encrypted = encryptedResult;
          delete data.access_token; // Remove plain text token
        } else {
          console.warn('⚠️ Failed to encrypt token, returning plain text (not recommended):', encryptError);
        }
      } else {
        console.warn('⚠️ Encryption environment variables not set, returning plain text token');
      }
    }

    return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ Notion token exchange failed:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
