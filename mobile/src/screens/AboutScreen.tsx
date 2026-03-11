import React from 'react';
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

const DEVELOPERS = [
  {
    name: 'Paul Dominic Syparrado',
    phone: '09770035933',
    address: '26-C Ilang-Ilang St., Wawa, Taguig City',
    email: 'pauldominic.syparrado@tup.edu.ph',
    role: 'Developer',
  },
  {
    name: 'Maricarl C. Leaño',
    phone: '09765387998',
    address: 'Purok 6-C, 12, Jasmin, Lower Bicutan, Taguig City',
    email: 'maricarl.leano@tup.edu.ph',
    role: 'Developer',
  },
  {
    name: 'Renz Mark A. Madera',
    phone: '09947407994',
    address: '08 Alagao St. Western Bicutan, Taguig City',
    email: 'renzmark.madera@tup.edu.ph',
    role: 'Developer',
  },
  {
    name: 'Richard Anthony G. Iddurut',
    phone: '09930065091',
    address: '7110 Kasoy St. Comembo Taguig City',
    emails: ['richardainthony@gmail.com', 'richardanthony.iddurut@tup.edu.ph'],
    role: 'Developer',
  },
];

export default function AboutScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={styles.appCard}>
          <View style={styles.appIconContainer}>
            <Ionicons name="leaf" size={40} color="#dc2626" />
          </View>
          <Text style={styles.appName}>ChiliScope</Text>
          <Text style={styles.appVersion}>v1.0.0</Text>
          <Text style={styles.appDescription}>
            AI-powered chili pepper analysis system for Philippine varieties.
            Classify, predict heat levels, and explore the world of chilies.
          </Text>
        </View>

        {/* University */}
        <View style={styles.universityCard}>
          <Ionicons name="school-outline" size={24} color="#dc2626" />
          <View style={styles.universityText}>
            <Text style={styles.universityName}>
              Technological University of the Philippines – Taguig
            </Text>
            <Text style={styles.universityDept}>
              College of Industrial Technology
            </Text>
          </View>
        </View>

        {/* Team */}
        <Text style={styles.sectionTitle}>Development Team</Text>
        {DEVELOPERS.map((dev, idx) => {
          const initials = dev.name
            .split(' ')
            .filter((_, i, arr) => i === 0 || i === arr.length - 1)
            .map((s) => s[0])
            .join('');
          const primaryEmail = 'emails' in dev ? dev.emails![0] : dev.email;

          return (
            <View key={idx} style={styles.devCard}>
              <View style={styles.devAvatar}>
                <Text style={styles.devInitials}>{initials}</Text>
              </View>
              <View style={styles.devInfo}>
                <Text style={styles.devName}>{dev.name}</Text>
                <Text style={styles.devRole}>{dev.role}</Text>

                <View style={styles.devContactRow}>
                  <Ionicons name="call-outline" size={13} color="#6b7280" />
                  <Text style={styles.devContactText}>{dev.phone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.devContactRow}
                  onPress={() => Linking.openURL(`mailto:${primaryEmail}`)}
                >
                  <Ionicons name="mail-outline" size={13} color="#6b7280" />
                  <Text style={[styles.devContactText, { color: '#dc2626' }]}>{primaryEmail}</Text>
                </TouchableOpacity>
                {'emails' in dev && dev.emails && dev.emails.length > 1 && (
                  <TouchableOpacity
                    style={styles.devContactRow}
                    onPress={() => Linking.openURL(`mailto:${dev.emails![1]}`)}
                  >
                    <Ionicons name="mail-outline" size={13} color="#6b7280" />
                    <Text style={[styles.devContactText, { color: '#dc2626' }]}>{dev.emails![1]}</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.devContactRow}>
                  <Ionicons name="location-outline" size={13} color="#6b7280" />
                  <Text style={styles.devContactText}>{dev.address}</Text>
                </View>
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
  appCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  appVersion: { fontSize: 14, color: '#9ca3af', marginTop: 2 },
  appDescription: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  universityCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  universityText: { flex: 1 },
  universityName: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
  universityDept: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  devCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
  },
  devAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devInitials: { color: '#dc2626', fontWeight: 'bold', fontSize: 16 },
  devInfo: { flex: 1 },
  devName: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
  devRole: { fontSize: 12, color: '#9ca3af', marginBottom: 6 },
  devContactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  devContactText: { fontSize: 12, color: '#6b7280', flex: 1 },
});
