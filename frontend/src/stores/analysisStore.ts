import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SegmentItem {
  class_name?: string
  class?: string
  variety?: string
  confidence: number
  bbox?: { x: number; y: number; width: number; height: number }
  area_pixels?: number
  center?: { x: number; y: number }
  measurement?: { length_mm: number; width_mm: number; area_mm2: number; estimated_weight_g?: number }
}

export interface MeasurementsSummary {
  scale_mm_per_px?: number
  scale_method?: string
  scale_note?: string
  per_pod?: Array<{ length_mm: number; width_mm: number; area_mm2: number; estimated_weight_g: number }>
  average?: { length_mm: number; width_mm: number; area_mm2: number; estimated_weight_g: number }
  total_pods?: number
  total_estimated_weight_g?: number
  total_area_pixels?: number
  image_width?: number
  image_height?: number
}

export interface VarietySummary {
  count: number
  avg_confidence: number
  avg_length_mm: number
  avg_width_mm: number
  avg_weight_g: number
  total_weight_g: number
  reference_length_mm?: number
  reference_width_mm?: number
  reference_weight_g?: number
  shu_range?: string
  heat_category?: string
  description?: string
  pod_indices?: number[]
}

export interface FlowerStressData {
  stress_class: string
  stress_score: number
  confidence: number
  capsaicin_impact: string
  shu_multiplier: number
  predictions?: Array<{ class: string; confidence: number }>
}

export interface CapsaicinData {
  capsaicin_mg_per_g: number
  dihydrocapsaicin_mg_per_g: number
  total_capsaicinoids_mg_per_g: number
  conversion_method: string
  note?: string
}

export interface MlDetails {
  model_used: string
  model_r2?: number
  model_mae?: number
  linear_regression_shu?: number
  random_forest_shu?: number
  prediction_interval?: { lower: number; upper: number }
  features_used?: Record<string, unknown>
}

export interface FlowerHeatEstimation {
  stress_adjusted_estimates: Record<string, {
    base_shu_range: [number, number]
    stress_adjusted_shu: [number, number]
    capsaicin_mg_per_g: number
  }>
  stress_score: number
  shu_multiplier: number
  interpretation: string
}

export interface AnalysisResult {
  id: string
  imageUrl: string
  variety: string
  confidence: number
  heatLevel: string
  shu: number
  maturity: string
  timestamp: string
  scanType?: string
  totalDetected?: number
  segments?: SegmentItem[]
  measurements?: MeasurementsSummary | null
  varietiesDetected?: Record<string, VarietySummary | number>
  flowerStress?: FlowerStressData | null
  capsaicin?: CapsaicinData | null
  mlDetails?: MlDetails | null
  flowerHeatEstimation?: FlowerHeatEstimation | null
  recommendations: Record<string, unknown>
}

interface AnalysisState {
  currentAnalysis: AnalysisResult | null
  analysisHistory: AnalysisResult[]
  isAnalyzing: boolean
  historyLoaded: boolean
  setCurrentAnalysis: (analysis: AnalysisResult | null) => void
  addToHistory: (analysis: AnalysisResult) => void
  updateHistoryItem: (id: string, updates: Partial<AnalysisResult>) => void
  setHistory: (items: AnalysisResult[]) => void
  clearHistory: () => void
  setAnalyzing: (isAnalyzing: boolean) => void
  setHistoryLoaded: (loaded: boolean) => void
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set) => ({
      currentAnalysis: null,
      analysisHistory: [],
      isAnalyzing: false,
      historyLoaded: false,
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      addToHistory: (analysis) =>
        set((state) => ({
          analysisHistory: [analysis, ...state.analysisHistory].slice(0, 100),
        })),
      updateHistoryItem: (id, updates) =>
        set((state) => ({
          analysisHistory: state.analysisHistory.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
          currentAnalysis:
            state.currentAnalysis?.id === id
              ? { ...state.currentAnalysis, ...updates }
              : state.currentAnalysis,
        })),
      setHistory: (items) => set({ analysisHistory: items, historyLoaded: true }),
      clearHistory: () => set({ analysisHistory: [], historyLoaded: false }),
      setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setHistoryLoaded: (loaded) => set({ historyLoaded: loaded }),
    }),
    {
      name: 'analysis-storage',
      version: 2,
      migrate: () => ({
        currentAnalysis: null,
        analysisHistory: [],
        isAnalyzing: false,
        historyLoaded: false,
      }),
    }
  )
)
