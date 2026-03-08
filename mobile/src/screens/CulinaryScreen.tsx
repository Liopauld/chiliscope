import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type HeatLevel = 'Mild' | 'Medium' | 'Hot' | 'Extra Hot';
type DishCategory = 'soup' | 'main' | 'appetizer' | 'sauce';

interface Recipe {
  id: string;
  name: string;
  filipinoName?: string;
  description: string;
  heatLevel: HeatLevel;
  recommendedChili: string;
  category: DishCategory;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: string[];
  instructions: string[];
  tips: string[];
}

const recipes: Recipe[] = [
  {
    id: 'sinigang-na-baboy',
    name: 'Sinigang na Baboy',
    filipinoName: 'Pork Sinigang',
    description: 'Classic Filipino sour soup with pork and vegetables, enhanced with Siling Haba.',
    heatLevel: 'Mild',
    recommendedChili: 'Siling Haba',
    category: 'soup',
    prepTime: '20 mins',
    cookTime: '1 hour',
    servings: 6,
    difficulty: 'Easy',
    ingredients: [
      '1 kg pork belly or ribs',
      '2 liters water',
      '1 pack sinigang mix',
      '2-3 Siling Haba, sliced',
      '2 tomatoes, quartered',
      '1 bunch kangkong',
      'Fish sauce to taste',
    ],
    instructions: [
      'Boil water and add pork. Skim off scum.',
      'Add onion and tomatoes. Simmer 30 mins.',
      'Add sinigang mix and radish. Cook 10 mins.',
      'Add eggplant and Siling Haba. Cook 5 mins.',
      'Add kangkong last. Season with fish sauce.',
    ],
    tips: [
      'Add more Siling Haba for extra mild heat',
      'Green mangoes can substitute for tamarind',
    ],
  },
  {
    id: 'bicol-express',
    name: 'Bicol Express',
    description: 'Fiery coconut milk stew loaded with Siling Labuyo for authentic Bicolano heat.',
    heatLevel: 'Hot',
    recommendedChili: 'Siling Labuyo',
    category: 'main',
    prepTime: '15 mins',
    cookTime: '45 mins',
    servings: 4,
    difficulty: 'Medium',
    ingredients: [
      '500g pork belly, sliced',
      '2 cups coconut milk',
      '1 cup coconut cream',
      '10-15 Siling Labuyo',
      '2 tbsp shrimp paste',
      '4 cloves garlic, minced',
    ],
    instructions: [
      'Sauté garlic, onion, and ginger.',
      'Add pork belly until lightly browned.',
      'Pour in coconut milk and simmer.',
      'Add shrimp paste and Siling Labuyo.',
      'Stir in coconut cream. Adjust seasoning.',
    ],
    tips: [
      'Keep chilies whole for less heat',
      'Use fresh coconut milk for best results',
    ],
  },
  {
    id: 'laing',
    name: 'Laing',
    filipinoName: 'Dried Taro Leaves in Coconut',
    description: 'Creamy coconut stew with dried taro leaves and Siling Labuyo.',
    heatLevel: 'Hot',
    recommendedChili: 'Siling Labuyo',
    category: 'main',
    prepTime: '10 mins',
    cookTime: '40 mins',
    servings: 4,
    difficulty: 'Medium',
    ingredients: [
      '200g dried taro leaves',
      '2 cups coconut milk',
      '1 cup coconut cream',
      '8-10 Siling Labuyo',
      '100g pork belly',
      'Shrimp paste to taste',
    ],
    instructions: [
      'Simmer coconut milk with pork and aromatics.',
      'Add dried taro leaves. Do not stir!',
      'Add shrimp paste and chilies.',
      'Pour coconut cream on top.',
      'Cover and simmer until leaves are tender.',
    ],
    tips: [
      'Never stir laing while cooking - causes itchiness',
      'Use properly dried gabi leaves',
    ],
  },
  {
    id: 'spicy-vinegar',
    name: 'Sukang Maanghang',
    filipinoName: 'Spicy Vinegar',
    description: 'Essential Filipino condiment with Siling Labuyo for dipping everything.',
    heatLevel: 'Hot',
    recommendedChili: 'Siling Labuyo',
    category: 'sauce',
    prepTime: '5 mins',
    cookTime: '0 mins',
    servings: 1,
    difficulty: 'Easy',
    ingredients: [
      '1 cup cane vinegar',
      '5-10 Siling Labuyo, crushed',
      '4 cloves garlic, crushed',
      '1 small onion, sliced',
      'Salt to taste',
    ],
    instructions: [
      'Combine all ingredients in a jar.',
      'Let sit for at least 30 minutes.',
      'Best after 24 hours of infusion.',
      'Store in refrigerator for up to 2 weeks.',
    ],
    tips: [
      'The longer it sits, the spicier it gets',
      'Add soy sauce for sawsawan variation',
    ],
  },
  {
    id: 'dinuguan',
    name: 'Spicy Dinuguan',
    filipinoName: 'Pork Blood Stew',
    description: 'Rich pork blood stew with a spicy kick from Siling Labuyo.',
    heatLevel: 'Medium',
    recommendedChili: 'Siling Labuyo',
    category: 'main',
    prepTime: '20 mins',
    cookTime: '1 hour',
    servings: 6,
    difficulty: 'Medium',
    ingredients: [
      '500g pork belly and ears',
      '2 cups pork blood',
      '1 cup vinegar',
      '5 Siling Labuyo',
      'Garlic and onion',
      'Salt and pepper',
    ],
    instructions: [
      'Sauté garlic and onion. Add pork.',
      'Add vinegar and simmer until tender.',
      'Pour in pork blood while stirring.',
      'Add chilies and simmer until thick.',
      'Season to taste.',
    ],
    tips: [
      'Stir continuously to prevent curdling',
      'Serve with puto (rice cakes)',
    ],
  },
];

