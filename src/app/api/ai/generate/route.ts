import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL = 'Qwen/Qwen2.5-7B-Instruct';

export async function POST(req: Request) {
  let analyticsData: any = null;
  let userQuery = '';
  let action = '';
  let chatHistory: any[] = [];
  
  try {
    const body = await req.json();
    analyticsData = body.analyticsData;
    userQuery = body.userQuery;
    action = body.action;
    chatHistory = body.chatHistory;
  } catch(e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    if (action === 'general_conversation' || action === 'greeting') {
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

    if (action === 'chart_generation') {
      const vizPrompt = `You are an expert data visualization AI for a drilling operations dashboard.
The user wants a chart based on the provided aggregated data.

Current User Query: "${userQuery}"

Aggregated Analytics Data (Source of Truth - NEVER invent numbers):
${JSON.stringify(analyticsData, null, 2)}

Your task is to:
1. Determine the EXACT chart intent from the user query.
2. Select the correct array from the aggregated data (e.g., aggregatedByEnvironment for onshore/offshore, aggregatedByCategory for categories, aggregatedByRig for rigs, etc.).
3. NEVER generate a generic category chart unless the question is specifically category-related.
4. Set "clarificationRequired": false. Never ask for clarification.
5. Select the most appropriate chart type: 'bar', 'pie', 'line', or 'scatter'.
6. Determine the 'xAxisKey' (e.g. "Environment", "CompanyCode", "RigName") and 'yAxisKey'.
7. SMART DEFAULT: If the user does not specify a metric to rank or chart by, automatically use "CostSaved". If "CostSaved" is not available or all 0, use "TimeSaved", then "Events".
8. Ensure the chart title, axis labels, and data source MATCH the user question exactly.
9. Provide a brief executive summary explaining the visualization.

Requirements:
- Output strictly valid JSON without any markdown formatting, backticks, or extra text.

JSON Structure (if successful):
{
  "chartOptions": {
    "title": "Onshore vs Offshore Performance",
    "chartType": "bar",
    "data": [{"Environment": "Onshore", "TimeSaved": 100}, ...],
    "xAxisKey": "Environment",
    "yAxisKey": "TimeSaved"
  },
  "summary": "Executive summary here..."
}

JSON Structure (if clarification required):
{
  "clarificationRequired": true,
  "summary": "I'm not sure how you'd like to group this data. Could you specify if you want it by rig, category, environment, or company?"
}
`;

      const out = await hf.chatCompletion({
        model: MODEL,
        messages: [{ role: "user", content: vizPrompt }],
        max_tokens: 1000,
        temperature: 0.1,
      });

      let rawResponse = out.choices[0].message.content || "{}";
      rawResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsed = JSON.parse(rawResponse);
        if (parsed.clarificationRequired) {
          return NextResponse.json({ summary: parsed.summary });
        }
        return NextResponse.json({ 
          summary: parsed.summary || "Here is your visualization.", 
          chartConfig: parsed.chartOptions 
        });
      } catch (e) {
        console.error("Failed to parse visualization JSON:", rawResponse);
        return NextResponse.json({ summary: "Failed to generate a valid visualization layout." });
      }
    }

    const prompt = `You are a McKinsey-style executive drilling operations analyst.
You must analyze the provided data and answer the user query.

Current User Query:
${userQuery || "Summarize the current dashboard view."}

Analytics Results (Source of Truth - NEVER invent numbers):
${JSON.stringify(analyticsData, null, 2)}

Requirements:
* Professional, executive consulting tone
* Maximum 200 words
* Never invent numbers. Use ONLY the data provided.
* Never assume missing information.
* EXCLUSIONS: If the user query asks to exclude a category or item (e.g., "except tool failure", "ignoring rig A"), you MUST completely ignore any data points related to that item and rank/analyze the remaining ones.
* SMART DEFAULTS: If the user asks for "top", "best", "worst", or ranking, and doesn't specify a metric, rank by: 1. CostSaved, 2. TimeSaved, 3. Events, in that priority order.

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
    
    // Fail-Safe Fallback
    if (analyticsData && analyticsData.totalTimeSaved !== undefined) {
       return NextResponse.json({ summary: `I encountered an issue generating the deep analysis, but looking at the dashboard overall, we have saved ${analyticsData.totalTimeSaved.toFixed(1)} hours across ${analyticsData.totalEvents || 0} events.` });
    }

    return NextResponse.json({ summary: "I was unable to complete that analysis. Please try rephrasing the request or selecting a specific metric." });
  }
}
