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
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../store/AuthContext';
import { getCachedWeather, cacheWeather } from '../../db/helpers';
import { useLanguage } from '../../store/LanguageContext';
import { useNetwork } from '../../store/NetworkContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const getWeatherIcon = (condition = '') => {
  const c = condition.toLowerCase();
  if (c.includes('rain'))  return { name: 'rainy',      color: '#60A5FA' };
  if (c.includes('cloud')) return { name: 'cloudy',     color: '#94A3B8' };
  if (c.includes('storm')) return { name: 'thunderstorm', color: '#F59E0B' };
  if (c.includes('clear')) return { name: 'sunny',      color: '#FCD34D' };
  return { name: 'partly-sunny', color: '#FCD34D' };
};

const translateCondition = (cond = '', lang) => {
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

const THEME = {
  background: '#070D19',
  surface: '#0F1E36',
  surfaceLight: '#182C4C',
  primary: '#3B82F6',
  secondary: '#F59E0B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#1E3A5F',
  borderLight: '#2A4E7E',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

const StatCard = ({ icon, label, value, color, badge, onPress }) => {
  const isSOS = icon === 'warning' && value > 0;
  
  const content = (
    <View style={styles.statCardContent}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        {badge > 0 && (
          <View style={[styles.badge, { backgroundColor: THEME.danger }]}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value ?? '0'}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );

  return (
    <TouchableOpacity 
      style={styles.statCardTouch} 
      activeOpacity={onPress ? 0.85 : 1} 
      onPress={onPress}
      disabled={!onPress}
    >
      {isSOS ? (
        <LinearGradient
          colors={['#DC262622', '#DC262644']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.statCard, { borderColor: '#DC2626', borderWidth: 1.5 }]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={styles.statCard}>
          {content}
        </View>
      )}
    </TouchableOpacity>
  );
};

const QuickActionCard = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
    <LinearGradient
      colors={['rgba(24, 44, 76, 0.45)', 'rgba(15, 30, 54, 0.7)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.actionCardGradient}
    >
      <View style={[styles.actionIconCircle, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={2}>{label}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const urgencyColor = (level) => {
  if (!level) return THEME.textMuted;
  const l = level.toLowerCase();
  if (l === 'critical' || l === 'high') return THEME.danger;
  if (l === 'medium') return THEME.warning;
  return THEME.success;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function OfficerHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const { isConnected } = useNetwork();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [location, setLocation] = useState(null);

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

  const fetchWeather = useCallback(async (coords) => {
    setWeatherLoading(true);
    try {
      const targetCoords = coords || location || { latitude: 13.0827, longitude: 80.2707 };
      if (isConnected) {
        const response = await api.get(ENDPOINTS.WEATHER, {
          params: { lat: targetCoords.latitude, lon: targetCoords.longitude },
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
  }, [isConnected, location]);

  const fetchOverview = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const res = await api.get(ENDPOINTS.ANALYTICS_OVERVIEW || '/analytics/overview');
      const data = res.data?.data || res.data;

      // Normalize the analytics overview response into the expected stats shape
      const normalized = {
        stats: {
          totalFishermen:  data?.fishermen?.total  ?? data?.stats?.totalFishermen  ?? 0,
          activeSOS:       data?.sos?.pending       ?? data?.stats?.activeSOS       ?? 0,
          openIncidents:   data?.incidents?.open    ?? data?.stats?.openIncidents   ?? 0,
          openComplaints:  data?.complaints?.open   ?? data?.stats?.openComplaints  ?? 0,
          totalBoats:      data?.boats?.total       ?? data?.stats?.totalBoats      ?? 0,
          totalOfficers:   data?.officers?.total    ?? data?.stats?.totalOfficers   ?? 0,
        },
        recentSOS: data?.recentSOS || [],
      };
      setOverview(normalized);
    } catch (err) {
      setError(lang === 'ta' ? 'டாஷ்போர்டு தரவை ஏற்ற முடியவில்லை' : 'Failed to load dashboard data');
      console.error('OfficerHome fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang]);

  const loadData = useCallback(async (isRefresh = false) => {
    const coords = await fetchLocation();
    await Promise.all([
      fetchOverview(isRefresh),
      fetchWeather(coords),
    ]);
  }, [fetchOverview, fetchWeather]);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true).finally(() => setRefreshing(false));
  }, [loadData]);

  const handleOfficerAction = (screen) => {
    if (['SOSMonitor', 'IncidentManage', 'ComplaintResolve'].includes(screen)) {
      navigation.navigate('Alerts', { screen });
    } else if (['SchemePublish', 'PriceManage', 'Broadcast'].includes(screen)) {
      navigation.navigate('Manage', { screen });
    } else {
      navigation.navigate(screen);
    }
  };

  const stats = overview?.stats || {};
  const recentSOS = overview?.recentSOS || [];


  const actions = [
    { icon: 'warning', label: lang === 'ta' ? 'SOS கண்காணி' : 'Monitor SOS', color: THEME.danger, screen: 'SOSMonitor' },
    { icon: 'document-text', label: lang === 'ta' ? 'சம்பவங்கள்' : 'Incidents', color: THEME.warning, screen: 'IncidentManage' },
    { icon: 'chatbubbles', label: lang === 'ta' ? 'புகார்கள்' : 'Complaints', color: THEME.primary, screen: 'ComplaintResolve' },
    { icon: 'ribbon', label: lang === 'ta' ? 'திட்டங்கள்' : 'Schemes', color: THEME.success, screen: 'SchemePublish' },
    { icon: 'pricetag', label: lang === 'ta' ? 'விலை நிலவரம்' : 'Prices', color: '#A78BFA', screen: 'PriceManage' },
    { icon: 'megaphone', label: lang === 'ta' ? 'அறிவிப்பு' : 'Broadcast', color: THEME.secondary, screen: 'Broadcast' },
  ];

  const renderWeatherCard = () => (
    <View style={styles.weatherCardContainer}>
      {weatherLoading ? (
        <View style={styles.weatherLoadingBox}>
          <ActivityIndicator color={THEME.primary} size="small" />
        </View>
      ) : weather ? (
        <LinearGradient
          colors={['#1E293B', '#0F172A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weatherGradient}
        >
          <View style={styles.weatherHeader}>
            <View style={styles.weatherTitleContainer}>
              <Ionicons name="cloud-sunny-outline" size={16} color={THEME.secondary} />
              <Text style={styles.weatherTitle}>{t('home.weatherWidget') || 'Current Weather'}</Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{lang === 'ta' ? 'நேரலை' : 'LIVE'}</Text>
            </View>
          </View>

          <View style={styles.weatherMain}>
            <View style={styles.weatherTempSection}>
              <Text style={styles.weatherTemp}>
                {Math.round(weather.temperature ?? weather.temp ?? 0)}°C
              </Text>
              <Text style={styles.weatherCondition}>
                {translateCondition(weather.condition || weather.description || 'Clear Sky', lang)}
              </Text>
            </View>
            <Ionicons
              name={getWeatherIcon(weather.condition || weather.description).name}
              size={64}
              color={getWeatherIcon(weather.condition || weather.description).color}
              style={styles.weatherIcon}
            />
          </View>

          <View style={styles.weatherStatsRow}>
            <View style={styles.weatherStatItem}>
              <Ionicons name="speedometer" size={14} color="#60A5FA" />
              <Text style={styles.weatherStatValue}>
                {weather.wind_speed ?? weather.windSpeed ?? '--'} km/h
              </Text>
              <Text style={styles.weatherStatLabel}>{lang === 'ta' ? 'காற்று' : 'Wind'}</Text>
            </View>
            <View style={styles.weatherStatDivider} />
            <View style={styles.weatherStatItem}>
              <Ionicons name="water" size={14} color="#34D399" />
              <Text style={styles.weatherStatValue}>{weather.humidity ?? '--'}%</Text>
              <Text style={styles.weatherStatLabel}>{lang === 'ta' ? 'ஈரப்பதம்' : 'Humidity'}</Text>
            </View>
            <View style={styles.weatherStatDivider} />
            <View style={styles.weatherStatItem}>
              <Ionicons name="eye" size={14} color="#FBBF24" />
              <Text style={styles.weatherStatValue}>
                {weather.visibility ? `${(weather.visibility / 1000).toFixed(1)} km` : '10 km'}
              </Text>
              <Text style={styles.weatherStatLabel}>{lang === 'ta' ? 'பார்வை' : 'Visibility'}</Text>
            </View>
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.weatherCard}>
          <Text style={styles.weatherNoData}>{lang === 'ta' ? 'வானிலை தகவல் கிடைக்கவில்லை' : 'Weather data unavailable'}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.primary}
            colors={[THEME.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Ionicons name="shield-checkmark" size={28} color={THEME.primary} />
            </View>
            <View>
              <Text style={styles.greeting}>{lang === 'ta' ? 'இனிய நாள், அதிகாரி' : 'Good day, Officer'}</Text>
              <Text style={styles.officerName}>{user?.name || 'Officer'}</Text>
              {user?.badgeNumber && (
                <Text style={styles.badgeNumber}>{lang === 'ta' ? 'அடையாள எண்' : 'Badge'} #{user.badgeNumber}</Text>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.navigate('Analytics')}
            >
              <Ionicons name="bar-chart" size={22} color={THEME.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { marginLeft: 8 }]}
              onPress={() => navigation.navigate('FishermenList')}
            >
              <Ionicons name="people" size={22} color={THEME.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Weather Card */}
        {renderWeatherCard()}

        {/* Loading / Error */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.loadingText}>{lang === 'ta' ? 'ஏற்றப்படுகிறது…' : 'Loading dashboard…'}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline" size={36} color={THEME.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
              <Text style={styles.retryBtnText}>{lang === 'ta' ? 'மீண்டும் முயற்சி' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats Row */}
            <Text style={styles.sectionTitle}>{lang === 'ta' ? 'கண்ணோட்டம்' : 'Overview'}</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="people"
                label={t('officer.fishermen') || 'Fishermen'}
                value={stats.totalFishermen ?? 0}
                color={THEME.primary}
                onPress={() => handleOfficerAction('FishermenList')}
              />
              <StatCard
                icon="warning"
                label={t('officer.sosAlerts') || 'Active SOS'}
                value={stats.activeSOS ?? 0}
                color={THEME.danger}
                badge={stats.activeSOS ?? 0}
                onPress={() => handleOfficerAction('SOSMonitor')}
              />
              <StatCard
                icon="alert-circle"
                label={t('officer.incidents') || 'Open Incidents'}
                value={stats.openIncidents ?? 0}
                color={THEME.warning}
                onPress={() => handleOfficerAction('IncidentManage')}
              />
              <StatCard
                icon="chatbubble-ellipses"
                label={t('officer.complaints') || 'Complaints'}
                value={stats.openComplaints ?? 0}
                color={THEME.success}
                onPress={() => handleOfficerAction('ComplaintResolve')}
              />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>{lang === 'ta' ? 'விரைவு செயல்கள்' : 'Quick Actions'}</Text>
            <View style={styles.actionsGrid}>
              {actions.map((a) => (
                <QuickActionCard
                  key={a.screen}
                  icon={a.icon}
                  label={a.label}
                  color={a.color}
                  onPress={() => handleOfficerAction(a.screen)}
                />
              ))}
            </View>

            {/* Recent SOS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{lang === 'ta' ? 'சமீபத்திய SOS எச்சரிக்கைகள்' : 'Recent SOS Alerts'}</Text>
              <TouchableOpacity onPress={() => handleOfficerAction('SOSMonitor')}>
                <Text style={styles.seeAll}>{lang === 'ta' ? 'அனைத்தும் காண்' : 'See All'}</Text>
              </TouchableOpacity>
            </View>

            {recentSOS.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-circle" size={32} color={THEME.success} />
                <Text style={styles.emptyText}>{lang === 'ta' ? 'அவசர எச்சரிக்கைகள் எதுவும் இல்லை' : 'No recent SOS alerts'}</Text>
              </View>
            ) : (
              recentSOS.slice(0, 3).map((sos, idx) => (
                <TouchableOpacity
                  key={sos._id || idx}
                  style={[
                    styles.sosCard,
                    { borderLeftColor: urgencyColor(sos.urgency || sos.priority) },
                  ]}
                  onPress={() => handleOfficerAction('SOSMonitor')}
                  activeOpacity={0.8}
                >
                  <View style={styles.sosTop}>
                    <View style={styles.sosLeft}>
                      <Ionicons
                        name="warning"
                        size={18}
                        color={urgencyColor(sos.urgency || sos.priority)}
                      />
                      <Text style={styles.sosName}>
                        {sos.fishermenId?.name || sos.userId?.name || sos.fisherman?.name || sos.userName || 'Unknown Fisherman'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.urgencyBadge,
                        { backgroundColor: urgencyColor(sos.urgency || sos.priority) + '22' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.urgencyText,
                          { color: urgencyColor(sos.urgency || sos.priority) },
                        ]}
                      >
                        {(sos.urgency || sos.priority || 'Unknown').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.sosType}>
                    {sos.emergencyType ? (t(`sos.types.${sos.emergencyType}`) || sos.emergencyType) : (t('sos.button') || 'Emergency')}
                  </Text>
                  <View style={styles.sosBottom}>
                    <Ionicons name="location" size={13} color={THEME.textMuted} />
                    <Text style={styles.sosMeta}>
                      {sos.location?.coordinates
                        ? `${sos.location.coordinates[1]?.toFixed(4)}, ${sos.location.coordinates[0]?.toFixed(4)}`
                        : 'Location unavailable'}
                    </Text>
                    <Text style={styles.sosTime}>{timeAgo(sos.createdAt)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {/* Extra nav rows */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.navRowItem}
                onPress={() => navigation.navigate('BoatMonitor')}
              >
                <Ionicons name="boat" size={20} color={THEME.primary} />
                <Text style={styles.navRowText}>{lang === 'ta' ? 'படகுகள் கண்காணிப்பு' : 'Boat Monitor'}</Text>
                <Ionicons name="chevron-forward" size={16} color={THEME.textMuted} />
              </TouchableOpacity>
              <View style={styles.navDivider} />
              <TouchableOpacity
                style={styles.navRowItem}
                onPress={() => navigation.navigate('CatchMonitor')}
              >
                <Ionicons name="fish" size={20} color={THEME.primary} />
                <Text style={styles.navRowText}>{lang === 'ta' ? 'மீன்பிடிப்பு கண்காணிப்பு' : 'Catch Monitor'}</Text>
                <Ionicons name="chevron-forward" size={16} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.border,
  },
  greeting: { fontSize: 11, color: THEME.textMuted, fontWeight: '500' },
  officerName: { fontSize: 16, fontWeight: '800', color: THEME.text },
  badgeNumber: { fontSize: 11, color: THEME.secondary, fontWeight: '700', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.text,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
    marginTop: 14,
  },
  seeAll: { fontSize: 13, color: THEME.primary, fontWeight: '700' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  statCardTouch: {
    flex: 1,
    minWidth: '46%',
  },
  statCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  statCardContent: {
    padding: 16,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    marginTop: 10,
  },
  statValue: { fontSize: 28, fontWeight: '900', color: THEME.text, lineHeight: 32 },
  statLabel: { fontSize: 11, color: THEME.textMuted, fontWeight: '600', marginTop: 2 },
  
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  actionCard: {
    width: '30%',
    minWidth: '28%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
    aspectRatio: 0.95,
  },
  actionCardGradient: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    color: THEME.text,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
  },

  sosCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sosTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sosLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sosName: { fontSize: 14, fontWeight: '800', color: THEME.text },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  urgencyText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  sosType: { fontSize: 13, color: THEME.textMuted, fontWeight: '600', marginBottom: 8 },
  sosBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sosMeta: { fontSize: 12, color: THEME.textMuted, flex: 1, fontWeight: '500' },
  sosTime: { fontSize: 11, color: THEME.textMuted, fontWeight: '600' },

  navRow: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  navRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  navRowText: { flex: 1, fontSize: 13, color: THEME.text, fontWeight: '700' },
  navDivider: { height: 1, backgroundColor: THEME.border, marginHorizontal: 16 },

  centered: { alignItems: 'center', paddingVertical: 50 },
  loadingText: { color: THEME.textMuted, marginTop: 12, fontSize: 14 },
  errorBox: {
    alignItems: 'center',
    paddingVertical: 40,
    marginHorizontal: 16,
  },
  errorText: { color: THEME.danger, marginTop: 10, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingVertical: 24, marginHorizontal: 16 },
  emptyText: { color: THEME.textMuted, marginTop: 8, fontSize: 14 },

  // Weather Card Container
  weatherCardContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  weatherGradient: {
    padding: 16,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weatherTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98115',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#10B981',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  weatherMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  weatherTempSection: {
    gap: 2,
  },
  weatherTemp: {
    fontSize: 38,
    fontWeight: '800',
    color: THEME.text,
  },
  weatherCondition: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textMuted,
    textTransform: 'capitalize',
  },
  weatherIcon: {
    marginRight: 4,
  },
  weatherStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(7, 13, 25, 0.45)',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: THEME.border,
  },
  weatherStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  weatherStatValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
  },
  weatherStatLabel: {
    fontSize: 10,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  weatherStatDivider: {
    width: 1,
    backgroundColor: THEME.border,
    marginVertical: 4,
  },
  weatherLoadingBox: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surface,
  },
  weatherCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherNoData: {
    color: THEME.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
