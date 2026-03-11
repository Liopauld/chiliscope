import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin, Filter, Flame, Leaf, X, ChevronDown, ChevronUp,
  Store, Tractor, Star, Navigation, Info, ExternalLink,
  Locate, Route, Loader2, MapPinOff,
  Clock, ArrowUp, ArrowLeft, ArrowRight, CornerUpLeft, CornerUpRight,
  MoveUp, CircleDot, Flag, Navigation2, RotateCw, ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

// ─── Chili Type Definitions ───────────────────────────────────────────────────

type ChiliType = 'siling_labuyo' | 'siling_haba' | 'siling_demonyo'
type SpotType = 'market' | 'farm' | 'both'

interface ChiliInfo {
  id: ChiliType
  name: string
  tagalog: string
  shu: string
  heatLevel: string
  color: string
  bgColor: string
  borderColor: string
  markerColor: string
  icon: string
  description: string
}

const CHILI_TYPES: Record<ChiliType, ChiliInfo> = {
  siling_labuyo: {
    id: 'siling_labuyo',
    name: 'Siling Labuyo',
    tagalog: "Bird's Eye Chili",
    shu: '80,000–100,000 SHU',
    heatLevel: 'Hot 🔥🔥🔥',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    markerColor: '#dc2626',
    icon: '🌶️',
    description: 'The iconic Filipino hot chili. Small but fiery, essential for sawsawan and spicy soups.',
  },
  siling_haba: {
    id: 'siling_haba',
    name: 'Siling Haba',
    tagalog: 'Finger Chili / Long Chili',
    shu: '5,000–15,000 SHU',
    heatLevel: 'Mild-Medium 🔥',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    markerColor: '#16a34a',
    icon: '🫑',
    description: 'The versatile long chili used in stir-fries, Bicol Express, and everyday cooking.',
  },
  siling_demonyo: {
    id: 'siling_demonyo',
    name: 'Siling Demonyo',
    tagalog: 'Demon Chili',
    shu: '100,000–150,000+ SHU',
    heatLevel: 'Extra Hot 🔥🔥🔥🔥',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    markerColor: '#ea580c',
    icon: '🔥',
    description: 'The fearsome demon chili — even hotter than Labuyo. Prized for artisanal hot sauces.',
  },
}

// ─── Hotspot Data ─────────────────────────────────────────────────────────────

interface Hotspot {
  id: string
  name: string
  region: string
  province: string
  lat: number
  lng: number
  type: SpotType
  chilies: ChiliType[]
  description: string
  famous_for: string
  rating: number // 1-5
  best_season: string
  tips?: string
}

