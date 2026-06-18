import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL = 'Qwen/Qwen2.5-7B-Instruct';

export async function POST(req: Request) {
  try {
    const { analyticsData, userQuery, action } = await req.json();

    if (!analyticsData) {
      return NextResponse.json({ error: 'Analytics data is required' }, { status: 400 });
    }

    const prompt = `You are an executive drilling operations analyst.
Using ONLY the data below, generate a concise management summary.

Analytics Results:
${JSON.stringify(analyticsData, null, 2)}

Context/Query:
${userQuery || "Summarize the current dashboard view."}

Requirements:
* Professional tone
* Executive style
* Maximum 200 words
* Mention rankings
* Mention percentages
* Mention savings opportunities if applicable
* Never invent numbers
* Never assume missing information
* Output directly the report text. Do NOT wrap in markdown json blocks.`;

    const out = await hf.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.2,
    });

    const summary = out.choices[0].message.content || "Summary could not be generated.";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('AI Generate Error:', error);
    return NextResponse.json({ summary: "An error occurred while generating the summary from the analytics engine." });
  }
}
