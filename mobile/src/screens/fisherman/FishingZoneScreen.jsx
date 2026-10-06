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
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { UrlTile, LocalTile, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { getCachedFishingZones, cacheFishingZones, saveFishingZoneOffline } from '../../db/helpers';
import { useNetwork } from '../../store/NetworkContext';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_MIN = 80;
const BOTTOM_SHEET_MAX = 300;

// Default Mock Recommendations
const MOCK_RECOMMENDATIONS = [
  {
    _id: 'mock_1',
    species: 'Mackerel',
    abundance: 'high',
    location: { lat: 8.401, lng: 76.985 },
    fishermanId: { name: 'Jai Kumar' },
    notes: 'Heavy school of Mackerels noticed. Caught 45kg in 2 hours using gill nets.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: 'mock_2',
    species: 'Sardine',
    abundance: 'high',
    location: { lat: 8.368, lng: 76.962 },
    fishermanId: { name: 'Karthik Raja' },
    notes: 'Sardines are highly active here. Smooth currents.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    _id: 'mock_3',
    species: 'Pomfret',
    abundance: 'medium',
    location: { lat: 13.048, lng: 80.312 },
    fishermanId: { name: 'Muthu Vel' },
    notes: 'Pomfrets spotted in good quantities. Sea condition moderate.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

const normalizeZones = (rawZones) => {
  return rawZones.map((z) => {
    const id = z.id || z._id || z.server_id || Math.random().toString();
    const lat = z.location?.lat ?? z.lat ?? 8.4;
    const lng = z.location?.lng ?? z.lng ?? 77.0;
    
    return {
      id,
      species: z.species || 'Unknown Fish',
      abundance: z.abundance || 'medium',
      latitude: Number(lat),
      longitude: Number(lng),
      reporterName: z.fishermanId?.name || z.reporter_name || 'Fisherman',
      notes: z.notes || '',
      createdAt: z.createdAt || z.created_at || new Date().toISOString(),
      isPending: !!z.isPending,
    };
  });
};

const getAbundanceColor = (level) => {
  if (level === 'high') return COLORS.success;
  if (level === 'medium') return COLORS.secondary;
  return COLORS.info;
};

const formatTimeAgo = (dateStr) => {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
};

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
  const [isMapDownloaded, setIsMapDownloaded] = useState(false);

  // Report Modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportSpecies, setReportSpecies] = useState('');
  const [reportAbundance, setReportAbundance] = useState('medium');
  const [reportNotes, setReportNotes] = useState('');
  const [reporting, setReporting] = useState(false);

  const tilesDir = `${FileSystem.documentDirectory}tiles/`;
  const pathTemplate = `${tilesDir}{z}/{x}/{y}.png`;
  const localPathTemplate = Platform.OS === 'android' ? pathTemplate.replace('file://', '') : pathTemplate;

  const initialRegion = {
    latitude: 8.4,
    longitude: 77.0,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setUserLocation(coords);
        // Focus map to user
        mapRef.current?.animateToRegion(
          { ...coords, latitudeDelta: 0.2, longitudeDelta: 0.2 },
          1000
        );
      }
    })();
  }, []);

  useEffect(() => {
    loadZones();
  }, [isConnected]);

  const loadZones = async () => {
    setLoading(true);
    try {
      const status = await AsyncStorage.getItem('@KadalThunai:offline_map_downloaded');
      setIsMapDownloaded(status === 'true');

      if (isConnected) {
        const res = await api.get('/fishing-zones');
        const rawData = res.data?.data || MOCK_RECOMMENDATIONS;
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
        const rawData = cached?.length ? cached : MOCK_RECOMMENDATIONS;
        setZones(normalizeZones(rawData));
      } catch (e) {
        setZones(normalizeZones(MOCK_RECOMMENDATIONS));
      }
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

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
        latitude: zone.latitude - 0.04,
        longitude: zone.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      },
      500
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

  const handleReportRecommendation = async () => {
    if (!reportSpecies.trim()) {
      Alert.alert(
        lang === 'ta' ? 'மீன் வகை தேவை' : 'Species Required',
        lang === 'ta' ? 'தயவுசெய்து மீன் வகையை உள்ளிடவும்.' : 'Please enter the fish species.'
      );
      return;
    }

    if (!userLocation) {
      Alert.alert(
        lang === 'ta' ? 'ஜிபிஎஸ் சிக்னல் இல்லை' : 'GPS Required',
        lang === 'ta' ? 'உங்களது தற்போதைய இருப்பிடத்தை கண்டறிய இயலவில்லை.' : 'Unable to acquire your current GPS coordinates.'
      );
      return;
    }

    setReporting(true);
    const recommendationData = {
      species: reportSpecies.trim(),
      abundance: reportAbundance,
      notes: reportNotes.trim(),
      lat: userLocation.latitude,
      lng: userLocation.longitude,
    };

    try {
      if (isConnected) {
        await api.post('/fishing-zones', {
          species: recommendationData.species,
          abundance: recommendationData.abundance,
          notes: recommendationData.notes,
          location: { lat: recommendationData.lat, lng: recommendationData.lng },
        });
        Alert.alert(
          lang === 'ta' ? 'வெற்றிகரமாக பகிரப்பட்டது' : 'Success',
          lang === 'ta' ? 'உங்கள் மீன்பிடி பரிந்துரை மற்ற மீனவர்களுடன் பகிரப்பட்டது!' : 'Your fishing recommendation has been shared with other fishermen!'
        );
      } else {
        // Save offline
        await saveFishingZoneOffline(recommendationData);
        Alert.alert(
          lang === 'ta' ? 'ஆஃப்லைனில் சேமிக்கப்பட்டது' : 'Saved Offline',
          lang === 'ta'
            ? 'இணைய இணைப்பு இல்லாததால் பரிந்துரை ஆஃப்லைனில் சேமிக்கப்பட்டது. நெட்வொர்க் கிடைத்தவுடன் தானாக ஒத்திசைக்கப்படும்.'
            : 'Saved offline. It will automatically sync to the server once internet is restored.'
        );
      }

      // Reset Form & reload
      setReportSpecies('');
      setReportAbundance('medium');
      setReportNotes('');
      setReportModalVisible(false);
      await loadZones();
    } catch (err) {
      Alert.alert(
        lang === 'ta' ? 'பிழை' : 'Error',
        lang === 'ta' ? 'பரிந்துரையை சேமிக்க முடியவில்லை.' : 'Failed to save recommendation.'
      );
      console.warn(err);
    } finally {
      setReporting(false);
    }
  };

  const centerOnUser = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion(
        { ...userLocation, latitudeDelta: 0.1, longitudeDelta: 0.1 },
        600
      );
    }
  };

  const isMapOffline = isOffline || !isConnected;

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        mapType={isMapOffline && isMapDownloaded && Platform.OS === 'android' ? 'none' : 'standard'}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        minZoomLevel={7}
        maxZoomLevel={isMapOffline && isMapDownloaded ? 10 : 19}
      >
        {isMapOffline && isMapDownloaded ? (
          <LocalTile pathTemplate={localPathTemplate} tileSize={256} zIndex={1} />
        ) : (
          <UrlTile
            urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
            tileSize={256}
          />
        )}

        {/* Render crowd-sourced points */}
        {zones.map((zone) => {
          const color = getAbundanceColor(zone.abundance);
          return (
            <Marker
              key={zone.id}
              coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
              onPress={() => openSheet(zone)}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.markerContainer, { borderColor: color }]}>
                <Ionicons name="fish" size={16} color={color} />
                {zone.isPending && (
                  <View style={styles.pendingBadgeDot} />
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Header Overlay */}
      <SafeAreaView edges={['top']} style={styles.headerWrapper}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {lang === 'ta' ? 'மீன் வள பரிந்துரைகள்' : 'Fish Recommendations'}
          </Text>
          {isOffline && (
            <View style={styles.offlinePill}>
              <Ionicons name="wifi-off" size={12} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.offlineText}>{lang === 'ta' ? 'ஆஃப்லைன்' : 'Offline'}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {lang === 'ta' ? 'பரிந்துரைகளை ஏற்றுகிறது...' : 'Loading recommendations...'}
          </Text>
        </View>
      )}

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        {/* Recenter GPS */}
        {userLocation && (
          <TouchableOpacity style={styles.fabMini} onPress={centerOnUser} activeOpacity={0.85}>
            <Ionicons name="locate" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        )}

        {/* Report Recommendation FAB */}
        <TouchableOpacity
          style={styles.fabMain}
          onPress={() => setReportModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>
            {lang === 'ta' ? 'பரிந்துரை சேர்' : 'Report Catch'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Detail View */}
      {selectedZone && (
        <Animated.View style={[styles.bottomSheet, { height: sheetAnim }]}>
          <View style={styles.sheetHandleWrapper}>
            <View style={styles.sheetHandle} />
          </View>

          <View style={styles.sheetContent}>
            {/* Title / Species */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetSpecies}>🐟 {selectedZone.species}</Text>
                <Text style={styles.sheetReporter}>
                  {lang === 'ta' ? 'பகிர்ந்தவர்: ' : 'Reported by: '}{selectedZone.reporterName}
                </Text>
              </View>
              <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Abundance Pill & Coordinates */}
            <View style={styles.sheetStats}>
              <View style={[styles.statBadge, { borderColor: getAbundanceColor(selectedZone.abundance) }]}>
                <Text style={[styles.statValue, { color: getAbundanceColor(selectedZone.abundance) }]}>
                  {selectedZone.abundance.toUpperCase()}
                </Text>
                <Text style={styles.statLabel}>{lang === 'ta' ? 'அளவு' : 'Abundance'}</Text>
              </View>

              <View style={styles.statBadge}>
                <Text style={styles.statValue}>
                  {selectedZone.latitude.toFixed(4)}, {selectedZone.longitude.toFixed(4)}
                </Text>
                <Text style={styles.statLabel}>{lang === 'ta' ? 'இருப்பிடம்' : 'Coordinates'}</Text>
              </View>

              <View style={styles.statBadge}>
                <Text style={styles.statValue}>{formatTimeAgo(selectedZone.createdAt)}</Text>
                <Text style={styles.statLabel}>{lang === 'ta' ? 'நேரம்' : 'Time'}</Text>
              </View>
            </View>

            {/* Notes Section */}
            {selectedZone.notes ? (
              <ScrollView style={styles.notesSection}>
                <Text style={styles.notesTitle}>{lang === 'ta' ? 'குறிப்புகள் / விவரங்கள்' : 'Fisherman Notes'}</Text>
                <Text style={styles.notesBody}>"{selectedZone.notes}"</Text>
              </ScrollView>
            ) : (
              <View style={styles.notesSection}>
                <Text style={[styles.notesBody, { fontStyle: 'italic', color: COLORS.textMuted }]}>
                  {lang === 'ta' ? 'கூடுதல் குறிப்புகள் ஏதுமில்லை.' : 'No additional notes provided.'}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Add Recommendation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Title */}
            <Text style={styles.modalTitle}>
              {lang === 'ta' ? 'மீன் வள பரிந்துரை' : 'Report Catch Location'}
            </Text>
            <Text style={styles.modalSub}>
              {lang === 'ta'
                ? 'நீங்கள் அதிகமாக மீன் பிடித்த இடத்தைப் பகிர்ந்து மற்ற மீனவர்களுக்கு உதவலாம்.'
                : 'Help other fishermen by marking coordinates where you found a heavy fish density.'}
            </Text>

            {/* Species Input */}
            <Text style={styles.inputLabel}>{lang === 'ta' ? 'மீன் வகை (Species):' : 'Fish Species:'}</Text>
            <TextInput
              style={styles.input}
              placeholder={lang === 'ta' ? 'உதாரணம்: அயலை / மத்தி / வாவல்' : 'e.g. Mackerel, Sardine, Pomfret'}
              placeholderTextColor={COLORS.textMuted}
              value={reportSpecies}
              onChangeText={setReportSpecies}
            />

            {/* Abundance Select */}
            <Text style={styles.inputLabel}>{lang === 'ta' ? 'மீன் அடர்த்தி / அளவு:' : 'Abundance / Density:'}</Text>
            <View style={styles.abundanceRow}>
              {['low', 'medium', 'high'].map((level) => {
                const active = reportAbundance === level;
                const activeColor = getAbundanceColor(level);
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.abundanceBtn,
                      active && { backgroundColor: activeColor + '33', borderColor: activeColor },
                    ]}
                    onPress={() => setReportAbundance(level)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.abundanceText,
                        { color: active ? activeColor : COLORS.textSecondary },
                      ]}
                    >
                      {level.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes Input */}
            <Text style={styles.inputLabel}>{lang === 'ta' ? 'விவரம் (Notes):' : 'Catch Observations:'}</Text>
            <TextInput
              style={[styles.input, styles.inputArea]}
              placeholder={lang === 'ta' ? 'அலைகள், தூண்டில்/வலை விவரம்...' : 'e.g. Swell state, net type, estimate caught (kg)...'}
              placeholderTextColor={COLORS.textMuted}
              value={reportNotes}
              onChangeText={setReportNotes}
              multiline
              numberOfLines={3}
            />

            {/* Coordinates indicator */}
            <View style={styles.coordsIndicator}>
              <Ionicons name="location" size={14} color={COLORS.secondary} />
              <Text style={styles.coordsIndicatorText}>
                {userLocation
                  ? `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)} (Live)`
                  : (lang === 'ta' ? 'ஜிபிஎஸ் தேடுகிறது...' : 'Acquiring GPS...')}
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setReportModalVisible(false)}
                disabled={reporting}
              >
                <Text style={styles.modalBtnTextCancel}>{lang === 'ta' ? 'ரத்து' : 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleReportRecommendation}
                disabled={reporting || !userLocation}
              >
                {reporting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnText}>{lang === 'ta' ? 'பகிர்' : 'Submit'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
    backgroundColor: COLORS.cardGlass,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.sos,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  offlineText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingText: { color: COLORS.textPrimary, fontSize: 13, marginTop: 12, fontWeight: '600' },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  pendingBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  fabContainer: {
    position: 'absolute',
    bottom: BOTTOM_SHEET_MIN + 20,
    right: SPACING.md,
    alignItems: 'flex-end',
    gap: SPACING.sm,
    zIndex: 5,
  },
  fabMini: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  fabMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
    ...SHADOWS.md,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.lg,
    zIndex: 10,
  },
  sheetHandleWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  sheetContent: { flex: 1, paddingHorizontal: SPACING.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sheetSpecies: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  sheetReporter: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetStats: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 16 },
  statBadge: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statValue: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  notesSection: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  notesTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  notesBody: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 32,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.lg,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  modalSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16, marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 14,
  },
  inputArea: { height: 70, textAlignVertical: 'top' },
  abundanceRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 14 },
  abundanceBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  abundanceText: { fontSize: 11, fontWeight: '700' },
  coordsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  coordsIndicatorText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: SPACING.sm },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modalBtnSubmit: { backgroundColor: COLORS.primary },
  modalBtnTextCancel: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
