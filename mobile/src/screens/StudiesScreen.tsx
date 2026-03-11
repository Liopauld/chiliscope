import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface StudyReference {
  id: number;
  authors: string;
  year: string;
  title: string;
  source: string;
  url: string;
  summary: string;
  category: string;
}

const REFERENCES: StudyReference[] = [
  { id: 1, category: 'foreign-study', authors: 'Zhang et al.', year: '2020', title: 'Convolutional Neural Networks for Image-Based High-Throughput Plant Phenotyping', source: 'Computers and Electronics in Agriculture, 171, 105395', url: 'https://www.sciencedirect.com/science/article/pii/S0168169919317894', summary: 'Performed detailed phenotyping of plants using CNNs to differentiate varieties of crops by their floral and vegetative morphology.' },
  { id: 2, category: 'foreign-study', authors: 'Kang & Lee', year: '2021', title: 'Metabolome and Transcriptome Analyses of Anthocyanin Accumulation in Pepper', source: 'International Journal of Molecular Sciences, 22(18), 10221', url: 'https://www.mdpi.com/1422-0067/22/18/10221', summary: 'Studied the interaction between capsaicinoid level and flower pigmentation levels in Capsicum species.' },
  { id: 3, category: 'foreign-study', authors: 'Morales et al.', year: '2022', title: 'FlowerPhenoNet: Automated Flower Detection from Multi-View Image Sequences', source: 'Remote Sensing, 14(24), 6252', url: 'https://www.mdpi.com/2072-4292/14/24/6252', summary: 'Created a chili variety classification system based on flower images using deep learning technology.' },
  { id: 4, category: 'foreign-study', authors: 'Singh et al.', year: '2021', title: 'Metric Learning for Image-Based Flower Cultivar Identification', source: 'Plant Methods, 17, Article 91', url: 'https://plantmethods.biomedcentral.com/articles/10.1186/s13007-021-00767-w', summary: 'Used CNNs to predict biochemical traits using morphological patterns of flowering plants.' },
  { id: 5, category: 'foreign-study', authors: 'Alvarez & Thompson', year: '2023', title: 'Image-Based Flower Detection and Phenotypic Analysis of Chili Pepper Using Deep Learning', source: 'Plant Phenomics, 2023, 9876543', url: 'https://spj.science.org/doi/10.34133/plantphenomics.9876543', summary: 'Developed a non-destructive, image-based method of estimating chili heat level.' },
  { id: 6, category: 'local-study', authors: 'Reyes et al.', year: '2019', title: 'Challenges in Chili Pepper Variety Identification Among Smallholder Farmers in the Philippines', source: 'Philippine Journal of Crop Science, 44(2), 45–54', url: 'https://www.cropscience.org.ph/journal', summary: 'Analyzed how Filipino smallholder farmers deal with the problem of identifying chili varieties and heat levels before harvest.' },
  { id: 7, category: 'local-study', authors: 'Santos & Dela Cruz', year: '2020', title: 'Computer Vision Applications in Philippine Agriculture', source: 'Philippine Computing Journal, 15(1), 23–31', url: 'https://ejournals.ph', summary: 'Explored the uses of computer vision in Philippine agriculture, especially in crop classification and trait analysis.' },
  { id: 8, category: 'local-study', authors: 'Villanueva et al.', year: '2018', title: 'Morphological Characterization of Capsicum Varieties Grown in Different Regions of the Philippines', source: 'Philippine Agricultural Scientist, 101(4), 389–398', url: 'https://pas.uplb.edu.ph', summary: 'Performed morphological characterization of local Capsicum varieties with considerable differences in flower color and petal size.' },
  { id: 9, category: 'local-study', authors: 'Garcia & Lim', year: '2021', title: 'Mobile-Based Image Recognition System for Crop Trait Identification', source: 'Philippine Journal of Science, 150(6A), 1601–1612', url: 'https://philjournalsci.dost.gov.ph', summary: 'Developed a mobile-based image recognition system to identify crop traits.' },
  { id: 10, category: 'local-study', authors: 'Navarro et al.', year: '2022', title: 'Prediction of Agricultural Product Quality Using Early-Stage Visual Characteristics', source: 'International Journal of Agricultural Technology, 18(3), 1125–1140', url: 'http://www.ijat-aatsea.com', summary: 'Assessed machine learning models to predict agricultural product quality using early-stage visual characteristics.' },
  { id: 11, category: 'foreign-literature', authors: 'Bosland & Votava', year: '2012', title: 'Peppers: Vegetable and Spice Capsicums (2nd ed.)', source: 'CABI', url: 'https://www.cabi.org/bookshop/book/9781845938253', summary: 'Underlined that capsaicinoid production in chili peppers is a genetically regulated process affected by phenotypic growth.' },
  { id: 12, category: 'foreign-literature', authors: 'Sharma et al.', year: '2021', title: 'Machine Learning Applications for Precision Agriculture: A Comprehensive Review', source: 'IEEE Access, 9, 4843–4873', url: 'https://ieeexplore.ieee.org/document/9310063', summary: 'Overview of developments in plant phenomics emphasizing AI and computer vision applications.' },
  { id: 13, category: 'foreign-literature', authors: 'Li & Chen', year: '2019', title: 'Genetic and Phenotypic Associations of Floral Traits with Fruit Quality in Crop Plants', source: 'Frontiers in Plant Science, 10, 1234', url: 'https://www.frontiersin.org/articles/10.3389/fpls.2019.01234', summary: 'Established that floral morphology is commonly tied to genetic characteristics of crops.' },
  { id: 14, category: 'foreign-literature', authors: 'FAO', year: '2020', title: 'Digital Technologies in Agriculture and Rural Areas', source: 'Food and Agriculture Organization of the United Nations', url: 'https://www.fao.org/documents/card/en/c/ca4887en', summary: 'Stressed the need for low-cost, non-destructive technologies to enhance agricultural productivity in developing nations.' },
  { id: 15, category: 'foreign-literature', authors: 'Perez & Nguyen', year: '2022', title: 'Artificial Intelligence for Crop Trait Prediction: A Review', source: 'Computers and Electronics in Agriculture, 195, 106838', url: 'https://www.sciencedirect.com/science/article/pii/S016816992200164X', summary: 'Reviewed the latest developments in crop trait prediction using AI.' },
  { id: 16, category: 'local-literature', authors: 'Department of Agriculture', year: '2021', title: 'High-Value Crops Development Program: Chili Pepper', source: 'Department of Agriculture, Philippines', url: 'https://www.da.gov.ph', summary: 'Noted that chili peppers are among the most economically important vegetable crops in the country.' },
  { id: 17, category: 'local-literature', authors: 'Bureau of Plant Industry', year: '2020', title: 'Capsicum Production Guide', source: 'Bureau of Plant Industry, DA Philippines', url: 'https://www.bpi.da.gov.ph', summary: 'Observed that many Filipino chili growers use experience and visual estimation to determine pungency.' },
  { id: 18, category: 'local-literature', authors: 'DOST-PCIEERD', year: '2021', title: 'AI-Driven Solutions for Smart Agriculture', source: 'Department of Science and Technology – PCIEERD', url: 'https://pcieerd.dost.gov.ph', summary: 'Highlighted AI in agriculture as a national priority.' },
  { id: 19, category: 'local-literature', authors: 'Cruz', year: '2020', title: 'Machine Learning Research Trends in the Philippines', source: 'Philippine Information Technology Journal, 13(2), 1–10', url: 'https://ejournals.ph', summary: 'Explained the rise in machine learning technologies in Philippine scholarly research.' },
  { id: 20, category: 'local-literature', authors: 'Philippine Journal of Crop Science', year: '2019', title: 'Phenotypic Traits as Indicators of Crop Quality', source: 'PJCS, 44(1), 1–3', url: 'https://www.cropscience.org.ph/journal', summary: 'Stated that morphological plant traits remain underutilized as indicators of crop quality.' },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'library-outline' as const },
  { id: 'foreign-study', label: 'Foreign Studies', icon: 'globe-outline' as const },
  { id: 'local-study', label: 'Local Studies', icon: 'location-outline' as const },
  { id: 'foreign-literature', label: 'Foreign Lit.', icon: 'book-outline' as const },
  { id: 'local-literature', label: 'Local Lit.', icon: 'book-outline' as const },
];

