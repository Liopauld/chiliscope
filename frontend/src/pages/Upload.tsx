import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { 
  Upload as UploadIcon, 
  X, 
  Loader2,
  Flame,
  CheckCircle2,
  Sun,
  Focus,
  Ruler,
  Image as ImageIcon,
  ArrowRight,
  Thermometer,
  Zap,
  ScanLine,
  Scale,
  Microscope,
  Layers,
  Flower2,
  Camera,
  SwitchCamera,
  CameraOff,
  Sprout,
  CalendarDays,
  AlertTriangle,
  Ban,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { predictionsApi } from '@/lib/api'
import { useAnalysisStore } from '@/stores/analysisStore'
import { cn } from '@/lib/utils'

interface UploadedFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'analyzing' | 'complete' | 'error'
  progress: number
  result?: Record<string, unknown>
}

interface PodMeasurement {
  length_mm: number
  width_mm: number
  area_mm2: number
  estimated_weight_g: number
}

interface PodReference {
  avg_length_mm: number | null
  avg_width_mm: number | null
  avg_weight_g: number | null
  shu_range: string | null
  heat_category: string | null
  description: string | null
}

interface SegmentPod {
  pod_number: number
  raw_class: string
  variety: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  measurement: PodMeasurement
  reference: PodReference | null
}

interface VarietySummary {
  count: number
  avg_confidence: number
  avg_length_mm: number
  avg_width_mm: number
  avg_weight_g: number
  total_weight_g: number
  reference_length_mm: number | null
  reference_width_mm: number | null
  reference_weight_g: number | null
  shu_range: string | null
  heat_category: string | null
  description: string | null
  pod_indices: number[]
}

interface SegmentationResult {
  total_detected: number
  segments: SegmentPod[]
  varieties_detected: Record<string, VarietySummary>
  measurements: {
    scale_mm_per_px: number
    scale_method: string
    scale_note: string
    per_pod: PodMeasurement[]
    average: PodMeasurement
    total_pods: number
    total_estimated_weight_g: number
  } | null
  processing_time_ms: number
  model: string
}

interface FlowerSegment {
  class: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  measurement: PodMeasurement
  points?: Array<{ x: number; y: number }>
}

interface FlowerStressResult {
  stress_class: string
  stress_score: number
  confidence: number
  capsaicin_impact: string
  shu_multiplier: number
  predictions?: Array<{ class: string; confidence: number }>
}

interface FlowerSegmentationResult {
  success: boolean
  error?: string
  segments: FlowerSegment[]
  total_detected: number
  image_width: number
  image_height: number
  measurements: {
    scale_mm_per_px: number
    scale_method: string
    scale_note: string
    per_pod: PodMeasurement[]
    average: PodMeasurement
    total_pods: number
    total_estimated_weight_g: number
  } | null
  flower_stress?: FlowerStressResult | null
  processing_time_ms: number
  model: string
}

interface MaturityResult {
  maturity_stage: string
  confidence: number
  days_to_harvest: number
  spice_estimate: string
  growth_advice: string[]
  description: string
  shu_modifier: number
  predictions: Array<{ class: string; confidence: number }>
}

interface FlowerRefinement {
  originalShu: number
  refinedShu: number
  flowerAdjustedShu: number
  shuMultiplier: number
  flowerStress: {
    stress_level: string
    stress_score: number
    description: string
  }
  capsaicin: {
    mg_per_g: number
    total_capsaicinoids_ppm: number
    pungency_category: string
  }
  heatLevel: string
}

interface AnalysisSummary {
  variety: string
  confidence: number
  heatLevel: string
  shu: number
  adjustedShu?: number
  analysisId: string
  imageUrl: string
  isChili?: boolean
  maturity?: MaturityResult | null
  segmentation?: SegmentationResult | null
  flowerRefinement?: FlowerRefinement | null
}

