import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.72;
const NEEDLE_LEN   = COMPASS_SIZE * 0.38;

// ─── Math helpers ─────────────────────────────────────────────────────────────
const toRad  = (deg) => (deg * Math.PI) / 180;
const toDeg  = (rad) => (rad * 180) / Math.PI;

function getBearing(from, to) {
  const φ1 = toRad(from.latitude);
  const φ2 = toRad(to.latitude);
  const Δλ = toRad(to.longitude - from.longitude);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function getDistance(from, to) {
  const R = 6371;
  const dφ = toRad(to.latitude  - from.latitude);
  const dλ = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const HOME_PORT = { latitude: 8.4869, longitude: 76.9521 }; // Thiruvananthapuram coast

const CARDINAL_LABELS = [
  { label: 'N',  deg: 0,   major: true,  color: '#EF4444' },
  { label: 'NE', deg: 45,  major: false, color: '#94A3B8' },
  { label: 'E',  deg: 90,  major: true,  color: '#F1F5F9' },
  { label: 'SE', deg: 135, major: false, color: '#94A3B8' },
  { label: 'S',  deg: 180, major: true,  color: '#F1F5F9' },
  { label: 'SW', deg: 225, major: false, color: '#94A3B8' },
  { label: 'W',  deg: 270, major: true,  color: '#F1F5F9' },
  { label: 'NW', deg: 315, major: false, color: '#94A3B8' },
];

const TICK_COUNT = 72; // tick every 5°

// ─── Compass Rose (pure View) ─────────────────────────────────────────────────
const CompassRose = ({ heading, bearingToDest, hasDest }) => {
  const { t } = useLanguage();
  const R = COMPASS_SIZE / 2;
  const LABEL_R = R - 28;
  const TICK_R  = R - 10;

  return (
    <View style={{ width: COMPASS_SIZE, height: COMPASS_SIZE }}>
      {/* Outer ring */}
      <View style={[styles.compassOuter, { width: COMPASS_SIZE, height: COMPASS_SIZE, borderRadius: R }]} />

      {/* Tick marks */}
      {Array.from({ length: TICK_COUNT }).map((_, i) => {
        const angle = (i * 5 - heading + 360) % 360;
        const rad   = toRad(angle - 90);
        const isMajor = i % 9 === 0; // every 45°
        const isMed   = i % 3 === 0;
        const tickLen = isMajor ? 14 : isMed ? 9 : 5;
        const x1 = R + TICK_R * Math.cos(rad);
        const y1 = R + TICK_R * Math.sin(rad);
        const x2 = R + (TICK_R - tickLen) * Math.cos(rad);
        const y2 = R + (TICK_R - tickLen) * Math.sin(rad);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x2,
              top: y2,
              width: x1 - x2 || 1,
              height: y1 - y2 || 1,
              backgroundColor: isMajor ? '#60A5FA' : isMed ? '#1E3A5F' : '#1E3A5F88',
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}

      {/* Cardinal labels */}
      {CARDINAL_LABELS.map(({ label, deg, major, color }) => {
        const angle = (deg - heading + 360) % 360;
        const rad   = toRad(angle - 90);
        const lx    = R + LABEL_R * Math.cos(rad) - (major ? 10 : 8);
        const ly    = R + LABEL_R * Math.sin(rad) - (major ? 10 : 8);
        return (
          <Text
            key={label}
            style={[
              styles.cardinalLabel,
              {
                position: 'absolute',
                left: lx,
                top: ly,
                fontSize: major ? 16 : 12,
                fontWeight: major ? '800' : '600',
                color,
              },
            ]}
          >
            {t('compass.cardinal.' + label)}
          </Text>
        );
      })}

      {/* Center circle */}
      <View style={styles.compassCenter}>
        <View style={styles.compassInnerCircle} />
      </View>

      {/* North needle */}
      <View
        style={[
          styles.needle,
          styles.needleNorth,
          {
            position: 'absolute',
            left: R - 2,
            top: R - NEEDLE_LEN,
            height: NEEDLE_LEN,
            transform: [{ rotate: `${-heading}deg` }, { translateX: -2 }, { translateY: 0 }],
            transformOrigin: `2px ${NEEDLE_LEN}px`,
          },
        ]}
      />
      {/* South needle */}
      <View
        style={[
          styles.needle,
          styles.needleSouth,
          {
            position: 'absolute',
            left: R - 2,
            top: R,
            height: NEEDLE_LEN * 0.7,
            transform: [{ rotate: `${-heading}deg` }, { translateX: -2 }, { translateY: 0 }],
            transformOrigin: `2px 0px`,
          },
        ]}
      />

      {/* Destination bearing arrow */}
      {hasDest && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: R,
            top: R,
            width: 0,
            height: 0,
          }}
        >
          <View
            style={[
              styles.bearingArrow,
              {
                transform: [
                  { rotate: `${(bearingToDest - heading + 360) % 360}deg` },
                ],
              },
            ]}
          >
            <View style={styles.bearingArrowLine} />
            <View style={styles.bearingArrowHead} />
          </View>
        </View>
      )}
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CompassScreen() {
  const { t, lang } = useLanguage();
  const headingAnim = useRef(new Animated.Value(0)).current;
  const prevHeadingRef = useRef(0);

  const [heading, setHeading]           = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination]   = useState(null);
  const [destLabel, setDestLabel]       = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [inputLat, setInputLat]         = useState('');
  const [inputLng, setInputLng]         = useState('');
  const [inputLabel, setInputLabel]     = useState('');
  const [sensorAvail, setSensorAvail]   = useState(true);

  // Derived
  const bearingToDest = destination && userLocation
    ? getBearing(userLocation, destination)
    : null;

  const distanceToDest = destination && userLocation
    ? getDistance(userLocation, destination)
    : null;

  // ── Location ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    })();
  }, []);

  // ── Magnetometer ──────────────────────────────────────────────────────────
  useEffect(() => {
    let sub;
    (async () => {
      const avail = await Magnetometer.isAvailableAsync();
      if (!avail) { setSensorAvail(false); return; }
      setSensorAvail(true);
      Magnetometer.setUpdateInterval(100);
      sub = Magnetometer.addListener(({ x, y }) => {
        let deg = Math.atan2(y, x) * (180 / Math.PI);
        deg = (deg + 360) % 360;

        // Smooth wrap-around
        let diff = deg - prevHeadingRef.current;
        if (diff > 180)  diff -= 360;
        if (diff < -180) diff += 360;
        const smooth = prevHeadingRef.current + diff;
        prevHeadingRef.current = smooth;

        Animated.spring(headingAnim, {
          toValue: smooth,
          useNativeDriver: false,
          tension: 80,
          friction: 10,
        }).start();
        setHeading(Math.round(((smooth % 360) + 360) % 360));
      });
    })();
    return () => sub?.remove();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDirectionLabel = (deg) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const label = dirs[Math.round(deg / 22.5) % 16];
    return t('compass.directions.' + label);
  };

  const setHomePort = () => {
    setDestination(HOME_PORT);
    setDestLabel(t('compass.homePort'));
    setModalVisible(false);
  };

  const confirmDestination = () => {
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);
    if (isNaN(lat) || isNaN(lng)) return;
    setDestination({ latitude: lat, longitude: lng });
    setDestLabel(inputLabel || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setInputLat(''); setInputLng(''); setInputLabel('');
    setModalVisible(false);
  };

  const clearDestination = () => {
    setDestination(null);
    setDestLabel('');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>{t('compass.title')}</Text>
            <Text style={styles.screenSub}>
              {sensorAvail ? t('compass.liveSensor') : t('compass.mockSensor')}
            </Text>
          </View>
          {!sensorAvail && (
            <View style={styles.mockBadge}>
              <Ionicons name="warning-outline" size={12} color="#F59E0B" />
              <Text style={styles.mockBadgeText}>{t('compass.mock')}</Text>
            </View>
          )}
        </View>

        {/* ── Heading display ───────────────────────────────────────────── */}
        <View style={styles.headingBox}>
          <Text style={styles.headingDeg}>{heading}°</Text>
          <Text style={styles.headingDir}>{getDirectionLabel(heading)}</Text>
        </View>

        {/* ── Compass rose ──────────────────────────────────────────────── */}
        <View style={styles.compassWrap}>
          <CompassRose
            heading={heading}
            bearingToDest={bearingToDest ?? 0}
            hasDest={!!destination}
          />
        </View>

        {/* ── Destination info ──────────────────────────────────────────── */}
        {destination ? (
          <View style={styles.destCard}>
            <View style={styles.destHeader}>
              <Ionicons name="location" size={18} color="#F59E0B" />
              <Text style={styles.destTitle} numberOfLines={1}>{destLabel}</Text>
              <TouchableOpacity onPress={clearDestination} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <View style={styles.destStats}>
              <View style={styles.destStat}>
                <Text style={styles.destStatLabel}>{t('compass.bearing')}</Text>
                <Text style={styles.destStatValue}>
                  {bearingToDest !== null ? `${Math.round(bearingToDest)}°` : '--'}
                </Text>
              </View>
              <View style={styles.destStatDivider} />
              <View style={styles.destStat}>
                <Text style={styles.destStatLabel}>{t('compass.distance')}</Text>
                <Text style={styles.destStatValue}>
                  {distanceToDest !== null
                    ? distanceToDest < 1
                      ? `${Math.round(distanceToDest * 1000)} m`
                      : `${distanceToDest.toFixed(1)} km`
                    : '--'}
                </Text>
              </View>
              <View style={styles.destStatDivider} />
              <View style={styles.destStat}>
                <Text style={styles.destStatLabel}>{t('compass.direction')}</Text>
                <Text style={styles.destStatValue}>
                  {bearingToDest !== null ? getDirectionLabel(bearingToDest) : '--'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noDestCard}>
            <Ionicons name="navigate-circle-outline" size={24} color="#1E3A5F" />
            <Text style={styles.noDestText}>{t('compass.noDest')}</Text>
          </View>
        )}

        {/* ── Action buttons ─────────────────────────────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.homePortBtn}
            onPress={setHomePort}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={18} color="#0066CC" />
            <Text style={styles.homePortBtnText}>{t('compass.returnHome')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.setDestBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#F1F5F9" />
            <Text style={styles.setDestBtnText}>{t('compass.setDestination')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Calibration tip ───────────────────────────────────────────── */}
        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={16} color="#60A5FA" />
          <Text style={styles.tipText}>
            {t('compass.calibrationTip')}
          </Text>
        </View>
      </ScrollView>

      {/* ── Set Destination Modal ────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('compass.setDestination')}</Text>

            <TextInput
              style={styles.input}
              placeholder={t('compass.modalLabelPlaceholder')}
              placeholderTextColor="#94A3B8"
              value={inputLabel}
              onChangeText={setInputLabel}
            />
            <TextInput
              style={styles.input}
              placeholder={t('compass.modalLatPlaceholder')}
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={inputLat}
              onChangeText={setInputLat}
            />
            <TextInput
              style={styles.input}
              placeholder={t('compass.modalLngPlaceholder')}
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={inputLng}
              onChangeText={setInputLng}
            />

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmDestination} activeOpacity={0.8}>
              <Text style={styles.modalConfirmText}>{t('compass.setDestination')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  mockBadge: {
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
  mockBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },

  // Heading display
  headingBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headingDeg: {
    color: '#F1F5F9',
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
  },
  headingDir: {
    color: '#0066CC',
    fontSize: 22,
    fontWeight: '700',
    marginTop: -4,
  },

  // Compass
  compassWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  compassOuter: {
    position: 'absolute',
    backgroundColor: '#0F2044',
    borderWidth: 2,
    borderColor: '#1E3A5F',
  },
  compassCenter: {
    position: 'absolute',
    left: COMPASS_SIZE / 2 - 18,
    top: COMPASS_SIZE / 2 - 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A1628',
    borderWidth: 2,
    borderColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  compassInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0066CC',
  },
  cardinalLabel: {
    fontFamily: undefined,
  },
  needle: {
    position: 'absolute',
    width: 4,
    borderRadius: 2,
    zIndex: 5,
  },
  needleNorth: {
    backgroundColor: '#EF4444',
  },
  needleSouth: {
    backgroundColor: '#94A3B8',
  },
  bearingArrow: {
    position: 'absolute',
    alignItems: 'center',
    bottom: 0,
  },
  bearingArrowLine: {
    width: 2,
    height: NEEDLE_LEN * 0.9,
    backgroundColor: '#F59E0B',
    borderRadius: 1,
  },
  bearingArrowHead: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F59E0B',
  },

  // Destination card
  destCard: {
    width: '100%',
    backgroundColor: '#0F2044',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B44',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  destHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  destTitle: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  clearBtn: {
    padding: 2,
  },
  destStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  destStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#1E3A5F',
  },
  destStatLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  destStatValue: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
  },
  noDestCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F2044',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderStyle: 'dashed',
    paddingVertical: 16,
    marginBottom: 14,
  },
  noDestText: {
    color: '#1E3A5F',
    fontSize: 14,
    fontWeight: '500',
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 14,
  },
  homePortBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0066CC22',
    borderColor: '#0066CC55',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
  },
  homePortBtnText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '700',
  },
  setDestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0066CC',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  setDestBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Tip
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#60A5FA11',
    borderColor: '#60A5FA33',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: '100%',
  },
  tipText: {
    color: '#94A3B8',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0F2044',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
    padding: 20,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E3A5F',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#0A1628',
    borderColor: '#1E3A5F',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F1F5F9',
    fontSize: 14,
    marginBottom: 10,
  },
  modalConfirmBtn: {
    backgroundColor: '#0066CC',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