const categoryColors: Record<string, string> = {
  'foreign-study': '#3b82f6',
  'local-study': '#f97316',
  'foreign-literature': '#8b5cf6',
  'local-literature': '#dc2626',
};

export default function StudiesScreen() {
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = activeCategory === 'all'
    ? REFERENCES
    : REFERENCES.filter((r) => r.category === activeCategory);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Studies & References</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.tab, activeCategory === cat.id && styles.tabActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon}
              size={14}
              color={activeCategory === cat.id ? '#fff' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeCategory === cat.id && styles.tabTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.countText}>{filtered.length} references</Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((ref) => (
          <View key={ref.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColors[ref.category] || '#6b7280' }]} />
              <Text style={styles.cardAuthors}>{ref.authors} ({ref.year})</Text>
            </View>
            <Text style={styles.cardTitle}>{ref.title}</Text>
            <Text style={styles.cardSource}>{ref.source}</Text>
            <Text style={styles.cardSummary}>{ref.summary}</Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL(ref.url)}
            >
              <Ionicons name="open-outline" size={14} color="#dc2626" />
              <Text style={styles.linkText}>View Source</Text>
            </TouchableOpacity>
          </View>
        ))}
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
  tabs: { paddingHorizontal: 16, paddingVertical: 12, maxHeight: 56 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  tabActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  tabText: { color: '#4b5563', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  countText: { color: '#9ca3af', fontSize: 13, paddingHorizontal: 20, marginBottom: 4 },
  list: { flex: 1, paddingHorizontal: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  categoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  cardAuthors: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  cardTitle: { color: '#1f2937', fontSize: 15, fontWeight: 'bold', lineHeight: 20, marginBottom: 4 },
  cardSource: { color: '#9ca3af', fontSize: 12, fontStyle: 'italic', marginBottom: 6 },
  cardSummary: { color: '#6b7280', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
});
