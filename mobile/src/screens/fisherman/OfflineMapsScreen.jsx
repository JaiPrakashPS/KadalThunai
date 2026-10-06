import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { UrlTile, LocalTile } from 'react-native-maps';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from '../../store/NetworkContext';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const { width } = Dimensions.get('window');

// Math helpers to map coordinates to XYZ tile numbers
const lon2tile = (lon, zoom) => Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
const lat2tile = (lat, zoom) => {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
};

const REGIONS = [
  {
    id: 'entire_tn',
    name: 'Entire Tamil Nadu Coast',
    nameTamil: 'முழு தமிழ்நாடு கடற்கரை',
    bounds: { minLat: 8.0, maxLat: 14.0, minLng: 75.5, maxLng: 80.8 },
    desc: 'Covers the entire coastline of Tamil Nadu from Chennai to Kanyakumari.',
    descTamil: 'சென்னையிலிருந்து கன்னியாகுமரி வரை முழு கடற்கரை பகுதியையும் உள்ளடக்கியது.',
  },
  {
    id: 'chennai',
    name: 'Chennai Coast',
    nameTamil: 'சென்னை கடற்கரை',
    bounds: { minLat: 12.5, maxLat: 13.5, minLng: 79.8, maxLng: 80.5 },
    desc: 'Covers Chennai, Thiruvallur, and Kanchipuram coastal zones.',
    descTamil: 'சென்னை, திருவள்ளூர் மற்றும் காஞ்சிபுரம் கடலோர பகுதிகளை உள்ளடக்கியது.',
  },
  {
    id: 'nagapattinam',
    name: 'Nagapattinam & Cuddalore Coast',
    nameTamil: 'நாகப்பட்டினம் & கடலூர் கடற்கரை',
    bounds: { minLat: 10.2, maxLat: 12.0, minLng: 79.5, maxLng: 80.2 },
    desc: 'Covers Nagapattinam, Karaikal, Cuddalore, and Villupuram.',
    descTamil: 'நாகப்பட்டினம், காரைக்கால், கடலூர் மற்றும் விழுப்புரம் பகுதிகளை உள்ளடக்கியது.',
  },
  {
    id: 'rameswaram',
    name: 'Rameswaram & Ramanathapuram',
    nameTamil: 'ராமேஸ்வரம் & ராமநாதபுரம்',
    bounds: { minLat: 9.0, maxLat: 10.0, minLng: 78.5, maxLng: 79.6 },
    desc: 'Covers Palk Bay, Gulf of Mannar, and Rameswaram island.',
    descTamil: 'பாக் விரிகுடா, மன்னார் வளைகுடா மற்றும் ராமேஸ்வரம் தீவு பகுதிகளை உள்ளடக்கியது.',
  },
  {
    id: 'kanyakumari',
    name: 'Kanyakumari & Thoothukudi',
    nameTamil: 'கன்னியாகுமரி & தூத்துக்குடி',
    bounds: { minLat: 8.0, maxLat: 9.2, minLng: 77.0, maxLng: 78.5 },
    desc: 'Covers Kanyakumari, Thoothukudi, and Tirunelveli coast.',
    descTamil: 'கன்னியாகுமரி, தூத்துக்குடி மற்றும் திருநெல்வேலி கடற்கரை பகுதிகளை உள்ளடக்கியது.',
  },
];

const getTilesList = (bounds) => {
  const list = [];
  // Zoom levels 7 to 10 cover regional to mid-level details of TN coast
  for (let z = 7; z <= 10; z++) {
    const xMin = lon2tile(bounds.minLng, z);
    const xMax = lon2tile(bounds.maxLng, z);
    const y1 = lat2tile(bounds.minLat, z);
    const y2 = lat2tile(bounds.maxLat, z);
    const yMin = Math.min(y1, y2);
    const yMax = Math.max(y1, y2);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        list.push({ z, x, y });
      }
    }
  }
  return list;
};

