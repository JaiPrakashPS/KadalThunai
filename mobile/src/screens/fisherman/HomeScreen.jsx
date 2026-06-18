import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { useNetwork } from '../../store/NetworkContext';
import { useLanguage } from '../../store/LanguageContext';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { getCachedWeather, cacheWeather, getAllCatches, getCachedSchemes } from '../../db/helpers';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import * as Location from 'expo-location';

// ─── Weather Icon Mapper ─────────────────────────────────────────────────────
const getWeatherIcon = (condition = '') => {
  const c = condition.toLowerCase();
  if (c.includes('rain'))  return { name: 'rainy',      color: '#60A5FA' };
  if (c.includes('cloud')) return { name: 'cloudy',     color: '#94A3B8' };
  if (c.includes('storm')) return { name: 'thunderstorm', color: '#F59E0B' };
  if (c.includes('clear')) return { name: 'sunny',      color: '#FCD34D' };
  return { name: 'partly-sunny', color: '#FCD34D' };
};

// ─── MOCK Data (used when API or cache unavailable) ──────────────────────────
const MOCK_SCHEMES = [
  {
    id: '1',
    title: 'Pradhan Mantri Matsya Sampada Yojana',
    description: 'Financial assistance up to ₹3 lakh for fishing equipment and boat upgrades.',
    deadline: '2026-07-31',
  },
  {
    id: '2',
    title: 'Tamil Nadu Fishermen Welfare Fund',
    description: 'Annual compensation of ₹5,000 for registered fishermen during ban period.',
    deadline: '2026-08-15',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  HomeScreen
// ═══════════════════════════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { lang, t } = useLanguage();

  const [refreshing,    setRefreshing]    = useState(false);
  const [weather,       setWeather]       = useState(null);
  const [weatherLoading,setWeatherLoading]= useState(true);
  const [recentCatches, setRecentCatches] = useState([]);
  const [schemes,       setSchemes]       = useState(MOCK_SCHEMES);
  const [location,      setLocation]      = useState(null);
  const [notifCount,    setNotifCount]    = useState(2);

  // ── Greeting Helper ────────────────────────────────────────────────────────
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning') || 'Good Morning';
    if (hour < 17) return t('home.goodAfternoon') || 'Good Afternoon';
    return t('home.goodEvening') || 'Good Evening';
  };

  // ── Quick Actions Localized Labels ──────────────────────────────────────────
  const QUICK_ACTIONS = [
    { id: 'catch',    label: t('catch.title') || 'Catch Fish',      icon: 'fish',            color: '#0066CC', route: 'CatchRecord'   },
    { id: 'zones',   label: t('zones.title') || 'Fishing Zones',   icon: 'map',             color: '#10B981', route: 'FishingZones'  },
    { id: 'sos',     label: t('sos.title') || 'SOS',             icon: 'warning',         color: '#EF4444', route: 'SOS'           },
    { id: 'market',  label: t('market.title') || 'Market Prices',   icon: 'pricetag',        color: '#F59E0B', route: 'MarketPrices'  },
    { id: 'compass', label: t('compass.title') || 'Compass',         icon: 'compass',         color: '#8B5CF6', route: 'Compass'       },
    { id: 'report',  label: t('incident.title') || 'Report Incident', icon: 'alert-circle',    color: '#EC4899', route: 'ReportIncident'},
  ];

  // ── Fetch Location ─────────────────────────────────────────────────────────
  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc.coords);
      return loc.coords;
    } catch {
      return null;
    }
  };

  // ── Fetch Weather ──────────────────────────────────────────────────────────
  const fetchWeather = useCallback(async (coords) => {
    setWeatherLoading(true);
    try {
      if (isConnected && coords) {
        const response = await api.get(ENDPOINTS.WEATHER, {
          params: { lat: coords.latitude, lon: coords.longitude },
        });
        const weatherObj = response.data?.data || response.data;
        setWeather(weatherObj);
        await cacheWeather(weatherObj);
      } else {
        const cached = await getCachedWeather();
        if (cached) setWeather(cached);
      }
    } catch {
      try {
        const cached = await getCachedWeather();
        if (cached) setWeather(cached);
      } catch {}
    } finally {
      setWeatherLoading(false);
    }
  }, [isConnected]);

  // ── Fetch Recent Catches ───────────────────────────────────────────────────
  const fetchRecentCatches = useCallback(async () => {
    try {
      if (isConnected) {
        const response = await api.get(ENDPOINTS.CATCHES, { params: { limit: 3 } });
        setRecentCatches(response.data?.data || []);
      } else {
        const local = await getAllCatches(3);
        setRecentCatches(local || []);
      }
    } catch {
      try {
        const local = await getAllCatches(3);
        setRecentCatches(local || []);
      } catch {}
    }
  }, [isConnected]);

  // ── Fetch Schemes ──────────────────────────────────────────────────────────
  const fetchSchemes = useCallback(async () => {
    try {
      if (isConnected) {
        const response = await api.get(ENDPOINTS.SCHEMES, { params: { limit: 2 } });
        const list = response.data?.data || response.data || [];
        setSchemes(list.length > 0 ? list : MOCK_SCHEMES);
      } else {
        const cached = getCachedSchemes();
        setSchemes(cached && cached.length > 0 ? cached : MOCK_SCHEMES);
      }
    } catch {
      try {
        const cached = getCachedSchemes();
        setSchemes(cached && cached.length > 0 ? cached : MOCK_SCHEMES);
      } catch {
        setSchemes(MOCK_SCHEMES);
      }
    }
  }, [isConnected]);

  // ── Initial Load ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const coords = await fetchLocation();
      await Promise.all([fetchWeather(coords), fetchRecentCatches(), fetchSchemes()]);
    })();
  }, []);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const coords = await fetchLocation();
    await Promise.all([fetchWeather(coords), fetchRecentCatches(), fetchSchemes()]);
    setRefreshing(false);
  }, [fetchWeather, fetchRecentCatches, fetchSchemes]);

  // ── Navigate Quick Action ──────────────────────────────────────────────────
  const handleQuickAction = (route) => {
    if (route === 'CatchRecord') {
      navigation.navigate('Catch', { screen: 'CatchRecord' });
    } else if (route === 'FishingZones') {
      navigation.navigate('Map', { screen: 'FishingZone' });
    } else if (route === 'SOS') {
      navigation.navigate('SOS');
    } else if (route === 'MarketPrices') {
      navigation.navigate('Market', { screen: 'MarketPrice' });
    } else if (route === 'Compass') {
      navigation.navigate('Map', { screen: 'Compass' });
    } else if (route === 'ReportIncident') {
      navigation.navigate('Market', { screen: 'Incident' });
    } else {
      navigation.navigate(route);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const translateCondition = (cond = '') => {
    if (lang !== 'ta') return cond;
    const c = cond.toLowerCase();
    if (c.includes('clear')) return 'தெளிவான வானம்';
    if (c.includes('scattered clouds')) return 'சிதறிய மேகங்கள்';
    if (c.includes('broken clouds')) return 'உடைந்த மேகங்கள்';
    if (c.includes('few clouds')) return 'சில மேகங்கள்';
    if (c.includes('overcast')) return 'மேகமூட்டம்';
    if (c.includes('cloud')) return 'மேகமூட்டம்';
    if (c.includes('drizzle')) return 'தூறல்';
    if (c.includes('heavy rain')) return 'கனமழை';
    if (c.includes('moderate rain')) return 'மிதமான மழை';
    if (c.includes('light rain')) return 'லேசான மழை';
    if (c.includes('rain')) return 'மழை';
    if (c.includes('thunderstorm')) return 'இடியுடன் கூடிய மழை';
    if (c.includes('mist') || c.includes('fog')) return 'பனிமூட்டம்';
    return cond;
  };

  const renderOfflineBanner = () => {
    if (isConnected) return null;
    return (
      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline" size={14} color="#78350F" />
        <Text style={styles.offlineBannerText}>
          {lang === 'ta' ? 'நீங்கள் ஆஃப்லைனில் உள்ளீர்கள் - சேமிக்கப்பட்ட தரவு' : 'You are offline — showing cached data'}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greetingText}>{getGreeting()} 👋</Text>
        <Text style={styles.userName}>{user?.name || (lang === 'ta' ? 'மீனவர்' : 'Fisherman')}</Text>
      </View>
      <TouchableOpacity
        style={styles.notifBtn}
        onPress={() => navigation.navigate('Notifications')}
        activeOpacity={0.75}
      >
        <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
        {notifCount > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>{notifCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderWeatherCard = () => (
    <View style={styles.weatherCard}>
      {weatherLoading ? (
        <ActivityIndicator color={COLORS.primary} size="small" style={{ padding: SPACING.md }} />
      ) : weather ? (
        <>
          <View style={styles.weatherLeft}>
            <Text style={styles.weatherTitle}>{t('home.weatherWidget') || 'Current Weather'}</Text>
            <Text style={styles.weatherTemp}>
              {Math.round(weather.temperature ?? weather.temp ?? 0)}°C
            </Text>
            <Text style={styles.weatherCondition}>
              {translateCondition(weather.condition || weather.description || 'Clear Sky')}
            </Text>
          </View>
          <View style={styles.weatherRight}>
            <Ionicons
              name={getWeatherIcon(weather.condition || weather.description).name}
              size={52}
              color={getWeatherIcon(weather.condition || weather.description).color}
            />
            <View style={styles.weatherWind}>
              <Ionicons name="speedometer-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.weatherWindText}>
                {weather.wind_speed ?? weather.windSpeed ?? '--'} km/h
              </Text>
            </View>
            <View style={styles.weatherWind}>
              <Ionicons name="water-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.weatherWindText}>
                {weather.humidity ?? '--'}% {lang === 'ta' ? 'ஈரப்பதம்' : 'humidity'}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.weatherNoData}>{lang === 'ta' ? 'வானிலை தகவல் கிடைக்கவில்லை' : 'Weather data unavailable'}</Text>
      )}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('home.quickActions') || 'Quick Actions'}</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={() => handleQuickAction(action.route)}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: action.color + '22' }]}>
              <Ionicons name={action.icon} size={26} color={action.color} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={2}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRecentCatches = () => (
    <View style={styles.section}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Recent Catches</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CatchHistory')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      {recentCatches.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="fish-outline" size={32} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No catches recorded yet</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('CatchRecord')}
          >
            <Text style={styles.emptyBtnText}>Record a Catch</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentCatches.map((item, idx) => (
          <View key={item.id || idx} style={styles.catchCard}>
            <View style={styles.catchIconWrap}>
              <Ionicons name="fish" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.catchInfo}>
              <Text style={styles.catchSpecies}>
                {item.species || item.fish_species || 'Unknown Species'}
              </Text>
              <Text style={styles.catchMeta}>
                {item.weight ?? item.quantity ?? '--'} kg
                {item.earnings ? `  ·  ₹${item.earnings}` : ''}
              </Text>
            </View>
            <View style={styles.catchDateWrap}>
              <Text style={styles.catchDate}>
                {item.date
                  ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : '--'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderSchemes = () => (
    <View style={styles.section}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{t('schemes.title') || 'Government Schemes'}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Schemes')}>
          <Text style={styles.seeAll}>{lang === 'ta' ? 'அனைத்தும் காண்' : 'View All'}</Text>
        </TouchableOpacity>
      </View>
      {schemes.slice(0, 2).map((scheme, idx) => (
        <TouchableOpacity
          key={scheme.id || scheme._id || idx}
          style={styles.schemeCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Schemes')} // Navigate to schemes list directly
        >
          <View style={styles.schemeTop}>
            <View style={styles.schemeIconWrap}>
              <Ionicons name="ribbon" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.schemeTitle} numberOfLines={2}>
                {lang === 'ta' ? (scheme.titleTamil || scheme.title_tamil || scheme.title) : scheme.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </View>
          <Text style={styles.schemeDesc} numberOfLines={2}>
            {lang === 'ta' ? (scheme.descriptionTamil || scheme.description_tamil || scheme.description) : scheme.description}
          </Text>
          {scheme.deadline && (
            <View style={styles.schemeBadge}>
              <Ionicons name="calendar-outline" size={12} color="#F59E0B" />
              <Text style={styles.schemeBadgeText}>
                {lang === 'ta' ? 'கடைசி தேதி: ' : 'Deadline: '}{new Date(scheme.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {renderOfflineBanner()}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {renderHeader()}
        {renderWeatherCard()}
        {renderQuickActions()}
        {renderRecentCatches()}
        {renderSchemes()}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Offline Banner
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    gap: 6,
  },
  offlineBannerText: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  greetingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    color: COLORS.text,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },

  // Weather Card
  weatherCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  weatherLeft: {
    flex: 1,
  },
  weatherTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  weatherTemp: {
    fontSize: 42,
    color: COLORS.text,
    fontWeight: '800',
    lineHeight: 48,
  },
  weatherCondition: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  weatherRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  weatherWind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherWindText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  weatherNoData: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    flex: 1,
    paddingVertical: SPACING.sm,
  },

  // Section
  section: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 17,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.md,
    letterSpacing: 0.2,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  seeAll: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Quick Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionCard: {
    width: '30.5%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  actionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },

  // Recent Catches
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyBtn: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  catchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  catchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  catchInfo: {
    flex: 1,
  },
  catchSpecies: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  catchMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  catchDateWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  catchDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },

  // Schemes
  schemeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  schemeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  schemeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B22',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  schemeTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
  },
  schemeDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    marginLeft: 40,
  },
  schemeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
    marginLeft: 40,
  },
  schemeBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
});
