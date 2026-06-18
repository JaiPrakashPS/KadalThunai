import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../store/LanguageContext';

const BOAT_TYPE_COLORS = {
  mechanized: COLORS.primary, motorized: COLORS.success, traditional: COLORS.secondary, fiber: COLORS.info,
};

export default function BoatMonitorScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.BOATS, { params: { limit: 200 } });
      setBoats(res.data.data || []);
    } catch (e) { console.warn(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const types = ['all', 'mechanized', 'motorized', 'traditional', 'fiber'];
  const filtered = typeFilter === 'all' ? boats : boats.filter(b => b.type === typeFilter);

  const getBoatTypeLabelLocal = (type) => {
    if (type === 'all') return lang === 'ta' ? 'அனைத்தும்' : 'All';
    return t(`boat.types.${type.toLowerCase()}`) || type;
  };

  const renderItem = ({ item }) => {
    const typeColor = BOAT_TYPE_COLORS[item.type] || COLORS.primary;
    return (
      <View style={[styles.card, { borderLeftColor: typeColor, borderLeftWidth: 4 }]}>
        <View style={styles.boatTop}>
          <View style={styles.boatInfo}>
            <Text style={styles.boatName}>{item.name}</Text>
            <Text style={styles.boatReg}>{item.registrationNo}</Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: typeColor + '22' }]}>
            <Text style={[styles.typePillText, { color: typeColor }]}>
              {item.type ? (t(`boat.types.${item.type.toLowerCase()}`) || item.type) : ''}
            </Text>
          </View>
        </View>
        <View style={styles.boatMeta}>
          {item.ownerId?.name && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{item.ownerId.name}</Text>
            </View>
          )}
          {item.capacity && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{item.capacity} {lang === 'ta' ? 'நபர்கள்' : 'crew'}</Text>
            </View>
          )}
          <View style={[styles.activeBadge, { backgroundColor: item.isActive ? COLORS.success + '22' : COLORS.textMuted + '22' }]}>
            <Text style={[styles.activeText, { color: item.isActive ? COLORS.success : COLORS.textMuted }]}>
              {item.isActive ? (lang === 'ta' ? 'செயலில்' : 'Active') : (lang === 'ta' ? 'செயலற்றது' : 'Inactive')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{(t('officer.boats') || 'Boats')} ({filtered.length})</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.filterRow}>
        {types.map(type => (
          <TouchableOpacity key={type} style={[styles.filterChip, typeFilter === type && styles.filterChipActive]} onPress={() => setTypeFilter(type)}>
            <Text style={[styles.filterText, typeFilter === type && styles.filterTextActive]}>{getBoatTypeLabelLocal(type)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} /> : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="boat-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{lang === 'ta' ? 'படகுகள் எதுவும் காணப்படவில்லை' : 'No boats found'}</Text></View>}
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
  filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: 8, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  filterChip: { backgroundColor: COLORS.backgroundLight, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', textTransform: 'capitalize' },
  filterTextActive: { color: COLORS.white, fontWeight: '700' },
  list: { paddingHorizontal: SPACING.md, gap: 10, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  boatTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  boatInfo: { flex: 1 },
  boatName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  boatReg: { fontSize: 12, color: COLORS.textSecondary },
  typePill: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  typePillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  boatMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textMuted },
  activeBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 'auto' },
  activeText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
});
