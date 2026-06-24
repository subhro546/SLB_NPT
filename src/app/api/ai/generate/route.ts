import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL = 'Qwen/Qwen2.5-7B-Instruct';

export async function POST(req: Request) {
  let analyticsData: any = null;
  try {
    const body = await req.json();
    analyticsData = body.analyticsData;
    const userQuery = body.userQuery;

    if (!userQuery) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!analyticsData) {
      return NextResponse.json({ summary: "I don't have any dashboard data to analyze right now." });
    }

    console.log('\n=== AI COPILOT DEBUG MODE: REQUEST ===');
    console.log('User Query:', userQuery);
    console.log('Dataset row count:', analyticsData.totalEvents);

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
      max_tokens: 1500,
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
      
      console.log('\n=== AI COPILOT DEBUG MODE: RESPONSE ===');
      console.log('Generated Metric (yAxis):', parsed.chartConfig?.yAxisKey || 'N/A');
      console.log('Generated Chart Type:', parsed.chartConfig?.chartType || 'N/A');
      console.log('Final Chart Payload:', JSON.stringify(parsed.chartConfig, null, 2));
      
    } catch (e: any) {
      console.error("Failed to parse LLM JSON:", rawResponse);
      console.error("Parse Exception:", e.message);
      
      // If the AI just returned text, return it as the summary
      return NextResponse.json({ 
        summary: rawResponse || "I encountered an error understanding the data format."
      });
    }

    return NextResponse.json({ 
      summary: parsed.summary || "Here is your requested information.",
      chartConfig: parsed.chartConfig
    });

  } catch (error: any) {
    console.error('\n=== AI COPILOT DEBUG MODE: ERROR ===');
    console.error('Exact Exception Message:', error.message);
    console.error('Stack:', error.stack);
    
    return NextResponse.json({ 
      summary: `Chart Error: ${error.message}\n\nFalling back to raw data table:\n\n${JSON.stringify(analyticsData?.aggregatedByCategory || {}, null, 2)}`
    });
  }
}
