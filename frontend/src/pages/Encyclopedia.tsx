import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Thermometer, MapPin, Leaf, ChefHat, Scale, Clock, Sun,
  Droplets, Info, Ruler, Zap, X, Bug, ShieldCheck, Sprout, Heart,
  Beaker, Package
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Disease {
  name: string
  pathogen: string
  symptoms: string[]
  management: string[]
}

interface DevelopmentalStage {
  stage: string
  days: string
  description: string
  icon: string
}

interface SpeciesInfo {
  genus: string
  species: string
  cultivarGroup: string
  chromosomeNumber: string
  pollinationType: string
  fruitType: string
  capsaicinoids: string[]
}

interface ChiliVariety {
  id: string; name: string; scientificName: string; localNames: string[]
  description: string; origin: string; shuRange: { min: number; max: number }
  heatLevel: 'Mild' | 'Medium' | 'Hot' | 'Extra Hot'
  flavorProfile: string[]
  appearance: { color: string; shape: string; size: string; texture: string }
  culinaryUses: string[]; pairings: string[]
  growing: { climate: string; sunlight: string; water: string; harvestTime: string; difficulty: string }
  nutritionalBenefits: string[]; funFacts: string[]; image: string
  diseases: Disease[]
  developmentalStages: DevelopmentalStage[]
  speciesInfo: SpeciesInfo
  medicinalUses: string[]
  industrialUses: string[]
}

