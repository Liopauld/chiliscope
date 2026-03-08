import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sprout, Leaf, Flower2, Apple, Sun,
  Droplets, Thermometer, ChevronDown
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ── Types ──

interface GrowthStage {
  name: string
  maturity: 'IMMATURE' | 'DEVELOPING' | 'MATURE' | 'OVERRIPE'
  dayRange: [number, number]
  description: string
  characteristics: { height: string; leafSize: string; visualIndicators: string }
  care: { watering: string; sunlight: string; fertilization: string; temperature: string }
  color: string          // tailwind bg class
  colorHex: string       // for progress bar gradient
}

interface GrowthVariety {
  id: string
  name: string
  scientificName: string
  heatLevel: string
  totalDays: string
  image: string
  heatBadge: string      // tailwind class
  stages: GrowthStage[]
  summary: { climate: string; soil: string; spacing: string; companions: string }
}

// ── Static Data ──

const growthVarieties: GrowthVariety[] = [
  {
    id: 'siling-haba',
    name: 'Siling Haba',
    scientificName: 'Capsicum annuum var. longum',
    heatLevel: 'Mild',
    totalDays: '60–75 days',
    image: '/images/haba.webp',
    heatBadge: 'heat-gradient-mild',
    stages: [
      {
        name: 'Seedling',
        maturity: 'IMMATURE',
        dayRange: [0, 14],
        description: 'Seeds germinate and produce their first pair of true leaves. The stem is thin and delicate.',
        characteristics: { height: '2–5 cm', leafSize: 'Tiny cotyledons + first true leaves', visualIndicators: 'Pale green stem, two rounded seed leaves' },
        care: { watering: 'Mist gently, keep soil consistently moist', sunlight: 'Indirect light or partial shade', fertilization: 'None needed — seed nutrients suffice', temperature: '25–30°C for optimal germination' },
        color: 'bg-lime-400',
        colorHex: '#a3e635',
      },
      {
        name: 'Vegetative Growth',
        maturity: 'IMMATURE',
        dayRange: [15, 35],
        description: 'Rapid stem and leaf development. The plant builds its canopy and root system before flowering.',
        characteristics: { height: '15–30 cm', leafSize: 'Medium, elongated leaves', visualIndicators: 'Sturdy green stem, branching begins' },
        care: { watering: 'Regular watering, keep soil evenly moist', sunlight: 'Full sun 6–8 hours', fertilization: 'Balanced NPK (14-14-14) every 2 weeks', temperature: '25–35°C' },
        color: 'bg-green-500',
        colorHex: '#22c55e',
      },
      {
        name: 'Flowering',
        maturity: 'DEVELOPING',
        dayRange: [36, 45],
        description: 'Small white flowers appear at branch nodes. Pollination occurs naturally with wind and insects.',
        characteristics: { height: '30–45 cm', leafSize: 'Full-sized, dark green', visualIndicators: 'White star-shaped flowers, some early bud drop' },
        care: { watering: 'Moderate — avoid flower splash', sunlight: 'Full sun 6–8 hours', fertilization: 'Switch to high-phosphorus (10-30-20)', temperature: '25–30°C ideal for fruit set' },
        color: 'bg-yellow-400',
        colorHex: '#facc15',
      },
      {
        name: 'Fruiting',
        maturity: 'MATURE',
        dayRange: [46, 60],
        description: 'Pods elongate rapidly after successful pollination. Fruits are green and firm.',
        characteristics: { height: '45–60 cm', leafSize: 'Full canopy', visualIndicators: 'Long green pods (7–12 cm), waxy skin' },
        care: { watering: 'Consistent deep watering', sunlight: 'Full sun', fertilization: 'Potassium-rich feed (10-10-30) for fruit quality', temperature: '25–35°C' },
        color: 'bg-orange-400',
        colorHex: '#fb923c',
      },
      {
        name: 'Ripening / Harvest',
        maturity: 'MATURE',
        dayRange: [61, 75],
        description: 'Pods transition from green to red/orange. Harvest when color is uniform for maximum flavor.',
        characteristics: { height: '50–65 cm', leafSize: 'Some lower-leaf yellowing normal', visualIndicators: 'Color change green → red/orange, slight softening' },
        care: { watering: 'Reduce slightly to concentrate flavor', sunlight: 'Full sun', fertilization: 'Stop fertilizing 1 week before harvest', temperature: '25–35°C' },
        color: 'bg-red-500',
        colorHex: '#ef4444',
      },
    ],
    summary: { climate: 'Tropical lowlands, 25–35°C', soil: 'Well-drained loamy soil, pH 6.0–6.8', spacing: '45–60 cm between plants', companions: 'Tomatoes, basil, carrots' },
  },
  {
    id: 'siling-labuyo',
    name: 'Siling Labuyo',
    scientificName: 'Capsicum frutescens',
    heatLevel: 'Hot',
    totalDays: '90–120 days',
    image: '/images/labuyo.jfif',
    heatBadge: 'heat-gradient-hot',
    stages: [
      {
        name: 'Seedling',
        maturity: 'IMMATURE',
        dayRange: [0, 14],
        description: 'Slow germination typical of frutescens species. Seeds need warm soil and patience.',
        characteristics: { height: '1–4 cm', leafSize: 'Very small cotyledons', visualIndicators: 'Compact sprout, dark green tinge' },
        care: { watering: 'Keep moist but not waterlogged', sunlight: 'Warm indirect light', fertilization: 'None', temperature: '28–32°C optimum for germination' },
        color: 'bg-lime-400',
        colorHex: '#a3e635',
      },
      {
        name: 'Vegetative Growth',
        maturity: 'IMMATURE',
        dayRange: [15, 45],
        description: 'Compact, bushy growth habit develops. Stems become woody at the base over time.',
        characteristics: { height: '15–40 cm', leafSize: 'Small to medium, pointed leaves', visualIndicators: 'Dense branching, woody lower stem' },
        care: { watering: 'Moderate — let top soil dry between waterings', sunlight: 'Full sun 6–8 hours minimum', fertilization: 'Balanced NPK every 2–3 weeks', temperature: '20–30°C' },
        color: 'bg-green-500',
        colorHex: '#22c55e',
      },
      {
        name: 'Flowering',
        maturity: 'DEVELOPING',
        dayRange: [46, 65],
        description: 'Greenish-white flowers emerge. Labuyo often self-pollinates, producing many small fruits.',
        characteristics: { height: '40–60 cm', leafSize: 'Full-sized, glossy', visualIndicators: 'Upright greenish-white flowers, multiple per node' },
        care: { watering: 'Moderate, avoid wet foliage', sunlight: 'Full sun 6–8 hours', fertilization: 'Phosphorus-rich feed for fruit set', temperature: '22–30°C' },
        color: 'bg-yellow-400',
        colorHex: '#facc15',
      },
      {
        name: 'Fruiting',
        maturity: 'MATURE',
        dayRange: [66, 95],
        description: 'Tiny conical pods point upward. Green fruits develop intense capsaicin as they grow.',
        characteristics: { height: '50–75 cm', leafSize: 'Dense canopy', visualIndicators: 'Small upright green pods (2–3 cm), pointed tips' },
        care: { watering: 'Consistent, stress increases heat but reduces yield', sunlight: 'Full sun', fertilization: 'Potassium-rich feed for heat & quality', temperature: '20–30°C' },
        color: 'bg-orange-400',
        colorHex: '#fb923c',
      },
      {
        name: 'Ripening / Harvest',
        maturity: 'MATURE',
        dayRange: [96, 120],
        description: 'Pods turn bright red at peak heat. Can be harvested green or red depending on use.',
        characteristics: { height: '60–80 cm', leafSize: 'Full but some leaf drop', visualIndicators: 'Red pods pointing upward, easy snap-off at stem' },
        care: { watering: 'Slightly reduce to intensify flavor', sunlight: 'Full sun', fertilization: 'Stop feeding 2 weeks before harvest', temperature: '20–30°C' },
        color: 'bg-red-500',
        colorHex: '#ef4444',
      },
    ],
    summary: { climate: 'Tropical, 20–30°C, tolerates partial shade', soil: 'Well-drained, slightly acidic pH 5.5–6.5', spacing: '30–45 cm between plants', companions: 'Onions, marigolds (pest deterrent)' },
  },
  {
    id: 'siling-demonyo',
    name: 'Siling Demonyo',
    scientificName: 'Capsicum frutescens (hybrid)',
    heatLevel: 'Extra Hot',
    totalDays: '100–130 days',
    image: '/images/demonyo.jpg',
    heatBadge: 'heat-gradient-extra-hot',
    stages: [
      {
        name: 'Seedling',
        maturity: 'IMMATURE',
        dayRange: [0, 14],
        description: 'Germination is slow and requires consistent warmth. Seedlings are very small and fragile.',
        characteristics: { height: '1–3 cm', leafSize: 'Tiny cotyledons, slow to develop', visualIndicators: 'Dark green, compact sprout' },
        care: { watering: 'Mist frequently, keep soil warm and moist', sunlight: 'Warm indirect light till true leaves', fertilization: 'None', temperature: '28–33°C for best germination' },
        color: 'bg-lime-400',
        colorHex: '#a3e635',
      },
      {
        name: 'Vegetative Growth',
        maturity: 'IMMATURE',
        dayRange: [15, 50],
        description: 'Extended vegetative phase to build a strong root system. Growth is slower than milder varieties.',
        characteristics: { height: '15–35 cm', leafSize: 'Small-medium, slightly wrinkled', visualIndicators: 'Compact habit, very dark green leaves, woody base' },
        care: { watering: 'Moderate — slight drought stress can increase future heat', sunlight: 'Full sun 8+ hours', fertilization: 'Balanced NPK every 2 weeks, add calcium', temperature: '25–35°C' },
        color: 'bg-green-500',
        colorHex: '#22c55e',
      },
      {
        name: 'Flowering',
        maturity: 'DEVELOPING',
        dayRange: [51, 70],
        description: 'Flowers are small and may appear in clusters. Pollination success is critical for the extreme heat pods.',
        characteristics: { height: '35–50 cm', leafSize: 'Full-sized, deep green', visualIndicators: 'Small white-green flowers, often in pairs' },
        care: { watering: 'Even moisture, avoid stress during flowering', sunlight: 'Full sun 8+ hours', fertilization: 'High-phosphorus formula', temperature: '25–32°C ideal for pollination' },
        color: 'bg-yellow-400',
        colorHex: '#facc15',
      },
      {
        name: 'Fruiting',
        maturity: 'MATURE',
        dayRange: [71, 105],
        description: 'Pods develop slowly but pack extreme capsaicin levels. The wrinkled skin is a signature trait.',
        characteristics: { height: '45–65 cm', leafSize: 'Dense, dark canopy', visualIndicators: 'Small wrinkled pods (1.5–2.5 cm), green with purple tinge' },
        care: { watering: 'Moderate, water stress increases capsaicin', sunlight: 'Full sun 8+ hours', fertilization: 'Potassium + sulfur for maximum heat', temperature: '25–35°C' },
        color: 'bg-orange-400',
        colorHex: '#fb923c',
      },
      {
        name: 'Ripening / Harvest',
        maturity: 'MATURE',
        dayRange: [106, 130],
        description: 'Pods ripen to deep red. Handle with gloves — capsaicin levels can cause skin irritation.',
        characteristics: { height: '50–70 cm', leafSize: 'Some yellowing at base', visualIndicators: 'Deep red wrinkled pods, intense aroma when crushed' },
        care: { watering: 'Reduce before final harvest for concentrated heat', sunlight: 'Full sun', fertilization: 'Stop 2 weeks before harvest', temperature: '25–35°C' },
        color: 'bg-red-500',
        colorHex: '#ef4444',
      },
    ],
    summary: { climate: 'Tropical, 25–35°C, needs full heat', soil: 'Well-drained, sandy-loam, pH 6.0–6.5', spacing: '30–40 cm, compact plants', companions: 'Basil (pest control), avoid fennel' },
  },
]

