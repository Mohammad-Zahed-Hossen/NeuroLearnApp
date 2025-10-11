// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY environment variable in ai-quiz-creator function. Set GEMINI_API_KEY in your Supabase function secrets or environment.');
}

Deno.serve(async (req: Request) => {
  const { session_id }: { session_id: string } = await req.json();
  const authHeader = req.headers.get('Authorization');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), { status: 403 });
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from('reading_sessions')
    .select('source_text')
    .eq('id', session_id)
    .single();

  if (sessionError || !sessionData?.source_text) {
    return new Response(JSON.stringify({ error: 'Session not found or forbidden.' }), { status: 404 });
  }
  const sourceText = sessionData.source_text;

  const geminiPrompt = `
    Analyze the following text and generate exactly 5 multiple-choice questions (MCQs).
    Each question must have four options (A, B, C, D) and one correct answer.
    The questions should focus on *recall and comprehension* suitable for a speed reading memory check.
    Output your response STRICTLY as a single JSON object that follows the specified structure.

    STRUCTURE:
    {
      "quiz_type": "MCQ_COMPREHENSION",
      "questions": [
        {
          "question_id": 1,
          "question": "What is the primary topic discussed in the first paragraph?",
          "options": {
            "A": "Option A text...",
            "B": "Option B text...",
            "C": "Option C text...",
            "D": "Option D text..."
          },
          "correct_answer": "B"
        }
        // ... 4 more questions
      ]
    }

    TEXT TO ANALYZE:
    ---
    ${sourceText}
    ---
  `;

  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration: GEMINI_API_KEY is not set.' }), { status: 500 });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: geminiPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (geminiResponse.ok) {
        const aiResult = await geminiResponse.json();
        const rawText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          console.error('No content in Gemini response:', aiResult);
          return new Response(JSON.stringify({ error: 'No quiz content generated' }), { status: 500 });
        }

        let quizData;
        try {
          quizData = JSON.parse(rawText);
        } catch (parseError) {
          console.error('Failed to parse quiz data:', parseError, 'Raw text:', rawText);
          return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), { status: 500 });
        }

        // Proceed with database insertion...
        const { data: quizInsertData, error: quizInsertError } = await supabase
          .from('quizzes')
          .insert({
            session_id: session_id,
            quiz_type: quizData.quiz_type || 'MCQ_COMPREHENSION',
            quiz_data: quizData.questions,
            completed: false
          })
          .select()
          .single();

        if (quizInsertError) {
          return new Response(JSON.stringify({ error: `Failed to save quiz: ${String(quizInsertError ?? 'Unknown error')}` }), { status: 500 });
        }

        const { error: updateError } = await supabase
          .from('reading_sessions')
          .update({ quiz_id: quizInsertData.id })
          .eq('id', session_id);

        if (updateError) {
          console.error('Failed to update session with quiz_id:', String(updateError ?? 'Unknown error'));
        }

        return new Response(JSON.stringify({ success: true, quiz: quizInsertData }), {
          headers: { "Content-Type": "application/json" },
        });
      } else if (geminiResponse.status >= 500 || geminiResponse.status === 429) {
        lastError = `HTTP ${geminiResponse.status}: ${await geminiResponse.text()}`;
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.warn(`AI request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        console.error('Gemini API error:', await geminiResponse.text());
        return new Response(JSON.stringify({ error: 'Failed to generate quiz with AI' }), { status: geminiResponse.status });
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
  return new Response(JSON.stringify({ error: `Failed to generate quiz after ${maxRetries} attempts: ${String(lastError ?? 'Unknown error')}` }), { status: 500 });
});
