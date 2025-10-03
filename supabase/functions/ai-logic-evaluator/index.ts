
// supabase/functions/ai-logic-evaluator/index.ts

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;

interface LogicEvaluationRequest {
  premise1: string;
  premise2: string;
  conclusion: string;
  exerciseType: 'deductive' | 'inductive' | 'abductive';
  domain: 'programming' | 'math' | 'english' | 'general';
  strictnessLevel?: number;
  encouragementLevel?: number;
}

Deno.serve(async (req: Request) => {
  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 403 });
    }

    // Parse request
    const {
      premise1,
      premise2,
      conclusion,
      exerciseType,
      domain,
      strictnessLevel = 0.7,
      encouragementLevel = 0.8
    }: LogicEvaluationRequest = await req.json();

    // Create comprehensive AI prompt for logic and grammar evaluation
    const prompt = `
You are an expert logic and English tutor. Evaluate this ${exerciseType} reasoning exercise and provide comprehensive feedback.

EXERCISE:
Premise 1: ${premise1}
Premise 2: ${premise2}
Conclusion: ${conclusion}
Type: ${exerciseType}
Domain: ${domain}

Please analyze both the LOGICAL STRUCTURE and ENGLISH QUALITY, then respond with EXACTLY this JSON structure:

{
  "grammarFeedback": {
    "hasErrors": boolean,
    "corrections": [
      {
        "original": "text with error",
        "corrected": "corrected text",
        "explanation": "why this is wrong",
        "type": "grammar|syntax|clarity|structure",
        "severity": "minor|moderate|major"
      }
    ],
    "overallQuality": "poor|fair|good|excellent"
  },
  "logicFeedback": {
    "score": 1-5,
    "reasoning": "detailed explanation of logical quality",
    "strengths": ["list of what was done well"],
    "weaknesses": ["list of logical problems"],
    "suggestions": ["specific improvement recommendations"],
    "validityAnalysis": {
      "premisesValid": boolean,
      "conclusionFollows": boolean,
      "logicalStructure": "sound|unsound|invalid"
    }
  },
  "combinedScore": {
    "logic": 1-5,
    "english": 1-5,
    "overall": 1-5
  },
  "personalizedTips": ["3-5 specific tips for improvement"],
  "nextSteps": ["2-3 concrete next actions"]
}

Be ${strictnessLevel > 0.5 ? 'strict but constructive' : 'gentle and encouraging'}. Focus on ${domain} context when relevant.
`;

    // Call Gemini API with retry logic
    const maxRetries = 3;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (geminiResponse.ok) {
          const aiResult = await geminiResponse.json();
          const rawText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!rawText) {
            console.error('No content in Gemini response:', aiResult);
            return new Response(JSON.stringify({ error: 'No evaluation content generated' }), { status: 500 });
          }

          let evaluationData;
          try {
            evaluationData = JSON.parse(rawText);
          } catch (parseError) {
            console.error('Failed to parse evaluation data:', parseError, 'Raw text:', rawText);
            return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), { status: 500 });
          }

          // Validate and clean the response
          const cleanedResponse = validateAndCleanResponse(evaluationData);

          return new Response(JSON.stringify(cleanedResponse), {
            headers: { "Content-Type": "application/json" },
          });

        } else if (geminiResponse.status >= 500 || geminiResponse.status === 429) {
          lastError = `HTTP ${geminiResponse.status}: ${await geminiResponse.text()}`;
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`AI request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`, lastError);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          console.error('Gemini API error:', await geminiResponse.text());
          return new Response(JSON.stringify({ error: 'Failed to evaluate with AI' }), { status: geminiResponse.status });
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

        lastError = error.message;
        console.error(`AI request failed (attempt ${attempt + 1}/${maxRetries}):`, error);
        if (attempt === maxRetries - 1) break;
      }
    }

    // All retries exhausted - return fallback
    return new Response(JSON.stringify({
      error: `Failed to evaluate logic after ${maxRetries} attempts: ${lastError}`,
      fallback: getFallbackEvaluation(premise1, premise2, conclusion, exerciseType)
    }), { status: 500 });

  } catch (error: any) {
    console.error('Global Error in AI Logic Evaluator:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Validate and clean the AI response to ensure it matches expected format
 */
function validateAndCleanResponse(data: any): any {
  return {
    grammarFeedback: {
      hasErrors: Boolean(data.grammarFeedback?.hasErrors || false),
      corrections: Array.isArray(data.grammarFeedback?.corrections)
        ? data.grammarFeedback.corrections.map((c: any) => ({
            original: String(c.original || ''),
            corrected: String(c.corrected || ''),
            explanation: String(c.explanation || ''),
            type: ['grammar', 'syntax', 'clarity', 'structure'].includes(c.type) ? c.type : 'grammar',
            severity: ['minor', 'moderate', 'major'].includes(c.severity) ? c.severity : 'minor',
          }))
        : [],
      overallQuality: ['poor', 'fair', 'good', 'excellent'].includes(data.grammarFeedback?.overallQuality)
        ? data.grammarFeedback.overallQuality
        : 'good',
    },
    logicFeedback: {
      score: Math.max(1, Math.min(5, Math.round(Number(data.logicFeedback?.score) || 3))),
      reasoning: String(data.logicFeedback?.reasoning || 'Logic analysis provided'),
      strengths: Array.isArray(data.logicFeedback?.strengths)
        ? data.logicFeedback.strengths.map((s: any) => String(s)).slice(0, 5)
        : [],
      weaknesses: Array.isArray(data.logicFeedback?.weaknesses)
        ? data.logicFeedback.weaknesses.map((w: any) => String(w)).slice(0, 5)
        : [],
      suggestions: Array.isArray(data.logicFeedback?.suggestions)
        ? data.logicFeedback.suggestions.map((s: any) => String(s)).slice(0, 5)
        : [],
      validityAnalysis: {
        premisesValid: Boolean(data.logicFeedback?.validityAnalysis?.premisesValid ?? true),
        conclusionFollows: Boolean(data.logicFeedback?.validityAnalysis?.conclusionFollows ?? true),
        logicalStructure: ['sound', 'unsound', 'invalid'].includes(data.logicFeedback?.validityAnalysis?.logicalStructure)
          ? data.logicFeedback.validityAnalysis.logicalStructure
          : 'sound',
      },
    },
    combinedScore: {
      logic: Math.max(1, Math.min(5, Math.round(Number(data.combinedScore?.logic) || 3))),
      english: Math.max(1, Math.min(5, Math.round(Number(data.combinedScore?.english) || 3))),
      overall: Math.max(1, Math.min(5, Math.round(Number(data.combinedScore?.overall) || 3))),
    },
    personalizedTips: Array.isArray(data.personalizedTips)
      ? data.personalizedTips.map((tip: any) => String(tip)).slice(0, 5)
      : ['Continue practicing logical reasoning', 'Focus on clear expression'],
    nextSteps: Array.isArray(data.nextSteps)
      ? data.nextSteps.map((step: any) => String(step)).slice(0, 3)
      : ['Try another logic exercise', 'Review logical patterns'],
  };
}

/**
 * Fallback evaluation when AI fails
 */
function getFallbackEvaluation(premise1: string, premise2: string, conclusion: string, exerciseType: string): any {
  const hasContent = premise1.length > 10 && premise2.length > 10 && conclusion.length > 10;
  const score = hasContent ? 3 : 2;

  return {
    grammarFeedback: {
      hasErrors: false,
      corrections: [],
      overallQuality: 'good',
    },
    logicFeedback: {
      score,
      reasoning: hasContent
        ? `Basic ${exerciseType} reasoning structure provided`
        : 'Incomplete reasoning - expand all sections for better evaluation',
      strengths: hasContent ? ['All components provided', 'Appropriate exercise type'] : [],
      weaknesses: hasContent ? [] : ['Insufficient detail in premises', 'Conclusion needs expansion'],
      suggestions: hasContent
        ? ['Add more specific logical connectors', 'Consider edge cases in reasoning']
        : ['Provide more detailed premises', 'Expand conclusion with clear reasoning'],
      validityAnalysis: {
        premisesValid: hasContent,
        conclusionFollows: hasContent,
        logicalStructure: hasContent ? 'sound' : 'unsound',
      },
    },
    combinedScore: {
      logic: score,
      english: score,
      overall: score,
    },
    personalizedTips: [
      `Focus on strengthening ${exerciseType} reasoning patterns`,
      'Practice connecting premises to conclusions clearly',
      'Use transition words to show logical flow',
    ],
    nextSteps: [
      'Complete more logic exercises of this type',
      'Review examples of strong logical arguments',
    ],
  };
}