const HOTSPOTS: Hotspot[] = [
  // ── Bicol Region (Chili Capital) ──
  {
    id: 'naga-market',
    name: 'Naga City Public Market',
    region: 'Bicol Region',
    province: 'Camarines Sur',
    lat: 13.6218,
    lng: 123.1948,
    type: 'market',
    chilies: ['siling_labuyo', 'siling_haba', 'siling_demonyo'],
    description: 'The heart of Bicolano chili culture. Naga City is considered the chili capital of the Philippines with abundant supply of all three major varieties.',
    famous_for: 'Bicol Express ingredients, fresh Siling Labuyo, wholesale chili trading',
    rating: 5,
    best_season: 'Year-round (peak: March–May)',
    tips: 'Visit early morning for the freshest picks. Vendors near the wet market section have the best Siling Demonyo.',
  },
  {
    id: 'legazpi-farms',
    name: 'Legazpi Chili Farms',
    region: 'Bicol Region',
    province: 'Albay',
    lat: 13.1391,
    lng: 123.7438,
    type: 'farm',
    chilies: ['siling_labuyo', 'siling_haba', 'siling_demonyo'],
    description: 'Vast chili farms at the foot of Mayon Volcano. The volcanic soil makes for exceptionally flavorful and spicy chilies.',
    famous_for: 'Volcanic soil-grown chilies, farm tours, Siling Demonyo cultivation',
    rating: 5,
    best_season: 'October–May (dry season)',
    tips: 'Some farms offer u-pick experiences. Ask about the "demonyo challenge" — eating a fresh Siling Demonyo straight from the vine!',
  },
  {
    id: 'sorsogon-farms',
    name: 'Sorsogon Pepper Farms',
    region: 'Bicol Region',
    province: 'Sorsogon',
    lat: 12.9742,
    lng: 124.0050,
    type: 'farm',
    chilies: ['siling_labuyo', 'siling_haba'],
    description: 'Southern Bicol chili farms specializing in organic, pesticide-free cultivation. Major supplier for Bicolano restaurants.',
    famous_for: 'Organic Siling Labuyo, traditional laing ingredients',
    rating: 4,
    best_season: 'November–April',
  },
  {
    id: 'iriga-market',
    name: 'Iriga City Market',
    region: 'Bicol Region',
    province: 'Camarines Sur',
    lat: 13.4230,
    lng: 123.4125,
    type: 'market',
    chilies: ['siling_labuyo', 'siling_haba', 'siling_demonyo'],
    description: 'A bustling market known for its affordable chili prices. A favorite sourcing point for chili-based products.',
    famous_for: 'Bulk Siling Haba, dried chili flakes, cheap wholesale',
    rating: 4,
    best_season: 'Year-round',
  },

  // ── Metro Manila ──
  {
    id: 'dangwa-market',
    name: 'Dangwa & Divisoria Market',
    region: 'Metro Manila',
    province: 'Manila',
    lat: 14.6042,
    lng: 120.9822,
    type: 'market',
    chilies: ['siling_labuyo', 'siling_haba'],
    description: 'The largest wholesale market in Metro Manila. Chili vendors from across the country supply fresh and dried varieties here.',
    famous_for: 'Wholesale Siling Labuyo, bulk Siling Haba, dried chili imports',
    rating: 4,
    best_season: 'Year-round',
    tips: 'Arrive before 6 AM for the best wholesale prices. Look for vendors from Bicol — they carry the spiciest Labuyo.',
  },
  {
    id: 'quezon-commonwealth',
    name: 'Commonwealth Market',
    region: 'Metro Manila',
    province: 'Quezon City',
    lat: 14.6860,
    lng: 121.0870,
    type: 'market',
    chilies: ['siling_labuyo', 'siling_haba'],
    description: 'Popular Metro Manila wet market with a dedicated spice and chili section. Known for competitive prices and fresh stock.',
    famous_for: 'Retail-friendly quantities, fresh daily supply from Bicol/Pangasinan',
    rating: 3,
    best_season: 'Year-round',
  },

  // ── Pangasinan / Ilocos ──
  {
    id: 'pangasinan-farms',
    name: 'Pangasinan Chili Fields',
    region: 'Ilocos Region',
    province: 'Pangasinan',
    lat: 15.8949,
    lng: 120.2863,
    type: 'farm',
    chilies: ['siling_haba', 'siling_labuyo'],
    description: 'Major chili-producing province in Northern Luzon. Vast farmlands dedicated to Siling Haba production for Metro Manila supply.',
    famous_for: 'Largest Siling Haba production in Luzon, commercial farming',
    rating: 4,
    best_season: 'October–March',
    tips: 'The farms in Villasis and Urdaneta are particularly renowned. Some offer bulk purchase direct from farm.',
  },
  {
    id: 'vigan-market',
    name: 'Vigan Public Market',
    region: 'Ilocos Region',
    province: 'Ilocos Sur',
    lat: 17.5747,
    lng: 120.3869,
    type: 'market',
    chilies: ['siling_labuyo', 'siling_haba'],
    description: 'Historic market in the heritage city of Vigan. Known for locally grown Ilocano chili varieties and traditional spice blends.',
    famous_for: 'Siling Labuyo-based vinegar (sukang Iloko), Ilocano chili pastes',
    rating: 4,
    best_season: 'Year-round',
  },

  // ── Western Visayas ──
  {
    id: 'iloilo-jaro',
    name: 'Jaro Wet Market',
    region: 'Western Visayas',
    province: 'Iloilo',
    lat: 10.7202,
    lng: 122.5621,
    type: 'market',
    chilies: ['siling_labuyo', 'siling_haba'],
    description: 'Major chili trading hub in the Visayas. Receives supply from local Panay Island farms and Mindanao.',
    famous_for: 'Fresh Siling Labuyo from Panay farms, KBL (kadios baboy langka) chili garnish',
    rating: 4,
    best_season: 'Year-round',
  },
  {
    id: 'negros-farms',
    name: 'Negros Occidental Chili Farms',
    region: 'Western Visayas',
    province: 'Negros Occidental',
    lat: 10.0073,
    lng: 122.6603,
    type: 'farm',
    chilies: ['siling_labuyo', 'siling_demonyo'],
    description: 'Sugar-and-spice province! Negros farms have started cultivating Siling Demonyo alongside their traditional Labuyo crops.',
    famous_for: 'Emerging Siling Demonyo cultivation, artisanal hot sauce producers',
    rating: 3,
    best_season: 'November–April',
  },

  // ── Cebu / Central Visayas ──
  {
    id: 'cebu-carbon',
    name: 'Carbon Market',
    region: 'Central Visayas',
    province: 'Cebu',
    lat: 10.2934,
    lng: 123.9010,
    type: 'market',
    chilies: ['siling_labuyo', 'siling_haba'],
    description: 'The oldest and largest public market in Cebu. A treasure trove of spices including fresh and dried Siling Labuyo.',
    famous_for: 'Dried Siling Labuyo, chili vinegar, lechon spice blends',
    rating: 4,
    best_season: 'Year-round',
    tips: 'Carbon Market is being redeveloped — check current status. Vendors in Section 5 specialize in spices.',
  },

  // ── Davao / Mindanao ──
  {
    id: 'davao-bankerohan',
    name: 'Bankerohan Public Market',
    region: 'Davao Region',
    province: 'Davao del Sur',
    lat: 7.0644,
    lng: 125.6095,
    type: 'market',
    chilies: ['siling_labuyo', 'siling_haba', 'siling_demonyo'],
    description: 'The largest market in Mindanao. All three major chili varieties are available, with some Mindanao-grown Siling Demonyo variants.',
    famous_for: 'Mindanao-grown Siling Demonyo, fresh Labuyo, spicy tuna paste ingredients',
    rating: 5,
    best_season: 'Year-round',
    tips: 'The fruit and vegetable section near Gate 3 has the best chili vendors. Try asking for "labuyo pula" — the extra-red variety.',
  },
  {
    id: 'cotabato-farms',
    name: 'North Cotabato Chili Farms',
    region: 'SOCCSKSARGEN',
    province: 'North Cotabato',
    lat: 7.1462,
    lng: 124.8451,
    type: 'farm',
    chilies: ['siling_labuyo', 'siling_haba'],
    description: 'Emerging chili farming area in Mindanao with growing commercial production. Known for particularly pungent Labuyo.',
    famous_for: 'Extra-spicy Siling Labuyo, Halal chili products',
    rating: 3,
    best_season: 'November–April',
  },
  {
    id: 'cagayan-oro',
    name: 'Cogon Market',
    region: 'Northern Mindanao',
    province: 'Misamis Oriental',
    lat: 8.4542,
    lng: 124.6319,
    type: 'market',
    chilies: ['siling_labuyo', 'siling_haba'],
    description: 'Major market hub in Northern Mindanao serving CDO and surrounding provinces. Fresh chili supply from Bukidnon highlands.',
    famous_for: 'Highland-grown Siling Labuyo, competitive pricing',
    rating: 3,
    best_season: 'Year-round',
  },

  // ── Zamboanga ──
  {
    id: 'zamboanga-market',
    name: 'Zamboanga City Market',
    region: 'Zamboanga Peninsula',
    province: 'Zamboanga del Sur',
    lat: 6.9214,
    lng: 122.0790,
    type: 'both',
    chilies: ['siling_labuyo', 'siling_haba'],
    description: 'Vibrant market influenced by Chabacano culture. Known for unique chili-based condiments and sauces with Spanish influence.',
    famous_for: 'Chili-vinegar sawsawan, curacha spice blends, unique Zamboangueño chili pastes',
    rating: 4,
    best_season: 'Year-round',
  },

  // ── Batangas / Calabarzon ──
  {
    id: 'batangas-lipa',
    name: 'Lipa City Farms & Market',
    region: 'CALABARZON',
    province: 'Batangas',
    lat: 13.9411,
    lng: 121.1630,
    type: 'both',
    chilies: ['siling_labuyo', 'siling_haba'],
    description: 'Agricultural hub near Metro Manila. Batangas is a major supplier of both Siling Labuyo and Siling Haba to the capital region.',
    famous_for: 'Farm-to-table chili supply for Manila, kapeng barako spiced with Labuyo',
    rating: 4,
    best_season: 'October–May',
    tips: 'Visit the Saturday farmers\' market for organic varieties. Local farms welcome visitors by appointment.',
  },

  // ── Pampanga ──
  {
    id: 'pampanga-market',
    name: 'San Fernando Public Market',
    region: 'Central Luzon',
    province: 'Pampanga',
    lat: 14.9551,
    lng: 120.6898,
    type: 'market',
    chilies: ['siling_haba', 'siling_labuyo'],
    description: 'The culinary capital of the Philippines! Pampanga\'s market is where top chefs source their chilies for award-winning dishes.',
    famous_for: 'Chef-quality Siling Haba, sisig chili components, gourmet chili oils',
    rating: 4,
    best_season: 'Year-round',
    tips: 'Ask Kapampangan vendors for their homemade chili garlic oil — it\'s legendary.',
  },

  // ── Cagayan Valley ──
  {
    id: 'tuguegarao',
    name: 'Tuguegarao Chili Farms',
    region: 'Cagayan Valley',
    province: 'Cagayan',
    lat: 17.6132,
    lng: 121.7270,
    type: 'farm',
    chilies: ['siling_labuyo'],
    description: 'The hottest province in the Philippines (both temperature and chili!). Cagayan\'s extreme heat produces exceptionally potent Siling Labuyo.',
    famous_for: 'Super-hot Siling Labuyo, pancit batil patong chili garnish',
    rating: 3,
    best_season: 'October–March',
  },
]