const chiliVarieties: ChiliVariety[] = [
  {
    id: 'siling-haba', name: 'Siling Haba', scientificName: 'Capsicum annuum var. longum',
    localNames: ['Siling Pangsigang', 'Finger Chili', 'Long Green Chili'],
    description: 'Siling Haba, meaning "long chili" in Filipino, is the most commonly used chili pepper in Philippine cuisine. Known for its mild heat and slightly sweet flavor, it\'s a staple ingredient in traditional dishes like sinigang and pinakbet.',
    origin: 'Philippines (cultivated throughout the archipelago)',
    shuRange: { min: 0, max: 15000 }, heatLevel: 'Mild',
    flavorProfile: ['Slightly sweet', 'Mild heat', 'Fresh', 'Grassy'],
    appearance: { color: 'Green when unripe, turns red/orange when mature', shape: 'Long, slender, finger-like', size: '7-12 cm length, 1-2 cm width', texture: 'Smooth, thin-walled, crisp' },
    culinaryUses: ['Sinigang (sour soup)', 'Pinakbet (vegetable stew)', 'Sawsawan (dipping sauces)', 'Ginisang dishes', 'Paksiw (vinegar-based dishes)', 'Fresh garnish for soups'],
    pairings: ['Pork', 'Fish', 'Tamarind', 'Tomatoes', 'Shrimp paste', 'Vinegar'],
    growing: { climate: 'Tropical, 25-35°C', sunlight: 'Full sun (6-8 hours)', water: 'Regular, well-drained soil', harvestTime: '60-75 days after transplanting', difficulty: 'Easy - great for beginners' },
    nutritionalBenefits: ['High in Vitamin C', 'Good source of Vitamin A', 'Contains capsaicin (metabolism boost)', 'Low in calories', 'Rich in antioxidants'],
    funFacts: ['Most widely cultivated chili in the Philippines', 'Can be eaten raw due to mild heat', 'The seeds contain most of the capsaicin', 'Green peppers have less heat than red ones'],
    image: '/images/haba.webp',
    diseases: [
      { name: 'Bacterial Wilt', pathogen: 'Ralstonia solanacearum', symptoms: ['Sudden wilting of entire plant', 'Brown vascular discoloration', 'Slimy bacterial ooze when stem is cut'], management: ['Use resistant varieties', 'Practice crop rotation (3+ years)', 'Remove and destroy infected plants immediately', 'Improve soil drainage'] },
      { name: 'Anthracnose', pathogen: 'Colletotrichum capsici', symptoms: ['Dark sunken lesions on fruit', 'Concentric ring patterns on affected areas', 'Premature fruit drop'], management: ['Apply copper-based fungicide preventively', 'Avoid overhead irrigation', 'Harvest promptly when ripe', 'Use certified disease-free seeds'] },
      { name: 'Leaf Curl Virus', pathogen: 'Begomovirus (whitefly-transmitted)', symptoms: ['Upward curling and distortion of leaves', 'Stunted growth', 'Yellowing leaf margins', 'Reduced fruit set'], management: ['Control whitefly populations with neem oil', 'Use reflective mulch to repel vectors', 'Remove infected plants early', 'Plant resistant cultivars'] },
    ],
    developmentalStages: [
      { stage: 'Germination', days: '7–14 days', description: 'Seeds sprout in warm seedbed (28–32 °C). Keep soil moist, not waterlogged.', icon: 'sprout' },
      { stage: 'Seedling', days: '15–28 days', description: 'First true leaves appear. Begin hardening off under partial shade.', icon: 'leaf' },
      { stage: 'Vegetative Growth', days: '29–56 days', description: 'Rapid leaf and stem growth. Apply NPK 14-14-14 every 2 weeks.', icon: 'trending' },
      { stage: 'Flowering', days: '57–70 days', description: 'White flowers emerge. Ensure pollinators have access. Reduce nitrogen.', icon: 'flower' },
      { stage: 'Fruit Set', days: '71–85 days', description: 'Small green pods form. Increase potassium for fruit development.', icon: 'circle' },
      { stage: 'Harvest', days: '86–110 days', description: 'Pods reach 7–12 cm. Harvest every 3–4 days for continuous fruiting.', icon: 'scissors' },
    ],
    speciesInfo: {
      genus: 'Capsicum', species: 'annuum', cultivarGroup: 'Longum Group',
      chromosomeNumber: '2n = 24', pollinationType: 'Self-pollinating (can cross with wind/insects)',
      fruitType: 'Berry (botanically)', capsaicinoids: ['Capsaicin', 'Dihydrocapsaicin', 'Nordihydrocapsaicin'],
    },
    medicinalUses: ['Traditional remedy for indigestion and bloating', 'Used as topical pain relief in folk medicine', 'Believed to boost immune system due to high Vitamin C', 'Applied as poultice for joint pain in rural areas'],
    industrialUses: ['Food coloring (paprika extracts)', 'Dried and powdered for commercial spice blends', 'Ingredient in organic pest repellent sprays'],
  },
  {
    id: 'siling-labuyo', name: 'Siling Labuyo', scientificName: 'Capsicum frutescens',
    localNames: ['Bird\'s Eye Chili', 'Thai Chili', 'Labuyo'],
    description: 'Siling Labuyo is the iconic Philippine hot pepper, known for its intense heat packed in a small package. The name "labuyo" means "wild" in Filipino, reflecting its original growth in the wild.',
    origin: 'Native to the Philippines, found wild in forests',
    shuRange: { min: 80000, max: 100000 }, heatLevel: 'Hot',
    flavorProfile: ['Intense heat', 'Fruity undertones', 'Slightly smoky', 'Pungent'],
    appearance: { color: 'Green to bright red when ripe', shape: 'Small, pointed, conical', size: '2-3 cm length, 0.5-1 cm width', texture: 'Smooth, thin skin, compact' },
    culinaryUses: ['Bicol Express', 'Laing', 'Spicy adobo', 'Chili oil and hot sauces', 'Spicy vinegar (sukang maanghang)', 'Sisig and other pulutan'],
    pairings: ['Coconut milk', 'Pork belly', 'Shrimp paste (bagoong)', 'Vinegar', 'Garlic', 'Ginger'],
    growing: { climate: 'Tropical, 20-30°C', sunlight: 'Full sun (6-8 hours)', water: 'Moderate, avoid overwatering', harvestTime: '90-120 days after transplanting', difficulty: 'Moderate - needs consistent care' },
    nutritionalBenefits: ['Very high in capsaicin', 'Excellent source of Vitamin C', 'Boosts metabolism', 'Natural pain reliever', 'Antibacterial properties'],
    funFacts: ['One of the hottest chilies native to the Philippines', 'Birds spread the seeds (they can\'t taste capsaicin)', 'Heat increases as the pepper ripens to red', 'Used traditionally as medicine for colds'],
    image: '/images/labuyo.jfif',
    diseases: [
      { name: 'Anthracnose', pathogen: 'Colletotrichum gloeosporioides', symptoms: ['Water-soaked spots on ripe fruits', 'Black sunken lesions with salmon-pink spore masses', 'Fruit rot starting from the tip'], management: ['Apply mancozeb or copper fungicide preventively', 'Avoid harvesting during wet conditions', 'Practice 2-year crop rotation', 'Remove and burn infected fruit debris'] },
      { name: 'Cercospora Leaf Spot', pathogen: 'Cercospora capsici', symptoms: ['Circular brown spots with gray centers on leaves', 'Yellow halo around lesions', 'Severe defoliation in wet weather'], management: ['Improve air circulation by proper spacing', 'Apply chlorothalonil at first sign of disease', 'Avoid overhead watering', 'Remove and destroy infected leaves'] },
      { name: 'Root Rot', pathogen: 'Phytophthora capsici', symptoms: ['Wilting despite adequate moisture', 'Brown/black discoloration at stem base', 'Root system dark and mushy'], management: ['Ensure proper drainage — never waterlog', 'Raise beds 15–20 cm in rainy season', 'Apply metalaxyl as preventive drench', 'Avoid planting in previously infected soil'] },
    ],
    developmentalStages: [
      { stage: 'Germination', days: '10–21 days', description: 'Slow germination; keep tray warm (30 °C+) and covered with plastic dome.', icon: 'sprout' },
      { stage: 'Seedling', days: '22–35 days', description: 'Tiny seedlings with narrow leaves. Handle carefully during transplanting.', icon: 'leaf' },
      { stage: 'Vegetative Growth', days: '36–70 days', description: 'Bushy growth habit. Very drought-tolerant. Minimal fertilizer needed.', icon: 'trending' },
      { stage: 'Flowering', days: '71–90 days', description: 'Small white flowers in clusters. Self-pollinating. Gentle shaking helps.', icon: 'flower' },
      { stage: 'Fruit Set', days: '91–105 days', description: 'Tiny green pods pointing upward. Dozens per plant. Reduce watering slightly.', icon: 'circle' },
      { stage: 'Harvest', days: '106–140 days', description: 'Pods turn bright red when ripe. Harvest every 4–5 days for maximum production.', icon: 'scissors' },
    ],
    speciesInfo: {
      genus: 'Capsicum', species: 'frutescens', cultivarGroup: 'Bird Pepper Group',
      chromosomeNumber: '2n = 24', pollinationType: 'Self-pollinating (high outcrossing rate via insects)',
      fruitType: 'Berry (small, erect)', capsaicinoids: ['Capsaicin (dominant)', 'Dihydrocapsaicin', 'Homocapsaicin'],
    },
    medicinalUses: ['Traditional cold and flu remedy — chewed raw or steeped in vinegar', 'Used as counter-irritant for muscle pain', 'Believed to improve blood circulation', 'Gargled with warm water for sore throat relief'],
    industrialUses: ['Primary ingredient in Philippine hot sauce production', 'Capsaicin extraction for pharmaceutical pain patches', 'Natural insect repellent in organic farming', 'Used in pepper spray formulations'],
  },
  {
    id: 'siling-demonyo', name: 'Siling Demonyo', scientificName: 'Capsicum frutescens (hybrid)',
    localNames: ['Demon Chili', 'Philippine Demon Pepper', 'Fire Chili'],
    description: 'Siling Demonyo (Demon Chili) is a fiery hybrid variety known for its extreme heat intensity. This pepper is for serious spice enthusiasts only.',
    origin: 'Philippines (developed through selective breeding)',
    shuRange: { min: 100000, max: 225000 }, heatLevel: 'Extra Hot',
    flavorProfile: ['Extreme heat', 'Intense burn', 'Brief fruity note', 'Long-lasting fire'],
    appearance: { color: 'Deep red when fully ripe', shape: 'Small, pointed, slightly wrinkled', size: '1.5-2.5 cm length, 0.5-0.8 cm width', texture: 'Slightly wrinkled, thin but tough skin' },
    culinaryUses: ['Extreme spicy challenges', 'Ultra-hot sauces', 'Spicy condiments (use sparingly)', 'Infused oils', 'Dried and powdered for seasoning', 'Hot sauce production'],
    pairings: ['Dark chocolate', 'Mango', 'Citrus fruits', 'Honey', 'Coconut', 'Strong cheeses'],
    growing: { climate: 'Tropical, 25-35°C', sunlight: 'Full sun (8+ hours)', water: 'Moderate, stress can increase heat', harvestTime: '100-130 days after transplanting', difficulty: 'Advanced - requires experience' },
    nutritionalBenefits: ['Highest capsaicin content', 'Extreme metabolism boost', 'Powerful endorphin release', 'Strong anti-inflammatory', 'Natural appetite suppressant'],
    funFacts: ['Can be 2-3x hotter than regular Siling Labuyo', 'Handle with gloves to avoid skin burns', 'Used in "lihi challenge" viral videos', 'A single pepper can spice an entire pot of food'],
    image: '/images/demonyo.jpg',
    diseases: [
      { name: 'Bacterial Spot', pathogen: 'Xanthomonas campestris pv. vesicatoria', symptoms: ['Small water-soaked spots on leaves', 'Raised scab-like lesions on fruit', 'Leaf drop in severe cases'], management: ['Use copper hydroxide sprays preventively', 'Avoid working with plants when wet', 'Practice seed treatment with hot water (50 °C, 25 min)', 'Remove volunteer plants from previous seasons'] },
      { name: 'Phytophthora Blight', pathogen: 'Phytophthora capsici', symptoms: ['Dark water-soaked lesions on stems', 'Sudden wilting and collapse', 'White mold on fruit surface in humid conditions'], management: ['Ensure excellent drainage — use raised beds', 'Apply metalaxyl or phosphonate fungicide', 'Avoid overhead irrigation', 'Rotate with non-solanaceous crops for 3+ years'] },
      { name: 'Blossom End Rot', pathogen: 'Calcium deficiency (physiological)', symptoms: ['Dark, sunken area at fruit tip (blossom end)', 'Leathery brown/black tissue', 'Affects first fruits most often'], management: ['Maintain consistent watering schedule', 'Add lime or gypsum to soil before planting', 'Avoid excessive nitrogen fertilization', 'Mulch to maintain even soil moisture'] },
    ],
    developmentalStages: [
      { stage: 'Germination', days: '14–28 days', description: 'Very slow germination. Use heat mat (30 °C+) and humidity dome. Patience is key.', icon: 'sprout' },
      { stage: 'Seedling', days: '29–42 days', description: 'Wrinkled true leaves typical of chinense types. Grow under strong light.', icon: 'leaf' },
      { stage: 'Vegetative Growth', days: '43–90 days', description: 'Slower growth than annuum types. Apply high-nitrogen feed early. Needs warmth.', icon: 'trending' },
      { stage: 'Flowering', days: '91–112 days', description: 'Multiple flowers per node. May drop if temp > 38 °C. Reduce nitrogen now.', icon: 'flower' },
      { stage: 'Fruit Set', days: '113–133 days', description: 'Bumpy, wrinkled pods form. Increase potassium. Keep watering consistent.', icon: 'circle' },
      { stage: 'Harvest', days: '134–168 days', description: 'Pods ripen to red/orange. Extremely hot — always handle with gloves.', icon: 'scissors' },
    ],
    speciesInfo: {
      genus: 'Capsicum', species: 'frutescens × chinense (hybrid)',
      cultivarGroup: 'Super-hot Philippine Hybrid',
      chromosomeNumber: '2n = 24', pollinationType: 'Self-pollinating (interspecific hybrid)',
      fruitType: 'Berry (small, wrinkled, pendant)', capsaicinoids: ['Capsaicin (very high)', 'Dihydrocapsaicin', 'Nordihydrocapsaicin', 'Homodihydrocapsaicin'],
    },
    medicinalUses: ['Capsaicin extracts used in pain management patches', 'Research applications for anti-cancer compound studies', 'Traditional use: tiny amounts in ginger tea for cold/flu', 'Endorphin release therapy for chronic pain conditions'],
    industrialUses: ['Specialty hot sauce production (artisanal)', 'Capsaicin extraction for pharmaceutical-grade compounds', 'Animal deterrent formulations', 'Extreme heat challenge products'],
  }
]

