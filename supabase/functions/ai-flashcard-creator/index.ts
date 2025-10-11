// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY environment variable in ai-flashcard-creator function. Set GEMINI_API_KEY in your Supabase function secrets or environment.');
}
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req: Request) => {
  const { text, category = 'general' }: { text: string; category?: string } = await req.json();
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 403 });
  }

  const prompt = `Analyze the following text and generate a single, highly effective Question/Answer flashcard following the F.A.S.T. principle. Output ONLY a JSON object: {"front": "Question based on: ${text}", "back": "Answer based on: ${text}"}`;

  // Add timeout and retry logic for AI call
  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      if (!GEMINI_API_KEY) return new Response(JSON.stringify({ error: 'Server misconfiguration: GEMINI_API_KEY is not set.' }), { status: 500 });

      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiResponse.ok) {
        // Success, proceed with response handling
        const aiResult = await aiResponse.json();
        const rawText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          console.error('No content in Gemini response:', aiResult);
          return new Response(JSON.stringify({ error: 'No flashcard content generated' }), { status: 500 });
        }

        let generatedCard;
        try {
          generatedCard = JSON.parse(rawText);
        } catch (parseError) {
          console.error('Failed to parse flashcard data:', parseError, 'Raw text:', rawText);
          return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), { status: 500 });
        }

        // Proceed with database insertion...
        const { data, error } = await supabase.from('flashcards').insert({
          user_id: user.id,
          front: generatedCard.front,
          back: generatedCard.back,
          category,
          stability: 0.5,
          difficulty: 0.5,
          created_by_ai: true
        }).select().single();

        if (error) {
          return new Response(JSON.stringify({ error: String(error ?? 'Unknown error') }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true, card: data }), {
          headers: { "Content-Type": "application/json" },
        });
      } else if (aiResponse.status >= 500 || aiResponse.status === 429) {
        // Retry on server errors or rate limits
        lastError = `HTTP ${aiResponse.status}: ${await aiResponse.text()}`;
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.warn(`AI request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        // Non-retryable error
        console.error('Gemini API error:', await aiResponse.text());
        return new Response(JSON.stringify({ error: 'Failed to generate flashcard with AI' }), { status: aiResponse.status });
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        lastError = 'AI request timed out';
        console.warn(`AI request timeout (attempt ${attempt + 1}/${maxRetries})`);
        if (attempt === maxRetries - 1) {
          return new Response(JSON.stringify({ error: 'AI request timed out after retries' }), { status: 408 });
        }
        continue;
      }
  lastError = String(error ?? 'Unknown error');
  console.error(`AI request failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      if (attempt === maxRetries - 1) break;
    }
  }

  // All retries exhausted
  return new Response(JSON.stringify({ error: `Failed to generate flashcard after ${maxRetries} attempts: ${String(lastError ?? 'Unknown error')}` }), { status: 500 });
});