export default function OfflineMapsScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const { isConnected } = useNetwork();
  const mapRef = useRef(null);

  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0]);
  const [downloadedRegions, setDownloadedRegions] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadCount, setDownloadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [forceOffline, setForceOffline] = useState(false);
  const [cacheSize, setCacheSize] = useState('0 MB');
  const [userLocation, setUserLocation] = useState(null);

  const tilesDir = `${FileSystem.documentDirectory}tiles/`;
  const pathTemplate = `${tilesDir}{z}/{x}/{y}.png`;

  // Center on Tamil Nadu Coastline
  const initialRegion = {
    latitude: 11.0,
    longitude: 78.8,
    latitudeDelta: 5.5,
    longitudeDelta: 5.5,
  };

  useEffect(() => {
    checkStatus();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation(loc.coords);
        // Pan map preview to user location
        mapRef.current?.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 1.5,
          longitudeDelta: 1.5,
        }, 1500);
      }
    } catch (err) {
      console.warn('Location request failed:', err);
    }
  };

  const calculateCacheSize = async () => {
    try {
      const info = await FileSystem.getInfoAsync(tilesDir);
      if (!info.exists) {
        setCacheSize('0 MB');
        return;
      }
      
      let bytes = 0;
      const getDirSize = async (dirUri) => {
        const files = await FileSystem.readDirectoryAsync(dirUri);
        for (const file of files) {
          const fileUri = `${dirUri}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (fileInfo.isDirectory) {
            await getDirSize(`${fileUri}/`);
          } else {
            bytes += fileInfo.size || 0;
          }
        }
      };
      await getDirSize(tilesDir);
      setCacheSize(`${(bytes / (1024 * 1024)).toFixed(2)} MB`);
    } catch {
      setCacheSize('0 MB');
    }
  };

  const checkStatus = async () => {
    try {
      const regionsStr = await AsyncStorage.getItem('@KadalThunai:downloaded_regions');
      const regions = regionsStr ? JSON.parse(regionsStr) : [];
      setDownloadedRegions(regions);
      await calculateCacheSize();
    } catch {
      setDownloadedRegions([]);
    }
  };

  const startDownload = async () => {
    if (!isConnected) {
      Alert.alert(
        lang === 'ta' ? 'இணைய இணைப்பு தேவை' : 'Connection Required',
        lang === 'ta'
          ? 'மேப் டவுன்லோட் செய்ய இணைய இணைப்பு தேவைப்படுகிறது.'
          : 'An active internet connection is required to download map tiles.'
      );
      return;
    }

    setDownloading(true);
    setProgress(0);
    setDownloadCount(0);

    try {
      const tiles = getTilesList(selectedRegion.bounds);
      setTotalCount(tiles.length);

      // Create base dir
      await FileSystem.makeDirectoryAsync(tilesDir, { intermediates: true });

      const batchSize = 10;
      let count = 0;

      for (let i = 0; i < tiles.length; i += batchSize) {
        const batch = tiles.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (tile) => {
            const url = `https://a.basemaps.cartocdn.com/dark_all/${tile.z}/${tile.x}/${tile.y}.png`;
            const folderUri = `${tilesDir}${tile.z}/${tile.x}`;
            const fileUri = `${folderUri}/${tile.y}.png`;

            try {
              // Ensure directories exist
              await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
              // Download single tile
              await FileSystem.downloadAsync(url, fileUri);
            } catch (err) {
              console.warn(`Tile download failed for ${tile.z}/${tile.x}/${tile.y}:`, err.message);
            } finally {
              count++;
              setDownloadCount(count);
              setProgress(count / tiles.length);
            }
          })
        );
      }

      const updated = Array.from(new Set([...downloadedRegions, selectedRegion.id]));
      await AsyncStorage.setItem('@KadalThunai:downloaded_regions', JSON.stringify(updated));
      await AsyncStorage.setItem('@KadalThunai:offline_map_downloaded', 'true');
      setDownloadedRegions(updated);
      await calculateCacheSize();

      Alert.alert(
        lang === 'ta' ? 'பதிவிறக்கம் முடிந்தது' : 'Download Complete',
        lang === 'ta'
          ? `${lang === 'ta' ? selectedRegion.nameTamil : selectedRegion.name} வரைபடம் வெற்றிகரமாக சேமிக்கப்பட்டது.`
          : `${selectedRegion.name} map downloaded successfully.`
      );
    } catch (error) {
      Alert.alert(
        lang === 'ta' ? 'பிழை ஏற்பட்டது' : 'Error',
        lang === 'ta'
          ? 'டவுன்லோட் செய்யும்போது தவறு நிகழ்ந்தது.'
          : 'Failed to complete map tile downloads.'
      );
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  const removeMapData = async () => {
    Alert.alert(
      lang === 'ta' ? 'வரைபடங்களை நீக்கவா?' : 'Delete Map Data?',
      lang === 'ta'
        ? 'பதிவிறக்கம் செய்யப்பட்டுள்ள அனைத்து வரைபடத் தரவுகளும் நீக்கப்படும். தொடரலாமா?'
        : 'All offline map files for all regions will be removed from storage. Proceed?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: lang === 'ta' ? 'நீக்கு' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const info = await FileSystem.getInfoAsync(tilesDir);
              if (info.exists) {
                await FileSystem.deleteAsync(tilesDir);
              }
              await AsyncStorage.removeItem('@KadalThunai:downloaded_regions');
              await AsyncStorage.removeItem('@KadalThunai:offline_map_downloaded');
              setDownloadedRegions([]);
              setCacheSize('0 MB');
            } catch (e) {
              console.warn(e);
            }
          },
        },
      ]
    );
  };

  const isRegionDownloaded = downloadedRegions.includes(selectedRegion.id) || downloadedRegions.includes('entire_tn');
  const isMapOffline = forceOffline || !isConnected;

  const localPathTemplate = Platform.OS === 'android' ? pathTemplate.replace('file://', '') : pathTemplate;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {lang === 'ta' ? 'ஆஃப்லைன் வரைபடங்கள்' : 'Offline Maps'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegion}
            mapType={isMapOffline && Platform.OS === 'android' ? 'none' : 'standard'}
            showsCompass={true}
            showsUserLocation={true}
            showsMyLocationButton={true}
            minZoomLevel={7}
            maxZoomLevel={isMapOffline ? 10 : 19}
          >
            {isMapOffline && downloadedRegions.length > 0 ? (
              <LocalTile pathTemplate={localPathTemplate} tileSize={256} zIndex={1} />
            ) : (
              <UrlTile
                urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                maximumZ={19}
                flipY={false}
                tileSize={256}
              />
            )}
          </MapView>
          {isMapOffline && (
            <View style={styles.mapBadge}>
              <Ionicons name="wifi-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.mapBadgeText}>
                {downloadedRegions.length > 0
                  ? lang === 'ta'
                    ? 'ஆஃப்லைன் பயன்முறை'
                    : 'OFFLINE MODE (LOCAL)'
                  : lang === 'ta'
                  ? 'ஆஃப்லைன் (வரைபடம் இல்லை)'
                  : 'OFFLINE (NO MAP DATA)'}
              </Text>
            </View>
          )}
        </View>

        {/* BBox Options Selector */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {lang === 'ta' ? 'வரைபடப் பகுதி தேர்வு:' : 'Select Region to Download:'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionScroll}>
            {REGIONS.map((r) => {
              const active = selectedRegion.id === r.id;
              const completed = downloadedRegions.includes(r.id);
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.regionChip, active && styles.regionChipActive]}
                  onPress={() => setSelectedRegion(r)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.regionChipText, active && styles.regionChipTextActive]}>
                    {lang === 'ta' ? r.nameTamil : r.name}
                  </Text>
                  {completed && (
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color={active ? COLORS.white : COLORS.success}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.regionDesc}>
            {lang === 'ta' ? selectedRegion.descTamil : selectedRegion.desc}
          </Text>
        </View>

        {/* Downloader Section */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {lang === 'ta' ? 'மேப் டவுன்லோடர்' : 'Map Downloader'}
          </Text>
          <Text style={styles.panelDesc}>
            {lang === 'ta'
              ? 'தேர்ந்தெடுக்கப்பட்ட பகுதியை டவுன்லோட் செய்வதன் மூலம், இணைய இணைப்பு இல்லாதபோதும் வரைபடத்தில் உங்களது துல்லியமான இருப்பிடத்தைக் காணலாம்.'
              : 'Download the selected region to load and view your exact GPS position in the map offline without cellular range.'}
          </Text>

          {downloading && (
            <View style={styles.progressContainer}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <View style={styles.progressBarWrapper}>
                <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {lang === 'ta' ? 'பதிவிறக்கம்: ' : 'Downloading: '}
                {downloadCount} / {totalCount} tiles
              </Text>
            </View>
          )}

          {!downloading && (
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.statusLabel}>
                  {lang === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட பகுதி நிலை:' : 'Selected Region:'}
                </Text>
                <Text
                  style={[
                    styles.statusValue,
                    { color: isRegionDownloaded ? COLORS.success : COLORS.danger },
                  ]}
                >
                  {isRegionDownloaded
                    ? lang === 'ta'
                      ? 'பதிவிறக்கம் செய்யப்பட்டுள்ளது'
                      : 'Downloaded'
                    : lang === 'ta'
                    ? 'பதிவிறக்கப்படவில்லை'
                    : 'Not Downloaded'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.statusLabel}>
                  {lang === 'ta' ? 'மொத்த நினைவக அளவு:' : 'Total Cache Size:'}
                </Text>
                <Text style={styles.cacheSize}>{cacheSize}</Text>
              </View>
            </View>
          )}

          <View style={styles.buttonRow}>
            {downloadedRegions.length > 0 && (
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger]}
                onPress={removeMapData}
                disabled={downloading}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>
                  {lang === 'ta' ? 'அனைத்தையும் நீக்கு' : 'Delete Cache'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, { flex: 2 }]}
              onPress={startDownload}
              disabled={downloading}
            >
              <Ionicons name="cloud-download-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>
                {isRegionDownloaded
                  ? lang === 'ta'
                    ? 'வரைபடத்தை புதுப்பி'
                    : 'Update Map'
                  : lang === 'ta'
                  ? 'டவுன்லோட் செய்'
                  : 'Download Map'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Configuration Toggles */}
        {downloadedRegions.length > 0 && (
          <View style={styles.panel}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.toggleLabel}>
                  {lang === 'ta' ? 'ஆஃப்லைன் பயன்முறையை கட்டாயப்படுத்து' : 'Simulate Offline Mode'}
                </Text>
                <Text style={styles.toggleDesc}>
                  {lang === 'ta'
                    ? 'இணைய இணைப்பு இருக்கும்போதும் உள்ளூர் வரைபடத்தை பயன்படுத்தி சோதிக்கவும்.'
                    : 'Force local storage tile rendering to test map behavior while online.'}
                </Text>
              </View>
              <Switch
                value={forceOffline}
                onValueChange={setForceOffline}
                thumbColor={forceOffline ? COLORS.secondary : COLORS.textMuted}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  mapContainer: {
    height: 280,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  mapBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  panelTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  panelDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: SPACING.md },
  regionScroll: { gap: 8, paddingBottom: 4 },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  regionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  regionChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  regionChipTextActive: { color: COLORS.white, fontWeight: '700' },
  regionDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 8, lineHeight: 16 },
  progressContainer: { marginTop: SPACING.sm, alignItems: 'center' },
  progressBarWrapper: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: COLORS.primary },
  progressText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  statusLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 2 },
  statusValue: { fontSize: 13, fontWeight: '700' },
  cacheSize: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  buttonRow: { flexDirection: 'row', gap: SPACING.sm },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnDanger: { backgroundColor: COLORS.danger },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  toggleDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
});
