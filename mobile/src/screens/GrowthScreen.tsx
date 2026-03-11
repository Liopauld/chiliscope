import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface GrowthStage {
  name: string;
  maturity: string;
  dayRange: [number, number];
  description: string;
  characteristics: { height: string; leafSize: string; visualIndicators: string };
  care: { watering: string; sunlight: string; fertilization: string; temperature: string };
  color: string;
}

interface Variety {
  id: string;
  name: string;
  scientificName: string;
  heatLevel: string;
  totalDays: string;
  stages: GrowthStage[];
  summary: { climate: string; soil: string; spacing: string; companions: string };
}

const VARIETIES: Variety[] = [
  {
    id: 'siling-haba',
    name: 'Siling Haba',
    scientificName: 'Capsicum annuum var. longum',
    heatLevel: 'Mild',
    totalDays: '60–75 days',
    stages: [
      {
        name: 'Seedling', maturity: 'IMMATURE', dayRange: [0, 14],
        description: 'Seeds germinate and produce their first pair of true leaves. The stem is thin and delicate.',
        characteristics: { height: '2–5 cm', leafSize: 'Tiny cotyledons + first true leaves', visualIndicators: 'Pale green stem, two rounded seed leaves' },
        care: { watering: 'Mist gently, keep soil consistently moist', sunlight: 'Indirect light or partial shade', fertilization: 'None needed — seed nutrients suffice', temperature: '25–30°C for optimal germination' },
        color: '#a3e635',
      },
      {
        name: 'Vegetative Growth', maturity: 'IMMATURE', dayRange: [15, 35],
        description: 'Rapid stem and leaf development. The plant builds its canopy and root system before flowering.',
        characteristics: { height: '15–30 cm', leafSize: 'Medium, elongated leaves', visualIndicators: 'Sturdy green stem, branching begins' },
        care: { watering: 'Regular watering, keep soil evenly moist', sunlight: 'Full sun 6–8 hours', fertilization: 'Balanced NPK (14-14-14) every 2 weeks', temperature: '25–35°C' },
        color: '#22c55e',
      },
      {
        name: 'Flowering', maturity: 'DEVELOPING', dayRange: [36, 45],
        description: 'Small white flowers appear at branch nodes. Pollination occurs naturally with wind and insects.',
        characteristics: { height: '30–45 cm', leafSize: 'Full-sized, dark green', visualIndicators: 'White star-shaped flowers, some early bud drop' },
        care: { watering: 'Moderate — avoid flower splash', sunlight: 'Full sun 6–8 hours', fertilization: 'Switch to high-phosphorus (10-30-20)', temperature: '25–30°C ideal for fruit set' },
        color: '#facc15',
      },
      {
        name: 'Fruiting', maturity: 'MATURE', dayRange: [46, 60],
        description: 'Pods elongate rapidly after successful pollination. Fruits are green and firm.',
        characteristics: { height: '45–60 cm', leafSize: 'Full canopy', visualIndicators: 'Long green pods (7–12 cm), waxy skin' },
        care: { watering: 'Consistent deep watering', sunlight: 'Full sun', fertilization: 'Potassium-rich feed (10-10-30) for fruit quality', temperature: '25–35°C' },
        color: '#fb923c',
      },
      {
        name: 'Ripening / Harvest', maturity: 'MATURE', dayRange: [61, 75],
        description: 'Pods transition from green to red/orange. Harvest when color is uniform for maximum flavor.',
        characteristics: { height: '50–65 cm', leafSize: 'Some lower-leaf yellowing normal', visualIndicators: 'Color change green → red/orange, slight softening' },
        care: { watering: 'Reduce slightly to concentrate flavor', sunlight: 'Full sun', fertilization: 'Stop fertilizing 1 week before harvest', temperature: '25–35°C' },
        color: '#ef4444',
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
    stages: [
      {
        name: 'Seedling', maturity: 'IMMATURE', dayRange: [0, 14],
        description: 'Slow germination typical of frutescens species. Seeds need warm soil and patience.',
        characteristics: { height: '1–4 cm', leafSize: 'Very small cotyledons', visualIndicators: 'Compact sprout, dark green tinge' },
        care: { watering: 'Keep moist but not waterlogged', sunlight: 'Warm indirect light', fertilization: 'None', temperature: '28–32°C optimum for germination' },
        color: '#a3e635',
      },
      {
        name: 'Vegetative Growth', maturity: 'IMMATURE', dayRange: [15, 45],
        description: 'Compact, bushy growth habit develops. Stems become woody at the base over time.',
        characteristics: { height: '15–40 cm', leafSize: 'Small to medium, pointed leaves', visualIndicators: 'Dense branching, woody lower stem' },
        care: { watering: 'Moderate — let top soil dry between waterings', sunlight: 'Full sun 6–8 hours minimum', fertilization: 'Balanced NPK every 2–3 weeks', temperature: '20–30°C' },
        color: '#22c55e',
      },
      {
        name: 'Flowering', maturity: 'DEVELOPING', dayRange: [46, 65],
        description: 'Greenish-white flowers emerge. Labuyo often self-pollinates, producing many small fruits.',
        characteristics: { height: '40–60 cm', leafSize: 'Full-sized, glossy', visualIndicators: 'Upright greenish-white flowers, multiple per node' },
        care: { watering: 'Moderate, avoid wet foliage', sunlight: 'Full sun 6–8 hours', fertilization: 'Phosphorus-rich feed for fruit set', temperature: '22–30°C' },
        color: '#facc15',
      },
      {
        name: 'Fruiting', maturity: 'MATURE', dayRange: [66, 95],
        description: 'Tiny conical pods point upward. Green fruits develop intense capsaicin as they grow.',
        characteristics: { height: '50–75 cm', leafSize: 'Dense canopy', visualIndicators: 'Small upright green pods (2–3 cm), pointed tips' },
        care: { watering: 'Consistent, stress increases heat but reduces yield', sunlight: 'Full sun', fertilization: 'Potassium-rich feed for heat & quality', temperature: '20–30°C' },
        color: '#fb923c',
      },
      {
        name: 'Ripening / Harvest', maturity: 'MATURE', dayRange: [96, 120],
        description: 'Pods turn bright red at peak heat. Can be harvested green or red depending on use.',
        characteristics: { height: '60–80 cm', leafSize: 'Full but some leaf drop', visualIndicators: 'Red pods pointing upward, easy snap-off at stem' },
        care: { watering: 'Slightly reduce to intensify flavor', sunlight: 'Full sun', fertilization: 'Stop feeding 2 weeks before harvest', temperature: '20–30°C' },
        color: '#ef4444',
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
    stages: [
      {
        name: 'Seedling', maturity: 'IMMATURE', dayRange: [0, 14],
        description: 'Germination is slow and requires consistent warmth. Seedlings are very small and fragile.',
        characteristics: { height: '1–3 cm', leafSize: 'Tiny cotyledons, slow to develop', visualIndicators: 'Dark green, compact sprout' },
        care: { watering: 'Mist frequently, keep soil warm and moist', sunlight: 'Warm indirect light till true leaves', fertilization: 'None', temperature: '28–33°C for best germination' },
        color: '#a3e635',
      },
      {
        name: 'Vegetative Growth', maturity: 'IMMATURE', dayRange: [15, 50],
        description: 'Extended vegetative phase to build a strong root system. Growth is slower than milder varieties.',
        characteristics: { height: '15–35 cm', leafSize: 'Small-medium, slightly wrinkled', visualIndicators: 'Compact habit, very dark green leaves, woody base' },
        care: { watering: 'Moderate — slight drought stress can increase future heat', sunlight: 'Full sun 8+ hours', fertilization: 'Balanced NPK every 2 weeks, add calcium', temperature: '25–35°C' },
        color: '#22c55e',
      },
      {
        name: 'Flowering', maturity: 'DEVELOPING', dayRange: [51, 70],
        description: 'Flowers are small and may appear in clusters. Pollination success is critical for the extreme heat pods.',
        characteristics: { height: '35–50 cm', leafSize: 'Full-sized, deep green', visualIndicators: 'Small white-green flowers, often in pairs' },
        care: { watering: 'Even moisture, avoid stress during flowering', sunlight: 'Full sun 8+ hours', fertilization: 'High-phosphorus formula', temperature: '25–32°C ideal for pollination' },
        color: '#facc15',
      },
      {
        name: 'Fruiting', maturity: 'MATURE', dayRange: [71, 105],
        description: 'Pods develop slowly but pack extreme capsaicin levels. The wrinkled skin is a signature trait.',
        characteristics: { height: '45–65 cm', leafSize: 'Dense, dark canopy', visualIndicators: 'Small wrinkled pods (1.5–2.5 cm), green with purple tinge' },
        care: { watering: 'Moderate, water stress increases capsaicin', sunlight: 'Full sun 8+ hours', fertilization: 'Potassium + sulfur for maximum heat', temperature: '25–35°C' },
        color: '#fb923c',
      },
      {
        name: 'Ripening / Harvest', maturity: 'MATURE', dayRange: [106, 130],
        description: 'Pods ripen to deep red. Handle with gloves — capsaicin levels can cause skin irritation.',
        characteristics: { height: '50–70 cm', leafSize: 'Some yellowing at base', visualIndicators: 'Deep red wrinkled pods, intense aroma when crushed' },
        care: { watering: 'Reduce before final harvest for concentrated heat', sunlight: 'Full sun', fertilization: 'Stop 2 weeks before harvest', temperature: '25–35°C' },
        color: '#ef4444',
      },
    ],
    summary: { climate: 'Tropical, 25–35°C, needs full heat', soil: 'Well-drained, sandy-loam, pH 6.0–6.5', spacing: '30–40 cm, compact plants', companions: 'Basil (pest control), avoid fennel' },
  },
];

const heatColors: Record<string, string> = {
  Mild: '#22c55e',
  Hot: '#f97316',
  'Extra Hot': '#ef4444',
};

export default function GrowthScreen() {
  const navigation = useNavigation();
  const [selectedVariety, setSelectedVariety] = useState(0);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  const variety = VARIETIES[selectedVariety];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Growth Guide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Variety Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.varietySelector}>
          {VARIETIES.map((v, i) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.varietyTab, selectedVariety === i && styles.varietyTabActive]}
              onPress={() => { setSelectedVariety(i); setExpandedStage(null); }}
            >
              <Text style={[styles.varietyTabText, selectedVariety === i && styles.varietyTabTextActive]}>
                {v.name}
              </Text>
              <View style={[styles.heatDot, { backgroundColor: heatColors[v.heatLevel] || '#6b7280' }]} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Variety Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoName}>{variety.name}</Text>
          <Text style={styles.infoScientific}>{variety.scientificName}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoChip}>
              <Ionicons name="flame" size={14} color={heatColors[variety.heatLevel] || '#6b7280'} />
              <Text style={styles.infoChipText}>{variety.heatLevel}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text style={styles.infoChipText}>{variety.totalDays}</Text>
            </View>
          </View>
        </View>

        {/* Growing Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Growing Summary</Text>
          {[
            { icon: 'sunny-outline' as const, label: 'Climate', value: variety.summary.climate },
            { icon: 'earth-outline' as const, label: 'Soil', value: variety.summary.soil },
            { icon: 'resize-outline' as const, label: 'Spacing', value: variety.summary.spacing },
            { icon: 'leaf-outline' as const, label: 'Companions', value: variety.summary.companions },
          ].map((item) => (
            <View key={item.label} style={styles.summaryRow}>
              <Ionicons name={item.icon} size={16} color="#f97316" />
              <Text style={styles.summaryLabel}>{item.label}:</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Timeline */}
        <Text style={styles.timelineTitle}>Growth Stages</Text>
        {variety.stages.map((stage, idx) => {
          const isExpanded = expandedStage === idx;
          return (
            <TouchableOpacity
              key={stage.name}
              style={styles.stageCard}
              onPress={() => setExpandedStage(isExpanded ? null : idx)}
              activeOpacity={0.7}
            >
              {/* Stage header */}
              <View style={styles.stageHeader}>
                <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
                <View style={styles.stageHeaderText}>
                  <Text style={styles.stageName}>{stage.name}</Text>
                  <Text style={styles.stageDays}>Days {stage.dayRange[0]}–{stage.dayRange[1]}</Text>
                </View>
                <View style={[styles.maturityBadge, { backgroundColor: stage.color + '20' }]}>
                  <Text style={[styles.maturityText, { color: stage.color }]}>{stage.maturity}</Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
              </View>

              <Text style={styles.stageDescription}>{stage.description}</Text>

              {isExpanded && (
                <View style={styles.stageDetails}>
                  {/* Characteristics */}
                  <Text style={styles.detailSectionTitle}>Characteristics</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="arrow-up-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>Height: {stage.characteristics.height}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="leaf-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>Leaves: {stage.characteristics.leafSize}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="eye-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>Visual: {stage.characteristics.visualIndicators}</Text>
                  </View>

                  {/* Care */}
                  <Text style={[styles.detailSectionTitle, { marginTop: 12 }]}>Care Tips</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="water-outline" size={14} color="#3b82f6" />
                    <Text style={styles.detailText}>{stage.care.watering}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="sunny-outline" size={14} color="#eab308" />
                    <Text style={styles.detailText}>{stage.care.sunlight}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="flask-outline" size={14} color="#22c55e" />
                    <Text style={styles.detailText}>{stage.care.fertilization}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="thermometer-outline" size={14} color="#ef4444" />
                    <Text style={styles.detailText}>{stage.care.temperature}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1 },
  varietySelector: { paddingHorizontal: 16, paddingVertical: 16 },
  varietyTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  varietyTabActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  varietyTabText: { color: '#4b5563', fontWeight: '600', marginRight: 6 },
  varietyTabTextActive: { color: '#fff' },
  heatDot: { width: 8, height: 8, borderRadius: 4 },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  infoName: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  infoScientific: { fontSize: 14, color: '#6b7280', fontStyle: 'italic', marginTop: 2 },
  infoRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  infoChipText: { fontSize: 13, color: '#4b5563' },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  summaryLabel: { fontWeight: '600', color: '#4b5563', fontSize: 13 },
  summaryValue: { flex: 1, color: '#6b7280', fontSize: 13 },
  timelineTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginHorizontal: 16, marginBottom: 12 },
  stageCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  stageHeader: { flexDirection: 'row', alignItems: 'center' },
  stageDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  stageHeaderText: { flex: 1 },
  stageName: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
  stageDays: { fontSize: 12, color: '#9ca3af' },
  maturityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginRight: 8 },
  maturityText: { fontSize: 10, fontWeight: '700' },
  stageDescription: { color: '#6b7280', fontSize: 13, marginTop: 8, lineHeight: 18 },
  stageDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  detailSectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  detailText: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 17 },
});
