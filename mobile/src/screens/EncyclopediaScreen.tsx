import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChiliVariety {
  id: string;
  name: string;
  scientificName: string;
  localNames: string[];
  description: string;
  shuRange: { min: number; max: number };
  heatLevel: 'Mild' | 'Medium' | 'Hot' | 'Extra Hot';
  flavorProfile: string[];
  appearance: {
    color: string;
    shape: string;
    size: string;
  };
  culinaryUses: string[];
  growing: {
    climate: string;
    sunlight: string;
    harvestTime: string;
    difficulty: string;
  };
  funFacts: string[];
}

const chiliVarieties: ChiliVariety[] = [
  {
    id: 'siling-haba',
    name: 'Siling Haba',
    scientificName: 'Capsicum annuum var. longum',
    localNames: ['Siling Pangsigang', 'Finger Chili', 'Long Green Chili'],
    description: 'The most commonly used chili in Philippine cuisine. Known for its mild heat and slightly sweet flavor.',
    shuRange: { min: 0, max: 15000 },
    heatLevel: 'Mild',
    flavorProfile: ['Slightly sweet', 'Mild heat', 'Fresh', 'Grassy'],
    appearance: {
      color: 'Green when unripe, red/orange when mature',
      shape: 'Long, slender, finger-like',
      size: '7-12 cm length',
    },
    culinaryUses: [
      'Sinigang (sour soup)',
      'Pinakbet (vegetable stew)',
      'Sawsawan (dipping sauces)',
      'Ginisang dishes',
    ],
    growing: {
      climate: 'Tropical, 25-35°C',
      sunlight: 'Full sun (6-8 hours)',
      harvestTime: '60-75 days',
      difficulty: 'Easy - great for beginners',
    },
    funFacts: [
      'Most widely cultivated chili in the Philippines',
      'Can be eaten raw due to mild heat',
      'Green peppers have less heat than red ones',
    ],
  },
  {
    id: 'siling-labuyo',
    name: 'Siling Labuyo',
    scientificName: 'Capsicum frutescens',
    localNames: ["Bird's Eye Chili", 'Thai Chili', 'Labuyo'],
    description: 'The iconic Philippine hot pepper. "Labuyo" means "wild" in Filipino, reflecting its original wild growth.',
    shuRange: { min: 80000, max: 100000 },
    heatLevel: 'Hot',
    flavorProfile: ['Intense heat', 'Fruity undertones', 'Slightly smoky', 'Pungent'],
    appearance: {
      color: 'Green to bright red when ripe',
      shape: 'Small, pointed, conical',
      size: '2-3 cm length',
    },
    culinaryUses: [
      'Bicol Express',
      'Laing (taro leaves in coconut)',
      'Spicy adobo',
      'Chili oil and hot sauces',
    ],
    growing: {
      climate: 'Tropical, 20-30°C',
      sunlight: 'Full sun (6-8 hours)',
      harvestTime: '90-120 days',
      difficulty: 'Moderate',
    },
    funFacts: [
      'One of the hottest chilies native to the Philippines',
      "Birds spread the seeds (they can't taste capsaicin)",
      'Used traditionally as medicine for colds',
    ],
  },
  {
    id: 'super-labuyo',
    name: 'Super Labuyo',
    scientificName: 'Capsicum frutescens (hybrid)',
    localNames: ['Demon Chili', 'Philippine Ghost Pepper'],
    description: 'An extremely hot hybrid developed from Siling Labuyo. Only for the bravest chili enthusiasts.',
    shuRange: { min: 100000, max: 200000 },
    heatLevel: 'Extra Hot',
    flavorProfile: ['Extreme heat', 'Fruity', 'Smoky', 'Lingering burn'],
    appearance: {
      color: 'Green to dark red',
      shape: 'Small, wrinkled, conical',
      size: '2-4 cm length',
    },
    culinaryUses: [
      'Extreme hot sauces',
      'Chili eating contests',
      'Spicy oil infusions',
      'Very spicy Bicol dishes',
    ],
    growing: {
      climate: 'Tropical, 20-30°C',
      sunlight: 'Full sun',
      harvestTime: '100-130 days',
      difficulty: 'Difficult',
    },
    funFacts: [
      'Can be 2x hotter than regular Labuyo',
      'Handle with gloves!',
      'Developed through selective breeding',
    ],
  },
];

