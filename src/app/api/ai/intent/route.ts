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
* savings_potential
* rig_intervention_comparison
* recommend_intervention
* estimate_annual_savings
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
{"intent":"intervention_performance","confidence":0.97}

User: "Where can we save the most additional time?"
{"intent":"savings_potential","confidence":0.95}

User: "Estimate annual savings potential"
{"intent":"estimate_annual_savings","confidence":0.99}

User: "Compare intervention effectiveness across rigs."
{"intent":"rig_intervention_comparison","confidence":0.98}

User: "What intervention should management prioritize next?"
{"intent":"recommend_intervention","confidence":0.99}

User: "Hello"
{"intent":"general_conversation","confidence":0.99}

---
Recent Chat Context:
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

    const result = JSON.parse(rawResponse);
    
    // Fallback handling
    if (!result.intent || result.confidence < 0.70) {
      return NextResponse.json({ intent: 'clarification_required', confidence: result.confidence || 0.0 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Intent Error:', error);
    return NextResponse.json({ intent: 'clarification_required', confidence: 0 });
  }
}
