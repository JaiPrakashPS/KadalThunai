import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../store/LanguageContext';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { getAllCatches } from '../../db/helpers';
import { useNetwork } from '../../store/NetworkContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const THEME = {
  background: '#0A1628',
  surface: '#0F2044',
  primary: '#0066CC',
  secondary: '#F59E0B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#1E3A5F',
  success: '#22C55E',
  danger: '#EF4444',
  card: '#112352',
};

const DATE_FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom', value: 'custom' },
];

const PAGE_SIZE = 20;

function filterByDate(catches, filter) {
  const now = new Date();
  return catches.filter((c) => {
    const d = new Date(c.created_at || c.date);
    if (isNaN(d)) return true;
    switch (filter) {
      case 'today': {
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }
      case 'week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return d >= startOfWeek;
      }
      case 'month': {
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }
      default:
        return true;
    }
  });
}

function SwipeableCard({ item, onDelete, onPress }) {
  const { t, lang } = useLanguage();
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteThreshold = -80;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx),
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dx < 0) {
        translateX.setValue(Math.max(gestureState.dx, -100));
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < deleteThreshold) {
        Animated.spring(translateX, {
          toValue: -80,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const handleDelete = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    onDelete(item);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const speciesName = lang === 'ta' ? (item.speciesTamil || item.species_tamil || item.species || item.species_name) : (item.species || item.species_name);

  return (
    <View style={styles.swipeWrapper}>
      {/* Delete action background */}
      <View style={styles.deleteAction}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteActionInner}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.deleteActionText}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </View>

      {/* Main card */}
      <Animated.View
        style={[styles.catchCard, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity activeOpacity={0.8} onPress={() => onPress && onPress(item)}>
          <View style={styles.catchCardTop}>
            <View style={styles.catchSpeciesIcon}>
              <Ionicons name="fish" size={20} color={THEME.primary} />
            </View>
            <View style={styles.catchInfo}>
              <Text style={styles.catchSpecies}>{speciesName || t('common.noData')}</Text>
              <Text style={styles.catchMeta}>
                {(typeof item.location === 'object' ? item.location?.name : item.location) || item.catch_location_name || 'Unknown Location'}
              </Text>
            </View>
            <View style={styles.catchRight}>
              <Text style={styles.catchEarnings}>
                ₹{(item.earnings || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.catchDate}>{formatDate(item.created_at || item.date)}</Text>
            </View>
          </View>

          <View style={styles.catchDivider} />

          <View style={styles.catchStats}>
            <View style={styles.catchStat}>
              <Ionicons name="scale-outline" size={13} color={THEME.textMuted} />
              <Text style={styles.catchStatText}>
                {item.weight != null ? `${item.weight} kg` : item.weight_kg != null ? `${item.weight_kg} kg` : '—'}
              </Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.catchStat}>
              <Ionicons name="location-outline" size={13} color={THEME.textMuted} />
              <Text style={styles.catchStatText}>
                {(typeof item.location === 'object' ? item.location?.name : item.location) || item.catch_location_name || '—'}
              </Text>
            </View>
            {item.synced && (
              <>
                <View style={styles.statDot} />
                <View style={styles.catchStat}>
                  <Ionicons name="cloud-done-outline" size={13} color={THEME.success} />
                  <Text style={[styles.catchStatText, { color: THEME.success }]}>{t('common.syncDone')}</Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function CatchHistoryScreen({ navigation }) {
  const { isConnected } = useNetwork();
  const { t, lang } = useLanguage();
  const [catches, setCatches] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [displayedItems, setDisplayedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('month');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState({ totalCatches: 0, totalEarnings: 0, totalWeight: 0 });

  const computeStats = useCallback((data) => {
    const now = new Date();
    const thisMonth = data.filter((c) => {
      const d = new Date(c.created_at || c.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalCatches = thisMonth.length;
    const totalEarnings = thisMonth.reduce((sum, c) => sum + (c.earnings || 0), 0);
    const totalWeight = thisMonth.reduce((sum, c) => sum + (c.weight_kg || 0), 0);
    setStats({ totalCatches, totalEarnings, totalWeight });
  }, []);

  const fetchCatches = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const local = await getAllCatches();
      let merged = [...(local || [])];
      if (isConnected) {
        try {
          const res = await api.get(ENDPOINTS.CATCHES || '/catches');
          const remote = res.data?.data || res.data || [];
          const remoteIds = new Set(remote.map((r) => r.id));
          const localOnly = merged.filter((l) => !remoteIds.has(l.id));
          merged = [...remote, ...localOnly];
        } catch {}
      }
      merged.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      setCatches(merged);
      computeStats(merged);
    } catch {
      setCatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected, computeStats]);

  useEffect(() => { fetchCatches(); }, [fetchCatches]);

  useEffect(() => {
    let result = [...catches];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) =>
        c.species_name?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q),
      );
    }
    result = filterByDate(result, dateFilter);
    setFiltered(result);
    setPage(1);
    setDisplayedItems(result.slice(0, PAGE_SIZE));
    setHasMore(result.length > PAGE_SIZE);
  }, [catches, searchQuery, dateFilter]);

  const loadMore = () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    const nextItems = filtered.slice(0, nextPage * PAGE_SIZE);
    setDisplayedItems(nextItems);
    setPage(nextPage);
    setHasMore(nextItems.length < filtered.length);
  };

  const handleDelete = (item) => {
    const speciesName = lang === 'ta' ? (item.speciesTamil || item.species_tamil || item.species || item.species_name) : (item.species || item.species_name);
    Alert.alert(
      t('catch.deleteTitle'),
      t('catch.deleteMsg', { species: speciesName || '' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const updated = catches.filter((c) => c.id !== item.id);
            setCatches(updated);
            computeStats(updated);
          },
        },
      ],
    );
  };

  const renderStat = (icon, label, value, color = THEME.text) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={THEME.primary} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="fish-outline" size={60} color={THEME.border} />
      <Text style={styles.emptyTitle}>{t('catch.noCatches')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('catch.emptySubtitle')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t('catch.historyTitle')}</Text>
          <Text style={styles.headerSub}>{lang === 'ta' ? 'மீன்பிடி வரலாறு' : 'Catch History'}</Text>
        </View>
        <TouchableOpacity
          style={styles.revenueBtn}
          onPress={() => navigation?.navigate('Revenue')}
        >
          <Ionicons name="bar-chart-outline" size={18} color={THEME.secondary} />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        {renderStat('fish-outline', t('revenue.monthly'), stats.totalCatches.toString(), THEME.primary)}
        <View style={styles.statsDivider} />
        {renderStat('cash-outline', t('revenue.earnings'), `₹${(stats.totalEarnings / 1000).toFixed(1)}k`, THEME.success)}
        <View style={styles.statsDivider} />
        {renderStat('scale-outline', t('catch.totalWeight'), `${stats.totalWeight.toFixed(1)} kg`, THEME.secondary)}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={THEME.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('catch.searchPlaceholder')}
          placeholderTextColor={THEME.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={THEME.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Date Filter */}
      <View style={styles.dateFilters}>
        {DATE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.dateChip,
              dateFilter === f.value && styles.dateChipActive,
            ]}
            onPress={() => setDateFilter(f.value)}
          >
            <Text
              style={[
                styles.dateChipText,
                dateFilter === f.value && styles.dateChipTextActive,
              ]}
            >
              {t('catch.dateFilters.' + f.value)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>{t('catch.loadingHistory')}</Text>
        </View>
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={({ item }) => (
            <SwipeableCard
              item={item}
              onDelete={handleDelete}
              onPress={() => {}}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchCatches(true)}
              tintColor={THEME.primary}
              colors={[THEME.primary]}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation?.navigate('CatchRecord')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 1,
  },
  revenueBtn: {
    marginLeft: 'auto',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F59E0B22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B44',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: THEME.border,
    marginHorizontal: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    fontSize: 14,
    padding: 0,
  },
  dateFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  dateChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  dateChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  dateChipText: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  dateChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 10,
  },
  swipeWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: THEME.danger,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  deleteActionInner: {
    alignItems: 'center',
    gap: 4,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  catchCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  catchCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catchSpeciesIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0066CC22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catchInfo: {
    flex: 1,
  },
  catchSpecies: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
  },
  catchMeta: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  catchRight: {
    alignItems: 'flex-end',
  },
  catchEarnings: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.success,
  },
  catchDate: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
  },
  catchDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 10,
  },
  catchStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  catchStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catchStatText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.border,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  loadingText: {
    color: THEME.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    color: THEME.textMuted,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
});