export default function Upload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [summary, setSummary] = useState<AnalysisSummary | null>(null)
  const [isSegmenting, setIsSegmenting] = useState(false)

  // Flower scanner state
  const [flowerFile, setFlowerFile] = useState<File | null>(null)
  const [flowerPreview, setFlowerPreview] = useState<string | null>(null)
  const [isFlowerScanning, setIsFlowerScanning] = useState(false)
  const [flowerResult, setFlowerResult] = useState<FlowerSegmentationResult | null>(null)

  // Flower refinement state (Step 2 inside chili analysis)
  const [flowerRefineFile, setFlowerRefineFile] = useState<File | null>(null)
  const [flowerRefinePreview, setFlowerRefinePreview] = useState<string | null>(null)
  const [isRefining, setIsRefining] = useState(false)

  // Camera capture state
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const navigate = useNavigate()
  const { toast } = useToast()
  const { setCurrentAnalysis, addToHistory, updateHistoryItem, setAnalyzing } = useAnalysisStore()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
  })

  // Camera functions
  const openCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    setCameraError(null)
    try {
      // Stop any existing stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      setCameraStream(stream)
      setIsCameraOpen(true)
      setCameraFacing(facing)
      // Attach to video element after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch (err: any) {
      console.error('Camera access failed:', err)
      setCameraError(err.message || 'Could not access camera')
    }
  }

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop())
      setCameraStream(null)
    }
    setIsCameraOpen(false)
    setCameraError(null)
  }

  const toggleCameraFacing = () => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment'
    openCamera(newFacing)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const preview = URL.createObjectURL(blob)
      setFiles((prev) => [...prev, { file, preview, status: 'pending' as const, progress: 0 }])
      closeCamera()
    }, 'image/jpeg', 0.85)
  }

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop())
      }
    }
  }, [cameraStream])

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const analyzeFiles = async () => {
    if (files.length === 0) return
    setIsAnalyzing(true)
    setAnalyzing(true)

    // Track results locally to avoid stale closure when reading files state
    const completedResults: { result: Record<string, unknown>; preview: string }[] = []

    for (let i = 0; i < files.length; i++) {
      try {
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading', progress: 30 } : f))
        await new Promise((r) => setTimeout(r, 500))
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'analyzing', progress: 60 } : f))

        const result = await predictionsApi.analyzeImage(files[i].file)

        // Check if the image was classified as non-chili ("Others")
        if (result.is_chili === false) {
          setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'complete', progress: 100, result } : f))
          setIsAnalyzing(false)
          setAnalyzing(false)
          toast({
            variant: 'destructive',
            title: 'Not a chili pepper',
            description: result.message || 'The uploaded image does not appear to be a chili pepper.',
          })
          setSummary({
            variety: 'Others',
            confidence: result.confidence || 0,
            heatLevel: 'N/A',
            shu: 0,
            analysisId: '',
            imageUrl: files[i].preview,
            isChili: false,
            maturity: null,
          })
          setTimeout(() => {
            document.getElementById('analysis-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 150)
          return
        }

        const variety = result.variety || result.variety_classification?.predicted_variety || 'Unknown'
        const confidence = result.confidence || result.variety_classification?.confidence || 0
        const heatLevel = result.heat_level || result.heat_prediction?.heat_category || (variety === 'Siling Demonyo' ? 'Extra Hot' : variety === 'Siling Labuyo' ? 'Hot' : 'Medium')
        const shu = result.shu || result.heat_prediction?.predicted_shu || (variety === 'Siling Demonyo' ? 150000 : variety === 'Siling Labuyo' ? 80000 : 5000)
        const analysisId = result.analysis_id || `${Date.now()}-${i}`

        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'complete', progress: 100, result } : f))
        completedResults.push({ result, preview: files[i].preview })

        addToHistory({
          id: analysisId,
          imageUrl: files[i].preview,
          variety, confidence, heatLevel, shu,
          maturity: (result.maturity as Record<string, unknown>)?.maturity_stage as string || 'Mature',
          timestamp: new Date().toISOString(),
          recommendations: result.recommendations || {},
        })
      } catch (error) {
        console.error('Analysis failed:', error)
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'error', progress: 0 } : f))
        toast({ variant: 'destructive', title: 'Analysis failed', description: `Could not analyze ${files[i].file.name}` })
      }
    }

    setIsAnalyzing(false)
    setAnalyzing(false)

    // Use locally tracked results (not stale files state)
    if (completedResults.length >= 1) {
      const res = completedResults[0].result as Record<string, unknown>
      const preview = completedResults[0].preview
      const variety = (res.variety as string) || ((res.variety_classification as Record<string, string>)?.predicted_variety) || 'Unknown'
      const confidence = (res.confidence as number) || ((res.variety_classification as Record<string, number>)?.confidence) || 0
      const heatLevel = (res.heat_level as string) || ((res.heat_prediction as Record<string, string>)?.heat_category) || (variety === 'Siling Demonyo' ? 'Extra Hot' : variety === 'Siling Labuyo' ? 'Hot' : 'Medium')
      const shu = (res.shu as number) || ((res.heat_prediction as Record<string, number>)?.predicted_shu) || (variety === 'Siling Demonyo' ? 150000 : variety === 'Siling Labuyo' ? 80000 : 5000)
      const analysisId = (res.analysis_id as string) || `${Date.now()}`

      const maturityData = res.maturity as MaturityResult | undefined
      const adjustedShu = (res.adjusted_shu as number) || shu

      setCurrentAnalysis({
        id: analysisId,
        imageUrl: preview,
        variety, confidence, heatLevel, shu: adjustedShu,
        maturity: maturityData?.maturity_stage || 'Mature',
        timestamp: new Date().toISOString(),
        recommendations: (res.recommendations as Record<string, unknown>) || {},
      })

      // Show summary instead of auto-navigating
      setSummary({ variety, confidence, heatLevel, shu, adjustedShu, analysisId, imageUrl: preview, isChili: true, maturity: maturityData || null })

      // Scroll to summary after a brief delay to let it render
      setTimeout(() => {
        document.getElementById('analysis-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
    }
  }

  const runSegmentation = async () => {
    if (!files.length || !summary) return
    setIsSegmenting(true)
    try {
      const result = await predictionsApi.segmentImage(files[0].file, summary.analysisId || undefined)
      if (result.success === false) {
        toast({ variant: 'destructive', title: 'Segmentation unavailable', description: result.error || 'The segmentation model is not configured.' })
        return
      }
      const segResult: SegmentationResult = {
        total_detected: result.total_detected ?? 0,
        segments: result.segments ?? [],
        varieties_detected: result.varieties_detected ?? {},
        measurements: result.measurements ?? null,
        processing_time_ms: result.processing_time_ms ?? 0,
        model: result.model ?? 'unknown',
      }
      const varietyNames = Object.keys(segResult.varieties_detected).join(', ') || 'Unknown'
      setSummary((prev) => prev ? { ...prev, segmentation: segResult } : prev)
      toast({ title: 'Segmentation complete!', description: `Detected ${segResult.total_detected} pod(s): ${varietyNames}` })
    } catch (error) {
      console.error('Segmentation failed:', error)
      toast({ variant: 'destructive', title: 'Segmentation failed', description: 'Could not segment the image. Try another photo.' })
    } finally {
      setIsSegmenting(false)
    }
  }

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Analyze Your Chili Sample</h1>
        <p className="text-foreground-secondary">Upload images of chili pods to identify variety, predict heat levels, and measure dimensions</p>
      </div>

      {/* Analysis Summary Card — shown at the top after analysis */}
      <AnimatePresence>
        {summary && (
          <motion.div
            id="analysis-summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
          >
            <Card className={cn(
              "border-2 shadow-elevated overflow-hidden",
              summary.isChili === false ? "border-red-300" : "border-primary/30"
            )}>
              <div className={cn("p-5 text-white", summary.isChili === false ? "bg-red-700" : "bg-sidebar")}>
                <div className="flex items-center gap-2 mb-1">
                  {summary.isChili === false ? (
                    <>
                      <Ban className="h-5 w-5 text-red-200" />
                      <h3 className="font-bold font-display text-lg">Not a Chili Pepper</h3>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      <h3 className="font-bold font-display text-lg">Analysis Complete!</h3>
                    </>
                  )}
                </div>
                <p className="text-white/60 text-sm">
                  {summary.isChili === false
                    ? 'The uploaded image was not recognized as a chili pepper'
                    : "Here's a quick summary of your chili analysis"}
                </p>
              </div>
              <CardContent className="p-5">
                {/* ── Non-chili ("Others") result ── */}
                {summary.isChili === false ? (
                  <div className="flex flex-col items-center text-center py-4 space-y-4">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-surface shadow-card">
                      <img src={summary.imageUrl} alt="Uploaded image" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <p className="font-semibold text-foreground">This image is not a chili pepper</p>
                      </div>
                      <p className="text-sm text-foreground-muted max-w-md">
                        Our classifier identified this image as a non-chili object. Please upload a clear photo of a chili pepper (Siling Haba, Siling Labuyo, or Siling Demonyo) for analysis.
                      </p>
                      <p className="text-xs text-foreground-muted">
                        Classification confidence: {(summary.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button onClick={() => { setSummary(null); setFiles([]); setFlowerFile(null); setFlowerPreview(null); setFlowerResult(null); closeCamera() }} className="flex-1">
                        Try Another Image
                      </Button>
                    </div>
                  </div>
                ) : (
                <>{/* ── Normal chili result ── */}
                <div className="flex flex-col md:flex-row gap-5">
                  {/* Thumbnail */}
                  <div className="w-28 h-28 rounded-xl overflow-hidden bg-surface flex-shrink-0 shadow-card">
                    <img src={summary.imageUrl} alt={summary.variety} className="w-full h-full object-cover" />
                  </div>

                  {/* Stats Grid */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-primary/5 rounded-xl p-3 text-center">
                      <Flame className="h-5 w-5 text-primary mx-auto mb-1.5" />
                      <p className="text-[10px] text-foreground-muted mb-0.5">Variety</p>
                      <p className="font-bold text-sm text-foreground">{summary.variety}</p>
                    </div>
                    <div className="bg-secondary/5 rounded-xl p-3 text-center">
                      <Zap className="h-5 w-5 text-secondary mx-auto mb-1.5" />
                      <p className="text-[10px] text-foreground-muted mb-0.5">Confidence</p>
                      <p className="font-bold text-sm text-foreground">{(summary.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                      <Thermometer className="h-5 w-5 text-amber-600 mx-auto mb-1.5" />
                      <p className="text-[10px] text-foreground-muted mb-0.5">Heat Level</p>
                      <p className="font-bold text-sm text-foreground">{summary.heatLevel}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                      <Flame className="h-5 w-5 text-red-600 mx-auto mb-1.5" />
                      <p className="text-[10px] text-foreground-muted mb-0.5">Scoville (SHU)</p>
                      <p className="font-bold text-sm text-foreground">{summary.shu.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Maturity Classification Section */}
                {summary.maturity && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 pt-4 border-t border-border"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sprout className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold text-sm text-foreground">Maturity Assessment</h4>
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                        summary.maturity.maturity_stage === 'Ripe'
                          ? 'bg-red-100 text-red-700'
                          : summary.maturity.maturity_stage === 'Turning'
                            ? 'bg-amber-100 text-amber-700'
                            : summary.maturity.maturity_stage === 'Over-Ripe'
                              ? 'bg-purple-100 text-purple-700'
                              : summary.maturity.maturity_stage === 'Over-Mature'
                                ? 'bg-orange-100 text-orange-700'
                                : summary.maturity.maturity_stage === 'Dried/Spent'
                                  ? 'bg-gray-200 text-gray-700'
                                  : 'bg-green-100 text-green-700'
                      )}>{summary.maturity.maturity_stage}</span>
                      <span className="text-[10px] text-foreground-muted ml-auto">{(summary.maturity.confidence * 100).toFixed(1)}% confidence</span>
                    </div>

                    <p className="text-xs text-foreground-muted mb-3">{summary.maturity.description}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      <div className="bg-orange-50 rounded-xl p-3 text-center">
                        <Flame className="h-4 w-4 text-orange-600 mx-auto mb-1" />
                        <p className="text-[10px] text-foreground-muted">Adjusted SHU</p>
                        <p className="font-bold text-sm">{(summary.adjustedShu ?? summary.shu).toLocaleString()}</p>
                      </div>
                      <div className="bg-yellow-50 rounded-xl p-3 text-center">
                        <Thermometer className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
                        <p className="text-[10px] text-foreground-muted">Spice Estimate</p>
                        <p className="font-bold text-sm">{summary.maturity.spice_estimate}</p>
                      </div>
                      <div className="bg-teal-50 rounded-xl p-3 text-center">
                        <CalendarDays className="h-4 w-4 text-teal-600 mx-auto mb-1" />
                        <p className="text-[10px] text-foreground-muted">Days to Harvest</p>
                        <p className="font-bold text-sm">{summary.maturity.days_to_harvest === 0 ? 'Ready!' : `${summary.maturity.days_to_harvest} days`}</p>
                      </div>
                    </div>

                    {summary.maturity.growth_advice.length > 0 && (
                      <div className="bg-green-50/60 rounded-xl p-3">
                        <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                          <Sprout className="h-3.5 w-3.5" /> Growth Advice
                        </p>
                        <ul className="space-y-1">
                          {summary.maturity.growth_advice.map((tip, idx) => (
                            <li key={idx} className="text-xs text-green-700 flex items-start gap-1.5">
                              <span className="text-green-400 mt-0.5">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Segmentation Section */}
                <div className="mt-5 pt-4 border-t border-border">
                  {!summary.segmentation ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-blue-50/80 rounded-xl">
                      <div className="p-2.5 bg-blue-100 rounded-lg flex-shrink-0">
                        <ScanLine className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">Chili Pod Segmentation & Identification</p>
                        <p className="text-xs text-foreground-muted mt-0.5">Detect, classify, and measure all chili pods in the image — identifies Siling Haba, Labuyo, and Demonyo individually.</p>
                      </div>
                      <Button onClick={runSegmentation} disabled={isSegmenting} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-100 flex-shrink-0">
                        {isSegmenting ? (
                          <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Segmenting…</>
                        ) : (
                          <><Microscope className="mr-1.5 h-3.5 w-3.5" /> Run Segmentation</>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Microscope className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-sm text-foreground">Segmentation Results</h4>
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{summary.segmentation.model}</span>
                        </div>
                        <span className="text-[10px] text-foreground-muted">
                          {summary.segmentation.processing_time_ms.toFixed(0)} ms
                        </span>
                      </div>

                      {/* Overview stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                          <Layers className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                          <p className="text-[10px] text-foreground-muted">Total Detected</p>
                          <p className="font-bold text-sm">{summary.segmentation.total_detected} pod{summary.segmentation.total_detected !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3 text-center">
                          <Flame className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                          <p className="text-[10px] text-foreground-muted">Varieties Found</p>
                          <p className="font-bold text-sm">{Object.keys(summary.segmentation.varieties_detected || {}).length}</p>
                        </div>
                        {summary.segmentation.measurements && (
                          <>
                            <div className="bg-emerald-50 rounded-xl p-3 text-center">
                              <Ruler className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                              <p className="text-[10px] text-foreground-muted">Avg Length</p>
                              <p className="font-bold text-sm">{summary.segmentation.measurements.average.length_mm} mm</p>
                            </div>
                            <div className="bg-rose-50 rounded-xl p-3 text-center">
                              <Scale className="h-4 w-4 text-rose-600 mx-auto mb-1" />
                              <p className="text-[10px] text-foreground-muted">Total Weight</p>
                              <p className="font-bold text-sm">{summary.segmentation.measurements.total_estimated_weight_g} g</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Per-variety breakdown cards */}
                      {Object.entries(summary.segmentation.varieties_detected || {}).map(([varietyName, info]) => {
                        const varietyColor = varietyName === 'Siling Haba' ? 'green' : varietyName === 'Siling Labuyo' ? 'red' : 'orange'
                        const bgClass = varietyColor === 'green' ? 'bg-green-50 border-green-200' : varietyColor === 'red' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
                        const textClass = varietyColor === 'green' ? 'text-green-700' : varietyColor === 'red' ? 'text-red-700' : 'text-orange-700'
                        const badgeBg = varietyColor === 'green' ? 'bg-green-100 text-green-700' : varietyColor === 'red' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        const iconBg = varietyColor === 'green' ? 'bg-green-100' : varietyColor === 'red' ? 'bg-red-100' : 'bg-orange-100'

                        return (
                          <div key={varietyName} className={`rounded-xl border p-4 ${bgClass}`}>
                            {/* Variety header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-lg ${iconBg}`}>
                                  <Flame className={`h-4 w-4 ${textClass}`} />
                                </div>
                                <div>
                                  <h5 className={`font-bold text-sm ${textClass}`}>{varietyName}</h5>
                                  <p className="text-[11px] text-foreground-muted">{info.description || 'Philippine chili variety'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeBg}`}>
                                  {info.count} pod{info.count !== 1 ? 's' : ''}
                                </span>
                                <span className="text-[10px] text-foreground-muted">
                                  {(info.avg_confidence * 100).toFixed(1)}% avg
                                </span>
                              </div>
                            </div>

                            {/* Measurements grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                              <div className="bg-white/70 rounded-lg p-2 text-center">
                                <p className="text-[10px] text-foreground-muted">Avg Length</p>
                                <p className="font-bold text-xs">{info.avg_length_mm} mm</p>
                                {info.reference_length_mm && (
                                  <p className="text-[9px] text-foreground-muted">ref: {info.reference_length_mm} mm</p>
                                )}
                              </div>
                              <div className="bg-white/70 rounded-lg p-2 text-center">
                                <p className="text-[10px] text-foreground-muted">Avg Width</p>
                                <p className="font-bold text-xs">{info.avg_width_mm} mm</p>
                                {info.reference_width_mm && (
                                  <p className="text-[9px] text-foreground-muted">ref: {info.reference_width_mm} mm</p>
                                )}
                              </div>
                              <div className="bg-white/70 rounded-lg p-2 text-center">
                                <p className="text-[10px] text-foreground-muted">Avg Weight</p>
                                <p className="font-bold text-xs">{info.avg_weight_g} g</p>
                                {info.reference_weight_g && (
                                  <p className="text-[9px] text-foreground-muted">ref: {info.reference_weight_g} g</p>
                                )}
                              </div>
                              <div className="bg-white/70 rounded-lg p-2 text-center">
                                <p className="text-[10px] text-foreground-muted">Heat (SHU)</p>
                                <p className="font-bold text-xs">{info.shu_range || '—'}</p>
                                {info.heat_category && (
                                  <p className="text-[9px] text-foreground-muted">{info.heat_category}</p>
                                )}
                              </div>
                            </div>

                            {/* Individual pod details (if more than 1) */}
                            {info.count > 1 && (
                              <div className="rounded-lg border border-white/50 overflow-hidden bg-white/50">
                                <table className="w-full text-[11px]">
                                  <thead>
                                    <tr className="bg-white/80 text-foreground-muted">
                                      <th className="text-left py-1 px-2 font-medium">Pod</th>
                                      <th className="text-right py-1 px-2 font-medium">Confidence</th>
                                      <th className="text-right py-1 px-2 font-medium">Length</th>
                                      <th className="text-right py-1 px-2 font-medium">Width</th>
                                      <th className="text-right py-1 px-2 font-medium">Weight</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(summary.segmentation!.segments || [])
                                      .filter((s) => s.variety === varietyName)
                                      .map((seg) => (
                                        <tr key={seg.pod_number} className="border-t border-gray-100/50">
                                          <td className="py-1 px-2 font-medium">#{seg.pod_number}</td>
                                          <td className="py-1 px-2 text-right">{(seg.confidence * 100).toFixed(1)}%</td>
                                          <td className="py-1 px-2 text-right">{seg.measurement.length_mm} mm</td>
                                          <td className="py-1 px-2 text-right">{seg.measurement.width_mm} mm</td>
                                          <td className="py-1 px-2 text-right font-semibold">{seg.measurement.estimated_weight_g} g</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Scale calibration info */}
                      {summary.segmentation.measurements && (
                        <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                            summary.segmentation.measurements.scale_method === 'reference-calibrated'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {summary.segmentation.measurements.scale_method === 'reference-calibrated' ? '✓ Calibrated' : '⚠ Estimated'}
                          </span>
                          <p className="text-[11px] text-foreground-muted leading-relaxed">
                            {summary.segmentation.measurements.scale_note}
                            <span className="ml-1 text-foreground-muted/60">
                              ({summary.segmentation.measurements.scale_mm_per_px.toFixed(4)} mm/px)
                            </span>
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Step 2: Flower Enhancement */}
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-pink-100 text-pink-600 text-xs font-bold">2</div>
                    <h4 className="font-semibold text-sm">Enhance with Flower Scan</h4>
                    <span className="text-[10px] bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-medium">Optional</span>
                  </div>
                  <p className="text-xs text-foreground-muted mb-3">
                    Scan a flower from the same plant to refine the SHU prediction. Flower stress indicators act as a multiplier to strengthen accuracy.
                  </p>

                  {!summary.flowerRefinement ? (
                    <div className="space-y-3">
                      {/* Flower image upload area */}
                      <label className="relative flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors hover:border-pink-300 hover:bg-pink-50/30 border-gray-200 bg-gray-50/50">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setFlowerRefineFile(file)
                              setFlowerRefinePreview(URL.createObjectURL(file))
                            }
                          }}
                        />
                        {flowerRefinePreview ? (
                          <div className="relative w-full">
                            <img src={flowerRefinePreview} alt="Flower preview" className="w-full h-32 object-cover rounded-lg" />
                            <button
                              onClick={(e) => { e.preventDefault(); setFlowerRefineFile(null); setFlowerRefinePreview(null) }}
                              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Flower2 className="h-8 w-8 text-pink-400" />
                            <span className="text-xs text-foreground-muted font-medium">Upload a flower image from this plant</span>
                          </>
                        )}
                      </label>

                      {flowerRefineFile && (
                        <Button
                          onClick={async () => {
                            if (!flowerRefineFile || !summary.analysisId) return
                            setIsRefining(true)
                            try {
                              const result = await predictionsApi.refineWithFlower(summary.analysisId, flowerRefineFile)
                              if (result.success) {
                                const refinedShu = result.flower_adjusted_shu
                                const refinedHeat = result.heat_level
                                setSummary(prev => prev ? {
                                  ...prev,
                                  shu: refinedShu,
                                  adjustedShu: refinedShu,
                                  heatLevel: refinedHeat,
                                  flowerRefinement: {
                                    originalShu: result.original_shu,
                                    refinedShu: result.refined_shu,
                                    flowerAdjustedShu: refinedShu,
                                    shuMultiplier: result.shu_multiplier,
                                    flowerStress: {
                                      stress_level: result.flower_stress?.stress_class || 'unknown',
                                      stress_score: result.flower_stress?.stress_score || 0,
                                      description: result.flower_stress?.capsaicin_impact || 'No stress data',
                                    },
                                    capsaicin: {
                                      mg_per_g: result.capsaicin?.capsaicin_mg_per_g || 0,
                                      total_capsaicinoids_ppm: (result.capsaicin?.total_capsaicinoids_mg_per_g || 0) * 1000,
                                      pungency_category: refinedHeat || 'Unknown',
                                    },
                                    heatLevel: refinedHeat,
                                  }
                                } : prev)
                                // Sync refined data to store so Results/Library show updated values
                                if (summary.analysisId) {
                                  const storeUpdates = {
                                    shu: refinedShu,
                                    heatLevel: refinedHeat,
                                    flowerStress: result.flower_stress ? {
                                      stress_class: result.flower_stress.stress_class || '',
                                      stress_score: result.flower_stress.stress_score || 0,
                                      confidence: result.flower_stress.confidence || 0,
                                      capsaicin_impact: result.flower_stress.capsaicin_impact || '',
                                      shu_multiplier: result.shu_multiplier || 1,
                                    } : undefined,
                                    capsaicin: result.capsaicin ? {
                                      capsaicin_mg_per_g: result.capsaicin.capsaicin_mg_per_g || 0,
                                      dihydrocapsaicin_mg_per_g: result.capsaicin.dihydrocapsaicin_mg_per_g || 0,
                                      total_capsaicinoids_mg_per_g: result.capsaicin.total_capsaicinoids_mg_per_g || 0,
                                      conversion_method: result.capsaicin.conversion_method || '',
                                      note: result.capsaicin.note || '',
                                    } : undefined,
                                  }
                                  // Sync to zustand store — updates both analysisHistory and currentAnalysis
                                  updateHistoryItem(summary.analysisId, storeUpdates)
                                }
                                toast({ title: 'SHU Refined!', description: `Flower stress multiplier (${result.shu_multiplier.toFixed(2)}×) applied. SHU updated to ${refinedShu.toLocaleString()}.` })
                              } else {
                                toast({ title: 'Refinement Failed', description: result.error || 'Could not process the flower image.', variant: 'destructive' })
                              }
                            } catch {
                              toast({ title: 'Error', description: 'Failed to refine with flower scan.', variant: 'destructive' })
                            } finally {
                              setIsRefining(false)
                            }
                          }}
                          disabled={isRefining}
                          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                        >
                          {isRefining ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Flower...</>
                          ) : (
                            <><Flower2 className="mr-2 h-4 w-4" /> Scan Flower & Refine SHU</>
                          )}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      {/* Refinement results */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-700">Flower Enhancement Applied</span>
                        </div>
                        
                        {/* Before / After comparison */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center p-2 bg-white/70 rounded-lg">
                            <div className="text-[10px] text-foreground-muted uppercase tracking-wide">Original SHU</div>
                            <div className="text-base font-bold text-gray-500 line-through">{summary.flowerRefinement.originalShu.toLocaleString()}</div>
                          </div>
                          <div className="text-center p-2 bg-white/70 rounded-lg flex flex-col items-center justify-center">
                            <div className="text-[10px] text-foreground-muted uppercase tracking-wide">Multiplier</div>
                            <div className="text-base font-bold text-pink-600">{summary.flowerRefinement.shuMultiplier.toFixed(2)}×</div>
                          </div>
                          <div className="text-center p-2 bg-white/80 rounded-lg border border-pink-300">
                            <div className="text-[10px] text-foreground-muted uppercase tracking-wide">Refined SHU</div>
                            <div className="text-base font-bold text-red-600">{summary.flowerRefinement.flowerAdjustedShu.toLocaleString()}</div>
                          </div>
                        </div>

                        {/* Stress & Capsaicin info */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-white/60 rounded-lg">
                            <div className="text-[10px] text-foreground-muted">Flower Stress</div>
                            <div className="text-xs font-semibold capitalize">{(summary.flowerRefinement.flowerStress?.stress_level || 'unknown').replace(/_/g, ' ')}</div>
                            <div className="text-[10px] text-foreground-muted mt-0.5">{summary.flowerRefinement.flowerStress?.description || 'N/A'}</div>
                          </div>
                          <div className="p-2 bg-white/60 rounded-lg">
                            <div className="text-[10px] text-foreground-muted">Capsaicin</div>
                            <div className="text-xs font-semibold">{(summary.flowerRefinement.capsaicin?.mg_per_g || 0).toFixed(2)} mg/g</div>
                            <div className="text-[10px] text-foreground-muted mt-0.5">{summary.flowerRefinement.capsaicin?.pungency_category || 'Unknown'}</div>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-foreground-muted"
                        onClick={() => {
                          setSummary(prev => prev ? { ...prev, flowerRefinement: null, shu: prev.flowerRefinement?.originalShu ?? prev.shu } : prev)
                          setFlowerRefineFile(null)
                          setFlowerRefinePreview(null)
                        }}
                      >
                        Reset flower enhancement
                      </Button>
                    </motion.div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 mt-5 pt-4 border-t border-border">
                  <Button onClick={() => navigate(`/results/${summary.analysisId}`)} className="flex-1">
                    View Full Results <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => { setSummary(null); setFiles([]); setFlowerFile(null); setFlowerPreview(null); setFlowerResult(null); setFlowerRefineFile(null); setFlowerRefinePreview(null); closeCamera() }}>
                    Analyze Another
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/library')}>
                    Go to Library
                  </Button>
                </div>
                </>)}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Images</CardTitle>
              <CardDescription>Drag and drop images or click to browse. Supports JPG, PNG, WebP up to 10MB.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200",
                  isDragActive
                    ? "border-primary bg-primary-50 scale-[1.01]"
                    : "border-border hover:border-primary/50 hover:bg-primary-50/30"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  <div className={cn(
                    "p-4 rounded-2xl transition-all duration-200",
                    isDragActive ? "bg-primary shadow-button" : "bg-surface"
                  )}>
                    <UploadIcon className={cn("h-10 w-10", isDragActive ? "text-white" : "text-foreground-muted")} />
                  </div>
                  <div>
                    <p className={cn("text-lg font-semibold", isDragActive ? "text-primary" : "text-foreground")}>
                      {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
                    </p>
                    <p className="text-sm text-foreground-muted mt-1">
                      or <span className="text-primary font-medium">click to browse</span> your files
                    </p>
                  </div>
                </div>
              </div>

              {/* Camera Capture Section */}
              {!isCameraOpen ? (
                <div className="mt-3 flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => openCamera()} className="text-foreground-secondary">
                    <Camera className="h-4 w-4 mr-1.5" /> Use Camera
                  </Button>
                </div>
              ) : (
                <div className="mt-4 rounded-xl overflow-hidden bg-black relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-video object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {cameraError && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center">
                      <CameraOff className="h-10 w-10 text-red-400 mb-3" />
                      <p className="text-white text-sm font-medium mb-1">Camera Unavailable</p>
                      <p className="text-white/60 text-xs">{cameraError}</p>
                    </div>
                  )}

                  {/* Camera overlay controls */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex items-center justify-center gap-4">
                    <button
                      onClick={closeCamera}
                      className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                    <button
                      onClick={capturePhoto}
                      className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors flex items-center justify-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-white" />
                    </button>
                    <button
                      onClick={toggleCameraFacing}
                      className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <SwitchCamera className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-foreground-secondary text-sm">{files.length} image(s) selected</p>
                      <button onClick={() => setFiles([])} className="text-xs text-foreground-muted hover:text-danger transition-colors">Clear all</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {files.map((file, index) => (
                        <motion.div key={file.preview} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-surface shadow-card">
                            <img src={file.preview} alt={file.file.name} className="w-full h-full object-cover" />
                            {file.status !== 'pending' && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                {file.status === 'uploading' && (
                                  <div className="text-white text-center">
                                    <Loader2 className="h-7 w-7 animate-spin mx-auto" />
                                    <p className="text-xs mt-1.5">Uploading…</p>
                                  </div>
                                )}
                                {file.status === 'analyzing' && (
                                  <div className="text-white text-center">
                                    <div className="p-2 bg-chili rounded-full mx-auto w-fit animate-pulse"><Flame className="h-5 w-5" /></div>
                                    <p className="text-xs mt-1.5">Analyzing…</p>
                                  </div>
                                )}
                                {file.status === 'complete' && (
                                  <div className="text-white text-center">
                                    <div className="p-2 bg-secondary rounded-full mx-auto w-fit"><CheckCircle2 className="h-5 w-5" /></div>
                                    <p className="text-xs mt-1.5">Complete!</p>
                                  </div>
                                )}
                                {file.status === 'error' && (
                                  <div className="text-white text-center">
                                    <div className="p-2 bg-danger rounded-full mx-auto w-fit"><X className="h-5 w-5" /></div>
                                    <p className="text-xs mt-1.5">Failed</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {(file.status === 'uploading' || file.status === 'analyzing') && (
                              <div className="absolute bottom-0 left-0 right-0 p-1.5">
                                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                                  <div className="h-full bg-white transition-all duration-300" style={{ width: `${file.progress}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                          {file.status === 'pending' && (
                            <button onClick={() => removeFile(index)} className="absolute -top-1.5 -right-1.5 p-0.5 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips for Best Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: Sun, title: 'Good Lighting', desc: 'Use natural daylight for accurate color detection', color: 'bg-amber-100 text-amber-600' },
                { icon: Focus, title: 'Clear Focus', desc: 'Ensure the chili is in sharp focus', color: 'bg-primary-100 text-primary-700' },
                { icon: Ruler, title: 'Include Scale', desc: 'Add a coin for accurate size measurement', color: 'bg-red-100 text-red-600' },
              ].map((tip) => (
                <div key={tip.title} className="flex gap-3 items-start">
                  <div className={`p-2 rounded-lg ${tip.color} flex-shrink-0`}>
                    <tip.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{tip.title}</p>
                    <p className="text-xs text-foreground-muted">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Flower Scanner Card */}
          <Card className="sticky top-20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Flower2 className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <CardTitle>Flower Scanner</CardTitle>
                  <CardDescription>Upload a chili flower image for AI segmentation analysis</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Flower image upload */}
              {!flowerPreview ? (
                <label
                  htmlFor="flower-upload"
                  className="relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-pink-200 rounded-xl cursor-pointer hover:border-pink-400 hover:bg-pink-50/30 transition-all duration-200"
                >
                  <input
                    id="flower-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        setFlowerFile(f)
                        setFlowerPreview(URL.createObjectURL(f))
                        setFlowerResult(null)
                      }
                    }}
                  />
                  <div className="p-3 bg-pink-50 rounded-2xl">
                    <Camera className="h-8 w-8 text-pink-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-foreground">Upload flower image</p>
                    <p className="text-xs text-foreground-muted mt-1">JPG, PNG, or WebP — click to browse</p>
                  </div>
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-surface shadow-card">
                    <img src={flowerPreview} alt="Chili flower" className="w-full h-48 object-cover" />
                    <button
                      onClick={() => {
                        if (flowerPreview) URL.revokeObjectURL(flowerPreview)
                        setFlowerFile(null)
                        setFlowerPreview(null)
                        setFlowerResult(null)
                      }}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Scan button */}
                  {!flowerResult && (
                    <Button
                      onClick={async () => {
                        if (!flowerFile) return
                        setIsFlowerScanning(true)
                        try {
                          const result = await predictionsApi.segmentFlower(flowerFile, summary?.analysisId || undefined)
                          setFlowerResult(result)
                          if (result.success) {
                            // Update summary SHU if the flower scan adjusted it
                            if (result.adjusted_shu || result.shu) {
                              setSummary(prev => prev ? {
                                ...prev,
                                shu: result.adjusted_shu || result.shu || prev.shu,
                                adjustedShu: result.adjusted_shu || result.shu || prev.adjustedShu,
                              } : prev)
                            }
                            const shuMsg = result.adjusted_shu ? ` SHU updated to ${result.adjusted_shu.toLocaleString()}.` : ''
                            toast({
                              title: 'Flower scan complete!',
                              description: `Detected ${result.total_detected} region(s) in ${result.processing_time_ms?.toFixed(0) || '?'} ms.${shuMsg}`,
                            })
                          } else {
                            toast({
                              variant: 'destructive',
                              title: 'Scan failed',
                              description: result.error || 'Could not process the flower image',
                            })
                          }
                        } catch (error) {
                          console.error('Flower scan failed:', error)
                          toast({
                            variant: 'destructive',
                            title: 'Flower scan failed',
                            description: 'Could not analyze the flower. Try another image.',
                          })
                        } finally {
                          setIsFlowerScanning(false)
                        }
                      }}
                      disabled={isFlowerScanning}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                    >
                      {isFlowerScanning ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning Flower…</>
                      ) : (
                        <><ScanLine className="mr-2 h-4 w-4" /> Scan Flower</>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Flower Segmentation Results */}
              {flowerResult && flowerResult.success && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flower2 className="h-4 w-4 text-pink-600" />
                      <h4 className="font-semibold text-sm text-foreground">Scan Results</h4>
                    </div>
                    <span className="text-[10px] text-foreground-muted">
                      {flowerResult.processing_time_ms?.toFixed(0) || '?'} ms • {flowerResult.model}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-pink-50 rounded-xl p-3 text-center">
                      <Layers className="h-4 w-4 text-pink-600 mx-auto mb-1" />
                      <p className="text-[10px] text-foreground-muted">Detected</p>
                      <p className="font-bold text-sm">{flowerResult.total_detected} region{flowerResult.total_detected !== 1 ? 's' : ''}</p>
                    </div>
                    {flowerResult.measurements && (
                      <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <Scale className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                        <p className="text-[10px] text-foreground-muted">Scale</p>
                        <p className="font-bold text-sm">{flowerResult.measurements.scale_mm_per_px.toFixed(3)} mm/px</p>
                      </div>
                    )}
                  </div>

                  {/* Per-segment details */}
                  <div className="space-y-2">
                    {flowerResult.segments.map((seg, i) => {
                      const isFlower = seg.class.toLowerCase().includes('flower')
                      const bgColor = isFlower ? 'bg-pink-50 border-pink-200' : 'bg-green-50 border-green-200'
                      const textColor = isFlower ? 'text-pink-700' : 'text-green-700'
                      const iconColor = isFlower ? 'text-pink-500' : 'text-green-500'
                      return (
                        <div key={i} className={`rounded-lg border p-3 ${bgColor}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isFlower ? (
                                <Flower2 className={`h-3.5 w-3.5 ${iconColor}`} />
                              ) : (
                                <Flame className={`h-3.5 w-3.5 ${iconColor}`} />
                              )}
                              <span className={`font-semibold text-xs ${textColor} capitalize`}>{seg.class.replace(/_/g, ' ')}</span>
                            </div>
                            <span className="text-[10px] text-foreground-muted">{(seg.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div className="bg-white/70 rounded p-1.5 text-center">
                              <p className="text-foreground-muted text-[9px]">Length</p>
                              <p className="font-bold">{seg.measurement.length_mm} mm</p>
                            </div>
                            <div className="bg-white/70 rounded p-1.5 text-center">
                              <p className="text-foreground-muted text-[9px]">Width</p>
                              <p className="font-bold">{seg.measurement.width_mm} mm</p>
                            </div>
                            <div className="bg-white/70 rounded p-1.5 text-center">
                              <p className="text-foreground-muted text-[9px]">Area</p>
                              <p className="font-bold">{seg.measurement.area_mm2} mm²</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Flower Stress Classification */}
                  {flowerResult.flower_stress && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            flowerResult.flower_stress.stress_class === 'healthy' ? 'bg-green-500' : 'bg-amber-500'
                          }`} />
                          <span className="font-semibold text-sm text-violet-800 capitalize">
                            {flowerResult.flower_stress.stress_class.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-foreground-muted">
                          {(flowerResult.flower_stress.confidence * 100).toFixed(1)}% confidence
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div className="bg-white/70 rounded p-1.5 text-center">
                          <p className="text-foreground-muted text-[9px]">Stress Score</p>
                          <p className="font-bold">{(flowerResult.flower_stress.stress_score * 100).toFixed(0)}%</p>
                        </div>
                        <div className="bg-white/70 rounded p-1.5 text-center">
                          <p className="text-foreground-muted text-[9px]">SHU Multiplier</p>
                          <p className="font-bold">{flowerResult.flower_stress.shu_multiplier.toFixed(2)}×</p>
                        </div>
                        <div className="bg-white/70 rounded p-1.5 text-center">
                          <p className="text-foreground-muted text-[9px]">Capsaicin</p>
                          <p className="font-bold capitalize">{flowerResult.flower_stress.capsaicin_impact || '—'}</p>
                        </div>
                      </div>
                      {/* Stress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-foreground-muted">
                          <span>Healthy</span>
                          <span>Stressed</span>
                        </div>
                        <div className="h-2 bg-white/70 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              flowerResult.flower_stress.stress_score < 0.3 ? 'bg-green-500'
                              : flowerResult.flower_stress.stress_score < 0.6 ? 'bg-amber-500'
                              : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(5, flowerResult.flower_stress.stress_score * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scale info */}
                  {flowerResult.measurements && (
                    <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                        flowerResult.measurements.scale_method === 'reference-calibrated'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {flowerResult.measurements.scale_method === 'reference-calibrated' ? '✓ Calibrated' : '⚠ Estimated'}
                      </span>
                      <p className="text-[10px] text-foreground-muted leading-relaxed">{flowerResult.measurements.scale_note}</p>
                    </div>
                  )}

                  {/* Rescan button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setFlowerResult(null)
                    }}
                  >
                    <ScanLine className="mr-1.5 h-3.5 w-3.5" /> Scan Again
                  </Button>
                </motion.div>
              )}

              {flowerResult && !flowerResult.success && (
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-sm text-red-700 font-medium">Scan failed</p>
                  <p className="text-xs text-red-500 mt-1">{flowerResult.error || 'Unknown error'}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setFlowerResult(null)}>
                    Try Again
                  </Button>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-border pt-4 space-y-2.5">
                <Button
                  onClick={analyzeFiles}
                  disabled={isAnalyzing || files.length === 0 || files.every((f) => f.status === 'complete')}
                  className="w-full h-11 text-base font-semibold"
                >
                  {isAnalyzing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</>
                  ) : (
                    <><Flame className="mr-2 h-4 w-4" /> Analyze Sample</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setFiles([]); setFlowerFile(null); setFlowerPreview(null); setFlowerResult(null); closeCamera() }}
                  className="w-full h-10"
                  disabled={files.length === 0 && !flowerFile && !isCameraOpen}
                >
                  Cancel
                </Button>
              </div>

              {files.length === 0 && !flowerFile && (
                <div className="text-center py-6 text-foreground-muted">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 text-foreground-muted/50" />
                  <p className="text-sm">Upload an image to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
