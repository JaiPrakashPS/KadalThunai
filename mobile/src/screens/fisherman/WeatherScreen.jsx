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
import * as Location from 'expo-location';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { getCachedWeather, cacheWeather } from '../../db/helpers';
import { useNetwork } from '../../store/NetworkContext';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

// ─── Icon helper based on condition string ────────────────────────────────────
const getWeatherIcon = (condition = '') => {
  const c = condition.toLowerCase();
  if (c.includes('thunder') || c.includes('storm'))  return 'thunderstorm-outline';
  if (c.includes('rain') || c.includes('drizzle'))   return 'rainy-outline';
  if (c.includes('snow'))                             return 'snow-outline';
  if (c.includes('fog') || c.includes('mist'))        return 'cloud-outline';
  if (c.includes('cloud'))                            return 'partly-sunny-outline';
  return 'sunny-outline';
};

const getSeaCondition = (windKmh) => {
  if (windKmh < 20) return { label: 'Calm',     color: '#10B981', icon: 'checkmark-circle' };
  if (windKmh < 40) return { label: 'Moderate', color: '#F59E0B', icon: 'remove-circle'    };
  return              { label: 'Rough',    color: '#EF4444', icon: 'warning'           };
};

const formatTime = (isoOrHour) => {
  if (!isoOrHour) return '--';
  if (typeof isoOrHour === 'number') {
    const h = isoOrHour % 12 || 12;
    return `${h}${isoOrHour < 12 ? 'am' : 'pm'}`;
  }
  const d = new Date(isoOrHour);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ─── Mock data (used as fallback) ─────────────────────────────────────────────
const MOCK_WEATHER = {
  temperature: 31,
  feelsLike: 35,
  condition: 'Partly Cloudy',
  humidity: 78,
  windSpeed: 22,
  windDirection: 'SW',
  visibility: 9.2,
  pressure: 1012,
  uvIndex: 7,
  lastUpdated: new Date().toISOString(),
  alerts: [],
  forecast: [
    { hour: 6,  condition: 'Sunny',         temp: 28, wind: 14 },
    { hour: 8,  condition: 'Partly Cloudy', temp: 29, wind: 16 },
    { hour: 10, condition: 'Partly Cloudy', temp: 31, wind: 22 },
    { hour: 12, condition: 'Cloudy',        temp: 33, wind: 26 },
    { hour: 14, condition: 'Rain',          temp: 30, wind: 30 },
    { hour: 16, condition: 'Thunderstorm',  temp: 27, wind: 42 },
    { hour: 18, condition: 'Rain',          temp: 26, wind: 35 },
    { hour: 20, condition: 'Cloudy',        temp: 25, wind: 22 },
  ],
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, unit, color = '#0066CC' }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>
      {value}
      <Text style={styles.statUnit}> {unit}</Text>
    </Text>
  </View>
);

