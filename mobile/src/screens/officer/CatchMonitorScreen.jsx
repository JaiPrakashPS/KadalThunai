import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../store/LanguageContext';

export default function CatchMonitorScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [catches, setCatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalWeight: 0, totalEarnings: 0, count: 0 });

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const params = { limit: 100 };
      if (search) params.species = search;
      const res = await api.get(ENDPOINTS.CATCHES, { params });
      const data = res.data.data || [];
      setCatches(data);
      setStats({
        totalWeight: data.reduce((s, c) => s + (c.weight || 0), 0),
        totalEarnings: data.reduce((s, c) => s + (c.earnings || 0), 0),
        count: data.length,
      });
    } catch (e) { console.warn(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { load(); }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.speciesRow}>
        <View style={styles.fishIcon}>
          <Ionicons name="fish" size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.species}>{item.species}</Text>
          <Text style={styles.fisherman}>{item.fishermenId?.name || (lang === 'ta' ? 'அறியப்படாத மீனவர்' : 'Unknown fisherman')}</Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.weight}>{item.weight} kg</Text>
          <Text style={styles.earnings}>₹{item.earnings?.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
        <Text style={styles.metaText}>{item.catchDate ? new Date(item.catchDate).toLocaleDateString('en-IN') : 'N/A'}</Text>
        {item.boatId?.name && <>
          <Text style={styles.metaDot}>·</Text>
          <Ionicons name="boat-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{item.boatId.name}</Text>
        </>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{lang === 'ta' ? 'மீன்பிடி கண்காணிப்பு' : 'Catch Monitor'}</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.statsRow}>
        {[
          { label: lang === 'ta' ? 'மொத்த மீன்பிடிப்பு' : 'Total Catches', value: stats.count, icon: 'fish', color: COLORS.primary },
          { label: lang === 'ta' ? 'மொத்த எடை' : 'Total Weight', value: `${stats.totalWeight.toFixed(0)} kg`, icon: 'scale', color: COLORS.success },
          { label: lang === 'ta' ? 'மொத்த வருவாய்' : 'Total Revenue', value: `₹${(stats.totalEarnings / 1000).toFixed(0)}K`, icon: 'cash', color: COLORS.secondary },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { borderColor: s.color + '44' }]}>
            <Ionicons name={s.icon} size={16} color={s.color} />
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder={t('catch.searchPlaceholder') || 'Search by species...'} placeholderTextColor={COLORS.textMuted} returnKeyType="search" onSubmitEditing={() => load()} />
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 60 }} /> : (
        <FlatList
          data={catches}
          renderItem={renderItem}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="fish-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{t('catch.noCatches') || 'No catches found'}</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, gap: 3 },
  statValue: { fontSize: 15, fontWeight: '800' },
  statLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14, paddingVertical: 12 },
  list: { paddingHorizontal: SPACING.md, gap: 10, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  speciesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  fishIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '22', justifyContent: 'center', alignItems: 'center' },
  species: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  fisherman: { fontSize: 12, color: COLORS.textSecondary },
  statsCol: { alignItems: 'flex-end' },
  weight: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  earnings: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: COLORS.textMuted },
  metaDot: { color: COLORS.textMuted },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
});
