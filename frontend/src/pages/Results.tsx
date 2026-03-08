import { useParams, useNavigate } from 'react-router-dom'
import {
  Flame, Leaf, Ruler, Thermometer, ChefHat, AlertTriangle,
  Download, Share2, ArrowLeft, Save, RotateCcw, Scale, Flower2, Layers,
  Sprout, Sun, Droplets, Clock, Calendar, TrendingUp, ShieldCheck,
  CircleDot, Scissors, MapPin, Bug, Heart, Package, Beaker, GitBranch, Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalysisStore, type AnalysisResult } from '@/stores/analysisStore'
import { predictionsApi } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { useEffect, useState } from 'react'

/* ──────────────────────────────────────────────────────────────
   Static knowledge bases – used purely on the frontend to provide
   growing tips, timelines, and recommendations per chili variety.
   ────────────────────────────────────────────────────────────── */

interface VarietyProfile {
  scientificName: string
  origin: string
  family: string
  season: string
  daysToGerminate: string
  daysToHarvest: string
  optimalTemp: string
  optimalHumidity: string
  waterNeeds: string
  sunlight: string
  soil: string
  spacing: string
  phRange: string
  companionPlants: string[]
  growingTips: string[]
  harvestTips: string[]
  commonPests: string[]
  diseases: string[]
  storageInfo: string
  culinaryUses: string[]
  timeline: { week: string; stage: string; description: string; icon: string }[]
  maturityGuide: Record<string, { color: string; description: string; readiness: string }>
}

const VARIETY_PROFILES: Record<string, VarietyProfile> = {
  'Siling Haba': {
    scientificName: 'Capsicum annuum (long variety)',
    origin: 'Philippines / Southeast Asia',
    family: 'Solanaceae',
    season: 'Year-round in tropical climates, best planted Mar–May',
    daysToGerminate: '7–14 days',
    daysToHarvest: '70–90 days from transplant',
    optimalTemp: '25–32 °C',
    optimalHumidity: '60–70%',
    waterNeeds: 'Moderate — 2–3 times per week, avoid waterlogging',
    sunlight: 'Full sun (6–8 hrs)',
    soil: 'Well-drained loamy soil rich in organic matter',
    spacing: '40–50 cm between plants, 60 cm between rows',
    phRange: '6.0–6.8',
    companionPlants: ['Basil', 'Tomato', 'Carrots', 'Marigold'],
    growingTips: [
      'Pinch the first flower set to encourage bushy growth and higher yield.',
      'Use mulch to retain soil moisture and suppress weeds around the base.',
      'Apply balanced NPK fertilizer (14-14-14) every 2 weeks after transplanting.',
      'Stake plants once they reach 30 cm to prevent stem breakage from fruit weight.',
      'Rotate with legumes the following season to replenish nitrogen in the soil.',
    ],
    harvestTips: [
      'Harvest when pods are 7–12 cm long and firm; color ranges from green to red depending on desired maturity.',
      'Use scissors or a sharp knife — pulling pods can damage the branch.',
      'Pick regularly every 3–4 days to stimulate continuous fruiting.',
    ],
    commonPests: ['Aphids', 'Fruit flies', 'Thrips', 'Whiteflies'],
    diseases: ['Bacterial wilt', 'Anthracnose', 'Leaf curl virus'],
    storageInfo: 'Store at 7–10 °C for up to 2 weeks. Can be dried, pickled, or frozen for long-term storage.',
    culinaryUses: ['Sinigang', 'Pinakbet', 'Ginisang dishes', 'Fresh sawsawan dip', 'Adobong Sili'],
    timeline: [
      { week: 'Week 1–2', stage: 'Germination', description: 'Seeds sprout in warm, moist seedbed (28–32 °C). Keep soil damp but not soaked.', icon: 'sprout' },
      { week: 'Week 3–4', stage: 'Seedling', description: 'First true leaves appear. Begin hardening off under partial shade.', icon: 'leaf' },
      { week: 'Week 5–6', stage: 'Transplanting', description: 'Move to garden beds or pots. Water deeply after transplanting.', icon: 'mappin' },
      { week: 'Week 7–9', stage: 'Vegetative Growth', description: 'Rapid leaf and stem growth. Apply fertilizer bi-weekly. Pinch early flowers.', icon: 'trending' },
      { week: 'Week 10–11', stage: 'Flowering', description: 'White flowers emerge. Ensure pollinators can access plants. Reduce nitrogen.', icon: 'flower' },
      { week: 'Week 12–14', stage: 'Fruit Set', description: 'Small green pods form. Increase potassium to promote fruit development.', icon: 'circle' },
      { week: 'Week 14–18', stage: 'Harvest', description: 'Pods reach 7–12 cm. Harvest regularly to encourage continuous production.', icon: 'scissors' },
    ],
    maturityGuide: {
      'Immature': { color: 'bg-lime-400', description: 'Small, bright green pod — not yet ready for harvest', readiness: 'Wait 2–3 more weeks' },
      'Mature': { color: 'bg-green-600', description: 'Full-sized, deep green — peak crunch & mild heat', readiness: 'Ready to harvest' },
      'Ripe': { color: 'bg-red-500', description: 'Turned red — sweeter flavor, slightly softer', readiness: 'Harvest immediately' },
      'Overripe': { color: 'bg-red-800', description: 'Dark red, soft, wrinkled — past prime, use for drying', readiness: 'Use quickly or dry' },
    },
  },
  'Siling Labuyo': {
    scientificName: 'Capsicum frutescens',
    origin: 'Philippines (native wild chili)',
    family: 'Solanaceae',
    season: 'Year-round; thrives in warm wet season (Jun–Nov)',
    daysToGerminate: '10–21 days',
    daysToHarvest: '80–100 days from transplant',
    optimalTemp: '27–35 °C',
    optimalHumidity: '65–80%',
    waterNeeds: 'Low to moderate — drought-tolerant once established',
    sunlight: 'Full sun (6–8 hrs)',
    soil: 'Well-drained sandy loam; tolerates poor soil',
    spacing: '30–40 cm between plants',
    phRange: '5.5–7.0',
    companionPlants: ['Basil', 'Onion', 'Garlic', 'Marigold'],
    growingTips: [
      'Soak seeds in warm water (30 °C) for 12 hours before sowing to improve germination rate.',
      'Labuyo is highly resilient — minimal fertilizer is needed. Over-fertilizing reduces capsaicin.',
      'Avoid overwatering; slightly stressed plants produce hotter peppers.',
      'This variety self-pollinates well, but gentle shaking of branches improves fruit set.',
      'Prune lower branches to improve air circulation and reduce fungal risk.',
    ],
    harvestTips: [
      'Harvest when pods are 2–3 cm and have turned fully red for maximum heat.',
      'Green labuyo is edible but has about 60% of the heat of a ripe red pod.',
      'The tiny pods bruise easily — use scissors and handle gently.',
    ],
    commonPests: ['Aphids', 'Spider mites', 'Pepper weevils'],
    diseases: ['Anthracnose', 'Cercospora leaf spot', 'Root rot (from overwatering)'],
    storageInfo: 'Air-dry in the sun for 2–3 days or dehydrate at 60 °C. Dried labuyo keeps for 6+ months.',
    culinaryUses: ['Labuyo vinegar dip', 'Bicol Express', 'Chili oil infusion', 'Hot sauce', 'Sinigang'],
    timeline: [
      { week: 'Week 1–3', stage: 'Germination', description: 'Slow to germinate — keep tray warm and covered. Seeds are tiny.', icon: 'sprout' },
      { week: 'Week 4–5', stage: 'Seedling', description: 'Tiny seedlings with narrow leaves. Handle carefully during transplanting.', icon: 'leaf' },
      { week: 'Week 6–7', stage: 'Transplanting', description: 'Move to permanent location. Water deeply once, then reduce.', icon: 'mappin' },
      { week: 'Week 8–11', stage: 'Vegetative Growth', description: 'Bushy growth habit. Very little care needed.', icon: 'trending' },
      { week: 'Week 12–13', stage: 'Flowering', description: 'Small white flowers appear in clusters. Self-pollinating.', icon: 'flower' },
      { week: 'Week 14–15', stage: 'Fruit Set', description: 'Tiny green pods pointing upward. Dozens per plant.', icon: 'circle' },
      { week: 'Week 16–20', stage: 'Harvest', description: 'Pods turn red when ripe. Harvest every 4–5 days.', icon: 'scissors' },
    ],
    maturityGuide: {
      'Immature': { color: 'bg-lime-400', description: 'Tiny green pod — under-developed heat', readiness: 'Wait 3–4 more weeks' },
      'Mature': { color: 'bg-green-600', description: 'Full-grown green pod — moderate heat, crunchy', readiness: 'Edible but not peak heat' },
      'Ripe': { color: 'bg-red-500', description: 'Bright red — maximum capsaicin & flavor', readiness: 'Ideal harvest time' },
      'Overripe': { color: 'bg-red-900', description: 'Dark red / wrinkled — still very hot, drying recommended', readiness: 'Dry immediately' },
    },
  },
  'Siling Demonyo': {
    scientificName: 'Capsicum chinense / C. frutescens hybrid',
    origin: 'Philippines (hybridized variety)',
    family: 'Solanaceae',
    season: 'Best planted May–Jul during warm wet season',
    daysToGerminate: '14–28 days',
    daysToHarvest: '90–120 days from transplant',
    optimalTemp: '28–35 °C',
    optimalHumidity: '70–80%',
    waterNeeds: 'Moderate — consistent watering, never waterlogged',
    sunlight: 'Full sun (8+ hrs)',
    soil: 'Rich, well-drained loam with compost',
    spacing: '45–60 cm between plants',
    phRange: '6.0–6.8',
    companionPlants: ['Basil', 'Oregano', 'Carrots', 'Eggplant'],
    growingTips: [
      'Use a heat mat for germination — this variety requires consistently warm soil (30 °C+).',
      'Feed with phosphorus-heavy fertilizer during flowering to increase pod count.',
      'Mild water stress (let soil dry slightly between watering) increases capsaicin production.',
      'Protect from strong winds; the heavy pods can snap thin branches.',
      'Companion-plant with basil to repel aphids and improve pollinator visits.',
    ],
    harvestTips: [
      'Harvest when fully colored (red/orange). Green pods are less hot and lack the fruity aroma.',
      'ALWAYS wear gloves — oil from this chili can cause skin burns.',
      'Cut (do not pull) the pods with 1 cm of stem to prevent plant damage.',
    ],
    commonPests: ['Broad mites', 'Aphids', 'Pepper maggots'],
    diseases: ['Bacterial spot', 'Phytophthora blight', 'Blossom end rot'],
    storageInfo: 'Refrigerate at 7 °C for up to 1 week. Freeze or make into hot sauce for long-term storage.',
    culinaryUses: ['Extreme hot sauces', 'Specialty chili oil', 'Small-amount flavoring', 'Chili flakes'],
    timeline: [
      { week: 'Week 1–4', stage: 'Germination', description: 'Very slow germination. Use heat mat and humidity dome. Patience is key.', icon: 'sprout' },
      { week: 'Week 5–6', stage: 'Seedling', description: 'Wrinkled true leaves typical of chinense types. Grow under strong light.', icon: 'leaf' },
      { week: 'Week 7–8', stage: 'Transplanting', description: 'Transplant only when night temps are above 18 °C.', icon: 'mappin' },
      { week: 'Week 9–13', stage: 'Vegetative Growth', description: 'Slower growth than annuum types. Apply high-nitrogen feed early.', icon: 'trending' },
      { week: 'Week 14–16', stage: 'Flowering', description: 'Multiple flowers per node. May drop flowers if temp exceeds 38 °C.', icon: 'flower' },
      { week: 'Week 17–19', stage: 'Fruit Set', description: 'Bumpy, wrinkled pods form. Increase potassium. Keep watering consistent.', icon: 'circle' },
      { week: 'Week 20–24', stage: 'Harvest', description: 'Pods ripen to red/orange. Extremely hot — handle with gloves.', icon: 'scissors' },
    ],
    maturityGuide: {
      'Immature': { color: 'bg-lime-400', description: 'Small, wrinkled green pod — developing heat compounds', readiness: 'Wait 4–5 weeks' },
      'Mature': { color: 'bg-green-600', description: 'Full-sized green pod — already very hot', readiness: 'Edible but not peak flavor' },
      'Ripe': { color: 'bg-orange-500', description: 'Orange to red with fruity aroma — peak heat & flavor', readiness: 'Ideal harvest time' },
      'Overripe': { color: 'bg-red-900', description: 'Deep red, soft — still extremely hot', readiness: 'Use or dry immediately' },
    },
  },
}