const heatColors: Record<string, string> = {
  'Mild': '#22c55e',
  'Medium': '#eab308',
  'Hot': '#f97316',
  'Extra Hot': '#ef4444',
};

const heatBgColors: Record<string, string> = {
  'Mild': '#f0fdf4',
  'Medium': '#fefce8',
  'Hot': '#fff7ed',
  'Extra Hot': '#fef2f2',
};

export default function EncyclopediaScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chili Encyclopedia</Text>
        <Text style={styles.headerSubtitle}>Philippine Varieties Guide</Text>
      </View>

      {/* Heat Scale Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Heat Scale</Text>
        <View style={styles.legendRow}>
          {['Mild', 'Medium', 'Hot', 'Extra Hot'].map((level) => (
            <View key={level} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: heatColors[level] }]} />
              <Text style={styles.legendText}>{level}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {chiliVarieties.map((variety) => (
          <TouchableOpacity
            key={variety.id}
            style={[styles.varietyCard, { backgroundColor: heatBgColors[variety.heatLevel] }]}
            onPress={() => toggleExpand(variety.id)}
            activeOpacity={0.8}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleSection}>
                <View style={[styles.heatBadge, { backgroundColor: heatColors[variety.heatLevel] }]}>
                  <Ionicons name="flame" size={14} color="white" />
                  <Text style={styles.heatBadgeText}>{variety.heatLevel}</Text>
                </View>
                <Text style={styles.varietyName}>{variety.name}</Text>
                <Text style={styles.scientificName}>{variety.scientificName}</Text>
              </View>
              <Ionicons
                name={expandedId === variety.id ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#6b7280"
              />
            </View>

            {/* SHU Range */}
            <View style={styles.shuContainer}>
              <Ionicons name="thermometer-outline" size={16} color="#f97316" />
              <Text style={styles.shuText}>
                {variety.shuRange.min.toLocaleString()} - {variety.shuRange.max.toLocaleString()} SHU
              </Text>
            </View>

            {/* Description */}
            <Text style={styles.description}>{variety.description}</Text>

            {/* Expanded Content */}
            {expandedId === variety.id && (
              <View style={styles.expandedContent}>
                {/* Local Names */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Also Known As</Text>
                  <Text style={styles.sectionText}>{variety.localNames.join(', ')}</Text>
                </View>

                {/* Appearance */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Appearance</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="color-palette-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{variety.appearance.color}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="resize-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{variety.appearance.size}</Text>
                  </View>
                </View>

                {/* Flavor Profile */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Flavor Profile</Text>
                  <View style={styles.tagsContainer}>
                    {variety.flavorProfile.map((flavor, idx) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{flavor}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Culinary Uses */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Culinary Uses</Text>
                  {variety.culinaryUses.map((use, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.bulletText}>{use}</Text>
                    </View>
                  ))}
                </View>

                {/* Growing Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Growing Information</Text>
                  <View style={styles.growingGrid}>
                    <View style={styles.growingItem}>
                      <Ionicons name="sunny-outline" size={20} color="#f97316" />
                      <Text style={styles.growingLabel}>Sunlight</Text>
                      <Text style={styles.growingValue}>{variety.growing.sunlight}</Text>
                    </View>
                    <View style={styles.growingItem}>
                      <Ionicons name="time-outline" size={20} color="#3b82f6" />
                      <Text style={styles.growingLabel}>Harvest</Text>
                      <Text style={styles.growingValue}>{variety.growing.harvestTime}</Text>
                    </View>
                  </View>
                </View>

                {/* Fun Facts */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Fun Facts</Text>
                  {variety.funFacts.map((fact, idx) => (
                    <View key={idx} style={styles.factRow}>
                      <Ionicons name="bulb-outline" size={16} color="#eab308" />
                      <Text style={styles.factText}>{fact}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#dc2626',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  legendContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#4b5563',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  varietyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleSection: {
    flex: 1,
  },
  heatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heatBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  varietyName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6b7280',
    marginTop: 2,
  },
  shuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  shuText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#4b5563',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4b5563',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#4b5563',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f97316',
    marginRight: 8,
  },
  bulletText: {
    fontSize: 14,
    color: '#4b5563',
  },
  growingGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  growingItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  growingLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  growingValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  factText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  bottomPadding: {
    height: 100,
  },
});
