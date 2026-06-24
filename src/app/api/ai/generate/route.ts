import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL = 'Qwen/Qwen2.5-7B-Instruct';

export async function POST(req: Request) {
  try {
    const { analyticsData, userQuery } = await req.json();

    if (!userQuery) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!analyticsData) {
      return NextResponse.json({ summary: "I don't have any dashboard data to analyze right now." });
    }

    const universalPrompt = `You are a simple, highly reliable analytics copilot for a drilling operations dashboard.
You have been provided with the user's query and the aggregated dashboard metrics.

USER QUERY: "${userQuery}"

DASHBOARD DATA (Source of Truth - NEVER invent numbers):
${JSON.stringify(analyticsData, null, 2)}

YOUR TASK:
Answer the user's query immediately. DO NOT ask for clarification. DO NOT state that you cannot complete the analysis.
Make the closest reasonable assumption if the query is vague.

RULES:
1. If the user asks for a chart, graph, or visualization, you MUST generate a valid chart configuration inside the JSON 'chartConfig' field.
2. If the user asks to analyze, rank, compare, or summarize, you MUST provide a text 'summary'.
3. SMART DEFAULTS (CRITICAL):
   - Top performing rig / best rig -> Rank by CostSaved
   - Best engineer -> Rank by CostSaved
   - Best incharge -> Rank by CostSaved
   - Compare onshore and offshore -> Compare CostSaved, TimeSaved, and Events
   - Trend -> Monthly
4. Text summaries should be brief, friendly, and factual. Do not use complex McKinsey formats unless asked.

Output MUST be strictly valid JSON matching this schema:
{
  "summary": "Your text response here (can be a greeting, an analysis, or chart description)",
  "chartConfig": {
    "title": "Chart Title",
    "chartType": "bar | pie | line | scatter",
    "xAxisKey": "String key from data",
    "yAxisKey": "String key from data",
    "data": [{"key": "value", ...}]
  } // chartConfig is OPTIONAL. Omit it if no chart is requested.
}
`;

    const out = await hf.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: universalPrompt }],
      max_tokens: 800,
      temperature: 0.1,
    });

    let rawResponse = out.choices[0].message.content || "{}";
    rawResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed: any = {};
    try {
      const startIdx = rawResponse.indexOf('{');
      const endIdx = rawResponse.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        parsed = JSON.parse(rawResponse.substring(startIdx, endIdx + 1));
      } else {
        parsed = JSON.parse(rawResponse);
      }
    } catch (e) {
      console.error("Failed to parse LLM JSON:", rawResponse);
      return NextResponse.json({ summary: "I analyzed the data but had trouble formatting the response perfectly." });
    }

    return NextResponse.json({ 
      summary: parsed.summary || "Here is your requested information.",
      chartConfig: parsed.chartConfig
    });

  } catch (error) {
    console.error('AI Generate Error:', error);
    return NextResponse.json({ summary: "I encountered a brief connection issue, please try asking again!" });
  }
}