/* Flower care knowledge */
interface FlowerCareProfile {
  tips: string[]
  whatToWatch: string[]
  stressRecovery: string[]
  idealConditions: { label: string; value: string; icon: string }[]
}

const FLOWER_CARE: FlowerCareProfile = {
  tips: [
    'Ensure chili flowers receive at least 6 hours of direct sunlight daily for proper pollination.',
    'Gently shake flowering branches to aid self-pollination; this can increase fruit set by 30%.',
    'Avoid high-nitrogen fertilizer once buds appear — switch to phosphorus/potassium to promote flowers.',
    'Maintain consistent soil moisture during flowering; drought stress causes bud and flower drop.',
    'Remove any flowers that form in the first 3–4 weeks after transplanting to strengthen the plant.',
  ],
  whatToWatch: [
    'Flowers falling off (blossom drop) — often caused by temperatures above 35 °C or below 15 °C.',
    'Discolored petals or deformed flowers — may indicate thrips or nutrient deficiency.',
    'No fruit forming despite many flowers — could be poor pollination; try hand-pollinating.',
    'Flowers appearing only on one side — the shaded side needs more light exposure.',
  ],
  stressRecovery: [
    'Move stressed plants to a partially shaded area for 2–3 days, then gradually reintroduce full sun.',
    'Apply a foliar spray of diluted seaweed extract (1:200) to help flowers recover from heat stress.',
    'Water deeply at the soil level (not overhead) early in the morning to reduce heat stress on flowers.',
    'Remove severely damaged flowers to redirect the plant\'s energy to healthier blooms.',
  ],
  idealConditions: [
    { label: 'Temperature', value: '21–29 °C', icon: 'thermometer' },
    { label: 'Humidity', value: '50–70%', icon: 'droplets' },
    { label: 'Sunlight', value: '6–8 hrs/day', icon: 'sun' },
    { label: 'Water', value: 'Even moisture', icon: 'droplets' },
  ],
}

const DEFAULT_PROFILE = VARIETY_PROFILES['Siling Labuyo']

/* Heat-based product recommendations */
interface ProductRec {
  name: string
  description: string
  heatMatch: string
}

const HEAT_INDEX_PRODUCTS: Record<string, ProductRec[]> = {
  'Mild': [
    { name: 'Pickled Peppers', description: 'Mild chili vinegar preserve — great as side dish or condiment', heatMatch: 'Ideal for Siling Haba' },
    { name: 'Chili Flakes', description: 'Dried and flaked for everyday seasoning with gentle warmth', heatMatch: 'Low-heat sprinkling' },
    { name: 'Sweet Chili Sauce', description: 'Blended with sugar and vinegar for a sweet-spicy dip', heatMatch: 'Beginner-friendly' },
    { name: 'Stuffed Peppers', description: 'Filled with meat, cheese, or rice — low-heat comfort food', heatMatch: 'Family-safe recipe' },
    { name: 'Chili Jam', description: 'Slow-cooked sweet preserve, perfect with crackers and cheese', heatMatch: 'Artisanal product' },
  ],
  'Medium': [
    { name: 'Chili Oil', description: 'Infused cooking oil with moderate kick for stir-fries', heatMatch: 'Versatile kitchen staple' },
    { name: 'Spiced Vinegar (Sukang Maanghang)', description: 'Traditional Filipino dipping sauce with chili and garlic', heatMatch: 'Classic sawsawan' },
    { name: 'Chili Paste', description: 'Thick paste for curry bases and marinades', heatMatch: 'Cooking essential' },
    { name: 'Dried Chili Pods', description: 'Sun-dried for long-term storage and rehydration', heatMatch: 'Shelf-stable product' },
    { name: 'Chili Salt', description: 'Ground chili mixed with sea salt for rimming or seasoning', heatMatch: 'Gourmet seasoning' },
  ],
  'Hot': [
    { name: 'Hot Sauce', description: 'Fermented or vinegar-based sauce for bold heat lovers', heatMatch: 'Siling Labuyo signature' },
    { name: 'Chili-Infused Vinegar', description: 'Labuyo steeped in cane vinegar — a Filipino staple', heatMatch: 'Classic Pinoy condiment' },
    { name: 'Spicy Adobo Flakes', description: 'Crispy garlic-chili topping for rice and ulam', heatMatch: 'Trending product' },
    { name: 'Capsaicin Extract', description: 'Concentrated heat extract for commercial food production', heatMatch: 'Industrial ingredient' },
    { name: 'Chili Powder Blend', description: 'Finely ground hot chili for spice mixes and rubs', heatMatch: 'BBQ and grilling' },
  ],
  'Extra Hot': [
    { name: 'Extreme Hot Sauce', description: 'Limited-batch ultra-hot sauce for seasoned spice enthusiasts', heatMatch: 'Siling Demonyo special' },
    { name: 'Capsaicin Supplements', description: 'Pharmaceutical-grade capsaicin in capsule form for metabolism boost', heatMatch: 'Health supplement' },
    { name: 'Pain Relief Patches', description: 'Topical capsaicin patches for muscle and joint pain', heatMatch: 'Medicinal product' },
    { name: 'Pepper Spray Compound', description: 'Industrial self-defense formulation base ingredient', heatMatch: 'Security product' },
    { name: 'Specialty Chili Chocolate', description: 'Dark chocolate infused with extreme chili — gourmet pairing', heatMatch: 'Artisanal confection' },
  ],
}

