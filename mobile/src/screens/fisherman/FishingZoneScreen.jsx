import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { UrlTile, Marker, Polygon, MAP_TYPES } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { getCachedFishingZones, cacheFishingZones } from '../../db/helpers';
import { useNetwork } from '../../store/NetworkContext';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_MIN = 80;
const BOTTOM_SHEET_MAX = height * 0.45;

const ZONE_COLORS = {
  safe:       { fill: 'rgba(16, 185, 129, 0.25)', stroke: '#10B981' },
  caution:    { fill: 'rgba(245, 158, 11, 0.25)',  stroke: '#F59E0B' },
  restricted: { fill: 'rgba(239, 68, 68, 0.25)',   stroke: '#EF4444' },
};

const STATUS_META = {
  safe:       { label: 'Safe',       icon: 'checkmark-circle', color: '#10B981' },
  caution:    { label: 'Caution',    icon: 'warning',          color: '#F59E0B' },
  restricted: { label: 'Restricted', icon: 'ban',              color: '#EF4444' },
};

// ─── Mock zone data (used as fallback) ───────────────────────────────────────
const MOCK_ZONES = [
  {
    id: 'z1',
    name: 'Kovalam Bay Zone',
    status: 'safe',
    description: 'Excellent conditions. Fish density high. Tuna and Mackerel reported.',
    recommendedFish: ['Tuna', 'Mackerel', 'Seer Fish'],
    coordinates: [
      { latitude: 8.42, longitude: 76.97 },
      { latitude: 8.44, longitude: 77.02 },
      { latitude: 8.40, longitude: 77.04 },
      { latitude: 8.38, longitude: 76.99 },
    ],
    center: { latitude: 8.41, longitude: 77.005 },
    depth: '40–80m',
    waterTemp: '28°C',
    lastUpdated: '2 hrs ago',
  },
  {
    id: 'z2',
    name: 'Vizhinjam Offshore',
    status: 'caution',
    description: 'Moderate swells. Proceed with care. Squid season active.',
    recommendedFish: ['Squid', 'Pomfret'],
    coordinates: [
      { latitude: 8.38, longitude: 76.95 },
      { latitude: 8.41, longitude: 76.98 },
      { latitude: 8.37, longitude: 77.01 },
      { latitude: 8.34, longitude: 76.97 },
    ],
    center: { latitude: 8.375, longitude: 76.978 },
    depth: '80–150m',
    waterTemp: '27°C',
    lastUpdated: '4 hrs ago',
  },
  {
    id: 'z3',
    name: 'Restricted Marine Reserve',
    status: 'restricted',
    description: 'Marine protected area. Fishing strictly prohibited. Heavy penalties apply.',
    recommendedFish: [],
    coordinates: [
      { latitude: 8.46, longitude: 77.05 },
      { latitude: 8.48, longitude: 77.09 },
      { latitude: 8.44, longitude: 77.11 },
      { latitude: 8.43, longitude: 77.07 },
    ],
    center: { latitude: 8.4525, longitude: 77.08 },
    depth: '20–40m',
    waterTemp: '29°C',
    lastUpdated: '1 day ago',
  },
];

