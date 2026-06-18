import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL = 'Qwen/Qwen2.5-7B-Instruct';

export async function POST(req: Request) {
  try {
    const { analyticsData, userQuery, action, chatHistory } = await req.json();

    if (action === 'general_conversation') {
      const convPrompt = `You are an AI assistant for a drilling operations dashboard. 
The user said: "${userQuery}"
Respond conversationally in 1-2 sentences. Do NOT run analytics.`;
      
      const out = await hf.chatCompletion({
        model: MODEL,
        messages: [{ role: "user", content: convPrompt }],
        max_tokens: 100,
        temperature: 0.5,
      });
      return NextResponse.json({ summary: out.choices[0].message.content });
    }

    if (action === 'clarification_required') {
      return NextResponse.json({ summary: "Could you clarify what analysis you would like me to perform?" });
    }

    if (!analyticsData) {
      return NextResponse.json({ error: 'Analytics data is required' }, { status: 400 });
    }

    const historyStr = chatHistory 
      ? chatHistory.slice(-4).map((msg: any) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`).join('\n')
      : 'No history';

    const prompt = `You are a McKinsey-style executive drilling operations analyst.
You must analyze the provided data and answer the user query.

Recent Chat Context:
${historyStr}

Current User Query:
${userQuery || "Summarize the current dashboard view."}

Analytics Results (Source of Truth - NEVER invent numbers):
${JSON.stringify(analyticsData, null, 2)}

Requirements:
* Professional, executive consulting tone
* Maximum 200 words
* Never invent numbers. Use ONLY the data provided.
* Never assume missing information.

Format your response EXACTLY like this:

Finding:
[1-2 sentences stating the core insight and percentages]

Business Impact:
[1-2 sentences stating the USD cost or operational delay impact]

Recommendation:
[1-2 sentences of actionable management advice based on the data]

Do NOT wrap in markdown json blocks. Output the text directly.`;

    const out = await hf.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.1,
    });

    const summary = out.choices[0].message.content || "Summary could not be generated.";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('AI Generate Error:', error);
    return NextResponse.json({ summary: "An error occurred while generating the summary from the analytics engine." });
  }
}
