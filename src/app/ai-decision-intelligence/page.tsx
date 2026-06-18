"use client"

import { useState, useEffect, useRef } from "react"
import { useFilteredData } from "@/hooks/useFilteredData"
import { useAppStore } from "@/store/useAppStore"
import { 
  summarizeCurrentView,
  compareAssets,
  compareRigs,
  compareOnshoreOffshore,
  identifyCostDrivers,
  identifySavingsOpportunities,
  identifyHighRiskRigs,
  rankAssets,
  rankRigs,
  analyzeNPTCategories,
  overallBusinessHealth,
  executiveSummary
} from "@/lib/analytics-engine"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BrainCircuit, Search, Copy, Send, FileText, FileDown, CheckCircle2, Loader2 } from "lucide-react"

export default function AIDecisionIntelligence() {
  const data = useFilteredData()
  const { activeDatasetId } = useAppStore()
  
  const [query, setQuery] = useState("")
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string, title?: string }[]>([])
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

  const runAnalytics = (action: string, extraArgs?: any) => {
    switch (action) {
      case 'overall_business_health': return overallBusinessHealth(data);
      case 'executive_summary': return executiveSummary(data);
      case 'compare_assets':
        const assets = Array.from(new Set(data.map(d => d.Asset).filter(Boolean)));
        const a1 = extraArgs?.asset1 || assets[0] || 'Unknown';
        const a2 = extraArgs?.asset2 || assets[1] || 'Unknown';
        return compareAssets(data, a1, a2);
      case 'compare_rigs':
        const rigs = Array.from(new Set(data.map(d => d.RigName).filter(Boolean)));
        const r1 = extraArgs?.rig1 || rigs[0] || 'Unknown';
        const r2 = extraArgs?.rig2 || rigs[1] || 'Unknown';
        return compareRigs(data, r1, r2);
      case 'compare_onshore_offshore': return compareOnshoreOffshore(data);
      case 'identify_cost_drivers': return identifyCostDrivers(data);
      case 'identify_savings_opportunities': return identifySavingsOpportunities(data);
      case 'identify_high_risk_rigs': return identifyHighRiskRigs(data);
      case 'rank_assets': return rankAssets(data);
      case 'rank_rigs': return rankRigs(data);
      case 'analyze_npt_categories': return analyzeNPTCategories(data);
      case 'general_conversation':
      case 'clarification_required':
        return null;
      case 'summarize_current_view':
      default:
        return summarizeCurrentView(data);
    }
  }

  const generateReport = async (action: string, userQuery: string, title: string) => {
    setIsProcessing(true)
    
    // Step 2: Analytics
    const analyticsData = runAnalytics(action)

    // Step 3: Executive Summary
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyticsData, userQuery, action, chatHistory })
      })
      const { summary } = await res.json()

      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: userQuery },
        { role: 'ai', title, content: summary }
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
    generateReport(action, `Generate: ${title}`, title)
  }

  const handleQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim() || isProcessing) return

    const currentQuery = query
    setQuery("")
    setIsProcessing(true)

    try {
      // Step 1: Intent
      const res = await fetch('/api/ai/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery, chatHistory })
      })
      const intent = await res.json()
      
      const action = intent.intent || intent.action || 'clarification_required'
      const title = action.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      
      // Step 2 & 3
      const analyticsData = runAnalytics(action, intent)

      const genRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyticsData, userQuery: currentQuery, action, chatHistory })
      })
      const { summary } = await genRes.json()

      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: currentQuery },
        { role: 'ai', title: `${title} Insight`, content: summary }
      ])
    } catch (e) {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: currentQuery },
        { role: 'ai', title: "Error", content: "Failed to process intent or connect to Hugging Face API." }
      ])
    }

    setIsProcessing(false)
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
    const file = new Blob([`${title}\n\n${content}`], {type: 'text/plain'});
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
    "Where can I save more money?",
    "Which rig has the highest cost impact?",
    "Compare offshore and onshore performance.",
    "Which asset should management prioritize?",
    "What are the top NPT contributors?",
    "Summarize the current view."
  ]

  return (
    <div className="flex flex-col p-6 space-y-4 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight">RTDMMA Decision Intelligence Copilot</h1>
        <p className="text-muted-foreground">Powered by Qwen 2.5 7B + Deterministic Analytics</p>
      </div>

      {/* Section 2: Analysis Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 shrink-0">
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('summarize_current_view', 'Executive Summary')}>
          <span className="font-semibold text-xs text-blue-500">Executive Summary</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('identify_cost_drivers', 'Cost Analysis')}>
          <span className="font-semibold text-xs text-green-500">Cost Analysis</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('identify_savings_opportunities', 'Savings Opportunities')}>
          <span className="font-semibold text-xs text-purple-500">Savings Opportunities</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('compare_assets', 'Asset Comparison')}>
          <span className="font-semibold text-xs text-amber-500">Asset Comparison</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('compare_onshore_offshore', 'Offshore vs Onshore')}>
          <span className="font-semibold text-xs text-indigo-500">Offshore vs Onshore</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('identify_high_risk_rigs', 'High Risk Rigs')}>
          <span className="font-semibold text-xs text-rose-500">High Risk Rigs</span>
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
                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                      msg.role === 'user' 
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
                placeholder="Ask where to save money, compare assets, or rank cost drivers..." 
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
