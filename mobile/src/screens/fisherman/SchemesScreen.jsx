import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { getCachedSchemes, cacheSchemes } from '../../db/helpers';
import { useNetwork } from '../../store/NetworkContext';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const CATEGORIES = ['all', 'subsidy', 'insurance', 'training', 'equipment', 'welfare', 'financial'];

const CATEGORY_ICONS = {
  all: 'apps', subsidy: 'cash', insurance: 'shield-checkmark',
  training: 'school', equipment: 'construct', welfare: 'heart', financial: 'wallet',
};

const CATEGORY_LABELS = {
  all: 'All', subsidy: 'Subsidy', insurance: 'Insurance',
  training: 'Training', equipment: 'Equipment', welfare: 'Welfare', financial: 'Financial',
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline, lang }) {
  if (!deadline) return null;
  const days = daysUntil(deadline);
  if (days < 0) return (
    <View style={[styles.badge, { backgroundColor: COLORS.danger + '22' }]}>
      <Text style={[styles.badgeText, { color: COLORS.danger }]}>{lang === 'ta' ? 'முடிவடைந்தது' : 'Expired'}</Text>
    </View>
  );
  if (days <= 30) return (
    <View style={[styles.badge, { backgroundColor: COLORS.warning + '22' }]}>
      <Ionicons name="time-outline" size={10} color={COLORS.warning} />
      <Text style={[styles.badgeText, { color: COLORS.warning }]}> {days} {lang === 'ta' ? 'நாட்கள் மீதமுள்ளன' : 'days left'}</Text>
    </View>
  );
  return (
    <View style={[styles.badge, { backgroundColor: COLORS.success + '22' }]}>
      <Text style={[styles.badgeText, { color: COLORS.success }]}>
        {new Date(deadline).toLocaleDateString('en-IN')}
      </Text>
    </View>
  );
}

export default function SchemesScreen({ navigation }) {
  const { isConnected } = useNetwork();
  const { lang, t } = useLanguage();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [isOfflineData, setIsOfflineData] = useState(false);

  const loadSchemes = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      if (isConnected) {
        const res = await api.get(ENDPOINTS.SCHEMES, { params: { limit: 100 } });
        const data = res.data.data || [];
        setSchemes(data);
        cacheSchemes(data);
        setIsOfflineData(false);
      } else {
        const cached = getCachedSchemes();
        setSchemes(cached);
        setIsOfflineData(true);
      }
    } catch {
      const cached = getCachedSchemes();
      setSchemes(cached);
      setIsOfflineData(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected]);

  useEffect(() => { loadSchemes(); }, [loadSchemes]);

  const filtered = selectedCategory === 'all'
    ? schemes
    : schemes.filter(s => s.category === selectedCategory);

  const renderScheme = ({ item }) => {
    const isExpanded = expandedId === (item._id || item.server_id);
    const title = lang === 'ta' ? (item.titleTamil || item.title_tamil || item.title) : item.title;
    const desc = lang === 'ta' ? (item.descriptionTamil || item.description_tamil || item.description) : item.description;

    return (
      <TouchableOpacity
        style={styles.schemeCard}
        onPress={() => setExpandedId(isExpanded ? null : (item._id || item.server_id))}
        activeOpacity={0.85}
      >
        <View style={styles.schemeHeader}>
          <View style={styles.categoryBadge}>
            <Ionicons name={CATEGORY_ICONS[item.category] || 'document'} size={12} color={COLORS.secondary} />
            <Text style={styles.categoryText}>
              {item.category === 'all'
                ? (lang === 'ta' ? 'அனைத்தும்' : 'All')
                : (t(`schemes.categories.${item.category}`) || item.category)}
            </Text>
          </View>
          <DeadlineBadge deadline={item.deadline} lang={lang} />
        </View>
        <Text style={styles.schemeTitle}>{title}</Text>
        {lang !== 'ta' && (item.titleTamil || item.title_tamil) ? (
          <Text style={styles.schemeTitleTamil}>{item.titleTamil || item.title_tamil}</Text>
        ) : null}
        {!isExpanded && (
          <Text style={styles.schemeDesc} numberOfLines={2}>
            {desc}
          </Text>
        )}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.schemeDesc}>{desc}</Text>
            {lang !== 'ta' && (item.descriptionTamil || item.description_tamil) && (
              <Text style={[styles.schemeDesc, { color: COLORS.textMuted, marginTop: 6 }]}>
                {item.descriptionTamil || item.description_tamil}
              </Text>
            )}
            {item.eligibility && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>✅ {t('schemes.eligibility') || 'Eligibility'}</Text>
                <Text style={styles.sectionText}>{lang === 'ta' ? (item.eligibilityTamil || item.eligibility) : item.eligibility}</Text>
              </View>
            )}
            {item.benefits && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>🎁 {t('schemes.benefits') || 'Benefits'}</Text>
                <Text style={styles.sectionText}>{lang === 'ta' ? (item.benefitsTamil || item.benefits) : item.benefits}</Text>
              </View>
            )}
            {item.howToApply && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>📋 {t('schemes.howToApply') || 'How to Apply'}</Text>
                <Text style={styles.sectionText}>{lang === 'ta' ? (item.howToApplyTamil || item.howToApply) : item.howToApply}</Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.expandRow}>
          <Text style={styles.expandText}>
            {isExpanded 
              ? (lang === 'ta' ? 'குறைவாகக் காட்டு' : 'Show less') 
              : (lang === 'ta' ? 'மேலும் படிக்க' : 'Read more')}
          </Text>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('schemes.title') || 'Government Schemes'}</Text>
        <View style={{ width: 36 }} />
      </View>
      {isOfflineData && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={COLORS.warning} />
          <Text style={styles.offlineText}>{lang === 'ta' ? 'ஆஃப்லைன் தரவு காட்டப்படுகிறது' : 'Showing cached data'}</Text>
        </View>
      )}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: SPACING.md }}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Ionicons name={CATEGORY_ICONS[cat]} size={13} color={selectedCategory === cat ? COLORS.background : COLORS.textSecondary} />
            <Text style={[styles.filterLabel, selectedCategory === cat && styles.filterLabelActive]}>
              {cat === 'all'
                ? (lang === 'ta' ? 'அனைத்தும்' : 'All')
                : (t(`schemes.categories.${cat}`) || CATEGORY_LABELS[cat])}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderScheme}
          keyExtractor={i => i._id || i.server_id || String(Math.random())}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSchemes(true); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{lang === 'ta' ? 'திட்டங்கள் எதுவும் இல்லை' : 'No schemes available'}</Text>
            </View>
          }
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
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.warning + '22', paddingHorizontal: SPACING.md, paddingVertical: 6 },
  offlineText: { fontSize: 12, color: COLORS.warning },
  filterRow: { maxHeight: 50, marginBottom: SPACING.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.backgroundLight, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  filterLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  filterLabelActive: { color: COLORS.background, fontWeight: '700' },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 32 },
  schemeCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  schemeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.secondary + '22', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontSize: 11, color: COLORS.secondary, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  schemeTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  schemeTitleTamil: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  schemeDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  expandedContent: { marginTop: SPACING.sm },
  section: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  sectionText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 4 },
  expandText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
});
