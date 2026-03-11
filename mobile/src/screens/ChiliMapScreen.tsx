import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

interface Hotspot {
  name: string;
  region: string;
  lat: number;
  lng: number;
  type: string;
  varieties: string[];
  description: string;
}

const DEFAULT_HOTSPOTS: Hotspot[] = [
  { name: 'Sorsogon Chili Farms', region: 'Bicol Region', lat: 12.9742, lng: 124.0058, type: 'growing', varieties: ['Siling Labuyo', 'Siling Haba'], description: 'Major chili-producing area in the Bicol region known for spicy cuisine.' },
  { name: 'Albay Pepper Gardens', region: 'Bicol Region', lat: 13.1775, lng: 123.7280, type: 'growing', varieties: ['Siling Labuyo'], description: 'Volcanic soil produces exceptionally hot peppers.' },
  { name: 'Manila Wholesale Market', region: 'NCR', lat: 14.5995, lng: 120.9842, type: 'market', varieties: ['Siling Haba', 'Siling Labuyo'], description: 'Central hub for chili trade in Metro Manila.' },
  { name: 'Ilocos Norte Farms', region: 'Ilocos Region', lat: 18.1647, lng: 120.7116, type: 'growing', varieties: ['Siling Haba'], description: 'Northern Luzon chili cultivation area.' },
  { name: 'Cebu Chili Market', region: 'Central Visayas', lat: 10.3157, lng: 123.8854, type: 'market', varieties: ['Siling Labuyo', 'Siling Haba'], description: 'Major Visayas distribution center for chilies.' },
  { name: 'Davao Pepper District', region: 'Davao Region', lat: 7.1907, lng: 125.4553, type: 'growing', varieties: ['Siling Labuyo', 'Siling Demonyo'], description: 'Mindanao growing region with hot pepper varieties.' },
  { name: 'Pangasinan Farms', region: 'Pangasinan', lat: 16.0433, lng: 120.3324, type: 'growing', varieties: ['Siling Haba'], description: 'Key producer of mild chili varieties.' },
  { name: 'Quezon Province', region: 'CALABARZON', lat: 14.0072, lng: 121.5969, type: 'growing', varieties: ['Siling Labuyo', 'Siling Haba'], description: 'Southern Luzon agricultural hub.' },
];

const typeColors: Record<string, { bg: string; text: string; icon: string }> = {
  growing: { bg: '#dcfce7', text: '#16a34a', icon: '#22c55e' },
  market: { bg: '#dbeafe', text: '#2563eb', icon: '#3b82f6' },
  research: { bg: '#f3e8ff', text: '#7c3aed', icon: '#8b5cf6' },
};

export default function ChiliMapScreen() {
  const navigation = useNavigation();
  const [hotspots, setHotspots] = useState<Hotspot[]>(DEFAULT_HOTSPOTS);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    api.get('/hotspots')
      .then((res: any) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setHotspots(res.data.map((h: any) => ({
            name: h.name,
            region: h.region,
            lat: h.lat,
            lng: h.lng,
            type: h.type,
            varieties: h.varieties || [],
            description: h.description || '',
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter ? hotspots.filter((h) => h.type === filter) : hotspots;
  const growingCount = hotspots.filter((h) => h.type === 'growing').length;
  const marketCount = hotspots.filter((h) => h.type === 'market').length;
  const researchCount = hotspots.filter((h) => h.type === 'research').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chili Map</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statChip, filter === 'growing' && { borderColor: '#22c55e', borderWidth: 2 }]}
            onPress={() => setFilter(filter === 'growing' ? null : 'growing')}
          >
            <Ionicons name="leaf" size={18} color="#22c55e" />
            <Text style={styles.statNumber}>{growingCount}</Text>
            <Text style={styles.statLabel}>Growing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statChip, filter === 'market' && { borderColor: '#3b82f6', borderWidth: 2 }]}
            onPress={() => setFilter(filter === 'market' ? null : 'market')}
          >
            <Ionicons name="storefront" size={18} color="#3b82f6" />
            <Text style={styles.statNumber}>{marketCount}</Text>
            <Text style={styles.statLabel}>Markets</Text>
          </TouchableOpacity>
          {researchCount > 0 && (
            <TouchableOpacity
              style={[styles.statChip, filter === 'research' && { borderColor: '#8b5cf6', borderWidth: 2 }]}
              onPress={() => setFilter(filter === 'research' ? null : 'research')}
            >
              <Ionicons name="flask" size={18} color="#8b5cf6" />
              <Text style={styles.statNumber}>{researchCount}</Text>
              <Text style={styles.statLabel}>Research</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator size="small" color="#dc2626" />
          </View>
        )}

        {/* Hotspot List */}
        <Text style={styles.sectionTitle}>
          Philippine Chili Hotspots ({filtered.length})
        </Text>

        {filtered.map((spot, idx) => {
          const tc = typeColors[spot.type] || typeColors.growing;
          return (
            <View key={idx} style={styles.spotCard}>
              <View style={styles.spotHeader}>
                <View style={[styles.typeIcon, { backgroundColor: tc.bg }]}>
                  <Ionicons
                    name={spot.type === 'market' ? 'storefront' : spot.type === 'research' ? 'flask' : 'leaf'}
                    size={18}
                    color={tc.icon}
                  />
                </View>
                <View style={styles.spotHeaderText}>
                  <Text style={styles.spotName}>{spot.name}</Text>
                  <Text style={styles.spotRegion}>{spot.region}</Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: tc.bg }]}>
                  <Text style={[styles.typeBadgeText, { color: tc.text }]}>
                    {spot.type.charAt(0).toUpperCase() + spot.type.slice(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.spotDescription}>{spot.description}</Text>

              {spot.varieties.length > 0 && (
                <View style={styles.varietiesRow}>
                  {spot.varieties.map((v) => (
                    <View key={v} style={styles.varietyChip}>
                      <Ionicons name="flame" size={10} color="#f97316" />
                      <Text style={styles.varietyChipText}>{v}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.coordsRow}>
                <Ionicons name="navigate-outline" size={12} color="#9ca3af" />
                <Text style={styles.coordsText}>
                  {spot.lat.toFixed(4)}°N, {spot.lng.toFixed(4)}°E
                </Text>
              </View>
            </View>
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
  content: { flex: 1, paddingHorizontal: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 },
  statChip: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#9ca3af' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 10 },
  spotCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  spotHeader: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  spotHeaderText: { flex: 1 },
  spotName: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
  spotRegion: { fontSize: 12, color: '#9ca3af' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  spotDescription: { color: '#6b7280', fontSize: 13, lineHeight: 18, marginTop: 10 },
  varietiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  varietyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  varietyChipText: { fontSize: 11, color: '#f97316', fontWeight: '500' },
  coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  coordsText: { fontSize: 11, color: '#9ca3af' },
});
