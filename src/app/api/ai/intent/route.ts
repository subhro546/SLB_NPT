import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL = 'Qwen/Qwen2.5-7B-Instruct';

export async function POST(req: Request) {
  try {
    const { query, chatHistory } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. FAST-PATH: Hardcoded Regex matching for Greetings and General Conversation
    const qLower = query.toLowerCase().trim();
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|yo|sup)$/.test(qLower) || /^hi\b|^hello\b/.test(qLower)) {
      return NextResponse.json({ intent: 'greeting', confidence: 1.0 });
    }
    
    if (/^(what can you do|who are you|help|help me|how do i use this)\b/.test(qLower)) {
      return NextResponse.json({ intent: 'general_conversation', confidence: 1.0 });
    }

    const historyStr = Array.isArray(chatHistory) 
      ? chatHistory.slice(-4).map((msg: any) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`).join('\n')
      : 'No history';

    const prompt = `You are an intent classification engine for a drilling operations dashboard.
Your job is to identify user intent based on their latest query and recent conversation context.

Available intents:
* comparison
* trend_analysis
* executive_summary
* greeting
* general_conversation
* dashboard_help

CRITICAL RULES:
- Never guess.
- Return ONLY valid JSON. No markdown wrappers.

Output Format:
{
  "intent": "...",
  "confidence": 0.95
}

---
Recent Chat Context (IGNORE unless current query explicitly refers back to it with pronouns like 'it', 'them', 'compare to the last one'):
${historyStr}

Current User Query: "${query}"

Ensure you only return ONE valid intent from the list above. Do NOT ask for clarification.

Example Outputs:
{"intent":"comparison","confidence":0.98}
{"intent":"chart_generation","confidence":0.98}
{"intent":"executive_summary","confidence":0.99}`;

    const out = await hf.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.1,
    });

    const content = out.choices[0].message.content || "{}";
    let result: any = { intent: 'executive_summary', confidence: 1.0 };
    try {
      // Find the first '{' and last '}' to extract JSON
      const startIdx = content.indexOf('{');
      const endIdx = content.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = content.substring(startIdx, endIdx + 1);
        result = JSON.parse(jsonStr);
      }
    } catch (e) {
      // Fallback to executive_summary
    }

    // Smart Defaults Override: Never ask for clarification.
    const noClarifyKeywords = ['top', 'bottom', 'best', 'worst', 'compare', 'trend', 'distribution', 'chart', 'graph', 'pie chart', 'bar chart', 'line chart', 'visualize', 'show', 'generate'];
    
    const containsKeyword = noClarifyKeywords.some(kw => qLower.includes(kw));

    if (containsKeyword) {
      if (qLower.includes('chart') || qLower.includes('graph') || qLower.includes('visualize') || qLower.includes('plot')) {
        result.intent = 'chart_generation';
        result.confidence = 1.0;
      } else if (qLower.includes('compare') || qLower.includes('trend') || qLower.includes('distribution')) {
        result.intent = 'comparison';
        result.confidence = 1.0;
      } else {
        result.intent = 'data_analysis';
        result.confidence = 1.0;
      }
    } else if (!result.intent || result.confidence < 0.60) {
      return NextResponse.json({ intent: 'executive_summary', confidence: 1.0 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Intent Error:', error);
    // Ultimate Failsafe: return executive_summary instead of failing.
    return NextResponse.json({ intent: 'executive_summary', confidence: 1.0 });
  }
}
