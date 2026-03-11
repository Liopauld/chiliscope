import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Search, Trash2, Sparkles, Filter, Grid, List, ChevronLeft, ChevronRight, Loader2, Printer, Scan, FlowerIcon, Ruler, Scale, Globe, Link2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAnalysisStore, type AnalysisResult } from '@/stores/analysisStore'
import { predictionsApi } from '@/lib/api'
import { samplesApi } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/utils'

const ITEMS_PER_PAGE = 12

/** Safely extract a displayable count from a varietiesDetected value */
function safeVarietyCount(val: unknown): string | number | null {
  if (val == null) return null
  if (typeof val === 'number') return val
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    const count = obj.count
    if (typeof count === 'number') return count
    if (typeof count === 'string') return count
    return null
  }
  return null
}

export default function Library() {
  const navigate = useNavigate()
  const { analysisHistory, clearHistory, setCurrentAnalysis, setHistory, historyLoaded } = useAnalysisStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [publicStates, setPublicStates] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const togglePublic = async (e: React.MouseEvent, resultId: string) => {
    e.stopPropagation()
    const current = publicStates[resultId] ?? false
    const next = !current
    setPublicStates((prev) => ({ ...prev, [resultId]: next }))
    try {
      await samplesApi.update(resultId, { is_public: next })
    } catch {
      setPublicStates((prev) => ({ ...prev, [resultId]: current }))
    }
  }

  const copyShareLink = (e: React.MouseEvent, resultId: string) => {
    e.stopPropagation()
    const url = `${window.location.origin}/results/${resultId}`
    navigator.clipboard.writeText(url)
    setCopiedId(resultId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Fetch prediction history from backend on mount
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true)
      try {
        const data = await predictionsApi.getHistory(1, 100)
        const items: AnalysisResult[] = (data.items || []).map((item: Record<string, unknown>) => ({
          id: (item.analysis_id as string) || String(Date.now()),
          imageUrl: (item.thumbnail as string) || '',
          variety: (item.variety as string) || 'Unknown',
          confidence: (item.confidence as number) || 0,
          heatLevel: (item.heat_level as string) || 'Medium',
          shu: (item.shu as number) || 0,
          maturity: (item.maturity as string) || 'Mature',
          timestamp: (item.created_at as string) || new Date().toISOString(),
          scanType: (item.scan_type as string) || 'classification',
          totalDetected: (item.total_detected as number) || 0,
          segments: (item.segments as AnalysisResult['segments']) || undefined,
          measurements: (item.measurements as AnalysisResult['measurements']) || undefined,
          varietiesDetected: (item.varieties_detected as AnalysisResult['varietiesDetected']) || undefined,
          recommendations: {},
        }))
        // Track public states from backend
        const pubStates: Record<string, boolean> = {}
        for (const item of data.items || []) {
          const id = (item as Record<string, unknown>).analysis_id as string
          if (id) pubStates[id] = !!(item as Record<string, unknown>).is_public
        }
        setPublicStates((prev) => ({ ...prev, ...pubStates }))
        // Merge: backend items + any local-only items
        const backendIds = new Set(items.map((i) => i.id))
        const localOnly = analysisHistory.filter((h) => !backendIds.has(h.id))
        setHistory([...items, ...localOnly])
      } catch (err) {
        console.error('Failed to fetch prediction history:', err)
        // If backend fails, keep local data
        if (!historyLoaded) setHistory(analysisHistory)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHistory()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredResults = analysisHistory.filter((result) => {
    const matchesSearch =
      result.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.heatLevel.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = !selectedFilter || result.heatLevel === selectedFilter
    return matchesSearch && matchesFilter
  })

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE)
  const paginatedResults = filteredResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleResultClick = (result: AnalysisResult) => {
    setCurrentAnalysis(result)
    navigate(`/results/${result.id}`)
  }

  const heatFilters = ['Mild', 'Medium', 'Hot', 'Extra Hot']

  const heatGradient = (level: string) => {
    const m: Record<string, string> = { Mild: 'heat-gradient-mild', Medium: 'heat-gradient-medium', Hot: 'heat-gradient-hot', 'Extra Hot': 'heat-gradient-extra-hot' }
    return m[level] || 'bg-foreground-muted'
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const rows = filteredResults.map(r =>
      `<tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
          <img src="${r.imageUrl}" alt="${r.variety}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'" />
        </td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:600;">${r.variety}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.heatLevel}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${formatNumber(r.shu)} SHU</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${(r.confidence * 100).toFixed(1)}%</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.maturity}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${formatDate(r.timestamp)}</td>
      </tr>`
    ).join('')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ChiliScope - Analysis Report</title>
        <style>
          body { font-family: 'Segoe UI', Inter, sans-serif; padding: 40px; color: #1c1917; }
          .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border-bottom: 3px solid #dc2626; padding-bottom: 16px; }
          .logo { width: 36px; height: 36px; background: #dc2626; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; }
          h1 { font-size: 24px; color: #7f1d1d; margin: 0; }
          .meta { color: #57534e; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 10px; background: #fef2f2; color: #991b1b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #dc2626; }
          .summary { display: flex; gap: 24px; margin-bottom: 24px; }
          .stat { padding: 12px 20px; background: #fef7f0; border-radius: 8px; border: 1px solid rgba(127,29,29,0.1); }
          .stat-value { font-size: 22px; font-weight: 700; color: #dc2626; }
          .stat-label { font-size: 11px; color: #57534e; text-transform: uppercase; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #a8a29e; font-size: 11px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🌶️</div>
          <h1>ChiliScope Analysis Report</h1>
        </div>
        <div class="meta">
          Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${filteredResults.length} results${selectedFilter ? ' · Filtered: ' + selectedFilter : ''}${searchQuery ? ' · Search: "' + searchQuery + '"' : ''}
        </div>
        <div class="summary">
          <div class="stat"><div class="stat-value">${filteredResults.length}</div><div class="stat-label">Total Analyses</div></div>
          <div class="stat"><div class="stat-value">${filteredResults.length > 0 ? formatNumber(Math.round(filteredResults.reduce((a, r) => a + r.shu, 0) / filteredResults.length)) : 0}</div><div class="stat-label">Avg SHU</div></div>
          <div class="stat"><div class="stat-value">${filteredResults.length > 0 ? (filteredResults.reduce((a, r) => a + r.confidence, 0) / filteredResults.length * 100).toFixed(1) + '%' : '0%'}</div><div class="stat-label">Avg Confidence</div></div>
        </div>
        <table>
          <thead><tr><th>Image</th><th>Variety</th><th>Heat Level</th><th>SHU</th><th>Confidence</th><th>Maturity</th><th>Date</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">© ${new Date().getFullYear()} ChiliScope — Technological University of the Philippines Taguig | Group 9</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">My Analysis History</h1>
          <p className="text-foreground-secondary text-sm">{analysisHistory.length} total analyses</p>
        </div>
        {analysisHistory.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-foreground-secondary hover:text-foreground"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { if (confirm('Are you sure you want to clear all history?')) clearHistory() }}
              className="text-danger border-danger/30 hover:bg-danger/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                placeholder="Search by variety or heat level…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-4 w-4 text-foreground-muted" />
              <Button
                variant={selectedFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSelectedFilter(null); setCurrentPage(1) }}
                className="h-8 text-xs"
              >All</Button>
              {heatFilters.map((f) => (
                <Button
                  key={f}
                  variant={selectedFilter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setSelectedFilter(f); setCurrentPage(1) }}
                  className={`h-8 text-xs ${selectedFilter === f ? `${heatGradient(f)} text-white border-0` : ''}`}
                >{f}</Button>
              ))}
            </div>
            <div className="flex gap-0.5 border border-border rounded-lg p-0.5">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface' : 'hover:bg-surface/50'}`}>
                <Grid className="h-4 w-4 text-foreground-secondary" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface' : 'hover:bg-surface/50'}`}>
                <List className="h-4 w-4 text-foreground-secondary" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-foreground-secondary text-sm">Loading your analysis history…</p>
          </CardContent>
        </Card>
      ) : filteredResults.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-5 rounded-full bg-surface mb-5">
              <Flame className="h-10 w-10 text-foreground-muted" />
            </div>
            <h2 className="text-xl font-bold font-display text-foreground mb-1">
              {searchQuery || selectedFilter ? 'No matches found' : 'No analyses yet'}
            </h2>
            <p className="text-foreground-secondary text-sm text-center max-w-md mb-6">
              {searchQuery || selectedFilter ? 'Try adjusting your search or filter criteria' : 'Start by uploading some chili images to analyze'}
            </p>
            <Button onClick={() => navigate('/upload')}>
              <Sparkles className="h-4 w-4 mr-1.5" /> Start Analyzing
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedResults.map((result, i) => (
            <motion.div key={result.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="cursor-pointer overflow-hidden group hover:-translate-y-0.5 transition-all duration-200" onClick={() => handleResultClick(result)}>
                <div className="aspect-square bg-surface relative overflow-hidden">
                  <img src={result.imageUrl} alt={result.variety} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white ${heatGradient(result.heatLevel)} shadow-sm`}>
                    {result.heatLevel}
                  </div>
                  <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => togglePublic(e, result.id)}
                      className={`p-1.5 rounded-full backdrop-blur-sm shadow-sm transition-colors ${publicStates[result.id] ? 'bg-green-500 text-white' : 'bg-black/50 text-white/80 hover:bg-black/70'}`}
                      title={publicStates[result.id] ? 'Public — click to make private' : 'Private — click to share publicly'}
                    >
                      <Globe className="h-3.5 w-3.5" />
                    </button>
                    {publicStates[result.id] && (
                      <button
                        onClick={(e) => copyShareLink(e, result.id)}
                        className="p-1.5 rounded-full bg-black/50 text-white/80 hover:bg-black/70 backdrop-blur-sm shadow-sm transition-colors"
                        title={copiedId === result.id ? 'Copied!' : 'Copy share link'}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {result.scanType && result.scanType !== 'classification' && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-full text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm flex items-center gap-1">
                      {result.scanType === 'flower_segmentation' ? <FlowerIcon className="h-3 w-3" /> : <Scan className="h-3 w-3" />}
                      {result.scanType === 'flower_segmentation' ? 'Flower' : 'Segmentation'}
                    </div>
                  )}
                </div>
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground">{result.variety}</p>
                    {publicStates[result.id] && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-medium flex items-center gap-0.5">
                        <Globe className="h-2.5 w-2.5" /> Public
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-foreground-secondary text-sm font-medium">{formatNumber(result.shu)} SHU</p>
                    {result.totalDetected && result.totalDetected > 0 ? (
                      <span className="text-xs text-primary font-semibold">{result.totalDetected} detected</span>
                    ) : null}
                  </div>
                  {/* Measurement summary for segmentation scans */}
                  {(result.scanType === 'chili_segmentation' || result.scanType === 'flower_segmentation') && result.measurements && (() => {
                    const pods = result.measurements.per_pod
                    const avg = result.measurements.average ?? (pods?.length
                      ? { length_mm: pods.reduce((s,p) => s + (p.length_mm||0), 0)/pods.length, estimated_weight_g: pods.reduce((s,p) => s + (p.estimated_weight_g||0), 0)/pods.length }
                      : null)
                    const totalW = typeof result.measurements.total_estimated_weight_g === 'number' ? result.measurements.total_estimated_weight_g : null
                    if (!avg && totalW == null) return null
                    return (
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-foreground-muted">
                        {avg?.length_mm != null && typeof avg.length_mm === 'number' && (
                          <span className="flex items-center gap-0.5"><Ruler className="h-2.5 w-2.5" />{avg.length_mm.toFixed(1)}mm</span>
                        )}
                        {totalW != null && (
                          <span className="flex items-center gap-0.5"><Scale className="h-2.5 w-2.5" />{totalW.toFixed(1)}g</span>
                        )}
                      </div>
                    )
                  })()}
                  {/* Varieties detected for chili segmentation */}
                  {result.scanType === 'chili_segmentation' && result.varietiesDetected && Object.keys(result.varietiesDetected).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(result.varietiesDetected).map(([name, val]) => {
                        const cnt = safeVarietyCount(val)
                        if (cnt == null) return null
                        return <span key={name} className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{name}: {String(cnt)}</span>
                      })}
                    </div>
                  )}
                  {/* Segment classes for flower scans */}
                  {result.scanType === 'flower_segmentation' && result.segments && result.segments.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {result.segments.slice(0, 3).map((seg, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-700 font-medium">{(seg.class_name || seg.class || 'region').replace(/_/g, ' ')}</span>
                      ))}
                      {result.segments.length > 3 && <span className="text-[9px] text-foreground-muted">+{result.segments.length - 3}</span>}
                    </div>
                  )}
                  <p className="text-xs text-foreground-muted mt-1.5">{formatDate(result.timestamp)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginatedResults.map((result, i) => (
            <motion.div key={result.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="cursor-pointer hover:-translate-y-0.5 transition-all duration-200" onClick={() => handleResultClick(result)}>
                <CardContent className="p-3.5 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-surface overflow-hidden flex-shrink-0">
                    <img src={result.imageUrl} alt={result.variety} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-foreground">{result.variety}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${heatGradient(result.heatLevel)}`}>{result.heatLevel}</span>
                      {result.scanType && result.scanType !== 'classification' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-slate-600">
                          {result.scanType === 'flower_segmentation' ? '🌸 Flower' : '🔍 Segment'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground-secondary">
                      {formatNumber(result.shu)} SHU · {(result.confidence * 100).toFixed(0)}% confidence
                      {result.totalDetected && result.totalDetected > 0 ? ` · ${result.totalDetected} detected` : ''}
                    </p>
                    {/* Measurement details for segmentation */}
                    {(result.scanType === 'chili_segmentation' || result.scanType === 'flower_segmentation') && result.measurements && (() => {
                      const pods = result.measurements.per_pod
                      const avg = result.measurements.average ?? (pods?.length
                        ? { length_mm: pods.reduce((s,p) => s + (p.length_mm||0), 0)/pods.length, width_mm: pods.reduce((s,p) => s + (p.width_mm||0), 0)/pods.length, estimated_weight_g: pods.reduce((s,p) => s + (p.estimated_weight_g||0), 0)/pods.length }
                        : null)
                      const totalW = typeof result.measurements.total_estimated_weight_g === 'number' ? result.measurements.total_estimated_weight_g : null
                      if (!avg && totalW == null) return null
                      return (
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-foreground-muted">
                          {avg && typeof avg.length_mm === 'number' && typeof avg.width_mm === 'number' && (
                            <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />Avg: {avg.length_mm.toFixed(1)}×{avg.width_mm.toFixed(1)}mm</span>
                          )}
                          {totalW != null && (
                            <span className="flex items-center gap-1"><Scale className="h-3 w-3" />Total: {totalW.toFixed(1)}g</span>
                          )}
                        </div>
                      )
                    })()}
                    {/* Varieties detected */}
                    {result.scanType === 'chili_segmentation' && result.varietiesDetected && Object.keys(result.varietiesDetected).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {Object.entries(result.varietiesDetected).map(([name, val]) => {
                          const cnt = safeVarietyCount(val)
                          if (cnt == null) return null
                          return <span key={name} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{name}: {String(cnt)}</span>
                        })}
                      </div>
                    )}
                    <p className="text-xs text-foreground-muted mt-0.5">{formatDate(result.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => togglePublic(e, result.id)}
                      className={`p-1.5 rounded-md transition-colors ${publicStates[result.id] ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-foreground-muted hover:bg-surface'}`}
                      title={publicStates[result.id] ? 'Public — click to make private' : 'Private — click to share publicly'}
                    >
                      <Globe className="h-4 w-4" />
                    </button>
                    {publicStates[result.id] && (
                      <button
                        onClick={(e) => copyShareLink(e, result.id)}
                        className="p-1.5 rounded-md text-foreground-muted hover:bg-surface transition-colors"
                        title={copiedId === result.id ? 'Copied!' : 'Copy share link'}
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                    )}
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="icon" className="h-8 w-8 text-xs" onClick={() => setCurrentPage(page)}>
              {page}
            </Button>
          ))}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