// ─── Normalize Zone Data Helper ────────────────────────────────────────────────
const normalizeZones = (rawZones) => {
  return rawZones.map((z) => {
    const id = z.id || z._id || z.server_id || Math.random().toString();
    
    let status = z.status || z.safetyLevel || z.safety_level || 'safe';
    if (status === 'danger') status = 'restricted';

    let coords = [];
    const rawCoords = z.coordinates || [];
    if (Array.isArray(rawCoords)) {
      coords = rawCoords.map((c) => {
        const lat = c.lat ?? c.latitude;
        const lng = c.lng ?? c.longitude;
        return { latitude: Number(lat), longitude: Number(lng) };
      });
    }

    let center = null;
    const centerLat = z.center?.latitude ?? z.centerPoint?.lat ?? z.center_lat ?? null;
    const centerLng = z.center?.longitude ?? z.centerPoint?.lng ?? z.center_lng ?? null;
    if (centerLat !== null && centerLng !== null) {
      center = { latitude: Number(centerLat), longitude: Number(centerLng) };
    } else if (coords.length > 0) {
      const sumLat = coords.reduce((sum, c) => sum + c.latitude, 0);
      const sumLng = coords.reduce((sum, c) => sum + c.longitude, 0);
      center = {
        latitude: sumLat / coords.length,
        longitude: sumLng / coords.length,
      };
    } else {
      center = { latitude: 8.4, longitude: 77.0 };
    }

    const name = z.name || '';
    const nameTamil = z.nameTamil || z.name_tamil || z.name || '';
    const description = z.description || '';
    const descriptionTamil = z.descriptionTamil || z.description_tamil || z.description || '';

    const depth = z.depth || (z.depthRangeMeters ? `${z.depthRangeMeters.min}–${z.depthRangeMeters.max}m` : '30–60m');
    const waterTemp = z.waterTemp || '28°C';
    const lastUpdated = z.lastUpdated || '2 hrs ago';
    const recommendedFish = z.recommendedFish || z.recommendedSpecies || z.recommended_species || [];

    return {
      id,
      name,
      nameTamil,
      status,
      description,
      descriptionTamil,
      coordinates: coords,
      center,
      depth,
      waterTemp,
      lastUpdated,
      recommendedFish,
    };
  });
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function FishingZoneScreen() {
  const mapRef = useRef(null);
  const sheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_MIN)).current;
  const { isConnected } = useNetwork();
  const { t, lang } = useLanguage();

  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const initialRegion = {
    latitude: 8.4,
    longitude: 77.0,
    latitudeDelta: 0.18,
    longitudeDelta: 0.18,
  };

  // ── Location ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();
  }, []);

  // ── Load zones ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadZones();
  }, [isConnected]);

  const loadZones = async () => {
    setLoading(true);
    try {
      if (isConnected) {
        const res = await api.get(ENDPOINTS.FISHING_ZONES);
        const rawData = res.data?.data || MOCK_ZONES;
        const normalized = normalizeZones(rawData);
        await cacheFishingZones(rawData);
        setZones(normalized);
        setIsOffline(false);
      } else {
        throw new Error('offline');
      }
    } catch (err) {
      try {
        const cached = await getCachedFishingZones();
        const rawData = cached?.length ? cached : MOCK_ZONES;
        setZones(normalizeZones(rawData));
      } catch (e) {
        setZones(normalizeZones(MOCK_ZONES));
      }
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Bottom sheet animation ────────────────────────────────────────────────
  const openSheet = (zone) => {
    setSelectedZone(zone);
    Animated.spring(sheetAnim, {
      toValue: BOTTOM_SHEET_MAX,
      useNativeDriver: false,
      tension: 60,
      friction: 9,
    }).start();
    setSheetExpanded(true);

    mapRef.current?.animateToRegion(
      {
        latitude: zone.center.latitude - 0.04,
        longitude: zone.center.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      },
      500,
    );
  };

  const closeSheet = () => {
    Animated.spring(sheetAnim, {
      toValue: BOTTOM_SHEET_MIN,
      useNativeDriver: false,
      tension: 60,
      friction: 9,
    }).start(() => {
      setSelectedZone(null);
      setSheetExpanded(false);
    });
  };

  const centerOnUser = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion(
        { ...userLocation, latitudeDelta: 0.08, longitudeDelta: 0.08 },
        600,
      );
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderZoneMarker = (zone) => {
    const meta = STATUS_META[zone.status];
    return (
      <Marker
        key={`marker-${zone.id}`}
        coordinate={zone.center}
        onPress={() => openSheet(zone)}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={[styles.markerContainer, { borderColor: meta.color }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
      </Marker>
    );
  };

  const renderZonePolygon = (zone) => {
    const clr = ZONE_COLORS[zone.status];
    return (
      <Polygon
        key={`poly-${zone.id}`}
        coordinates={zone.coordinates}
        fillColor={clr.fill}
        strokeColor={clr.stroke}
        strokeWidth={2}
        tappable
        onPress={() => openSheet(zone)}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          tileSize={256}
        />
        {zones.map(renderZonePolygon)}
        {zones.map(renderZoneMarker)}
      </MapView>

      {/* ── Loading overlay ───────────────────────────────────────────────── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('zones.loading')}</Text>
        </View>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.headerWrapper}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{t('zones.title')}</Text>
            <Text style={styles.headerSub}>{zones.length} {t('zones.zonesLoaded')}</Text>
          </View>
          {isOffline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline-outline" size={12} color="#fff" />
              <Text style={styles.offlineBadgeText}>{t('common.offline')}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <View style={styles.legend}>
        {Object.entries(STATUS_META).map(([key, val]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: val.color }]} />
            <Text style={styles.legendText}>{t('zones.' + key)}</Text>
          </View>
        ))}
      </View>

      {/* ── My location button ────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.locationBtn} onPress={centerOnUser} activeOpacity={0.8}>
        <Ionicons name="locate" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      {/* ── Refresh button ────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.refreshBtn} onPress={loadZones} activeOpacity={0.8}>
        <Ionicons name="refresh" size={20} color="#94A3B8" />
      </TouchableOpacity>

      {/* ── Bottom Sheet ──────────────────────────────────────────────────── */}
      <Animated.View style={[styles.bottomSheet, { height: sheetAnim }]}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {selectedZone ? (
          <ScrollView
            style={styles.sheetScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Zone header */}
            <View style={styles.zoneHeader}>
              <View style={styles.zoneHeaderLeft}>
                <View
                  style={[
                    styles.zoneStatusBadge,
                    { backgroundColor: STATUS_META[selectedZone.status].color + '22' },
                  ]}
                >
                  <Ionicons
                    name={STATUS_META[selectedZone.status].icon}
                    size={14}
                    color={STATUS_META[selectedZone.status].color}
                  />
                  <Text
                    style={[
                      styles.zoneStatusText,
                      { color: STATUS_META[selectedZone.status].color },
                    ]}
                  >
                    {t('zones.' + selectedZone.status)}
                  </Text>
                </View>
                <Text style={styles.zoneName}>
                  {lang === 'ta' ? (selectedZone.nameTamil || selectedZone.name_tamil || selectedZone.name) : selectedZone.name}
                </Text>
              </View>
              <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.zoneDesc}>
              {lang === 'ta' ? (selectedZone.descriptionTamil || selectedZone.description_tamil || selectedZone.description) : selectedZone.description}
            </Text>

            {/* Stat row */}
            <View style={styles.zoneStatRow}>
              <View style={styles.zoneStat}>
                <Ionicons name="water-outline" size={16} color="#0066CC" />
                <Text style={styles.zoneStatLabel}>{t('zones.depth')}</Text>
                <Text style={styles.zoneStatValue}>{selectedZone.depth}</Text>
              </View>
              <View style={styles.zoneStatDivider} />
              <View style={styles.zoneStat}>
                <Ionicons name="thermometer-outline" size={16} color="#F59E0B" />
                <Text style={styles.zoneStatLabel}>{t('zones.waterTemp')}</Text>
                <Text style={styles.zoneStatValue}>{selectedZone.waterTemp}</Text>
              </View>
              <View style={styles.zoneStatDivider} />
              <View style={styles.zoneStat}>
                <Ionicons name="time-outline" size={16} color="#94A3B8" />
                <Text style={styles.zoneStatLabel}>{t('zones.updated')}</Text>
                <Text style={styles.zoneStatValue}>
                  {selectedZone.lastUpdated === '2 hrs ago' ? (lang === 'ta' ? '2 மணி நேரம் முன்' : '2 hrs ago') :
                   selectedZone.lastUpdated === '4 hrs ago' ? (lang === 'ta' ? '4 மணி நேரம் முன்' : '4 hrs ago') :
                   selectedZone.lastUpdated === '1 day ago' ? (lang === 'ta' ? '1 நாள் முன்' : '1 day ago') :
                   selectedZone.lastUpdated}
                </Text>
              </View>
            </View>

            {/* Recommended fish */}
            {selectedZone.recommendedFish?.length > 0 && (
              <View style={styles.fishSection}>
                <Text style={styles.fishSectionTitle}>
                  <Ionicons name="fish-outline" size={14} color="#94A3B8" /> {t('zones.recommendedFish')}
                </Text>
                <View style={styles.fishChips}>
                  {selectedZone.recommendedFish.map((f) => {
                    const fishMap = {
                      'Tuna': 'சூரை', 'Sardine': 'மத்தி', 'Mackerel': 'அயலை',
                      'Pomfret': 'வாவல்', 'Prawn': 'இறால்', 'Squid': 'கணவாய்',
                      'Seer Fish': 'நெய்மீன்'
                    };
                    const translatedFish = lang === 'ta' ? (fishMap[f] || f) : f;
                    return (
                      <View key={f} style={styles.fishChip}>
                        <Text style={styles.fishChipText}>{translatedFish}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {selectedZone.status === 'restricted' && (
              <View style={styles.restrictedWarning}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.restrictedWarningText}>
                  {t('zones.restrictedWarning')}
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.sheetHint}>
            <Ionicons name="hand-left-outline" size={24} color="#94A3B8" />
            <Text style={styles.sheetHintText}>{t('zones.sheetHint')}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,22,40,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },

  // Header
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(15,32,68,0.92)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
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

  // Legend
  legend: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: 'rgba(15,32,68,0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 10,
    gap: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#F1F5F9',
    fontSize: 11,
    fontWeight: '500',
  },

  // Floating buttons
  locationBtn: {
    position: 'absolute',
    right: 16,
    bottom: BOTTOM_SHEET_MIN + 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15,32,68,0.95)',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  refreshBtn: {
    position: 'absolute',
    right: 16,
    bottom: BOTTOM_SHEET_MIN + 72,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15,32,68,0.95)',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },

  // Marker
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: 'rgba(15,32,68,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F2044',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 20,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E3A5F',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sheetHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sheetHintText: {
    color: '#94A3B8',
    fontSize: 14,
  },

  // Zone detail
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  zoneHeaderLeft: {
    flex: 1,
    gap: 6,
  },
  zoneStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  zoneStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  zoneName: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  zoneDesc: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  zoneStatRow: {
    flexDirection: 'row',
    backgroundColor: '#0A1628',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    marginBottom: 16,
    overflow: 'hidden',
  },
  zoneStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  zoneStatDivider: {
    width: 1,
    backgroundColor: '#1E3A5F',
    marginVertical: 10,
  },
  zoneStatLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  zoneStatValue: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
  fishSection: {
    marginBottom: 16,
  },
  fishSectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  fishChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fishChip: {
    backgroundColor: '#0066CC22',
    borderColor: '#0066CC55',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  fishChipText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '600',
  },
  restrictedWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EF444422',
    borderColor: '#EF444455',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  restrictedWarningText: {
    color: '#FCA5A5',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