/* ────────────────────────── Component ────────────────────────── */

export default function Results() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentAnalysis, analysisHistory, setCurrentAnalysis } = useAnalysisStore()
  const [loading, setLoading] = useState(false)

  const storeAnalysis = currentAnalysis?.id === id ? currentAnalysis : analysisHistory.find((a) => a.id === id)
  const [fetchedAnalysis, setFetchedAnalysis] = useState<AnalysisResult | null>(null)

  useEffect(() => {
    if (!id) return
    if (!storeAnalysis) setLoading(true)
    predictionsApi.getHistoryDetail(id)
      .then((data: Record<string, unknown>) => {
        const mapped: AnalysisResult = {
          id: (data.analysis_id as string) || id,
          imageUrl: (data.thumbnail as string) || '',
          variety: (data.variety as string) || 'Unknown',
          confidence: (data.confidence as number) || 0,
          heatLevel: (data.heat_level as string) || 'Medium',
          shu: (data.shu as number) || 0,
          maturity: (data.maturity as string) || 'Mature',
          timestamp: (data.created_at as string) || new Date().toISOString(),
          scanType: (data.scan_type as string) || 'classification',
          totalDetected: (data.total_detected as number) || 0,
          segments: (data.segments as AnalysisResult['segments']) || undefined,
          measurements: (data.measurements as AnalysisResult['measurements']) || undefined,
          varietiesDetected: (data.varieties_detected as AnalysisResult['varietiesDetected']) || undefined,
          flowerStress: (data.flower_stress as AnalysisResult['flowerStress']) || undefined,
          capsaicin: (data.capsaicin as AnalysisResult['capsaicin']) || undefined,
          mlDetails: (data.ml_details as AnalysisResult['mlDetails']) || undefined,
          flowerHeatEstimation: (data.flower_heat_estimation as AnalysisResult['flowerHeatEstimation']) || undefined,
          recommendations: {},
        }
        setFetchedAnalysis(mapped)
        setCurrentAnalysis(mapped)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const analysis = fetchedAnalysis || storeAnalysis

  /* ── Loading / Not-found states ── */
  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-secondary">Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-surface flex items-center justify-center">
            <Flame className="h-10 w-10 text-foreground-muted" />
          </div>
          <h2 className="text-xl font-bold font-display text-foreground mb-2">Analysis not found</h2>
          <p className="text-foreground-secondary mb-5">The analysis you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Button onClick={() => navigate('/upload')}>Start New Analysis</Button>
        </div>
      </div>
    )
  }

  /* ── Branch on scan type ── */
  if (analysis.scanType === 'flower_segmentation') {
    return <FlowerResultsLayout analysis={analysis} navigate={navigate} />
  }

  return <ChiliResultsLayout analysis={analysis} navigate={navigate} />
}

/* ═══════════════════════════════════════════════════════════════
   FLOWER RESULTS LAYOUT
   ═══════════════════════════════════════════════════════════════ */

function FlowerResultsLayout({ analysis, navigate }: { analysis: AnalysisResult; navigate: ReturnType<typeof useNavigate> }) {
  const stress = analysis.flowerStress
  const segments = analysis.segments ?? []
  const measurements = analysis.measurements

  const totalDetected = analysis.totalDetected || segments.length
  const partTypes = new Set(segments.map(s => (s.class_name || s.class || 'region'))).size
  const avgConf = segments.length ? segments.reduce((a, s) => a + (s.confidence || 0), 0) / segments.length : 0

  const stressLevel = stress
    ? stress.stress_score < 0.3 ? 'Healthy' : stress.stress_score < 0.6 ? 'Moderate Stress' : 'High Stress'
    : null

  const stressColor = stress
    ? stress.stress_score < 0.3 ? 'text-green-700 bg-green-100' : stress.stress_score < 0.6 ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100'
    : ''

  const stressBarColor = stress
    ? stress.stress_score < 0.3 ? 'bg-green-500' : stress.stress_score < 0.6 ? 'bg-amber-500' : 'bg-red-500'
    : ''

  return (
    <div className="page-container space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="page-title !mb-0 flex items-center gap-2"><Flower2 className="h-5 w-5 text-pink-600" /> Flower Analysis</h1>
            <p className="text-xs text-foreground-muted">Sample #{analysis.id?.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon"><Share2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* ── Hero: Image + Main Stats ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-pink-200 bg-gradient-to-br from-pink-50 via-white to-violet-50">
          <div className="grid md:grid-cols-2">
            {/* Image */}
            <div className="aspect-square bg-surface relative">
              <img src={analysis.imageUrl} alt="Analyzed flower" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                <Flower2 className="h-3 w-3" /> Flower Scan
              </div>
            </div>

            {/* Stats panel */}
            <div className="p-6 sm:p-8 flex flex-col justify-center space-y-5">
              {/* Health badge */}
              {stress && (
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stressColor}`}>
                    <Heart className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-foreground">{stressLevel}</p>
                    <p className="text-xs text-foreground-muted">{(stress.confidence * 100).toFixed(1)}% confidence</p>
                  </div>
                </div>
              )}

              {/* Key metrics grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 rounded-xl p-3 text-center border border-pink-100">
                  <Layers className="h-4 w-4 text-pink-600 mx-auto mb-1" />
                  <p className="text-[10px] text-foreground-muted">Total Detected</p>
                  <p className="font-bold text-lg">{totalDetected}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 text-center border border-violet-100">
                  <CircleDot className="h-4 w-4 text-violet-600 mx-auto mb-1" />
                  <p className="text-[10px] text-foreground-muted">Part Types</p>
                  <p className="font-bold text-lg">{partTypes}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 text-center border border-blue-100">
                  <TrendingUp className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-[10px] text-foreground-muted">Avg Confidence</p>
                  <p className="font-bold text-lg">{(avgConf * 100).toFixed(0)}%</p>
                </div>
                {stress && (
                  <div className="bg-white/80 rounded-xl p-3 text-center border border-amber-100">
                    <Flame className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                    <p className="text-[10px] text-foreground-muted">SHU Multiplier</p>
                    <p className="font-bold text-lg">{stress.shu_multiplier.toFixed(2)}×</p>
                  </div>
                )}
              </div>

              {/* Scan timestamp */}
              <div className="flex items-center gap-2 text-xs text-foreground-muted">
                <Clock className="h-3.5 w-3.5" />
                <span>Scanned {new Date(analysis.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Estimated Current Growth Stage ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-purple-50 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Flower2 className="h-7 w-7 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-indigo-500 uppercase tracking-wide mb-0.5">Estimated Current Growth Stage</p>
                <p className="text-xl font-bold font-display text-foreground">Flowering Stage</p>
                <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                  Your chili plant is currently in the <span className="font-semibold text-indigo-600">flowering stage</span>. 
                  Flowers have been detected, indicating the plant has passed vegetative growth and is actively producing blooms. 
                  {stress && stress.stress_score < 0.3 && 'The flowers appear healthy — expect fruit set within 1–2 weeks if pollination is successful.'}
                  {stress && stress.stress_score >= 0.3 && stress.stress_score < 0.6 && 'Some stress has been detected — address conditions promptly to prevent blossom drop.'}
                  {stress && stress.stress_score >= 0.6 && 'Significant stress detected — flowers may drop if conditions are not improved quickly.'}
                  {!stress && 'Ensure adequate pollination and consistent watering for successful fruit set.'}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                    <Clock className="h-3 w-3" />
                    <span>Approx. Week 10–13 of growth cycle</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full">CURRENT STAGE</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Stress Dashboard ── */}
      {stress && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-violet-200 bg-violet-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-4 w-4 text-violet-600" /> Stress Analysis Dashboard
              </CardTitle>
              <CardDescription className="text-xs">Automated health assessment based on flower analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-foreground-muted font-medium">
                  <span>Healthy</span>
                  <span>Moderate Stress</span>
                  <span>High Stress</span>
                </div>
                <div className="h-4 bg-white/70 rounded-full overflow-hidden shadow-inner relative">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${stressBarColor}`}
                    style={{ width: `${Math.max(5, stress.stress_score * 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm">
                    {(stress.stress_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-foreground-muted mb-0.5">Stress Class</p>
                  <p className="font-bold text-sm capitalize">{stress.stress_class.replace(/_/g, ' ')}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-foreground-muted mb-0.5">Stress Score</p>
                  <p className="font-bold text-sm">{(stress.stress_score * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-foreground-muted mb-0.5">Capsaicin Impact</p>
                  <p className="font-bold text-sm capitalize">{stress.capsaicin_impact || '—'}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-foreground-muted mb-0.5">SHU Multiplier</p>
                  <p className="font-bold text-sm">{stress.shu_multiplier.toFixed(2)}×</p>
                </div>
              </div>

              {/* Class probabilities */}
              {stress.predictions && stress.predictions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-violet-100">
                  <p className="text-[10px] text-foreground-muted font-medium uppercase tracking-wide">Class Probabilities</p>
                  {stress.predictions.map((pred) => (
                    <div key={pred.class} className="flex items-center gap-2">
                      <span className="text-xs text-foreground-secondary w-28 capitalize">{pred.class.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-2.5 bg-white/70 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          pred.class === 'healthy' ? 'bg-green-500' : 'bg-amber-500'
                        }`} style={{ width: `${pred.confidence * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-12 text-right">{(pred.confidence * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Segmentation Breakdown ── */}
      {segments.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
          <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-pink-600" /> Detected Flower Parts
          </h3>

          {(() => {
            const groups: Record<string, typeof segments> = {}
            for (const seg of segments) {
              const name = (seg.class_name || seg.class || 'region').replace(/_/g, ' ')
              if (!groups[name]) groups[name] = []
              groups[name].push(seg)
            }
            return Object.entries(groups).map(([name, segs]) => {
              const isFlower = name.toLowerCase().includes('flower')
              const bgClass = isFlower ? 'bg-pink-50 border-pink-200' : 'bg-green-50 border-green-200'
              const textClass = isFlower ? 'text-pink-700' : 'text-green-700'
              const iconBg = isFlower ? 'bg-pink-100' : 'bg-green-100'
              const avgC = segs.reduce((a, s) => a + (s.confidence || 0), 0) / segs.length

              const segsWithM = segs.filter(s => s.measurement)
              const avgLen = segsWithM.length ? segsWithM.reduce((a, s) => a + (s.measurement?.length_mm || 0), 0) / segsWithM.length : null
              const avgWid = segsWithM.length ? segsWithM.reduce((a, s) => a + (s.measurement?.width_mm || 0), 0) / segsWithM.length : null
              const avgArea = segsWithM.length ? segsWithM.reduce((a, s) => a + (s.measurement?.area_mm2 || 0), 0) / segsWithM.length : null

              return (
                <Card key={name} className={`border ${bgClass}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${iconBg}`}>
                          {isFlower ? <Flower2 className={`h-4 w-4 ${textClass}`} /> : <Leaf className={`h-4 w-4 ${textClass}`} />}
                        </div>
                        <div>
                          <h5 className={`font-bold text-sm capitalize ${textClass}`}>{name}</h5>
                          <p className="text-[11px] text-foreground-muted">Flower segment type</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isFlower ? 'bg-pink-100 text-pink-700' : 'bg-green-100 text-green-700'}`}>
                          {segs.length} part{segs.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-foreground-muted">{(avgC * 100).toFixed(1)}% avg</span>
                      </div>
                    </div>

                    {segsWithM.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {avgLen != null && (
                          <div className="bg-white/70 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-foreground-muted">Avg Length</p>
                            <p className="font-bold text-xs">{avgLen.toFixed(1)} mm</p>
                          </div>
                        )}
                        {avgWid != null && (
                          <div className="bg-white/70 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-foreground-muted">Avg Width</p>
                            <p className="font-bold text-xs">{avgWid.toFixed(1)} mm</p>
                          </div>
                        )}
                        {avgArea != null && (
                          <div className="bg-white/70 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-foreground-muted">Avg Area</p>
                            <p className="font-bold text-xs">{avgArea.toFixed(0)} mm²</p>
                          </div>
                        )}
                      </div>
                    )}

                    {segs.length > 1 && segsWithM.length > 0 && (
                      <div className="rounded-lg border border-white/50 overflow-hidden bg-white/50">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="bg-white/80 text-foreground-muted">
                              <th className="text-left py-1 px-2 font-medium">Part</th>
                              <th className="text-right py-1 px-2 font-medium">Confidence</th>
                              <th className="text-right py-1 px-2 font-medium">Length</th>
                              <th className="text-right py-1 px-2 font-medium">Width</th>
                              <th className="text-right py-1 px-2 font-medium">Area</th>
                            </tr>
                          </thead>
                          <tbody>
                            {segs.map((seg, idx) => (
                              <tr key={idx} className="border-t border-gray-100/50">
                                <td className="py-1 px-2 font-medium">#{idx + 1}</td>
                                <td className="py-1 px-2 text-right">{((seg.confidence || 0) * 100).toFixed(1)}%</td>
                                <td className="py-1 px-2 text-right">{seg.measurement?.length_mm?.toFixed(1) ?? '—'} mm</td>
                                <td className="py-1 px-2 text-right">{seg.measurement?.width_mm?.toFixed(1) ?? '—'} mm</td>
                                <td className="py-1 px-2 text-right">{seg.measurement?.area_mm2?.toFixed(0) ?? '—'} mm²</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          })()}

          {/* Scale info */}
          {measurements && typeof measurements.scale_mm_per_px === 'number' && (
            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                measurements.scale_method === 'reference-calibrated'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {measurements.scale_method === 'reference-calibrated' ? '✓ Calibrated' : '⚠ Estimated'}
              </span>
              <p className="text-[11px] text-foreground-muted leading-relaxed">
                {measurements.scale_note || 'Scale calibration applied to measurements.'}
                <span className="ml-1 text-foreground-muted/60">({measurements.scale_mm_per_px.toFixed(4)} mm/px)</span>
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Flower Care & Ideal Conditions ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Ideal Conditions */}
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sun className="h-4 w-4 text-emerald-600" /> Ideal Flowering Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {FLOWER_CARE.idealConditions.map((cond) => (
                  <div key={cond.label} className="bg-white/70 rounded-lg p-3 text-center">
                    {cond.icon === 'thermometer' && <Thermometer className="h-4 w-4 text-emerald-600 mx-auto mb-1" />}
                    {cond.icon === 'droplets' && <Droplets className="h-4 w-4 text-emerald-600 mx-auto mb-1" />}
                    {cond.icon === 'sun' && <Sun className="h-4 w-4 text-emerald-600 mx-auto mb-1" />}
                    <p className="text-[10px] text-foreground-muted">{cond.label}</p>
                    <p className="font-bold text-xs">{cond.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* What to Watch */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> What to Watch For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {FLOWER_CARE.whatToWatch.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 p-2 rounded-lg bg-white/60 text-xs text-foreground-secondary leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Flowering Tips & Stress Recovery */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sprout className="h-4 w-4 text-green-600" /> Flowering Tips
              </CardTitle>
              <CardDescription className="text-xs">Best practices for chili flower care</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {FLOWER_CARE.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface text-xs text-foreground-secondary leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Stress recovery — only if stress detected */}
          {stress && stress.stress_score >= 0.3 && (
            <Card className="border-red-200 bg-red-50/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-red-600" /> Stress Recovery Tips
                </CardTitle>
                <CardDescription className="text-xs">Actions to help your flowers recover</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {FLOWER_CARE.stressRecovery.map((tip) => (
                    <li key={tip} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/60 text-xs text-foreground-secondary leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {/* ── Flower → Heat Estimation (B4: core thesis) ── */}
      {analysis.flowerHeatEstimation && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50/30 via-white to-orange-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-rose-600" /> Flower → Heat Prediction
              </CardTitle>
              <CardDescription className="text-xs">
                Projected fruit pungency based on flower stress morphology — core thesis pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 p-3 rounded-lg bg-rose-50/50 border border-rose-100">
                <div className="flex items-center gap-4 text-center">
                  <div className="flex-1">
                    <p className="text-[10px] text-foreground-muted mb-0.5">Stress Score</p>
                    <p className="font-bold text-lg text-rose-600">{(analysis.flowerHeatEstimation.stress_score * 100).toFixed(0)}%</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-foreground-muted mb-0.5">SHU Multiplier</p>
                    <p className="font-bold text-lg text-orange-600">{analysis.flowerHeatEstimation.shu_multiplier.toFixed(2)}×</p>
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mb-3">
                {Object.entries(analysis.flowerHeatEstimation.stress_adjusted_estimates).map(([variety, est]) => (
                  <div key={variety} className="bg-white/70 rounded-xl p-3 border border-rose-100">
                    <p className="font-bold text-xs text-foreground mb-1">{variety}</p>
                    <div className="flex justify-between text-[10px] text-foreground-muted mb-0.5">
                      <span>Base SHU</span>
                      <span>{formatNumber(est.base_shu_range[0])}–{formatNumber(est.base_shu_range[1])}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-rose-600">
                      <span>Adjusted SHU</span>
                      <span>{formatNumber(est.stress_adjusted_shu[0])}–{formatNumber(est.stress_adjusted_shu[1])}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-foreground-muted mt-1">
                      <span>Capsaicin</span>
                      <span>{est.capsaicin_mg_per_g} mg/g</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-foreground-muted italic text-center">{analysis.flowerHeatEstimation.interpretation}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row justify-center gap-3">
        <Button variant="outline" onClick={() => navigate('/library')}>
          <Save className="mr-2 h-4 w-4" /> Save to Library
        </Button>
        <Button onClick={() => navigate('/upload')}>
          <RotateCcw className="mr-2 h-4 w-4" /> Analyze Another
        </Button>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CHILI RESULTS LAYOUT
   ═══════════════════════════════════════════════════════════════ */

function ChiliResultsLayout({ analysis, navigate }: { analysis: AnalysisResult; navigate: ReturnType<typeof useNavigate> }) {
  const profile = VARIETY_PROFILES[analysis.variety] || DEFAULT_PROFILE

  const getHeatClass = (level: string) => {
    const m: Record<string, string> = { Mild: 'heat-gradient-mild', Medium: 'heat-gradient-medium', Hot: 'heat-gradient-hot', 'Extra Hot': 'heat-gradient-extra-hot' }
    return m[level] || 'bg-foreground-muted'
  }
  const heatPos = (shu: number) => Math.min(95, Math.max(5, (shu / 150000) * 100))

  const maturityInfo = profile.maturityGuide[analysis.maturity] ?? null

  // Determine the current growth stage based on detected maturity
  const getCurrentStage = () => {
    const mat = analysis.maturity
    if (mat === 'Immature') {
      // Immature pods detected — plant is in fruit set stage
      return {
        stageIdx: 5, // Fruit Set
        label: 'Fruit Set',
        icon: 'circle',
        weekRange: profile.timeline[5]?.week || 'Week 12–14',
        description: 'Immature pods have been detected on your plant. The fruits are still developing and gaining size. Continue providing consistent water and increase potassium to support fruit growth.',
        nextStep: 'Wait for pods to reach full size and deepen in color before harvesting.',
        badgeColor: 'bg-lime-600',
      }
    } else if (mat === 'Mature') {
      // Full-sized green pods — between fruit set and harvest
      return {
        stageIdx: 5,
        label: 'Late Fruit Set / Early Harvest',
        icon: 'circle',
        weekRange: profile.timeline[5]?.week || 'Week 12–15',
        description: 'Mature, full-sized pods have been detected. The chili has reached harvestable size but has not yet fully ripened. You can harvest green for a crunchy bite, or wait for color change.',
        nextStep: 'Harvest now for green chili, or wait 1–2 weeks for full ripening and maximum heat.',
        badgeColor: 'bg-green-600',
      }
    } else if (mat === 'Ripe') {
      return {
        stageIdx: 6,
        label: 'Harvest',
        icon: 'scissors',
        weekRange: profile.timeline[6]?.week || 'Week 14–18',
        description: 'Ripe pods detected — the chili has reached peak color, flavor, and heat. This is the ideal time to harvest for the best culinary experience.',
        nextStep: 'Harvest immediately using scissors. Pick regularly to encourage continued fruiting.',
        badgeColor: 'bg-red-500',
      }
    } else {
      // Overripe
      return {
        stageIdx: 6,
        label: 'Post-Harvest',
        icon: 'scissors',
        weekRange: profile.timeline[6]?.week || 'Week 16+',
        description: 'Overripe pods detected — the chili is past its prime harvest window. The pod may be softer and wrinkled but is still usable, especially for drying or making powder.',
        nextStep: 'Harvest and dry immediately. Remove overripe pods to redirect energy to younger fruit.',
        badgeColor: 'bg-red-800',
      }
    }
  }

  const currentStage = getCurrentStage()

  const timelineIcon = (icon: string) => {
    switch (icon) {
      case 'sprout': return <Sprout className="h-4 w-4" />
      case 'leaf': return <Leaf className="h-4 w-4" />
      case 'mappin': return <MapPin className="h-4 w-4" />
      case 'trending': return <TrendingUp className="h-4 w-4" />
      case 'flower': return <Flower2 className="h-4 w-4" />
      case 'circle': return <CircleDot className="h-4 w-4" />
      case 'scissors': return <Scissors className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="page-container space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="page-title !mb-0">Analysis Results</h1>
            <p className="text-xs text-foreground-muted">Sample #{analysis.id?.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon"><Share2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* ── Main result card ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="aspect-square bg-surface">
              <img src={analysis.imageUrl} alt="Analyzed chili" className="w-full h-full object-cover" />
            </div>
            <div className="p-6 sm:p-8 flex flex-col justify-center space-y-6">
              <div>
                <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-1">Detected Variety</p>
                <p className="text-3xl font-bold font-display text-foreground">{analysis.variety}</p>
                <p className="text-xs text-foreground-muted italic mt-0.5">{profile.scientificName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-2 flex-1 max-w-48 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${analysis.confidence * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-foreground-secondary">{(analysis.confidence * 100).toFixed(1)}% confidence</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-2">Heat Level</p>
                <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full ${getHeatClass(analysis.heatLevel)} text-white shadow-button`}>
                  <Flame className="h-5 w-5" />
                  <span className="font-bold text-lg">{analysis.heatLevel}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-1">Scoville Heat Units</p>
                <p className="text-4xl font-bold font-display text-primary">{formatNumber(analysis.shu)} <span className="text-xl">SHU</span></p>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-1">Maturity Stage</p>
                <div className="flex items-center gap-3">
                  {maturityInfo && <div className={`w-3 h-3 rounded-full ${maturityInfo.color}`} />}
                  <p className="text-xl font-semibold text-foreground">{analysis.maturity}</p>
                </div>
                {maturityInfo && (
                  <div className="mt-1.5 text-xs text-foreground-muted space-y-0.5">
                    <p>{maturityInfo.description}</p>
                    <p className="font-medium text-foreground-secondary">{maturityInfo.readiness}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Variety Profile ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-green-200 bg-green-50/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Leaf className="h-4 w-4 text-green-600" /> Variety Profile
            </CardTitle>
            <CardDescription className="text-xs">About {analysis.variety}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Origin', value: profile.origin },
                { label: 'Family', value: profile.family },
                { label: 'Season', value: profile.season },
                { label: 'Days to Harvest', value: profile.daysToHarvest },
                { label: 'Germination', value: profile.daysToGerminate },
                { label: 'Spacing', value: profile.spacing },
              ].map((item) => (
                <div key={item.label} className="bg-white/70 rounded-lg p-2.5">
                  <p className="text-[10px] text-foreground-muted">{item.label}</p>
                  <p className="text-xs font-semibold text-foreground leading-snug">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Detail metric cards ── */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Thermometer className="h-4 w-4 text-chili" /> Heat Meter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 rounded-full heat-scale-bar relative shadow-inner">
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-white border-2 border-foreground rounded shadow-sm" style={{ left: `${heatPos(analysis.shu)}%`, transform: 'translate(-50%, -50%)' }} />
                </div>
                <div className="flex justify-between text-[10px] font-medium text-foreground-muted"><span>Mild</span><span>Medium</span><span>Hot</span><span>Extra Hot</span></div>
                <div className="text-center pt-3 border-t border-border">
                  <p className="text-xs text-foreground-muted">Estimated Range</p>
                  <p className="font-semibold text-sm text-foreground">{formatNumber(Math.max(0, analysis.shu - 5000))} – {formatNumber(analysis.shu + 5000)} SHU</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Leaf className="h-4 w-4 text-secondary" /> Variety Match
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground">{analysis.variety}</span>
                  <span className="text-primary font-bold">{(analysis.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${analysis.confidence * 100}%` }} />
                </div>
              </div>
              <div className="opacity-50">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground-secondary">Other Varieties</span>
                  <span className="text-foreground-muted">{((1 - analysis.confidence) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-foreground-muted/40 rounded-full transition-all duration-500" style={{ width: `${(1 - analysis.confidence) * 100}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ruler className="h-4 w-4 text-primary" /> Measurements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const m = analysis.measurements
                const pods = m?.per_pod
                const avg = m?.average ?? (pods?.length ? {
                  length_mm: pods.reduce((s, p) => s + (p.length_mm || 0), 0) / pods.length,
                  width_mm: pods.reduce((s, p) => s + (p.width_mm || 0), 0) / pods.length,
                  area_mm2: pods.reduce((s, p) => s + (p.area_mm2 || 0), 0) / pods.length,
                  estimated_weight_g: pods.reduce((s, p) => s + (p.estimated_weight_g || 0), 0) / pods.length,
                } : null)
                const segsWithM = analysis.segments?.filter(s => s.measurement) ?? []
                const segAvg = !avg && segsWithM.length ? {
                  length_mm: segsWithM.reduce((s, seg) => s + (seg.measurement?.length_mm || 0), 0) / segsWithM.length,
                  width_mm: segsWithM.reduce((s, seg) => s + (seg.measurement?.width_mm || 0), 0) / segsWithM.length,
                  area_mm2: segsWithM.reduce((s, seg) => s + (seg.measurement?.area_mm2 || 0), 0) / segsWithM.length,
                  estimated_weight_g: segsWithM.reduce((s, seg) => s + (seg.measurement?.estimated_weight_g || 0), 0) / segsWithM.length,
                } : null
                const displayAvg = avg || segAvg
                const totalW = typeof m?.total_estimated_weight_g === 'number' ? m.total_estimated_weight_g
                  : pods?.length ? pods.reduce((s, p) => s + (p.estimated_weight_g || 0), 0)
                  : segsWithM.length ? segsWithM.reduce((s, seg) => s + (seg.measurement?.estimated_weight_g || 0), 0) : null
                if (!displayAvg && totalW == null) return <p className="text-sm text-foreground-muted">No measurement data</p>
                return (
                  <div className="space-y-3">
                    {[
                      displayAvg?.length_mm != null ? { label: 'Avg Length', value: `${Number(displayAvg.length_mm).toFixed(1)} mm` } : null,
                      displayAvg?.width_mm != null ? { label: 'Avg Width', value: `${Number(displayAvg.width_mm).toFixed(1)} mm` } : null,
                      displayAvg?.estimated_weight_g != null ? { label: 'Avg Weight', value: `${Number(displayAvg.estimated_weight_g).toFixed(1)} g` } : null,
                      totalW != null ? { label: 'Total Weight', value: `${Number(totalW).toFixed(1)} g` } : null,
                      (pods?.length || segsWithM.length) ? { label: 'Pods Measured', value: String(pods?.length || segsWithM.length) } : null,
                    ].filter(Boolean).map((item) => (
                      <div key={item!.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                        <span className="text-sm text-foreground-secondary">{item!.label}</span>
                        <span className="font-semibold text-sm text-foreground">{item!.value}</span>
                      </div>
                    ))}
                    {/* Per-pod measurements table */}
                    {(pods?.length ?? segsWithM.length) > 0 && (
                      <div className="mt-3 rounded-lg border border-border overflow-hidden">
                        <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide px-2 py-1.5 bg-surface">Individual Pod Measurements</p>
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="bg-surface/50 text-foreground-muted">
                              <th className="text-left py-1 px-2 font-medium">Pod</th>
                              <th className="text-right py-1 px-2 font-medium">Length</th>
                              <th className="text-right py-1 px-2 font-medium">Width</th>
                              <th className="text-right py-1 px-2 font-medium">Weight</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(pods || segsWithM.map(s => s.measurement!)).map((pod, idx) => (
                              <tr key={idx} className="border-t border-border/50">
                                <td className="py-1 px-2 font-medium">#{idx + 1}</td>
                                <td className="py-1 px-2 text-right">{pod.length_mm?.toFixed(1) ?? '—'} mm</td>
                                <td className="py-1 px-2 text-right">{pod.width_mm?.toFixed(1) ?? '—'} mm</td>
                                <td className="py-1 px-2 text-right font-semibold">{pod.estimated_weight_g?.toFixed(2) ?? '—'} g</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {typeof m?.scale_mm_per_px === 'number' && (
                      <p className="text-[10px] text-foreground-muted text-right mt-1">Scale: {m.scale_mm_per_px.toFixed(3)} mm/px ({m.scale_method || 'estimated'})</p>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Segmentation Breakdown ── */}
      {(analysis.scanType === 'chili_segmentation') && analysis.segments && analysis.segments.length > 0 && (() => {
        const varietyGroups: Record<string, typeof analysis.segments> = {}
        for (const seg of analysis.segments!) {
          const vName = seg.variety || seg.class_name || seg.class || 'Unknown'
          if (!varietyGroups[vName]) varietyGroups[vName] = []
          varietyGroups[vName]!.push(seg)
        }
        const varietyEntries = Object.entries(varietyGroups)

        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-4">
            {(() => {
              const m = analysis.measurements
              const totalDetected = analysis.totalDetected || analysis.segments!.length
              const varietiesCount = varietyEntries.length
              const avgLen = m?.average?.length_mm ?? (analysis.segments!.filter(s => s.measurement).length
                ? analysis.segments!.filter(s => s.measurement).reduce((a, s) => a + (s.measurement?.length_mm || 0), 0) / analysis.segments!.filter(s => s.measurement).length
                : null)
              const totalW = m?.total_estimated_weight_g ?? (analysis.segments!.filter(s => s.measurement).length
                ? analysis.segments!.filter(s => s.measurement).reduce((a, s) => a + (s.measurement?.estimated_weight_g || 0), 0)
                : null)
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <Layers className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                    <p className="text-[10px] text-foreground-muted">Total Detected</p>
                    <p className="font-bold text-sm">{totalDetected} pod{totalDetected !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <Flame className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                    <p className="text-[10px] text-foreground-muted">Varieties Found</p>
                    <p className="font-bold text-sm">{varietiesCount}</p>
                  </div>
                  {avgLen != null && (
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <Ruler className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                      <p className="text-[10px] text-foreground-muted">Avg Length</p>
                      <p className="font-bold text-sm">{Number(avgLen).toFixed(1)} mm</p>
                    </div>
                  )}
                  {totalW != null && (
                    <div className="bg-rose-50 rounded-xl p-3 text-center">
                      <Scale className="h-4 w-4 text-rose-600 mx-auto mb-1" />
                      <p className="text-[10px] text-foreground-muted">Total Weight</p>
                      <p className="font-bold text-sm">{Number(totalW).toFixed(1)} g</p>
                    </div>
                  )}
                </div>
              )
            })()}

            {varietyEntries.map(([varietyName, segs]) => {
              if (!segs || segs.length === 0) return null
              const count = segs.length
              const segsWithM = segs.filter(s => s.measurement)
              const avgConf = segs.reduce((a, s) => a + (s.confidence || 0), 0) / count
              const avgLen = segsWithM.length ? segsWithM.reduce((a, s) => a + (s.measurement?.length_mm || 0), 0) / segsWithM.length : null
              const avgWid = segsWithM.length ? segsWithM.reduce((a, s) => a + (s.measurement?.width_mm || 0), 0) / segsWithM.length : null
              const avgWt = segsWithM.length ? segsWithM.reduce((a, s) => a + (s.measurement?.estimated_weight_g || 0), 0) / segsWithM.length : null
              const totalWt = segsWithM.length ? segsWithM.reduce((a, s) => a + (s.measurement?.estimated_weight_g || 0), 0) : null

              const richInfo = analysis.varietiesDetected && typeof analysis.varietiesDetected[varietyName] === 'object' && analysis.varietiesDetected[varietyName] !== null
                ? (analysis.varietiesDetected[varietyName] as unknown as Record<string, unknown>)
                : null
              const shuRange = richInfo?.shu_range as string | null
              const heatCat = richInfo?.heat_category as string | null
              const description = richInfo?.description as string | null
              const refLen = richInfo?.reference_length_mm as number | null
              const refWid = richInfo?.reference_width_mm as number | null
              const refWt = richInfo?.reference_weight_g as number | null

              const varietyColor = varietyName.includes('Haba') ? 'green' : varietyName.includes('Labuyo') ? 'red' : varietyName.includes('Demonyo') ? 'orange' : 'blue'
              const bgClass = varietyColor === 'green' ? 'bg-green-50 border-green-200' : varietyColor === 'red' ? 'bg-red-50 border-red-200' : varietyColor === 'orange' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
              const textClass = varietyColor === 'green' ? 'text-green-700' : varietyColor === 'red' ? 'text-red-700' : varietyColor === 'orange' ? 'text-orange-700' : 'text-blue-700'
              const badgeBg = varietyColor === 'green' ? 'bg-green-100 text-green-700' : varietyColor === 'red' ? 'bg-red-100 text-red-700' : varietyColor === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
              const iconBg = varietyColor === 'green' ? 'bg-green-100' : varietyColor === 'red' ? 'bg-red-100' : varietyColor === 'orange' ? 'bg-orange-100' : 'bg-blue-100'

              return (
                <Card key={varietyName} className={`border ${bgClass}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${iconBg}`}>
                          <Flame className={`h-4 w-4 ${textClass}`} />
                        </div>
                        <div>
                          <h5 className={`font-bold text-sm ${textClass}`}>{varietyName}</h5>
                          <p className="text-[11px] text-foreground-muted">{description || 'Philippine chili variety'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeBg}`}>
                          {count} pod{count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-foreground-muted">{(avgConf * 100).toFixed(1)}% avg</span>
                      </div>
                    </div>

                    {segsWithM.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        {avgLen != null && (
                          <div className="bg-white/70 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-foreground-muted">Avg Length</p>
                            <p className="font-bold text-xs">{avgLen.toFixed(1)} mm</p>
                            {refLen != null && <p className="text-[9px] text-foreground-muted">ref: {refLen} mm</p>}
                          </div>
                        )}
                        {avgWid != null && (
                          <div className="bg-white/70 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-foreground-muted">Avg Width</p>
                            <p className="font-bold text-xs">{avgWid.toFixed(1)} mm</p>
                            {refWid != null && <p className="text-[9px] text-foreground-muted">ref: {refWid} mm</p>}
                          </div>
                        )}
                        {avgWt != null && (
                          <div className="bg-white/70 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-foreground-muted">Avg Weight</p>
                            <p className="font-bold text-xs">{avgWt.toFixed(2)} g</p>
                            {refWt != null && <p className="text-[9px] text-foreground-muted">ref: {refWt} g</p>}
                          </div>
                        )}
                        <div className="bg-white/70 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-foreground-muted">Heat (SHU)</p>
                          <p className="font-bold text-xs">{shuRange || '—'}</p>
                          {heatCat && <p className="text-[9px] text-foreground-muted">{heatCat}</p>}
                        </div>
                      </div>
                    )}

                    {count > 1 && segsWithM.length > 0 && (
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
                            {segs.map((seg, idx) => (
                              <tr key={idx} className="border-t border-gray-100/50">
                                <td className="py-1 px-2 font-medium">#{idx + 1}</td>
                                <td className="py-1 px-2 text-right">{((seg.confidence || 0) * 100).toFixed(1)}%</td>
                                <td className="py-1 px-2 text-right">{seg.measurement?.length_mm?.toFixed(1) ?? '—'} mm</td>
                                <td className="py-1 px-2 text-right">{seg.measurement?.width_mm?.toFixed(1) ?? '—'} mm</td>
                                <td className="py-1 px-2 text-right font-semibold">{seg.measurement?.estimated_weight_g?.toFixed(2) ?? '—'} g</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-200 font-semibold bg-white/60">
                              <td className="py-1.5 px-2" colSpan={2}>Total / Avg</td>
                              <td className="py-1.5 px-2 text-right">{avgLen?.toFixed(1) ?? '—'} mm</td>
                              <td className="py-1.5 px-2 text-right">{avgWid?.toFixed(1) ?? '—'} mm</td>
                              <td className="py-1.5 px-2 text-right font-bold">{totalWt?.toFixed(2) ?? '—'} g</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {analysis.measurements && typeof analysis.measurements.scale_mm_per_px === 'number' && (
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                  analysis.measurements.scale_method === 'reference-calibrated'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {analysis.measurements.scale_method === 'reference-calibrated' ? '✓ Calibrated' : '⚠ Estimated'}
                </span>
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  {analysis.measurements.scale_note || 'Scale calibration applied to measurements.'}
                  <span className="ml-1 text-foreground-muted/60">({analysis.measurements.scale_mm_per_px.toFixed(4)} mm/px)</span>
                </p>
              </div>
            )}
          </motion.div>
        )
      })()}

      {/* ── Estimated Current Growth Stage ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${currentStage.badgeColor} text-white shadow-lg`}>
                {timelineIcon(currentStage.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-indigo-500 uppercase tracking-wide mb-0.5">Estimated Current Growth Stage</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xl font-bold font-display text-foreground">{currentStage.label}</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full">CURRENT STAGE</span>
                </div>
                <p className="text-xs text-foreground-muted mt-1.5 leading-relaxed">{currentStage.description}</p>
                <div className="mt-3 p-2.5 bg-white/70 rounded-lg border border-indigo-100">
                  <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">What to Do Next</p>
                  <p className="text-xs text-foreground-secondary leading-relaxed">{currentStage.nextStep}</p>
                </div>
                <div className="flex items-center gap-3 mt-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                    <Clock className="h-3 w-3" />
                    <span>Approx. {currentStage.weekRange} of growth cycle</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                    <Leaf className="h-3 w-3" />
                    <span>Detected maturity: <span className="font-semibold text-foreground-secondary">{analysis.maturity}</span></span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Growth Timeline ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-blue-200 bg-blue-50/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-600" /> Growth Timeline
            </CardTitle>
            <CardDescription className="text-xs">Typical growth stages for {analysis.variety}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-blue-200" />
              <div className="space-y-1">
                {profile.timeline.map((stage, idx) => {
                  const isActive = idx === currentStage.stageIdx
                  const isPast = idx < currentStage.stageIdx

                  return (
                    <div key={stage.week} className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${isActive ? 'bg-blue-100/80' : isPast ? 'bg-blue-50/50' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        isActive ? 'bg-blue-600 text-white' : isPast ? 'bg-blue-400 text-white' : 'bg-white border-2 border-blue-200 text-blue-500'
                      }`}>
                        {timelineIcon(stage.icon)}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-blue-700">{stage.week}</span>
                          <span className="text-xs font-semibold text-foreground">{stage.stage}</span>
                          {isActive && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded-full">YOU ARE HERE</span>
                          )}
                          {isPast && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-400 text-white rounded-full">COMPLETED</span>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground-muted leading-relaxed mt-0.5">{stage.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Growing Recommendations ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sprout className="h-4 w-4 text-emerald-600" /> Growing Recommendations
            </CardTitle>
            <CardDescription className="text-xs">Expert tips for cultivating {analysis.variety}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Conditions summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <Sun className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                <p className="text-[10px] text-foreground-muted">Sunlight</p>
                <p className="font-bold text-[11px]">{profile.sunlight}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <Droplets className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                <p className="text-[10px] text-foreground-muted">Water</p>
                <p className="font-bold text-[11px]">{profile.waterNeeds}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <Thermometer className="h-4 w-4 text-red-500 mx-auto mb-1" />
                <p className="text-[10px] text-foreground-muted">Temperature</p>
                <p className="font-bold text-[11px]">{profile.optimalTemp}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <Leaf className="h-4 w-4 text-green-500 mx-auto mb-1" />
                <p className="text-[10px] text-foreground-muted">Soil pH</p>
                <p className="font-bold text-[11px]">{profile.phRange}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Growing Tips</p>
              <ul className="space-y-2">
                {profile.growingTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/60 text-xs text-foreground-secondary leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Harvest Tips</p>
              <ul className="space-y-2">
                {profile.harvestTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/60 text-xs text-foreground-secondary leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Companion Plants</p>
              <div className="flex flex-wrap gap-2">
                {profile.companionPlants.map((plant) => (
                  <span key={plant} className="text-[11px] font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded-full">
                    {plant}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white/70 rounded-lg p-3">
              <p className="text-xs font-semibold text-foreground mb-1">Storage & Preservation</p>
              <p className="text-[11px] text-foreground-muted leading-relaxed">{profile.storageInfo}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Pests & Diseases ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-amber-200 bg-amber-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bug className="h-4 w-4 text-amber-600" /> Common Pests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {profile.commonPests.map((pest) => (
                  <li key={pest} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/60 text-xs text-foreground-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {pest}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-red-600" /> Common Diseases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {profile.diseases.map((disease) => (
                  <li key={disease} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/60 text-xs text-foreground-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {disease}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Culinary Uses + Safety ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><ChefHat className="h-4 w-4 text-amber-500" /> Culinary Uses</CardTitle>
              <CardDescription className="text-xs">Best uses for {analysis.variety}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {profile.culinaryUses.map((use) => (
                  <li key={use} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface text-sm text-foreground-secondary">
                    <div className={`w-1.5 h-1.5 rounded-full ${getHeatClass(analysis.heatLevel)}`} />
                    {use}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-warning" /> Safety Precautions</CardTitle>
              <CardDescription className="text-xs">Handling recommendations for this heat level</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {((analysis.heatLevel === 'Mild' || analysis.heatLevel === 'Medium')
                  ? ['Safe for direct handling', 'Wash hands after cutting', 'Remove seeds for milder dishes']
                  : ['Wear gloves when handling', 'Avoid touching face or eyes', 'Work in ventilated area', 'Keep milk ready for emergencies', 'Wash cutting board thoroughly after use']
                ).map((tip) => (
                  <li key={tip} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface text-sm text-foreground-secondary">
                    <div className={`w-1.5 h-1.5 rounded-full ${(analysis.heatLevel === 'Mild' || analysis.heatLevel === 'Medium') ? 'bg-secondary' : 'bg-danger'}`} />
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Product Recommendations ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
        <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50/30 via-white to-blue-50/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-cyan-600" /> Recommended Products
            </CardTitle>
            <CardDescription className="text-xs">
              Chili-based products suited for {analysis.heatLevel.toLowerCase()} heat levels ({formatNumber(analysis.shu)} SHU)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(HEAT_INDEX_PRODUCTS[analysis.heatLevel] || HEAT_INDEX_PRODUCTS['Medium']).map((product) => (
                <div key={product.name} className="bg-white/70 rounded-xl p-3 border border-cyan-100 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cyan-100 flex-shrink-0 mt-0.5">
                      <Package className="h-3.5 w-3.5 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-foreground">{product.name}</p>
                      <p className="text-[11px] text-foreground-muted leading-relaxed mt-0.5">{product.description}</p>
                      <span className="inline-block mt-1.5 text-[9px] font-medium px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full">
                        {product.heatMatch}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Capsaicin Estimation (B2) ── */}
      {analysis.capsaicin && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.50 }}>
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50/30 via-white to-yellow-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Beaker className="h-4 w-4 text-orange-600" /> Capsaicin Estimation
              </CardTitle>
              <CardDescription className="text-xs">
                Estimated capsaicinoid content based on ML-predicted SHU ({formatNumber(analysis.shu)} SHU)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white/70 rounded-xl p-3 border border-orange-100 text-center">
                  <p className="text-[10px] text-foreground-muted mb-0.5">Capsaicin</p>
                  <p className="font-bold text-lg text-orange-600">{analysis.capsaicin.capsaicin_mg_per_g}</p>
                  <p className="text-[9px] text-foreground-muted">mg/g</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 border border-orange-100 text-center">
                  <p className="text-[10px] text-foreground-muted mb-0.5">Dihydrocapsaicin</p>
                  <p className="font-bold text-lg text-amber-600">{analysis.capsaicin.dihydrocapsaicin_mg_per_g}</p>
                  <p className="text-[9px] text-foreground-muted">mg/g</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 border border-orange-100 text-center">
                  <p className="text-[10px] text-foreground-muted mb-0.5">Total Capsaicinoids</p>
                  <p className="font-bold text-lg text-red-600">{analysis.capsaicin.total_capsaicinoids_mg_per_g}</p>
                  <p className="text-[9px] text-foreground-muted">mg/g</p>
                </div>
              </div>
              <p className="text-[10px] text-foreground-muted italic text-center">{analysis.capsaicin.conversion_method}</p>
              {analysis.capsaicin.note && <p className="text-[10px] text-foreground-muted text-center mt-1">{analysis.capsaicin.note}</p>}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── ML Model Details (B3) ── */}
      {analysis.mlDetails && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4 text-indigo-600" /> ML Prediction Details
              </CardTitle>
              <CardDescription className="text-xs">
                Model: {analysis.mlDetails.model_used} — Transparency into how SHU was predicted
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {analysis.mlDetails.linear_regression_shu != null && (
                  <div className="bg-white/70 rounded-xl p-3 border border-indigo-100 text-center">
                    <p className="text-[10px] text-foreground-muted mb-0.5">Linear Regression</p>
                    <p className="font-bold text-sm text-indigo-600">{formatNumber(analysis.mlDetails.linear_regression_shu)} SHU</p>
                  </div>
                )}
                {analysis.mlDetails.random_forest_shu != null && (
                  <div className="bg-white/70 rounded-xl p-3 border border-indigo-100 text-center">
                    <p className="text-[10px] text-foreground-muted mb-0.5">Random Forest</p>
                    <p className="font-bold text-sm text-indigo-600">{formatNumber(analysis.mlDetails.random_forest_shu)} SHU</p>
                  </div>
                )}
                {analysis.mlDetails.prediction_interval && (
                  <div className="bg-white/70 rounded-xl p-3 border border-indigo-100 text-center">
                    <p className="text-[10px] text-foreground-muted mb-0.5">Prediction Interval</p>
                    <p className="font-bold text-sm text-indigo-600">
                      {formatNumber(analysis.mlDetails.prediction_interval.lower)} – {formatNumber(analysis.mlDetails.prediction_interval.upper)}
                    </p>
                  </div>
                )}
                {analysis.mlDetails.model_r2 != null && (
                  <div className="bg-white/70 rounded-xl p-3 border border-indigo-100 text-center">
                    <p className="text-[10px] text-foreground-muted mb-0.5">Model R²</p>
                    <p className="font-bold text-sm text-indigo-600">{(analysis.mlDetails.model_r2 * 100).toFixed(1)}%</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-foreground-muted italic text-center mt-2">
                Models trained on synthetic morphometric data — see Model Comparison page for full methodology
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Actions ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="flex flex-col sm:flex-row justify-center gap-3">
        <Button variant="outline" onClick={() => navigate('/library')}>
          <Save className="mr-2 h-4 w-4" /> Save to Library
        </Button>
        <Button onClick={() => navigate('/upload')}>
          <RotateCcw className="mr-2 h-4 w-4" /> Analyze Another
        </Button>
      </motion.div>
    </div>
  )
}
