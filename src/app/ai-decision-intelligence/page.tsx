"use client"

import { useState, useEffect, useRef } from "react"
import { useFilteredData } from "@/hooks/useFilteredData"
import { useAppStore } from "@/store/useAppStore"
import {
  summarizeCurrentView,
  interventionPerformance,
  savingsPotential,
  assetInterventionComparison,
  recommendIntervention,
  estimateAnnualSavings,
  prepareUniversalContext
} from "@/lib/analytics-engine"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BrainCircuit, Search, Copy, Send, FileText, FileDown, CheckCircle2, Loader2, Database, BarChart2 } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts"

export default function AIDecisionIntelligence() {
  const data = useFilteredData()
  const { activeDatasetId } = useAppStore()

  const [query, setQuery] = useState("")
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string, title?: string, chartConfig?: any }[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory])

  if (!activeDatasetId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <BrainCircuit className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Decision Intelligence Copilot Unavailable</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Please upload or select a dataset to activate the AI copilot.
        </p>
      </div>
    )
  }

  const generateReport = async (userQuery: string, title: string) => {
    setIsProcessing(true)

    const analyticsData = prepareUniversalContext(data)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyticsData, userQuery })
      })
      const { summary, chartConfig } = await res.json()

      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: userQuery },
        { role: 'ai', title, content: summary, chartConfig }
      ])
    } catch (e) {
      console.error(e)
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: userQuery },
        { role: 'ai', title: "Error", content: "Failed to connect to the Copilot Engine." }
      ])
    }

    setIsProcessing(false)
  }

  const handleAction = (action: string, title: string) => {
    generateReport(`Generate: ${title}`, title)
  }

  const handleQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim() || isProcessing) return

    const currentQuery = query
    setQuery("")
    
    // Fallback title for raw queries
    generateReport(currentQuery, "Copilot Insight")
  }

  const handleSmartPrompt = (prompt: string) => {
    setQuery(prompt);
    setTimeout(() => {
      document.getElementById("chat-submit")?.click()
    }, 50)
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const downloadText = (title: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([`${title}\n\n${content}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, '_').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  const renderFormattedContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
        }
        return <span key={pIdx}>{part}</span>
      })

      if (line.startsWith('### ')) return <h3 key={idx} className="text-lg font-bold text-foreground mt-4 mb-2">{formattedParts}</h3>
      if (line.startsWith('- ')) return <li key={idx} className="ml-4 mb-1 list-disc text-muted-foreground">{formattedParts}</li>
      if (/^\d+\.\s/.test(line)) return <li key={idx} className="ml-4 mb-1 list-decimal text-muted-foreground">{formattedParts}</li>
      if (line.trim() === '') return <br key={idx} />
      return <p key={idx} className="mb-2 text-muted-foreground leading-relaxed">{formattedParts}</p>
    })
  }

  const smartPrompts = [
    "Plot the time saved across all rigs.",
    "Which intervention generated maximum savings?",
    "Show me a pie chart of the cost impact by well category.",
    "Where can we save the most additional time?",
    "Visualize the biggest remaining savings opportunities."
  ]

  const renderDynamicChart = (config: any) => {
    if (!config || !config.data || config.data.length === 0) return null;
    const { chartType, data, xAxisKey, yAxisKey } = config;

    if (chartType === 'bar') {
      return (
        <div className="h-[300px] w-full mt-4 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey={xAxisKey} angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }} />
              <Bar isAnimationActive={false} dataKey={yAxisKey} fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'pie') {
      return (
        <div className="h-[300px] w-full mt-4 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey={yAxisKey} nameKey={xAxisKey} cx="50%" cy="50%" outerRadius={100} label>
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)'][index % 5]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'line') {
      return (
        <div className="h-[300px] w-full mt-4 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey={xAxisKey} angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }} />
              <Line isAnimationActive={false} type="monotone" dataKey={yAxisKey} stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return <div className="text-sm text-muted-foreground italic my-2">Unsupported chart type: {chartType}</div>;
  }

  const wellCatAgg = data.reduce((acc, curr) => {
    const key = curr.WellCategory === 'D' ? 'Development' : curr.WellCategory === 'E' ? 'Exploratory' : 'Unknown';
    if (!acc[key]) acc[key] = 0;
    acc[key] += 1;
    return acc;
  }, {} as Record<string, number>);
  const miniDonutData = Object.entries(wellCatAgg).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)'];

  return (
    <div className="flex flex-col p-6 space-y-4 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intervention Copilot</h1>
          <p className="text-muted-foreground">Powered by Qwen 2.5 7B + Deterministic Analytics</p>
        </div>
        <div className="hidden md:flex items-center gap-4 bg-muted/20 p-2 pr-6 rounded-full border">
          <div className="h-12 w-12 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={miniDonutData} cx="50%" cy="50%" innerRadius={14} outerRadius={22} dataKey="value" paddingAngle={2}>
                  {miniDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '10px', padding: '4px 8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs">
            <p className="font-semibold flex items-center gap-1"><Database className="w-3 h-3" /> Active Context</p>
            <p className="text-muted-foreground">{data.length} Events Analyzed</p>
          </div>
        </div>
      </div>

      {/* Section 2: Analysis Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 shrink-0">
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('intervention_performance', 'Top Interventions')}>
          <span className="font-semibold text-xs text-blue-500">Top Interventions</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('savings_potential', 'Savings Potential')}>
          <span className="font-semibold text-xs text-green-500">Savings Potential</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('rig_intervention_comparison', 'Rig Comparison')}>
          <span className="font-semibold text-xs text-purple-500">Rig Comparison</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('recommend_intervention', 'Recommended Action')}>
          <span className="font-semibold text-xs text-amber-500">Recommended Action</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('estimate_annual_savings', 'Annual Projections')}>
          <span className="font-semibold text-xs text-indigo-500">Annual Projections</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('summarize_current_view', 'View Summary')}>
          <span className="font-semibold text-xs text-rose-500">View Summary</span>
        </Button>
      </div>

      {/* Section 3: Chat Interface */}
      <Card className="h-[600px] shrink-0 flex flex-col border shadow-sm">
        <CardHeader className="py-4 border-b bg-muted/30 shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Ask the AI Copilot
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0 flex flex-col">

          <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-70 p-8">
                <BrainCircuit className="h-12 w-12 mb-4 text-primary/40" />
                <p>Ask a natural language question about the dashboard data.</p>
                <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl">
                  {smartPrompts.map(p => (
                    <Button key={p} variant="secondary" size="sm" className="text-xs rounded-full" onClick={() => handleSmartPrompt(p)}>
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-card border rounded-tl-sm'
                      }`}>
                      {msg.role === 'ai' && msg.title && (
                        <div className="flex items-center justify-between border-b pb-2 mb-3">
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4 text-primary" />
                            {msg.title}
                          </span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => copyToClipboard(msg.content, i)}>
                              {copiedIndex === i ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => downloadText(msg.title || 'Report', msg.content)}>
                              <FileDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="text-[14px]">
                        {msg.role === 'ai' && msg.chartConfig && renderDynamicChart(msg.chartConfig)}
                        {msg.role === 'ai' ? renderFormattedContent(msg.content) : msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl p-4 shadow-sm bg-card border rounded-tl-sm flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm">Qwen 2.5 is analyzing...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-muted/10 shrink-0">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
              {smartPrompts.map(p => (
                <button key={p} onClick={() => handleSmartPrompt(p)} className="shrink-0 px-3 py-1 bg-background border rounded-full text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  {p}
                </button>
              ))}
            </div>
            <form onSubmit={handleQuery} className="flex gap-2">
              <Input
                placeholder="Ask about intervention effectiveness or estimate annual savings..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 shadow-sm"
                disabled={isProcessing}
              />
              <Button type="submit" id="chat-submit" disabled={!query.trim() || isProcessing} className="shrink-0 px-6">
                <Send className="h-4 w-4 mr-2" />
                Analyze
              </Button>
            </form>
          </div>

        </CardContent>
      </Card>

    </div>
  )
}
