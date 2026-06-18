"use client"

import { useState, useEffect, useRef } from "react"
import { useFilteredData } from "@/hooks/useFilteredData"
import { useAppStore } from "@/store/useAppStore"
import { 
  generateExecutiveSummary, 
  generateCostImpactAnalysis, 
  generateRiskReliabilityAnalysis, 
  generateSavingsAnalysis,
  processNaturalLanguageQuery,
  AIResponse
} from "@/lib/ai-engine"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BrainCircuit, Search, Download, Copy, Send, FileText, FileDown, CheckCircle2 } from "lucide-react"

export default function AIDecisionIntelligence() {
  const data = useFilteredData()
  const { activeDatasetId } = useAppStore()
  const [executiveSummary, setExecutiveSummary] = useState<AIResponse | null>(null)
  
  // Chat state
  const [query, setQuery] = useState("")
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string, title?: string }[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-generate executive summary on load/data change
  useEffect(() => {
    if (data.length > 0) {
      setExecutiveSummary(generateExecutiveSummary(data))
    }
  }, [data])

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
        <h2 className="text-2xl font-bold mb-2">AI Decision Engine Unavailable</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Please upload or select a dataset to activate the AI decision intelligence module.
        </p>
      </div>
    )
  }

  const handleAction = (type: 'exec' | 'cost' | 'risk' | 'savings') => {
    let res: AIResponse;
    switch(type) {
      case 'exec': res = generateExecutiveSummary(data); break;
      case 'cost': res = generateCostImpactAnalysis(data); break;
      case 'risk': res = generateRiskReliabilityAnalysis(data); break;
      case 'savings': res = generateSavingsAnalysis(data); break;
    }
    setChatHistory(prev => [
      ...prev,
      { role: 'user', content: `Generate ${res.title}` },
      { role: 'ai', title: res.title, content: res.content }
    ])
  }

  const handleQuery = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    const res = processNaturalLanguageQuery(query, data)
    
    setChatHistory(prev => [
      ...prev,
      { role: 'user', content: query },
      { role: 'ai', title: res.title, content: res.content }
    ])
    setQuery("")
  }

  const handleSmartPrompt = (prompt: string) => {
    setQuery(prompt);
    // Give state a tiny tick to update input visually if needed, though we can just execute immediately
    setTimeout(() => {
      const res = processNaturalLanguageQuery(prompt, data)
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: prompt },
        { role: 'ai', title: res.title, content: res.content }
      ])
      setQuery("")
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
      // Bold rendering
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
        }
        return <span key={pIdx}>{part}</span>
      })

      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-bold text-foreground mt-4 mb-2">{formattedParts}</h3>
      }
      if (line.startsWith('- ')) {
        return <li key={idx} className="ml-4 mb-1 list-disc text-muted-foreground">{formattedParts}</li>
      }
      if (/^\d+\.\s/.test(line)) {
        return <li key={idx} className="ml-4 mb-1 list-decimal text-muted-foreground">{formattedParts}</li>
      }
      if (line.trim() === '') {
        return <br key={idx} />
      }
      return <p key={idx} className="mb-2 text-muted-foreground leading-relaxed">{formattedParts}</p>
    })
  }

  const smartPrompts = [
    "Summarize Current View",
    "Analyze Cost Drivers",
    "Compare Offshore vs Onshore",
    "Identify High-Risk Rigs",
    "Find Savings Opportunities",
  ]

  return (
    <div className="flex flex-col p-6 space-y-4 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      
      {/* Removed Executive Summary Card */}

      {/* Section 2: Analysis Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('exec')}>
          <FileText className="h-5 w-5 text-blue-500" />
          <span className="font-semibold text-xs">Executive Summary</span>
        </Button>
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('cost')}>
          <DollarSignIcon className="h-5 w-5 text-green-500" />
          <span className="font-semibold text-xs">Cost Impact Analysis</span>
        </Button>
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('risk')}>
          <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-xs">Risk & Reliability</span>
        </Button>
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleAction('savings')}>
          <TrendingDownIcon className="h-5 w-5 text-purple-500" />
          <span className="font-semibold text-xs">Savings Opportunity</span>
        </Button>
      </div>

      {/* Section 3: Chat Interface */}
      <Card className="h-[600px] shrink-0 flex flex-col border shadow-sm">
        <CardHeader className="py-4 border-b bg-muted/30 shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Ask the AI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
          
          <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-70 p-8">
                <BrainCircuit className="h-12 w-12 mb-4 text-primary/40" />
                <p>Ask a question about the dashboard data or use the analysis buttons above.</p>
                <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-lg">
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
                placeholder="Ask about highest downtime, cost drivers, or compare metrics..." 
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 shadow-sm"
              />
              <Button type="submit" disabled={!query.trim()} className="shrink-0 px-6">
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

function DollarSignIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
}

function AlertTriangleIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
}

function TrendingDownIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
}
