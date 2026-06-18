import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { UrlTile, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const BOAT_TYPE_COLORS = {
  mechanized: COLORS.primary,
  motorized: COLORS.success,
  traditional: COLORS.secondary,
  fiber: COLORS.info,
};

export default function NearbyBoatsScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [viewMode, setViewMode] = useState('map');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const init = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
        const res = await api.get(ENDPOINTS.BOATS, { params: { limit: 100 } });
        setBoats(res.data.data || []);
      } catch (e) { console.warn(e.message); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  const types = ['all', 'mechanized', 'motorized', 'traditional', 'fiber'];
  const filtered = typeFilter === 'all' ? boats : boats.filter(b => b.type === typeFilter);

  const renderBoat = ({ item }) => (
    <View style={styles.boatCard}>
      <View style={[styles.boatTypeBar, { backgroundColor: BOAT_TYPE_COLORS[item.type] || COLORS.primary }]} />
      <View style={styles.boatCardContent}>
        <View style={styles.boatRow}>
          <View style={styles.boatIconCircle}>
            <Ionicons name="boat" size={22} color={BOAT_TYPE_COLORS[item.type] || COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.boatName}>{item.name}</Text>
            <Text style={styles.boatReg}>{item.registrationNo}</Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: (BOAT_TYPE_COLORS[item.type] || COLORS.primary) + '22' }]}>
            <Text style={[styles.typePillText, { color: BOAT_TYPE_COLORS[item.type] || COLORS.primary }]}>
              {t('boat.types.' + item.type) || item.type}
            </Text>
          </View>
        </View>
        {item.ownerId && (
          <View style={styles.ownerRow}>
            <Ionicons name="person-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.ownerText}>{item.ownerId?.name || (lang === 'ta' ? 'தெரியாதவர்' : 'Unknown')}</Text>
            {item.ownerId?.phone && <Text style={styles.ownerPhone}>· {item.ownerId.phone}</Text>}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{lang === 'ta' ? 'அருகிலுள்ள படகுகள்' : 'Nearby Boats'}</Text>
        <TouchableOpacity style={styles.viewToggle} onPress={() => setViewMode(v => v === 'map' ? 'list' : 'map')}>
          <Ionicons name={viewMode === 'map' ? 'list' : 'map'} size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Type filter */}
      <View style={styles.filterRow}>
        {types.map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, typeFilter === type && styles.filterChipActive]}
            onPress={() => setTypeFilter(type)}
          >
            <Text style={[styles.filterText, typeFilter === type && styles.filterTextActive]}>
              {type === 'all'
                ? (lang === 'ta' ? 'அனைத்தும்' : 'All')
                : (t('boat.types.' + type) || type)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} /> : (
        viewMode === 'map' ? (
          <MapView
            style={styles.map}
            mapType="none"
            initialRegion={{
              latitude: userLocation?.lat || 11.0,
              longitude: userLocation?.lng || 79.8,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }}
          >
            <UrlTile urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
            {userLocation && (
              <Marker coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}>
                <View style={styles.userMarker}><View style={styles.userMarkerDot} /></View>
              </Marker>
            )}
            {filtered.map(b => b.lastLocation && (
              <Marker
                key={b._id}
                coordinate={{ latitude: b.lastLocation.lat, longitude: b.lastLocation.lng }}
                title={b.name}
                description={b.registrationNo}
              >
                <View style={[styles.boatMarker, { backgroundColor: BOAT_TYPE_COLORS[b.type] || COLORS.primary }]}>
                  <Ionicons name="boat" size={14} color={COLORS.white} />
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderBoat}
            keyExtractor={i => i._id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="boat-outline" size={56} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>{lang === 'ta' ? 'படகுகள் எதுவும் காணப்படவில்லை' : 'No boats found'}</Text>
              </View>
            }
          />
        )
      )}
      {viewMode === 'map' && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {filtered.length} {lang === 'ta' ? 'படகுகள்' : 'boats'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  viewToggle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: 8, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  filterChip: { backgroundColor: COLORS.backgroundLight, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  filterTextActive: { color: COLORS.white, fontWeight: '700' },
  map: { flex: 1 },
  userMarker: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary + '44', justifyContent: 'center', alignItems: 'center' },
  userMarkerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  boatMarker: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', ...SHADOWS.sm },
  countBadge: { position: 'absolute', bottom: 24, left: SPACING.md, backgroundColor: COLORS.backgroundMid + 'EE', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  countText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  list: { padding: SPACING.md, gap: 12, paddingBottom: 40 },
  boatCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  boatTypeBar: { width: 5 },
  boatCardContent: { flex: 1, padding: SPACING.md },
  boatRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  boatIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  boatName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  boatReg: { fontSize: 12, color: COLORS.textSecondary },
  typePill: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  typePillText: { fontSize: 11, fontWeight: '600' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ownerText: { fontSize: 12, color: COLORS.textSecondary },
  ownerPhone: { fontSize: 12, color: COLORS.textMuted },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
});