const heatColors: Record<HeatLevel, string> = {
  Mild: '#22c55e',
  Medium: '#eab308',
  Hot: '#f97316',
  'Extra Hot': '#ef4444',
};

const categoryIcons: Record<DishCategory, keyof typeof Ionicons.glyphMap> = {
  soup: 'water-outline',
  main: 'restaurant-outline',
  appetizer: 'pizza-outline',
  sauce: 'flask-outline',
};

export default function CulinaryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHeat, setSelectedHeat] = useState<HeatLevel | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHeat = !selectedHeat || recipe.heatLevel === selectedHeat;
    return matchesSearch && matchesHeat;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Culinary Guide</Text>
        <Text style={styles.headerSubtitle}>Filipino Chili Recipes</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Heat Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, !selectedHeat && styles.filterChipActive]}
          onPress={() => setSelectedHeat(null)}
        >
          <Text style={[styles.filterChipText, !selectedHeat && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {(['Mild', 'Medium', 'Hot', 'Extra Hot'] as HeatLevel[]).map((heat) => (
          <TouchableOpacity
            key={heat}
            style={[
              styles.filterChip,
              selectedHeat === heat && { backgroundColor: heatColors[heat] },
            ]}
            onPress={() => setSelectedHeat(selectedHeat === heat ? null : heat)}
          >
            <Ionicons
              name="flame"
              size={14}
              color={selectedHeat === heat ? '#fff' : heatColors[heat]}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedHeat === heat && styles.filterChipTextActive,
              ]}
            >
              {heat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recipes */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredRecipes.map((recipe) => (
          <TouchableOpacity
            key={recipe.id}
            style={styles.recipeCard}
            onPress={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
            activeOpacity={0.8}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: `${heatColors[recipe.heatLevel]}20` }]}>
                <Ionicons
                  name={categoryIcons[recipe.category]}
                  size={24}
                  color={heatColors[recipe.heatLevel]}
                />
              </View>
              <View style={styles.cardTitleSection}>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                {recipe.filipinoName && (
                  <Text style={styles.filipinoName}>{recipe.filipinoName}</Text>
                )}
              </View>
              <View style={[styles.heatBadge, { backgroundColor: heatColors[recipe.heatLevel] }]}>
                <Ionicons name="flame" size={12} color="white" />
              </View>
            </View>

            {/* Description */}
            <Text style={styles.description}>{recipe.description}</Text>

            {/* Meta Info */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#6b7280" />
                <Text style={styles.metaText}>{recipe.cookTime}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={14} color="#6b7280" />
                <Text style={styles.metaText}>{recipe.servings} servings</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="leaf-outline" size={14} color="#6b7280" />
                <Text style={styles.metaText}>{recipe.recommendedChili}</Text>
              </View>
            </View>

            {/* Expanded Content */}
            {expandedId === recipe.id && (
              <View style={styles.expandedContent}>
                {/* Ingredients */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  {recipe.ingredients.map((ing, idx) => (
                    <View key={idx} style={styles.ingredientRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                      <Text style={styles.ingredientText}>{ing}</Text>
                    </View>
                  ))}
                </View>

                {/* Instructions */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  {recipe.instructions.map((step, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>

                {/* Tips */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tips</Text>
                  {recipe.tips.map((tip, idx) => (
                    <View key={idx} style={styles.tipRow}>
                      <Ionicons name="bulb-outline" size={16} color="#eab308" />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Expand Indicator */}
            <View style={styles.expandIndicator}>
              <Text style={styles.expandText}>
                {expandedId === recipe.id ? 'Show less' : 'View recipe'}
              </Text>
              <Ionicons
                name={expandedId === recipe.id ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#f97316"
              />
            </View>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  filterScroll: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#dc2626',
  },
  filterChipText: {
    fontSize: 14,
    color: '#4b5563',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  recipeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleSection: {
    flex: 1,
    marginLeft: 12,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  filipinoName: {
    fontSize: 13,
    color: '#6b7280',
  },
  heatBadge: {
    padding: 6,
    borderRadius: 8,
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4b5563',
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  expandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  expandText: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '600',
    marginRight: 4,
  },
  bottomPadding: {
    height: 100,
  },
});
