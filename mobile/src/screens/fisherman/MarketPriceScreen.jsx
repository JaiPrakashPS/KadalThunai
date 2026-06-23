import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { getCachedMarketPrices, cacheMarketPrices } from '../../db/helpers';
import { useNetwork } from '../../store/NetworkContext';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const translateDistrict = (d, lang) => {
  if (lang !== 'ta') return d;
  const mapping = {
    'All Districts': 'அனைத்து மாவட்டங்கள்',
    'Chennai': 'சென்னை',
    'Cuddalore': 'கடலூர்',
    'Nagapattinam': 'நாகப்பட்டினம்',
    'Ramanathapuram': 'இராமநாதபுரம்',
    'Thoothukudi': 'தூத்துக்குடி',
    'Tirunelveli': 'திருநெல்வேலி',
    'Kanyakumari': 'கன்னியாகுமரி',
    'Villupuram': 'விழுப்புரம்',
    'Thanjavur': 'தஞ்சாவூர்',
    'Pudukkottai': 'புதுக்கோட்டை',
  };
  return mapping[d] || d;
};

const translateSortOption = (value, lang) => {
  const mapping = {
    'price_desc': lang === 'ta' ? 'விலை: அதிகத்திலிருந்து குறைவு' : 'Price: High to Low',
    'price_asc': lang === 'ta' ? 'விலை: குறைவிலிருந்து அதிகம்' : 'Price: Low to High',
    'name_asc': lang === 'ta' ? 'வகைகள் A–Z' : 'Species A–Z',
    'recent': lang === 'ta' ? 'சமீபத்தியது' : 'Most Recent',
  };
  return mapping[value] || value;
};

const DISTRICTS = [
  'All Districts',
  'Chennai',
  'Cuddalore',
  'Nagapattinam',
  'Ramanathapuram',
  'Thoothukudi',
  'Tirunelveli',
  'Kanyakumari',
  'Villupuram',
  'Thanjavur',
  'Pudukkottai',
];

const SORT_OPTIONS = [
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Species A–Z', value: 'name_asc' },
  { label: 'Most Recent', value: 'recent' },
];

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

const normalizePrice = (p) => {
  const fishName = p.fishName || p.species || 'Unknown';
  const fishNameTamil = p.fishNameTamil || p.speciesTamil || p.species_tamil || '';
  const wholesalePrice = p.wholesalePrice !== undefined ? p.wholesalePrice : (p.minPrice || p.min_price || 0);
  const retailPrice = p.retailPrice !== undefined ? p.retailPrice : (p.price || 0);
  const market = p.market || 'Unknown';
  const district = p.district || 'Unknown';
  const date = p.date || p.priceDate || p.price_date || new Date().toISOString();

  // Compute mock yesterday_price based on date
  const day = new Date(date).getDate();
  const diff = Math.sin(day) * (retailPrice * 0.04);
  const yesterday_price = retailPrice - diff;

  return {
    id: p._id || p.server_id || p.id,
    fishName,
    fishNameTamil,
    wholesalePrice,
    retailPrice,
    market,
    district,
    date,
    yesterday_price
  };
};