// ─── Custom Marker Icons ──────────────────────────────────────────────────────

const createChiliIcon = (colors: string[], spotType: SpotType) => {
  const primaryColor = colors[0] || '#dc2626'
  const isMultiple = colors.length > 1
  const borderColor = spotType === 'farm' ? '#16a34a' : spotType === 'both' ? '#9333ea' : '#dc2626'
  
  return L.divIcon({
    className: 'custom-chili-marker',
    html: `
      <div style="
        width: 36px; height: 36px;
        background: linear-gradient(135deg, ${primaryColor}, ${colors[1] || primaryColor});
        border: 3px solid ${borderColor};
        border-radius: 50% 50% 50% 4px;
        transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 3px 12px rgba(0,0,0,0.3);
        position: relative;
      ">
        <span style="transform: rotate(45deg); font-size: 16px; line-height: 1;">
          ${spotType === 'farm' ? '🌱' : spotType === 'both' ? '⭐' : '🏪'}
        </span>
      </div>
      ${isMultiple ? `<div style="
        position: absolute; top: -6px; right: -6px;
        width: 18px; height: 18px;
        background: #f97316; color: white;
        border-radius: 50%; font-size: 10px;
        display: flex; align-items: center; justify-content: center;
        font-weight: bold; border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      ">${colors.length}</div>` : ''}
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

// ─── Philippines Bounds ───────────────────────────────────────────────────────

const PH_BOUNDS: L.LatLngBoundsExpression = [
  [4.2, 114.0],   // Southwest corner (south of Tawi-Tawi, west of Palawan)
  [21.5, 127.5],  // Northeast corner (north of Batanes, east of Eastern Samar)
]
const PH_MIN_ZOOM = 5
const PH_MAX_ZOOM = 18

// ─── User Location Marker ─────────────────────────────────────────────────────

const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        width: 20px; height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      ">
        <div style="
          position: absolute; inset: -8px;
          border: 2px solid rgba(59,130,246,0.25);
          border-radius: 50%;
          animation: userPulse 2s ease-out infinite;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  })
}

// ─── Map Recenter Component ───────────────────────────────────────────────────

