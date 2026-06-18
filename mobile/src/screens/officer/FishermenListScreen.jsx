import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../store/LanguageContext';

export default function FishermenListScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [fishermen, setFishermen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const params = { role: 'fisherman', limit: 100 };
      if (search) params.search = search;
      const res = await api.get(ENDPOINTS.ADMIN_USERS, { params });
      setFishermen(res.data.data || []);
    } catch (e) { console.warn(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{(item.name || 'U').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.phone}>{item.phone || (lang === 'ta' ? 'தொலைபேசி எண் இல்லை' : 'No phone')}</Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.statusDot, { backgroundColor: item.isActive ? COLORS.success : COLORS.textMuted }]} />
        {item.isVerified && <Ionicons name="checkmark-circle" size={16} color={COLORS.success} style={{ marginTop: 4 }} />}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{(t('officer.fishermen') || 'Fishermen')} ({fishermen.length})</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder={lang === 'ta' ? 'பெயர் அல்லது மின்னஞ்சலைத் தேடுங்கள்...' : 'Search name or email...'} placeholderTextColor={COLORS.textMuted} returnKeyType="search" onSubmitEditing={() => load()} />
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} /> : (
        <FlatList
          data={fishermen}
          renderItem={renderItem}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{lang === 'ta' ? 'மீனவர்கள் யாரும் காணப்படவில்லை' : 'No fishermen found'}</Text></View>}
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
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginHorizontal: SPACING.md, marginBottom: SPACING.md, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14, paddingVertical: 12 },
  list: { paddingHorizontal: SPACING.md, gap: 10, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  avatarCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  email: { fontSize: 12, color: COLORS.textSecondary },
  phone: { fontSize: 12, color: COLORS.textMuted },
  right: { alignItems: 'center', gap: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
});