export default function MarketPriceScreen({ navigation }) {
  const { isConnected } = useNetwork();
  const { t, lang } = useLanguage();
  const [prices, setPrices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [sortBy, setSortBy] = useState('recent');
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const fetchPrices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (isConnected) {
        const response = await api.get(ENDPOINTS.MARKET_PRICES);
        const data = response.data?.data || response.data || [];
        const normalized = data.map(normalizePrice);
        setPrices(normalized);
        await cacheMarketPrices(data);
        setIsOffline(false);
      } else {
        throw new Error('offline');
      }
    } catch (err) {
      try {
        const cached = await getCachedMarketPrices();
        const normalized = (cached || []).map(normalizePrice);
        setPrices(normalized);
        setIsOffline(true);
      } catch {
        setPrices([]);
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    let result = [...prices];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.fishName?.toLowerCase().includes(q) ||
          item.fishNameTamil?.toLowerCase().includes(q) ||
          item.market?.toLowerCase().includes(q),
      );
    }

    if (selectedDistrict !== 'All Districts') {
      result = result.filter((item) => item.district === selectedDistrict);
    }

    switch (sortBy) {
      case 'price_desc':
        result.sort((a, b) => b.retailPrice - a.retailPrice);
        break;
      case 'price_asc':
        result.sort((a, b) => a.retailPrice - b.retailPrice);
        break;
      case 'name_asc':
        result.sort((a, b) =>
          (a.fishName || '').localeCompare(b.fishName || ''),
        );
        break;
      case 'recent':
        result.sort(
          (a, b) => new Date(b.date) - new Date(a.date),
        );
        break;
      default:
        break;
    }

    setFiltered(result);
  }, [prices, searchQuery, selectedDistrict, sortBy]);

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return lang === 'ta' ? 'இப்போது' : 'Just now';
    if (diffH < 24) return lang === 'ta' ? `${diffH} மணி நேரம் முன்` : `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return lang === 'ta' ? 'நேற்று' : 'Yesterday';
    return lang === 'ta' ? `${diffD} நாட்களுக்கு முன்` : `${diffD}d ago`;
  };

  const renderTrend = (item) => {
    if (item.yesterday_price == null || item.retailPrice == null) return null;
    const diff = item.retailPrice - item.yesterday_price;
    if (diff === 0) return null;
    const isUp = diff > 0;
    return (
      <View style={[styles.trendBadge, { backgroundColor: isUp ? '#22C55E22' : '#EF444422' }]}>
        <Ionicons
          name={isUp ? 'trending-up' : 'trending-down'}
          size={12}
          color={isUp ? THEME.success : THEME.danger}
        />
        <Text style={[styles.trendText, { color: isUp ? THEME.success : THEME.danger }]}>
          ₹{Math.abs(diff).toFixed(0)}
        </Text>
      </View>
    );
  };

  const renderPriceCard = ({ item }) => {
    const speciesName = lang === 'ta'
      ? (item.fishNameTamil || item.fishName || 'தெரியாத வகை')
      : (item.fishName || 'Unknown');
    const speciesSub = lang === 'ta' && item.fishNameTamil ? item.fishName : (item.fishNameTamil || '');

    return (
      <View style={styles.priceCard}>
        <View style={styles.cardHeader}>
          <View style={styles.speciesInfo}>
            <Text style={styles.speciesName}>{speciesName}</Text>
            {speciesSub ? <Text style={styles.speciesTamil}>{speciesSub}</Text> : null}
          </View>
          <View style={styles.priceBlock}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.priceLabel}>{lang === 'ta' ? 'மொத்த விலை' : 'Wholesale'}</Text>
                <Text style={[styles.priceValue, { color: THEME.text }]}>
                  ₹{item.wholesalePrice}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.priceLabel}>{lang === 'ta' ? 'சில்லறை விலை' : 'Retail'}</Text>
                <Text style={styles.priceValue}>
                  ₹{item.retailPrice}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, justifyContent: 'flex-end' }}>
              <Text style={styles.priceUnit}>/{t('market.perKg') || 'kg'}</Text>
              {renderTrend(item)}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="storefront-outline" size={13} color={THEME.textMuted} />
            <Text style={styles.footerText}>{item.market || '—'}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="location-outline" size={13} color={THEME.textMuted} />
            <Text style={styles.footerText}>{translateDistrict(item.district, lang) || '—'}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={13} color={THEME.textMuted} />
            <Text style={styles.footerText}>{formatTime(item.date)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const currentSortLabel = translateSortOption(sortBy, lang);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t('market.title') || 'Market Prices'}</Text>
          <Text style={styles.headerSub}>{lang === 'ta' ? 'அதிகாரப்பூர்வ சந்தை மீன் விலைகள்' : 'Official market fish prices'}</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="fish-outline" size={22} color={THEME.primary} />
        </View>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={15} color={THEME.secondary} />
          <Text style={styles.offlineBannerText}>{lang === 'ta' ? 'ஆஃப்லைன் தரவு காட்டப்படுகிறது' : 'Showing cached data'}</Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={THEME.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={lang === 'ta' ? 'வகை அல்லது சந்தையைத் தேடுங்கள்...' : 'Search species or market...'}
          placeholderTextColor={THEME.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={THEME.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Row */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => setShowDistrictModal(true)}
        >
          <Ionicons name="location-outline" size={14} color={THEME.primary} />
          <Text style={styles.filterChipText} numberOfLines={1}>
            {selectedDistrict === 'All Districts' ? (lang === 'ta' ? 'மாவட்டம்' : 'District') : translateDistrict(selectedDistrict, lang)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={THEME.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical-outline" size={14} color={THEME.primary} />
          <Text style={styles.filterChipText} numberOfLines={1}>
            {currentSortLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={THEME.primary} />
        </TouchableOpacity>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>{lang === 'ta' ? 'விலைகளை ஏற்றுகிறது...' : 'Loading prices...'}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="fish-outline" size={56} color={THEME.border} />
          <Text style={styles.emptyTitle}>{t('market.noData') || 'No prices found'}</Text>
          <Text style={styles.emptySubtitle}>
            {lang === 'ta' ? 'உங்கள் தேடல் அல்லது மாவட்ட வடிகட்டியை மாற்றவும்' : 'Try adjusting your search or district filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderPriceCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPrices(true)}
              tintColor={THEME.primary}
              colors={[THEME.primary]}
            />
          }
        />
      )}

      {/* District Modal */}
      <Modal
        visible={showDistrictModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDistrictModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDistrictModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{lang === 'ta' ? 'மாவட்டத்தைத் தேர்ந்தெடுக்கவும்' : 'Select District'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {DISTRICTS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.modalOption,
                    selectedDistrict === d && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedDistrict(d);
                    setShowDistrictModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedDistrict === d && styles.modalOptionTextSelected,
                    ]}
                  >
                    {translateDistrict(d, lang)}
                  </Text>
                  {selectedDistrict === d && (
                    <Ionicons name="checkmark" size={18} color={THEME.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{lang === 'ta' ? 'வரிசைப்படுத்து' : 'Sort By'}</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.modalOption,
                  sortBy === opt.value && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSortBy(opt.value);
                  setShowSortModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    sortBy === opt.value && styles.modalOptionTextSelected,
                  ]}
                >
                  {translateSortOption(opt.value, lang)}
                </Text>
                {sortBy === opt.value && (
                  <Ionicons name="checkmark" size={18} color={THEME.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  headerRight: {
    marginLeft: 'auto',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B22',
    paddingVertical: 7,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B44',
  },
  offlineBannerText: {
    color: THEME.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    margin: 16,
    marginBottom: 10,
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
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: THEME.primary,
    gap: 5,
    maxWidth: 160,
  },
  filterChipText: {
    color: THEME.primary,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  countBadge: {
    marginLeft: 'auto',
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  priceCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  speciesInfo: {
    flex: 1,
    marginRight: 12,
  },
  speciesName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: 0.2,
  },
  speciesTamil: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 2,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 9,
    color: THEME.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.secondary,
    letterSpacing: 0.5,
  },
  priceUnit: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: -2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    gap: 3,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    color: THEME.textMuted,
    marginTop: 12,
    fontSize: 14,
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
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderColor: THEME.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: THEME.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionSelected: {
    backgroundColor: '#0066CC22',
  },
  modalOptionText: {
    color: THEME.textMuted,
    fontSize: 14,
  },
  modalOptionTextSelected: {
    color: THEME.primary,
    fontWeight: '700',
  },
});