function FlyToLocation({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  map.flyTo(center, zoom, { duration: 1.5 })
  return null
}

// ─── Map Bounds Enforcer ──────────────────────────────────────────────────────

function MapBoundsEnforcer() {
  const map = useMap()
  useEffect(() => {
    map.setMaxBounds(PH_BOUNDS)
    map.setMinZoom(PH_MIN_ZOOM)
    map.setMaxZoom(PH_MAX_ZOOM)
    map.options.maxBoundsViscosity = 1.0
  }, [map])
  return null
}

// ─── Routing Types & Helpers ──────────────────────────────────────────────────

interface RouteStep {
  instruction: string
  distance: number   // meters
  duration: number   // seconds
  maneuver: string
  name: string
}

interface RouteSummary {
  totalDistance: number  // meters
  totalDuration: number  // seconds
}

interface RouteData {
  coordinates: [number, number][]
  steps: RouteStep[]
  summary: RouteSummary
}

const MANEUVER_ICONS: Record<string, React.ElementType> = {
  'turn-left': ArrowLeft,
  'turn-right': ArrowRight,
  'sharp left': CornerUpLeft,
  'sharp right': CornerUpRight,
  'slight left': ArrowLeft,
  'slight right': ArrowRight,
  'straight': ArrowUp,
  'uturn': RotateCw,
  'depart': Navigation2,
  'arrive': Flag,
  'roundabout': RotateCw,
  'rotary': RotateCw,
  'merge': MoveUp,
  'fork': ArrowRight,
  'default': CircleDot,
}

function getManeuverIcon(modifier?: string, type?: string): React.ElementType {
  if (type === 'arrive') return MANEUVER_ICONS['arrive']
  if (type === 'depart') return MANEUVER_ICONS['depart']
  if (type === 'roundabout' || type === 'rotary') return MANEUVER_ICONS['roundabout']
  if (modifier && MANEUVER_ICONS[modifier]) return MANEUVER_ICONS[modifier]
  if (type && MANEUVER_ICONS[type]) return MANEUVER_ICONS[type]
  return MANEUVER_ICONS['default']
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.round((seconds % 3600) / 60)
  if (hours === 0) return `${mins} min`
  return `${hours} hr ${mins} min`
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

async function fetchRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteData | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Routing request failed')
    const data = await res.json()
    if (!data.routes || data.routes.length === 0) return null

    const route = data.routes[0]
    const coords: [number, number][] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]] as [number, number]
    )

    const steps: RouteStep[] = []
    for (const leg of route.legs) {
      for (const step of leg.steps) {
        steps.push({
          instruction: step.maneuver?.instruction || step.name || 'Continue',
          distance: step.distance,
          duration: step.duration,
          maneuver: step.maneuver?.modifier || step.maneuver?.type || 'straight',
          name: step.name || '',
        })
      }
    }

    return {
      coordinates: coords,
      steps,
      summary: {
        totalDistance: route.distance,
        totalDuration: route.duration,
      },
    }
  } catch (err) {
    console.error('Routing error:', err)
    return null
  }
}

