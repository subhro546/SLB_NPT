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
    if (action === 'greeting') {
      return NextResponse.json({ summary: "Hello! I can help analyze the dashboard, generate charts, answer operational questions, and provide insights. How can I help you today?" });
    }

    if (action === 'general_conversation' || action === 'dashboard_help') {
      const convPrompt = `You are a friendly and helpful AI assistant for a drilling operations dashboard. 
The user said: "${userQuery}"
Respond conversationally in 1-2 sentences. DO NOT ask them to clarify what analysis they want. Behave like ChatGPT.`;
      
      const out = await hf.chatCompletion({
        model: MODEL,
        messages: [{ role: 'user', content: convPrompt }],
        max_tokens: 150,
      });
      return NextResponse.json({ summary: out.choices[0].message.content });
    }

    if (!analyticsData) {
      return NextResponse.json({ summary: "I don't have any dashboard data to analyze right now." });
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
2. Select the correct array from the aggregated data.
3. Select the most appropriate chart type: 'bar', 'pie', 'line', or 'scatter'.
4. Determine the 'xAxisKey' and 'yAxisKey'.
5. SMART DEFAULTS (CRITICAL): 
   - If the user asks about Top Performing Rig, Best Engineer, or Best Incharge: ALWAYS use "CostSaved".
   - If the user asks for a Trend: ALWAYS use "Monthly" granularity.
   - If the user asks for a Comparison: ALWAYS use "CostSaved", "TimeSaved", and "Events".
   - If "CostSaved" is not available or all 0, use "TimeSaved".
6. Ensure the chart title, axis labels, and data source MATCH the user question exactly.
7. Provide a brief executive summary explaining the visualization.

Requirements:
- Output strictly valid JSON without any markdown formatting, backticks, or extra text.

JSON Structure:
{
  "chartOptions": {
    "title": "Chart Title",
    "chartType": "bar | pie | line | scatter",
    "data": [{"RigName": "Rig A", "CostSaved": 50000}, ...],
    "xAxisKey": "RigName",
    "yAxisKey": "CostSaved"
  },
  "summary": "Brief executive summary of the chart insights."
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
* EXCLUSIONS: If the user query asks to exclude a category or item, you MUST completely ignore any data points related to that item and rank/analyze the remaining ones.
* SMART DEFAULTS (CRITICAL): 
   - If the user asks about Top Performing Rig, Best Engineer, or Best Incharge: ALWAYS use "CostSaved".
   - If the user asks for a Trend: ALWAYS use "Monthly" granularity.
   - If the user asks for a Comparison: ALWAYS use "CostSaved", "TimeSaved", and "Events".
   - If "CostSaved" is not available or all 0, use "TimeSaved".

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
       return NextResponse.json({ summary: `We encountered an issue with the deep analytics engine, but looking at the overall dashboard, we have saved ${analyticsData.totalTimeSaved.toFixed(1)} hours and $${(analyticsData.totalCostSaved || 0).toLocaleString()} across ${analyticsData.totalEvents || 0} events.` });
    }

    return NextResponse.json({ summary: "I was unable to complete that analysis at this moment. Please check the dashboard metrics above." });
  }
}
