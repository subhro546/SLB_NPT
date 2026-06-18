import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL = 'Qwen/Qwen2.5-7B-Instruct';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const prompt = `You are an intent classification engine.
Available actions:
* summarize_current_view
* compare_assets
* compare_onshore_offshore
* identify_cost_drivers
* identify_savings_opportunities
* identify_high_risk_rigs
* rank_assets
* rank_rigs
* analyze_npt_categories

Return ONLY valid JSON. No markdown, no explanations, just the raw JSON object.

Example:
User: "Where can I save more money?"
{"action": "identify_savings_opportunities"}

User: "Compare Asset A and Asset B"
{"action": "compare_assets", "asset1": "A", "asset2": "B"}

User: "${query}"
`;

    const out = await hf.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.1, // extremely low temperature for deterministic formatting
    });

    let rawResponse = out.choices[0].message.content || "{}";
    
    // Strip markdown JSON wrappers if the model ignores the instruction
    rawResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    const intent = JSON.parse(rawResponse);

    return NextResponse.json(intent);
  } catch (error) {
    console.error('AI Intent Error:', error);
    // Fallback if LLM fails
    return NextResponse.json({ action: 'summarize_current_view' });
  }
}