const createDestinationIcon = () => {
  return L.divIcon({
    className: 'custom-chili-marker',
    html: `
      <div style="
        width: 32px; height: 32px;
        background: #ef4444;
        border: 3px solid white;
        border-radius: 50% 50% 50% 4px;
        transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 3px 12px rgba(239,68,68,0.4);
      ">
        <span style="transform: rotate(45deg); font-size: 14px;">📍</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

// ─── Fit Route Bounds Component ───────────────────────────────────────────────

function FitRouteBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords.map(c => L.latLng(c[0], c[1])))
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
    }
  }, [coords, map])
  return null
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PH_CENTER: [number, number] = [12.5, 122.0]
const PH_ZOOM = 6

export default function ChiliMap() {
  const [selectedChili, setSelectedChili] = useState<ChiliType | 'all'>('all')
  const [selectedType, setSelectedType] = useState<SpotType | 'all'>('all')
  const [selectedSpot, setSelectedSpot] = useState<Hotspot | null>(null)
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(null)
  const [showLegend, setShowLegend] = useState(true)
  const [showFilters, setShowFilters] = useState(true)
  const [hotspots, setHotspots] = useState<Hotspot[]>(HOTSPOTS)

  // Fetch hotspots from API with fallback to hardcoded data
  useEffect(() => {
    api.get('/hotspots').then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        setHotspots(res.data.map((h: Record<string, unknown>) => ({
          id: h.id as string,
          name: h.name as string,
          region: h.region as string,
          province: h.province as string,
          lat: h.lat as number,
          lng: h.lng as number,
          type: h.type as SpotType,
          chilies: h.chilies as ChiliType[],
          description: h.description as string,
          famous_for: h.famous_for as string,
          rating: h.rating as number,
          best_season: h.best_season as string,
          tips: h.tips as string | undefined,
        })))
      }
    }).catch(() => { /* keep hardcoded fallback */ })
  }, [])

  // Geolocation state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied' | 'unavailable'>('idle')
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable')
      return
    }
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setLocationAccuracy(accuracy)
        setLocationStatus('granted')
      },
      (error) => {
        console.warn('Geolocation error:', error.message)
        setLocationStatus(error.code === 1 ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  // Try to get location on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestUserLocation()
        }
      }).catch(() => { /* permissions API not supported */ })
    }
  }, [requestUserLocation])

  const getDirectionsUrl = useCallback((spot: Hotspot) => {
    if (userLocation) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${spot.lat},${spot.lng}&travelmode=driving`
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`
  }, [userLocation])

  const getDistanceKm = useCallback((spot: Hotspot) => {
    if (!userLocation) return null
    // Haversine formula
    const R = 6371
    const dLat = ((spot.lat - userLocation.lat) * Math.PI) / 180
    const dLng = ((spot.lng - userLocation.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((spot.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c)
  }, [userLocation])

  // ── Routing state ──
  const [routeData, setRouteData] = useState<RouteData | null>(null)
  const [routingTo, setRoutingTo] = useState<Hotspot | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const stepsContainerRef = useRef<HTMLDivElement>(null)

  const startDirections = useCallback(async (spot: Hotspot) => {
    // If no user location, request it first, then retry
    if (!userLocation) {
      if (!navigator.geolocation) {
        setRouteError('Geolocation is not supported by your browser')
        return
      }
      setRouteLoading(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude }
          setUserLocation(loc)
          setLocationAccuracy(position.coords.accuracy)
          setLocationStatus('granted')
          // Now fetch route with the freshly obtained location
          const route = await fetchRoute(loc, { lat: spot.lat, lng: spot.lng })
          setRouteLoading(false)
          if (route) {
            setRouteData(route)
            setRoutingTo(spot)
            setRouteError(null)
            setActiveStepIndex(0)
            setSelectedSpot(null)
            setFlyTo(null) // let FitRouteBounds handle it
          } else {
            setRouteError('Could not find a route. The destination may not be accessible by road.')
          }
        },
        (err) => {
          setRouteLoading(false)
          setLocationStatus(err.code === 1 ? 'denied' : 'unavailable')
          setRouteError('Location access is needed for directions. Please enable it in your browser settings.')
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
      return
    }

    setRouteLoading(true)
    setRouteError(null)
    const route = await fetchRoute(userLocation, { lat: spot.lat, lng: spot.lng })
    setRouteLoading(false)
    if (route) {
      setRouteData(route)
      setRoutingTo(spot)
      setActiveStepIndex(0)
      setSelectedSpot(null)
      setFlyTo(null)
    } else {
      setRouteError('Could not find a route. The destination may not be accessible by road.')
    }
  }, [userLocation])

  const clearRoute = useCallback(() => {
    setRouteData(null)
    setRoutingTo(null)
    setRouteError(null)
    setActiveStepIndex(0)
    setFlyTo({ center: PH_CENTER, zoom: PH_ZOOM })
  }, [])

  const filteredSpots = useMemo(() => {
    return hotspots.filter((spot) => {
      if (selectedChili !== 'all' && !spot.chilies.includes(selectedChili)) return false
      if (selectedType !== 'all' && spot.type !== selectedType && !(selectedType === 'both' && spot.type === 'both')) return false
      return true
    })
  }, [selectedChili, selectedType, hotspots])

  const handleSpotClick = (spot: Hotspot) => {
    setSelectedSpot(spot)
    setFlyTo({ center: [spot.lat, spot.lng], zoom: 12 })
  }

  const handleResetView = () => {
    setFlyTo({ center: PH_CENTER, zoom: PH_ZOOM })
    setSelectedSpot(null)
  }

  const spotTypeLabel = (type: SpotType) => {
    switch (type) {
      case 'market': return 'Market'
      case 'farm': return 'Farm'
      case 'both': return 'Market & Farm'
    }
  }

  const spotTypeIcon = (type: SpotType) => {
    switch (type) {
      case 'market': return <Store className="h-3.5 w-3.5" />
      case 'farm': return <Tractor className="h-3.5 w-3.5" />
      case 'both': return <Star className="h-3.5 w-3.5" />
    }
  }

  return (
    <div className="page-container space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-orange-500 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 text-6xl">🌶️</div>
          <div className="absolute bottom-2 right-32 text-4xl">🔥</div>
          <div className="absolute top-6 right-56 text-3xl">🫑</div>
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-xs font-medium mb-2 backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5" /> Interactive Map
          </div>
          <h1 className="text-2xl font-bold font-display">Philippine Chili Hotspot Map</h1>
          <p className="text-white/70 text-sm mt-1 max-w-xl">
            Explore the best chili markets, farms, and growing regions across the Philippines.
            Discover where to find Siling Labuyo, Siling Haba, and the fiery Siling Demonyo.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        {/* ── Map Section ── */}
        <div className="relative">
          <Card className="overflow-hidden">
            <div className="relative h-[65vh] min-h-[500px]">
              <MapContainer
                center={PH_CENTER}
                zoom={PH_ZOOM}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
                style={{ background: '#e8f4f8' }}
                maxBounds={PH_BOUNDS}
                maxBoundsViscosity={1.0}
                minZoom={PH_MIN_ZOOM}
                maxZoom={PH_MAX_ZOOM}
              >
                <MapBoundsEnforcer />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {flyTo && <FlyToLocation center={flyTo.center} zoom={flyTo.zoom} />}

                {/* User location marker */}
                {userLocation && (
                  <>
                    <Marker
                      position={[userLocation.lat, userLocation.lng]}
                      icon={createUserLocationIcon()}
                      zIndexOffset={1000}
                    >
                      <Popup>
                        <div className="p-1 text-center">
                          <p className="font-bold text-sm text-blue-600">📍 Your Location</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                          </p>
                          {locationAccuracy && (
                            <p className="text-[10px] text-gray-400">± {Math.round(locationAccuracy)}m accuracy</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                    {locationAccuracy && locationAccuracy > 50 && (
                      <Circle
                        center={[userLocation.lat, userLocation.lng]}
                        radius={locationAccuracy}
                        pathOptions={{
                          color: '#3b82f6',
                          fillColor: '#3b82f6',
                          fillOpacity: 0.08,
                          weight: 1,
                          opacity: 0.3,
                        }}
                      />
                    )}
                  </>
                )}

                {/* Route line */}
                {routeData && routeData.coordinates.length > 0 && (
                  <>
                    <FitRouteBounds coords={routeData.coordinates} />
                    {/* Shadow */}
                    <Polyline
                      positions={routeData.coordinates}
                      pathOptions={{
                        color: '#1e40af',
                        weight: 8,
                        opacity: 0.3,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                    {/* Main route */}
                    <Polyline
                      positions={routeData.coordinates}
                      pathOptions={{
                        color: '#4285F4',
                        weight: 5,
                        opacity: 1,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                    {/* Destination marker */}
                    {routingTo && (
                      <Marker
                        position={[routingTo.lat, routingTo.lng]}
                        icon={createDestinationIcon()}
                        zIndexOffset={999}
                      >
                        <Popup>
                          <div className="p-1 text-center">
                            <p className="font-bold text-sm text-red-600">🏁 {routingTo.name}</p>
                            <p className="text-[10px] text-gray-500">{routingTo.province}, {routingTo.region}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </>
                )}

                {filteredSpots.map((spot) => {
                  const markerColors = spot.chilies.map((c) => CHILI_TYPES[c].markerColor)
                  return (
                    <Marker
                      key={spot.id}
                      position={[spot.lat, spot.lng]}
                      icon={createChiliIcon(markerColors, spot.type)}
                      eventHandlers={{
                        click: () => handleSpotClick(spot),
                      }}
                    >
                      <Popup maxWidth={300} className="chili-popup">
                        <div className="p-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-bold text-sm text-gray-900">{spot.name}</h3>
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap',
                              spot.type === 'market' ? 'bg-blue-100 text-blue-700' :
                              spot.type === 'farm' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            )}>
                              {spotTypeLabel(spot.type)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{spot.province}, {spot.region}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {spot.chilies.map((c) => (
                              <span key={c} className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', CHILI_TYPES[c].bgColor, CHILI_TYPES[c].color)}>
                                {CHILI_TYPES[c].icon} {CHILI_TYPES[c].name}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{spot.description}</p>
                          <div className="mt-2 flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn('h-3 w-3', i < spot.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300')}
                              />
                            ))}
                            <span className="text-[10px] text-gray-500 ml-1">({spot.rating}/5)</span>
                          </div>
                          {/* Distance + Directions */}
                          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                            {(() => {
                              const dist = getDistanceKm(spot)
                              return dist !== null ? (
                                <span className="text-[10px] text-blue-600 font-medium">📍 ~{dist} km away</span>
                              ) : (
                                <span className="text-[10px] text-gray-400">Enable location for distance</span>
                              )
                            })()}
                            <button
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-md text-[10px] font-medium hover:bg-blue-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                startDirections(spot)
                              }}
                            >
                              <Route className="h-3 w-3" /> Directions
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>

              {/* Map overlay controls */}
              <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
                <button
                  onClick={handleResetView}
                  className="bg-white rounded-lg shadow-md px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 border border-gray-200"
                >
                  <Navigation className="h-3.5 w-3.5" /> Reset View
                </button>
                <button
                  onClick={() => {
                    if (userLocation) {
                      setFlyTo({ center: [userLocation.lat, userLocation.lng], zoom: 13 })
                    } else {
                      requestUserLocation()
                    }
                  }}
                  disabled={locationStatus === 'loading'}
                  className={cn(
                    'bg-white rounded-lg shadow-md px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1.5 border',
                    locationStatus === 'granted'
                      ? 'text-blue-600 border-blue-200 hover:bg-blue-50'
                      : locationStatus === 'denied'
                        ? 'text-red-500 border-red-200 hover:bg-red-50'
                        : 'text-gray-700 border-gray-200 hover:bg-gray-50'
                  )}
                  title={
                    locationStatus === 'granted'
                      ? 'Go to your location'
                      : locationStatus === 'denied'
                        ? 'Location access denied — enable in browser settings'
                        : locationStatus === 'loading'
                          ? 'Locating…'
                          : 'Show my location'
                  }
                >
                  {locationStatus === 'loading' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : locationStatus === 'denied' ? (
                    <MapPinOff className="h-3.5 w-3.5" />
                  ) : (
                    <Locate className="h-3.5 w-3.5" />
                  )}
                  {locationStatus === 'loading'
                    ? 'Locating…'
                    : locationStatus === 'granted'
                      ? 'My Location'
                      : locationStatus === 'denied'
                        ? 'Denied'
                        : 'Find Me'}
                </button>
              </div>

              {/* Legend toggle */}
              <div className="absolute bottom-3 left-3 z-[1000]">
                <button
                  onClick={() => setShowLegend(!showLegend)}
                  className="bg-white rounded-lg shadow-md px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 border border-gray-200"
                >
                  <Info className="h-3.5 w-3.5" /> {showLegend ? 'Hide' : 'Show'} Legend
                </button>
              </div>

              {/* Legend */}
              <AnimatePresence>
                {showLegend && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-12 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 w-52"
                  >
                    <h4 className="text-[11px] font-bold text-gray-700 mb-2">Map Legend</h4>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-600 shrink-0" />
                        <span className="text-gray-600">Siling Labuyo spots</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600 shrink-0" />
                        <span className="text-gray-600">Siling Haba spots</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-orange-500 border-2 border-orange-600 shrink-0" />
                        <span className="text-gray-600">Siling Demonyo spots</span>
                      </div>
                      <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                        <div className="flex items-center gap-2"><span className="text-xs">🏪</span><span className="text-gray-600">Market</span></div>
                        <div className="flex items-center gap-2"><span className="text-xs">🌱</span><span className="text-gray-600">Farm</span></div>
                        <div className="flex items-center gap-2"><span className="text-xs">⭐</span><span className="text-gray-600">Market & Farm</span></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Spot count badge */}
              {!routeData && (
                <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 border border-gray-200">
                  <p className="text-xs font-bold text-gray-800">{filteredSpots.length} hotspot{filteredSpots.length !== 1 ? 's' : ''}</p>
                  <p className="text-[10px] text-gray-500">across the Philippines</p>
                </div>
              )}

              {/* Route loading overlay */}
              <AnimatePresence>
                {routeLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[1001] bg-black/20 backdrop-blur-[2px] flex items-center justify-center"
                  >
                    <div className="bg-white rounded-xl shadow-xl px-6 py-4 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">Finding best route…</p>
                        <p className="text-[10px] text-gray-500">Calculating directions</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Route error toast */}
              <AnimatePresence>
                {routeError && !routeLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001] bg-red-50 border border-red-200 rounded-lg shadow-md px-4 py-3 max-w-sm flex items-start gap-2"
                  >
                    <MapPinOff className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-red-700">{routeError}</p>
                    </div>
                    <button onClick={() => setRouteError(null)} className="text-red-400 hover:text-red-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Directions Panel (Google Maps style) ── */}
              <AnimatePresence>
                {routeData && routingTo && (
                  <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute top-0 right-0 bottom-0 z-[1001] w-[340px] max-w-[85%] bg-white shadow-2xl flex flex-col border-l border-gray-200"
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold flex items-center gap-1.5">
                          <Route className="h-4 w-4" /> Directions
                        </h3>
                        <button
                          onClick={clearRoute}
                          className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                          title="Close directions"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Origin / Destination */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-blue-400 border-2 border-white flex items-center justify-center shrink-0">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-blue-200">Your location</p>
                            <p className="text-xs font-medium truncate">
                              {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Current location'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 pl-[10px]">
                          <div className="w-0 border-l-2 border-dashed border-blue-300 h-3" />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center shrink-0">
                            <Flag className="h-2.5 w-2.5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-blue-200">Destination</p>
                            <p className="text-xs font-medium truncate">{routingTo.name}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Route Summary */}
                    <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-blue-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-bold">{formatDuration(routeData.summary.totalDuration)}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistance(routeData.summary.totalDistance)}
                        </div>
                        <div className="ml-auto">
                          <button
                            onClick={() => window.open(getDirectionsUrl(routingTo), '_blank')}
                            className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1 font-medium"
                          >
                            <ExternalLink className="h-3 w-3" /> Open in Google Maps
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Via roads • Powered by OSRM</p>
                    </div>

                    {/* Turn-by-turn steps */}
                    <div ref={stepsContainerRef} className="flex-1 overflow-y-auto directions-steps-container">
                      {routeData.steps.map((step, idx) => {
                        const ManeuverIcon = getManeuverIcon(step.maneuver, 
                          idx === 0 ? 'depart' : idx === routeData.steps.length - 1 ? 'arrive' : undefined
                        )
                        const isActive = idx === activeStepIndex
                        const isLast = idx === routeData.steps.length - 1

                        return (
                          <button
                            key={idx}
                            onClick={() => setActiveStepIndex(idx)}
                            className={cn(
                              'w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-100 transition-colors hover:bg-blue-50/50',
                              isActive && 'bg-blue-50 border-l-2 border-l-blue-500'
                            )}
                          >
                            {/* Step number / icon */}
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                              isActive ? 'bg-blue-500 text-white' :
                              isLast ? 'bg-red-100 text-red-600' :
                              idx === 0 ? 'bg-green-100 text-green-600' :
                              'bg-gray-100 text-gray-600'
                            )}>
                              <ManeuverIcon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className={cn(
                                'text-xs leading-relaxed',
                                isActive ? 'text-blue-900 font-medium' : 'text-gray-700'
                              )}>
                                {step.instruction}
                              </p>
                              {step.distance > 0 && !isLast && (
                                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                                  <span>{formatDistance(step.distance)}</span>
                                  <span>•</span>
                                  <span>{formatDuration(step.duration)}</span>
                                </p>
                              )}
                              {isLast && (
                                <p className="text-[10px] text-red-500 font-medium mt-0.5">🏁 You have arrived!</p>
                              )}
                            </div>

                            <ChevronRight className={cn(
                              'h-3.5 w-3.5 shrink-0 mt-1',
                              isActive ? 'text-blue-400' : 'text-gray-300'
                            )} />
                          </button>
                        )
                      })}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 p-3 shrink-0 bg-gray-50 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={clearRoute}
                      >
                        <X className="h-3 w-3 mr-1" /> Close
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs h-8 bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => window.open(getDirectionsUrl(routingTo), '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Google Maps
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        {/* ── Sidebar Panel ── */}
        <div className="space-y-4">
          {/* Chili Type Filter */}
          <Card>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold font-display text-foreground">Filters</span>
              </div>
              {showFilters ? <ChevronUp className="h-4 w-4 text-foreground-muted" /> : <ChevronDown className="h-4 w-4 text-foreground-muted" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <CardContent className="pt-0 pb-4 px-4 space-y-3">
                    {/* Chili type filter */}
                    <div>
                      <p className="text-[10px] font-medium text-foreground-muted uppercase tracking-wider mb-2">Chili Variety</p>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => setSelectedChili('all')}
                          className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all', selectedChili === 'all' ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm' : 'bg-surface text-foreground-secondary hover:bg-gray-100')}
                        >
                          <Flame className="h-3.5 w-3.5" /> All Varieties
                        </button>
                        {Object.values(CHILI_TYPES).map((chili) => (
                          <button
                            key={chili.id}
                            onClick={() => setSelectedChili(chili.id)}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                              selectedChili === chili.id
                                ? `${chili.bgColor} ${chili.color} border ${chili.borderColor} shadow-sm`
                                : 'bg-surface text-foreground-secondary hover:bg-gray-100'
                            )}
                          >
                            <span className="text-sm">{chili.icon}</span>
                            <div className="text-left">
                              <span className="block">{chili.name}</span>
                              <span className="block text-[9px] opacity-70">{chili.shu}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Spot type filter */}
                    <div>
                      <p className="text-[10px] font-medium text-foreground-muted uppercase tracking-wider mb-2">Spot Type</p>
                      <div className="flex gap-1.5">
                        {([['all', 'All', Flame], ['market', 'Markets', Store], ['farm', 'Farms', Tractor]] as const).map(([val, label, Icon]) => (
                          <button
                            key={val}
                            onClick={() => setSelectedType(val as SpotType | 'all')}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-medium transition-all',
                              selectedType === val ? 'bg-sidebar text-white shadow-sm' : 'bg-surface text-foreground-secondary hover:bg-gray-100'
                            )}
                          >
                            <Icon className="h-3 w-3" /> {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Chili Highlights */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-bold font-display text-foreground mb-3 flex items-center gap-1.5">
                <Leaf className="h-4 w-4 text-primary" /> Featured Chilies
              </h3>
              <div className="space-y-2">
                {Object.values(CHILI_TYPES).map((chili) => (
                  <button
                    key={chili.id}
                    onClick={() => setSelectedChili(chili.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all hover:shadow-md group',
                      selectedChili === chili.id ? `${chili.bgColor} ${chili.borderColor}` : 'bg-white border-gray-100 hover:border-gray-200'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="text-2xl shrink-0 group-hover:scale-110 transition-transform">{chili.icon}</div>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-bold', chili.color)}>{chili.name}</p>
                        <p className="text-[10px] text-foreground-muted">{chili.tagalog}</p>
                        <p className="text-[10px] text-foreground-secondary mt-1">{chili.heatLevel} • {chili.shu}</p>
                        <p className="text-[10px] text-foreground-muted mt-1 line-clamp-2">{chili.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hotspots List */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-bold font-display text-foreground mb-3 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" /> Hotspot List
                <span className="ml-auto text-[10px] font-normal text-foreground-muted">{filteredSpots.length} results</span>
              </h3>
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {filteredSpots.length === 0 ? (
                  <div className="text-center py-6">
                    <MapPin className="h-8 w-8 text-foreground-muted mx-auto mb-2" />
                    <p className="text-xs text-foreground-muted">No hotspots match your filters</p>
                  </div>
                ) : (
                  filteredSpots.map((spot) => (
                    <button
                      key={spot.id}
                      onClick={() => handleSpotClick(spot)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-2.5 group',
                        selectedSpot?.id === spot.id ? 'bg-red-50 border border-red-200' : 'hover:bg-surface border border-transparent'
                      )}
                    >
                      <div className="shrink-0 mt-0.5">
                        {spotTypeIcon(spot.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">{spot.name}</p>
                        <p className="text-[10px] text-foreground-muted">{spot.province}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {spot.chilies.map((c) => (
                            <span key={c} className="text-[9px]">{CHILI_TYPES[c].icon}</span>
                          ))}
                          <div className="flex items-center gap-0.5 ml-auto">
                            {(() => {
                              const dist = getDistanceKm(spot)
                              return dist !== null ? (
                                <span className="text-[9px] text-blue-500 font-medium mr-1">{dist}km</span>
                              ) : null
                            })()}
                            {Array.from({ length: spot.rating }).map((_, i) => (
                              <Star key={i} className="h-2 w-2 text-amber-400 fill-amber-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Selected Spot Detail Panel ── */}
      <AnimatePresence>
        {selectedSpot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className="border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold font-display text-foreground">{selectedSpot.name}</h2>
                      <span className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-medium',
                        selectedSpot.type === 'market' ? 'bg-blue-100 text-blue-700' :
                        selectedSpot.type === 'farm' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      )}>
                        {spotTypeIcon(selectedSpot.type)}
                        <span className="ml-1">{spotTypeLabel(selectedSpot.type)}</span>
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedSpot.province}, {selectedSpot.region}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedSpot(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Chilies Available */}
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-[10px] text-foreground-muted font-medium mb-2 uppercase tracking-wider">Available Chilies</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSpot.chilies.map((c) => (
                        <span key={c} className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium', CHILI_TYPES[c].bgColor, CHILI_TYPES[c].color)}>
                          {CHILI_TYPES[c].icon} {CHILI_TYPES[c].name}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Rating */}
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-[10px] text-foreground-muted font-medium mb-2 uppercase tracking-wider">Rating</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn('h-4 w-4', i < selectedSpot.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300')} />
                      ))}
                      <span className="text-sm font-bold text-foreground ml-1">{selectedSpot.rating}/5</span>
                    </div>
                  </div>
                  {/* Best Season */}
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-[10px] text-foreground-muted font-medium mb-2 uppercase tracking-wider">Best Season</p>
                    <p className="text-sm font-medium text-foreground">{selectedSpot.best_season}</p>
                  </div>
                  {/* Famous For */}
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-[10px] text-foreground-muted font-medium mb-2 uppercase tracking-wider">Famous For</p>
                    <p className="text-xs text-foreground-secondary leading-relaxed">{selectedSpot.famous_for}</p>
                  </div>
                </div>

                <p className="text-sm text-foreground-secondary leading-relaxed mb-3">{selectedSpot.description}</p>

                {selectedSpot.tips && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                    <span className="text-sm shrink-0">💡</span>
                    <div>
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">Insider Tip</p>
                      <p className="text-xs text-amber-700 leading-relaxed">{selectedSpot.tips}</p>
                    </div>
                  </div>
                )}

                {/* Distance banner */}
                {(() => {
                  const dist = getDistanceKm(selectedSpot)
                  return dist !== null ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 mt-3">
                      <Locate className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-blue-800">
                          ~{dist} km from your location
                        </p>
                        <p className="text-[10px] text-blue-600/70">
                          Estimated straight-line distance • Actual travel distance may vary
                        </p>
                      </div>
                    </div>
                  ) : locationStatus === 'idle' || locationStatus === 'unavailable' ? (
                    <button
                      onClick={requestUserLocation}
                      className="mt-3 w-full bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 hover:bg-blue-100 transition-colors text-left"
                    >
                      <Locate className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-blue-800">Enable Location</p>
                        <p className="text-[10px] text-blue-600/70">Get personalized distance & directions</p>
                      </div>
                    </button>
                  ) : null
                })()}

                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs h-9 bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => startDirections(selectedSpot)}
                    disabled={routeLoading}
                  >
                    {routeLoading ? (
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    ) : (
                      <Route className="h-3 w-3 mr-1.5" />
                    )}
                    {userLocation ? 'Get Directions' : 'Enable Location & Get Directions'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-9"
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedSpot.lat},${selectedSpot.lng}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1.5" /> Google Maps
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-9"
                    onClick={handleResetView}
                  >
                    <Navigation className="h-3 w-3 mr-1.5" /> Back to Overview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