const heatScaleData = [
  { level: 'Mild', range: '0 - 15,000 SHU', color: 'bg-green-500', examples: 'Siling Haba, Poblano, Anaheim' },
  { level: 'Medium', range: '15,000 - 50,000 SHU', color: 'bg-amber-500', examples: 'Serrano, Cayenne, Tabasco' },
  { level: 'Hot', range: '50,000 - 100,000 SHU', color: 'bg-orange-500', examples: 'Siling Labuyo, Thai Chili, Piri Piri' },
  { level: 'Extra Hot', range: '100,000+ SHU', color: 'bg-red-600', examples: 'Siling Demonyo, Habanero, Scotch Bonnet' },
]

function HeatBadge({ level }: { level: string }) {
  const c: Record<string, string> = { Mild: 'heat-gradient-mild', Medium: 'heat-gradient-medium', Hot: 'heat-gradient-hot', 'Extra Hot': 'heat-gradient-extra-hot' }
  return <span className={cn('px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm', c[level] || 'bg-gray-500')}>{level}</span>
}

function VarietyCard({ variety, isSelected, onSelect, exitDirection = 'left' }: { variety: ChiliVariety; isSelected: boolean; onSelect: () => void; exitDirection?: 'left' | 'right' }) {
  const pct = (variety.shuRange.max / 225000) * 100
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: exitDirection === 'left' ? -300 : 300 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card
        className={cn(
          'overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5',
          isSelected ? 'ring-2 ring-primary shadow-md' : ''
        )}
        onClick={onSelect}
      >
        <CardHeader className="p-0">
          <div className="relative h-40 bg-sidebar overflow-hidden">
            <img src={variety.image} alt={variety.name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <div>
                <h3 className="text-xl font-bold font-display text-white">{variety.name}</h3>
                <p className="text-white/60 text-xs italic">{variety.scientificName}</p>
              </div>
              <HeatBadge level={variety.heatLevel} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-foreground-secondary text-sm mb-4 leading-relaxed">{variety.description}</p>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground-secondary">Heat Level</span>
              <span className="text-xs font-bold text-chili">{variety.shuRange.min.toLocaleString()} – {variety.shuRange.max.toLocaleString()} SHU</span>
            </div>
            <div className="h-2.5 bg-surface rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-green-500 via-amber-500 via-orange-500 to-red-600" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} viewport={{ once: true }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-xs"><MapPin className="h-3.5 w-3.5 text-primary" /><span className="text-foreground-secondary">{variety.origin}</span></div>
            <div className="flex items-center gap-2 text-xs"><Ruler className="h-3.5 w-3.5 text-primary" /><span className="text-foreground-secondary">{variety.appearance.size}</span></div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {variety.flavorProfile.map((f, i) => <span key={i} className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-medium">{f}</span>)}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DetailPanel({ variety, onClose }: { variety: ChiliVariety; onClose: () => void }) {
  return (
    <motion.div
      key={variety.id}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex-1 min-w-0"
    >
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-sidebar shrink-0">
              <img src={variety.image} alt={variety.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold font-display text-foreground truncate">{variety.name}</h3>
              <p className="text-xs text-foreground-muted italic truncate">{variety.scientificName}</p>
            </div>
            <HeatBadge level={variety.heatLevel} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface transition-colors shrink-0 ml-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Detail content */}
        <div className="p-5 space-y-5 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {/* Local Names */}
          <div>
            <p className="text-xs text-foreground-muted mb-1">Also known as</p>
            <div className="flex flex-wrap gap-1.5">
              {variety.localNames.map((n, i) => <span key={i} className="px-2.5 py-0.5 bg-surface rounded-full text-xs font-medium text-foreground-secondary">{n}</span>)}
            </div>
          </div>

          {/* Appearance */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Leaf className="h-4 w-4 text-primary" /> Appearance</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(variety.appearance).map(([k, v]) => (
                <div key={k} className="bg-surface p-2.5 rounded-lg">
                  <p className="text-[10px] text-foreground-muted capitalize mb-0.5">{k}</p>
                  <p className="text-xs font-medium text-foreground-secondary">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Culinary Uses */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><ChefHat className="h-4 w-4 text-primary" /> Culinary Uses</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {variety.culinaryUses.map((u, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-foreground-secondary"><span className="text-primary mt-0.5">•</span>{u}</li>)}
            </ul>
          </div>

          {/* Best Pairings */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Scale className="h-4 w-4 text-primary" /> Best Pairings</h4>
            <div className="flex flex-wrap gap-1.5">
              {variety.pairings.map((p, i) => <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">{p}</span>)}
            </div>
          </div>

          {/* Growing Information */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Sun className="h-4 w-4 text-primary" /> Growing Information</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { icon: Thermometer, label: 'Climate', value: variety.growing.climate, bg: 'bg-green-50', color: 'text-green-600' },
                { icon: Sun, label: 'Sunlight', value: variety.growing.sunlight, bg: 'bg-amber-50', color: 'text-amber-600' },
                { icon: Droplets, label: 'Water', value: variety.growing.water, bg: 'bg-blue-50', color: 'text-blue-600' },
                { icon: Clock, label: 'Harvest', value: variety.growing.harvestTime, bg: 'bg-purple-50', color: 'text-purple-600' },
                { icon: Zap, label: 'Difficulty', value: variety.growing.difficulty, bg: 'bg-orange-50', color: 'text-orange-600' },
              ].map((g) => (
                <div key={g.label} className={`${g.bg} p-2.5 rounded-lg`}>
                  <div className="flex items-center gap-1 mb-0.5"><g.icon className={`h-3 w-3 ${g.color}`} /><p className={`text-[10px] ${g.color}`}>{g.label}</p></div>
                  <p className="text-xs font-medium text-foreground-secondary">{g.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Nutritional Benefits */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Leaf className="h-4 w-4 text-secondary" /> Nutritional Benefits</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {variety.nutritionalBenefits.map((b, i) => <li key={i} className="flex items-center gap-1.5 text-xs text-foreground-secondary"><span className="h-1.5 w-1.5 bg-secondary rounded-full" />{b}</li>)}
            </ul>
          </div>

          {/* Fun Facts */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Info className="h-4 w-4 text-primary" /> Fun Facts</h4>
            <div className="bg-primary/5 rounded-xl p-3">
              <ul className="space-y-1.5">
                {variety.funFacts.map((f, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-foreground-secondary"><span className="text-primary font-bold">{i + 1}.</span>{f}</li>)}
              </ul>
            </div>
          </div>

          {/* Species & Taxonomy */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Beaker className="h-4 w-4 text-indigo-600" /> Species & Taxonomy</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Genus', value: variety.speciesInfo.genus },
                { label: 'Species', value: variety.speciesInfo.species },
                { label: 'Cultivar Group', value: variety.speciesInfo.cultivarGroup },
                { label: 'Chromosomes', value: variety.speciesInfo.chromosomeNumber },
                { label: 'Pollination', value: variety.speciesInfo.pollinationType },
                { label: 'Fruit Type', value: variety.speciesInfo.fruitType },
              ].map((item) => (
                <div key={item.label} className="bg-indigo-50 p-2.5 rounded-lg">
                  <p className="text-[10px] text-indigo-400 mb-0.5">{item.label}</p>
                  <p className="text-xs font-medium text-foreground-secondary">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 bg-indigo-50 rounded-lg p-2.5">
              <p className="text-[10px] text-indigo-400 mb-1">Key Capsaicinoids</p>
              <div className="flex flex-wrap gap-1.5">
                {variety.speciesInfo.capsaicinoids.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white rounded-full text-[10px] font-medium text-indigo-600">{c}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Developmental Stages */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Sprout className="h-4 w-4 text-green-600" /> Developmental Stages</h4>
            <div className="relative">
              <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-green-200" />
              <div className="space-y-1">
                {variety.developmentalStages.map((stage, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-green-50/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 z-10 text-[10px] font-bold border-2 border-white">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-green-700">{stage.stage}</span>
                        <span className="text-[10px] text-foreground-muted bg-green-100 px-1.5 py-0.5 rounded-full">{stage.days}</span>
                      </div>
                      <p className="text-[11px] text-foreground-muted leading-relaxed mt-0.5">{stage.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Common Diseases */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Bug className="h-4 w-4 text-red-500" /> Common Diseases</h4>
            <div className="space-y-3">
              {variety.diseases.map((disease, i) => (
                <div key={i} className="bg-red-50/50 rounded-xl p-3 border border-red-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-red-500" />
                    <p className="text-xs font-bold text-red-700">{disease.name}</p>
                  </div>
                  <p className="text-[10px] text-red-400 italic mb-2">Pathogen: {disease.pathogen}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-semibold text-foreground-muted mb-1">Symptoms</p>
                      <ul className="space-y-0.5">
                        {disease.symptoms.map((s, j) => (
                          <li key={j} className="flex items-start gap-1 text-[10px] text-foreground-secondary">
                            <span className="text-red-400 mt-0.5">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-foreground-muted mb-1">Management</p>
                      <ul className="space-y-0.5">
                        {disease.management.map((m, j) => (
                          <li key={j} className="flex items-start gap-1 text-[10px] text-foreground-secondary">
                            <span className="text-green-500 mt-0.5">✓</span>{m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Medicinal & Industrial Uses */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Heart className="h-4 w-4 text-pink-500" /> Medicinal Uses</h4>
              <ul className="space-y-1.5">
                {variety.medicinalUses.map((u, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground-secondary bg-pink-50/50 rounded-lg p-2">
                    <span className="text-pink-400 mt-0.5">•</span>{u}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Package className="h-4 w-4 text-cyan-600" /> Industrial Uses</h4>
              <ul className="space-y-1.5">
                {variety.industrialUses.map((u, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground-secondary bg-cyan-50/50 rounded-lg p-2">
                    <span className="text-cyan-500 mt-0.5">•</span>{u}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default function Encyclopedia() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedVariety = selectedId ? chiliVarieties.find(v => v.id === selectedId) : null

  return (
    <div className="page-container space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-xs font-medium text-primary mb-3">
          <Flame className="h-3.5 w-3.5" /> Philippine Chili Guide
        </div>
        <h1 className="page-title">Chili Encyclopedia</h1>
        <p className="text-foreground-secondary max-w-2xl">
          Discover the rich variety of Philippine chili peppers. Learn about their heat levels, flavor profiles, culinary uses, and growing tips.
        </p>
      </div>

      {/* Scoville Scale */}
      <section>
        <h2 className="page-subtitle mb-4">Understanding the Scoville Scale</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {heatScaleData.map((item, i) => (
            <motion.div key={item.level} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}>
              <Card className="h-full hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-5">
                  <div className={cn('w-full h-2 rounded-full mb-3', item.color)} />
                  <h3 className="font-bold text-foreground mb-0.5">{item.level}</h3>
                  <p className="text-chili font-semibold text-sm mb-2">{item.range}</p>
                  <p className="text-xs text-foreground-muted">{item.examples}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Varieties — master-detail layout */}
      <section>
        <h2 className="page-subtitle mb-4">Philippine Chili Varieties</h2>

        {/* When no card selected: show all cards in a grid */}
        <AnimatePresence mode="wait">
          {!selectedVariety && (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {chiliVarieties.map((v) => (
                <VarietyCard
                  key={v.id}
                  variety={v}
                  isSelected={false}
                  onSelect={() => setSelectedId(v.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* When a card is selected: selected card on left, detail on right */}
        <AnimatePresence mode="wait">
          {selectedVariety && (
            <motion.div
              key="detail-layout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col lg:flex-row gap-6"
            >
              {/* Selected card pinned on the left */}
              <div className="lg:w-[35%] shrink-0">
                <VarietyCard
                  variety={selectedVariety}
                  isSelected={true}
                  onSelect={() => setSelectedId(null)}
                />
              </div>

              {/* Detail panel on the right */}
              <DetailPanel
                variety={selectedVariety}
                onClose={() => setSelectedId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Comparison Table */}
      <section>
        <h2 className="page-subtitle mb-4">Quick Comparison</h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-sidebar text-white">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-bold">Variety</th>
                  <th className="px-5 py-3 text-left text-sm font-bold">Heat (SHU)</th>
                  <th className="px-5 py-3 text-left text-sm font-bold">Size</th>
                  <th className="px-5 py-3 text-left text-sm font-bold">Best For</th>
                  <th className="px-5 py-3 text-left text-sm font-bold">Difficulty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {chiliVarieties.map((v) => (
                  <tr key={v.id} className="hover:bg-surface transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Flame className="h-4 w-4 text-primary" /></div>
                        <div><p className="font-bold text-sm text-foreground">{v.name}</p><p className="text-[10px] text-foreground-muted">{v.heatLevel}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground-secondary">{v.shuRange.min.toLocaleString()} – {v.shuRange.max.toLocaleString()}</td>
                    <td className="px-5 py-3 text-sm text-foreground-secondary">{v.appearance.size}</td>
                    <td className="px-5 py-3 text-sm text-foreground-secondary">{v.culinaryUses[0]}</td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-medium',
                        v.growing.difficulty.includes('Easy') ? 'bg-green-100 text-green-700' :
                        v.growing.difficulty.includes('Moderate') ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      )}>{v.growing.difficulty.split(' - ')[0]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  )
}
