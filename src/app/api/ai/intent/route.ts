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

    const historyStr = chatHistory 
      ? chatHistory.slice(-4).map((msg: any) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`).join('\n')
      : 'No history';

    const prompt = `You are an intent classification engine for a drilling operations dashboard.
Your job is to identify user intent based on their latest query and recent conversation context.

Available intents:
* chart_generation
* data_analysis
* comparison
* ranking
* trend_analysis
* summary_generation
* executive_insights
* general_conversation

CRITICAL RULES:
- Never guess.
- Return ONLY valid JSON. No markdown wrappers.

Output Format:
{
  "intent": "...",
  "confidence": 0.95
}

Examples:
User: "Which intervention generated maximum savings?"
{"intent":"ranking","confidence":0.97}

User: "Where can we save the most additional time?"
{"intent":"data_analysis","confidence":0.95}

User: "Estimate annual savings potential"
{"intent":"executive_insights","confidence":0.99}

User: "Compare intervention effectiveness across rigs."
{"intent":"comparison","confidence":0.98}

User: "What intervention should management prioritize next?"
{"intent":"executive_insights","confidence":0.99}

User: "Show me a chart of the cost impact by well category."
{"intent":"chart_generation","confidence":0.98}

User: "Plot the time saved across all rigs."
{"intent":"chart_generation","confidence":0.98}

User: "Visualize the biggest remaining savings opportunities."
{"intent":"chart_generation","confidence":0.97}

User: "Can you graph the distribution of events?"
{"intent":"chart_generation","confidence":0.98}

User: "Hello"
{"intent":"general_conversation","confidence":0.99}

---
Recent Chat Context (IGNORE unless current query explicitly refers back to it with pronouns like 'it', 'them', 'compare to the last one'):
${historyStr}

Current User Query: "${query}"
Output your JSON intent classification below:`;

    const out = await hf.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.1,
    });

    let rawResponse = out.choices[0].message.content || "{}";
    rawResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    let result = { intent: 'clarification_required', confidence: 0 };
    try {
      result = JSON.parse(rawResponse);
    } catch(e) {
      // JSON parse error
    }

    // Smart Defaults Override: Never ask for clarification if these keywords are present
    const qLower = query.toLowerCase();
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
        result.intent = 'ranking';
        result.confidence = 1.0;
      }
    } else if (!result.intent || result.confidence < 0.70) {
      return NextResponse.json({ intent: 'clarification_required', confidence: result.confidence || 0.0 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Intent Error:', error);
    return NextResponse.json({ intent: 'clarification_required', confidence: 0 });
  }
}