const ForecastCard = ({ item }) => (
  <View style={styles.forecastCard}>
    <Text style={styles.forecastTime}>{formatTime(item.hour)}</Text>
    <Ionicons
      name={getWeatherIcon(item.condition)}
      size={20}
      color="#60A5FA"
      style={styles.forecastIcon}
    />
    <Text style={styles.forecastTemp}>{item.temp}°</Text>
    <View style={styles.forecastWindRow}>
      <Ionicons name="arrow-up-outline" size={10} color="#94A3B8" />
      <Text style={styles.forecastWind}>{item.wind}</Text>
    </View>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WeatherScreen() {
  const { isConnected } = useNetwork();
  const { lang, t } = useLanguage();

  const [weather, setWeather]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [location, setLocation]   = useState(null);

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

  // ── Location ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      }
    })();
  }, []);

  // ── Fetch weather ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchWeather();
  }, [location, isConnected]);

  const fetchWeather = useCallback(async (pullRefresh = false) => {
    if (pullRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (isConnected && location) {
        const res = await api.get(ENDPOINTS.WEATHER, {
          params: { lat: location.lat, lon: location.lon },
        });
        const weatherObj = res.data?.data || res.data || MOCK_WEATHER;
        await cacheWeather(weatherObj);
        setWeather(weatherObj);
        setIsOffline(false);
      } else {
        throw new Error('offline');
      }
    } catch {
      try {
        const cached = await getCachedWeather();
        setWeather(cached || MOCK_WEATHER);
      } catch {
        setWeather(MOCK_WEATHER);
      }
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected, location]);

  const onRefresh = () => fetchWeather(true);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{lang === 'ta' ? 'வானிலை தரவு பெறப்படுகிறது…' : 'Fetching weather data…'}</Text>
      </View>
    );
  }

  const getSeaCondLabel = (lbl) => {
    if (lang !== 'ta') return lbl;
    if (lbl === 'Calm') return 'அமைதியானது';
    if (lbl === 'Moderate') return 'மிதமானது';
    if (lbl === 'Rough') return 'அலையடிக்கிறது';
    return lbl;
  };

  const seaCond = getSeaCondition(weather?.windSpeed || 0);
  const lastUpd = weather?.lastUpdated
    ? new Date(weather.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0066CC"
            colors={['#0066CC']}
          />
        }
      >
        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.screenTitle}>{t('weather.title') || 'Weather'}</Text>
            <Text style={styles.screenSub}>
              {lang === 'ta' ? 'புதுப்பிக்கப்பட்டது' : 'Updated'} {lastUpd}
            </Text>
          </View>
          <View style={styles.topBarRight}>
            {isOffline && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline-outline" size={12} color="#F59E0B" />
                <Text style={styles.offlineBadgeText}>{lang === 'ta' ? 'இணைப்பு இல்லை' : 'Offline'}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh} activeOpacity={0.75}>
              <Ionicons name="refresh-outline" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Current conditions hero ──────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroTemp}>{weather?.temperature ?? '--'}°</Text>
            <Text style={styles.heroCondition}>{translateCondition(weather?.condition ?? 'Unknown')}</Text>
            <Text style={styles.heroFeels}>{lang === 'ta' ? 'உணரப்படும் வெப்பநிலை' : 'Feels like'} {weather?.feelsLike ?? '--'}°C</Text>
          </View>
          <View style={styles.heroRight}>
            <View style={styles.heroIconCircle}>
              <Ionicons
                name={getWeatherIcon(weather?.condition)}
                size={52}
                color="#F59E0B"
              />
            </View>
          </View>
        </View>

        {/* ── Sea condition indicator ───────────────────────────────────── */}
        <View style={[styles.seaCard, { borderColor: seaCond.color + '55' }]}>
          <View style={[styles.seaIconWrap, { backgroundColor: seaCond.color + '22' }]}>
            <Ionicons name={seaCond.icon} size={22} color={seaCond.color} />
          </View>
          <View style={styles.seaInfo}>
            <Text style={styles.seaLabel}>{lang === 'ta' ? 'கடல் நிலை' : 'Sea Condition'}</Text>
            <Text style={[styles.seaValue, { color: seaCond.color }]}>{getSeaCondLabel(seaCond.label)}</Text>
          </View>
          <View style={styles.seaWindBox}>
            <Text style={styles.seaWindLabel}>{lang === 'ta' ? 'காற்று' : 'Wind'}</Text>
            <Text style={styles.seaWindValue}>
              {weather?.windSpeed ?? '--'} km/h {weather?.windDirection ?? ''}
            </Text>
          </View>
        </View>

        {/* ── Stat cards ────────────────────────────────────────────────── */}
        <View style={styles.statGrid}>
          <StatCard
            icon="speedometer-outline"
            label={lang === 'ta' ? 'காற்றின் வேகம்' : 'Wind Speed'}
            value={weather?.windSpeed ?? '--'}
            unit="km/h"
            color="#0066CC"
          />
          <StatCard
            icon="water-outline"
            label={lang === 'ta' ? 'ஈரப்பதம்' : 'Humidity'}
            value={weather?.humidity ?? '--'}
            unit="%"
            color="#10B981"
          />
          <StatCard
            icon="eye-outline"
            label={lang === 'ta' ? 'தெரிவுத்தன்மை' : 'Visibility'}
            value={weather?.visibility ?? '--'}
            unit="km"
            color="#8B5CF6"
          />
          <StatCard
            icon="cellular-outline"
            label={lang === 'ta' ? 'அழுத்தம்' : 'Pressure'}
            value={weather?.pressure ?? '--'}
            unit="hPa"
            color="#F59E0B"
          />
        </View>

        {/* ── Weather alerts ────────────────────────────────────────────── */}
        {weather?.alerts?.length > 0 && (
          <View style={styles.alertsSection}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="warning-outline" size={14} color="#EF4444" /> {lang === 'ta' ? 'வானிலை எச்சரிக்கைகள்' : 'Alerts'}
            </Text>
            {weather.alerts.map((alert, i) => (
              <View key={i} style={styles.alertCard}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <View style={styles.alertTextWrap}>
                  <Text style={styles.alertTitle}>{alert.event || (lang === 'ta' ? 'வானிலை எச்சரிக்கை' : 'Weather Alert')}</Text>
                  <Text style={styles.alertDesc}>{translateCondition(alert.description)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 8-period forecast ─────────────────────────────────────────── */}
        <View style={styles.forecastSection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="time-outline" size={14} color="#94A3B8" /> {lang === 'ta' ? 'மணிநேர முன்னறிவிப்பு' : 'Hourly Forecast'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.forecastScroll}
          >
            {(weather?.forecast || []).map((item, i) => (
              <ForecastCard key={i} item={item} />
            ))}
          </ScrollView>
        </View>

        {/* ── UV + extra info strip ─────────────────────────────────────── */}
        <View style={styles.extraStrip}>
          <View style={styles.extraItem}>
            <Ionicons name="sunny-outline" size={18} color="#F59E0B" />
            <Text style={styles.extraLabel}>{lang === 'ta' ? 'புற ஊதா கதிர்' : 'UV Index'}</Text>
            <Text style={styles.extraValue}>{weather?.uvIndex ?? '--'}</Text>
          </View>
          <View style={styles.extraDivider} />
          <View style={styles.extraItem}>
            <Ionicons name="navigate-outline" size={18} color="#0066CC" />
            <Text style={styles.extraLabel}>{lang === 'ta' ? 'காற்றின் திசை' : 'Wind Dir'}</Text>
            <Text style={styles.extraValue}>{weather?.windDirection ?? '--'}</Text>
          </View>
          <View style={styles.extraDivider} />
          <View style={styles.extraItem}>
            <Ionicons name="cloud-outline" size={18} color="#94A3B8" />
            <Text style={styles.extraLabel}>{lang === 'ta' ? 'அழுத்தம்' : 'Pressure'}</Text>
            <Text style={styles.extraValue}>{weather?.pressure ?? '--'} hPa</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0A1628',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 16,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  screenTitle: {
    color: '#F1F5F9',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  screenSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B22',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offlineBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F2044',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  heroCard: {
    backgroundColor: '#0F2044',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  heroLeft: {
    flex: 1,
  },
  heroTemp: {
    color: '#F1F5F9',
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 78,
    letterSpacing: -2,
  },
  heroCondition: {
    color: '#60A5FA',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  heroFeels: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  heroIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F59E0B11',
    borderWidth: 2,
    borderColor: '#F59E0B33',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sea condition
  seaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F2044',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  seaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seaInfo: {
    flex: 1,
  },
  seaLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  seaValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  seaWindBox: {
    alignItems: 'flex-end',
  },
  seaWindLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  seaWindValue: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },

  // Stat grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: '#0F2044',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700',
  },
  statUnit: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '400',
  },

  // Section title
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Alerts
  alertsSection: {
    marginBottom: 14,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EF444415',
    borderColor: '#EF444445',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  alertTextWrap: {
    flex: 1,
  },
  alertTitle: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '700',
  },
  alertDesc: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },

  // Forecast
  forecastSection: {
    marginBottom: 14,
  },
  forecastScroll: {
    gap: 10,
    paddingRight: 4,
  },
  forecastCard: {
    backgroundColor: '#0F2044',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 64,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  forecastTime: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  forecastIcon: {
    marginVertical: 2,
  },
  forecastTemp: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
  },
  forecastWindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  forecastWind: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
  },

  // Extra strip
  extraStrip: {
    flexDirection: 'row',
    backgroundColor: '#0F2044',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 14,
    marginBottom: 14,
  },
  extraItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  extraDivider: {
    width: 1,
    backgroundColor: '#1E3A5F',
    marginVertical: 4,
  },
  extraLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  extraValue: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
});