const stageIcons = [Sprout, Leaf, Flower2, Apple, Sun]

// ── Components ──

function HeatBadge({ level }: { level: string }) {
  const c: Record<string, string> = { Mild: 'heat-gradient-mild', Medium: 'heat-gradient-medium', Hot: 'heat-gradient-hot', 'Extra Hot': 'heat-gradient-extra-hot' }
  return <span className={cn('px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm', c[level] || 'bg-gray-500')}>{level}</span>
}

export default function Growth() {
  const [selectedId, setSelectedId] = useState(growthVarieties[0].id)
  const [activeStage, setActiveStage] = useState(0)

  const variety = growthVarieties.find(v => v.id === selectedId)!
  const stage = variety.stages[activeStage]
  const StageIcon = stageIcons[activeStage]

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-xs font-medium text-primary mb-3">
          <Sprout className="h-3.5 w-3.5" /> Growth Guide
        </div>
        <h1 className="page-title">Growth & Development Patterns</h1>
        <p className="text-foreground-secondary max-w-2xl">
          Visual growth timelines for each Philippine chili variety — from seedling to harvest. Track stages, care tips, and development milestones.
        </p>
      </div>

      {/* Variety Selector */}
      <section className="grid sm:grid-cols-3 gap-4">
        {growthVarieties.map(v => (
          <motion.div key={v.id} whileTap={{ scale: 0.98 }}>
            <Card
              className={cn(
                'cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-0.5',
                selectedId === v.id ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'
              )}
              onClick={() => { setSelectedId(v.id); setActiveStage(0) }}
            >
              <div className="relative h-28 bg-sidebar overflow-hidden">
                <img src={v.image} alt={v.name} className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display text-white">{v.name}</h3>
                    <p className="text-white/50 text-[10px]">{v.totalDays}</p>
                  </div>
                  <HeatBadge level={v.heatLevel} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </section>

      {/* Growth Timeline */}
      <section>
        <h2 className="page-subtitle mb-5">Growth Timeline — {variety.name}</h2>

        {/* Timeline bar */}
        <div className="relative mb-8">
          {/* Progress track */}
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((activeStage + 1) / variety.stages.length) * 100}%`,
                background: `linear-gradient(90deg, ${variety.stages.slice(0, activeStage + 1).map(s => s.colorHex).join(', ')})`,
              }}
            />
          </div>

          {/* Stage nodes */}
          <div className="flex justify-between mt-3">
            {variety.stages.map((s, i) => {
              const Icon = stageIcons[i]
              return (
                <button
                  key={i}
                  onClick={() => setActiveStage(i)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 border-2',
                      i === activeStage
                        ? `${s.color} border-white text-white shadow-md scale-110`
                        : i < activeStage
                          ? `${s.color} border-transparent text-white`
                          : 'bg-surface border-border text-foreground-muted group-hover:border-primary/30'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium text-center leading-tight max-w-[70px]',
                    i === activeStage ? 'text-foreground font-semibold' : 'text-foreground-muted'
                  )}>
                    {s.name}
                  </span>
                  <span className="text-[9px] text-foreground-muted">
                    Day {s.dayRange[0]}–{s.dayRange[1]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Stage Detail Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedId}-${activeStage}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="overflow-hidden">
              <div className={cn('h-1.5', stage.color)} />
              <CardContent className="p-5 sm:p-6 space-y-5">
                {/* Stage header */}
                <div className="flex items-start gap-3">
                  <div className={cn('p-2.5 rounded-xl text-white', stage.color)}>
                    <StageIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold font-display text-foreground">{stage.name}</h3>
                      <span className="px-2 py-0.5 bg-surface rounded-full text-[10px] font-semibold text-foreground-muted">
                        {stage.maturity}
                      </span>
                      <span className="text-xs text-foreground-secondary">
                        Day {stage.dayRange[0]} – {stage.dayRange[1]}
                      </span>
                    </div>
                    <p className="text-sm text-foreground-secondary mt-1 leading-relaxed">{stage.description}</p>
                  </div>
                </div>

                {/* Characteristics grid */}
                <div>
                  <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
                    <Leaf className="h-4 w-4 text-primary" /> Characteristics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { label: 'Height', value: stage.characteristics.height },
                      { label: 'Leaf Size', value: stage.characteristics.leafSize },
                      { label: 'Visual Indicators', value: stage.characteristics.visualIndicators },
                    ].map(c => (
                      <div key={c.label} className="bg-surface p-3 rounded-lg">
                        <p className="text-[10px] text-foreground-muted mb-0.5">{c.label}</p>
                        <p className="text-xs font-medium text-foreground-secondary">{c.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Care tips */}
                <div>
                  <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
                    <Sun className="h-4 w-4 text-amber-500" /> Care Tips
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { icon: Droplets, label: 'Watering', value: stage.care.watering, bg: 'bg-blue-50', color: 'text-blue-600' },
                      { icon: Sun, label: 'Sunlight', value: stage.care.sunlight, bg: 'bg-amber-50', color: 'text-amber-600' },
                      { icon: Leaf, label: 'Fertilization', value: stage.care.fertilization, bg: 'bg-green-50', color: 'text-green-600' },
                      { icon: Thermometer, label: 'Temperature', value: stage.care.temperature, bg: 'bg-purple-50', color: 'text-purple-600' },
                    ].map(t => (
                      <div key={t.label} className={cn('p-3 rounded-lg', t.bg)}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <t.icon className={cn('h-3 w-3', t.color)} />
                          <p className={cn('text-[10px]', t.color)}>{t.label}</p>
                        </div>
                        <p className="text-xs font-medium text-foreground-secondary">{t.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Navigation arrows */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <button
                    onClick={() => setActiveStage(Math.max(0, activeStage - 1))}
                    disabled={activeStage === 0}
                    className={cn(
                      'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors',
                      activeStage === 0
                        ? 'text-foreground-muted cursor-not-allowed'
                        : 'text-primary hover:bg-primary/5'
                    )}
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" /> Previous
                  </button>
                  <span className="text-xs text-foreground-muted">
                    Stage {activeStage + 1} of {variety.stages.length}
                  </span>
                  <button
                    onClick={() => setActiveStage(Math.min(variety.stages.length - 1, activeStage + 1))}
                    disabled={activeStage === variety.stages.length - 1}
                    className={cn(
                      'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors',
                      activeStage === variety.stages.length - 1
                        ? 'text-foreground-muted cursor-not-allowed'
                        : 'text-primary hover:bg-primary/5'
                    )}
                  >
                    Next <ChevronDown className="h-4 w-4 -rotate-90" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Growing Conditions Summary */}
      <section>
        <h2 className="page-subtitle mb-4">Growing Conditions — {variety.name}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Thermometer, label: 'Climate', value: variety.summary.climate, bg: 'bg-green-50', color: 'text-green-600' },
            { icon: Droplets, label: 'Soil', value: variety.summary.soil, bg: 'bg-blue-50', color: 'text-blue-600' },
            { icon: Sprout, label: 'Spacing', value: variety.summary.spacing, bg: 'bg-amber-50', color: 'text-amber-600' },
            { icon: Leaf, label: 'Companions', value: variety.summary.companions, bg: 'bg-purple-50', color: 'text-purple-600' },
          ].map((item) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="h-full hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-4">
                  <div className={cn('inline-flex p-2 rounded-lg mb-2', item.bg)}>
                    <item.icon className={cn('h-4 w-4', item.color)} />
                  </div>
                  <p className="text-xs text-foreground-muted mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium text-foreground-secondary">{item.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
