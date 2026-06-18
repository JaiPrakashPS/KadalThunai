import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Vibration,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useNetwork } from '../../store/NetworkContext';
import { useAuth } from '../../store/AuthContext';
import { useLanguage } from '../../store/LanguageContext';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { saveSOSOffline } from '../../db/helpers';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

// ─── Emergency Types ──────────────────────────────────────────────────────────
const EMERGENCY_TYPES = [
  { id: 'medical',   label: 'Medical Emergency', icon: 'medkit',          color: '#EF4444' },
  { id: 'breakdown', label: 'Boat Breakdown',     icon: 'boat',            color: '#F59E0B' },
  { id: 'weather',   label: 'Severe Weather',     icon: 'thunderstorm',    color: '#8B5CF6' },
  { id: 'capsized',  label: 'Capsized / Sinking', icon: 'water',           color: '#3B82F6' },
  { id: 'fire',      label: 'Fire on Board',      icon: 'flame',           color: '#F97316' },
  { id: 'other',     label: 'Other Emergency',    icon: 'alert-circle',    color: '#94A3B8' },
];

// ─── Coastguard Contact Info ──────────────────────────────────────────────────
const COASTGUARD_CONTACTS = [
  { label: 'Indian Coast Guard',  number: '1554',       icon: 'shield' },
  { label: 'National Emergency',  number: '112',        icon: 'call'   },
  { label: 'Fishermen Helpline',  number: '1800-425-6567', icon: 'headset' },
];

// ─── Hold Duration (ms) ───────────────────────────────────────────────────────
const HOLD_DURATION = 3000;
const HOLD_INTERVAL = 50;

// ═══════════════════════════════════════════════════════════════════════════════
//  SOSScreen
// ═══════════════════════════════════════════════════════════════════════════════
export default function SOSScreen({ navigation }) {
  const { isConnected } = useNetwork();
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  // ── State ──────────────────────────────────────────────────────────────────
  const [location,        setLocation]        = useState(null);
  const [locLoading,      setLocLoading]       = useState(true);
  const [emergencyType,   setEmergencyType]    = useState(EMERGENCY_TYPES[0]);
  const [isHolding,       setIsHolding]        = useState(false);
  const [holdProgress,    setHoldProgress]     = useState(0); // 0–100
  const [sosConfirmed,    setSosConfirmed]      = useState(false);
  const [submitting,      setSubmitting]        = useState(false);
  const [secondsLeft,     setSecondsLeft]       = useState(3);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const holdTimer        = useRef(null);
  const progressInterval = useRef(null);
  const pulseAnim        = useRef(new Animated.Value(1)).current;
  const pulseOpacity     = useRef(new Animated.Value(0.6)).current;
  const ringScale        = useRef(new Animated.Value(1)).current;
  const ringOpacity      = useRef(new Animated.Value(1)).current;
  const confirmScale     = useRef(new Animated.Value(0)).current;
  const holdProgressAnim = useRef(new Animated.Value(0)).current;

  // ── Location on Mount ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLocLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation(loc.coords);
      } catch {}
      setLocLoading(false);
    })();
  }, []);

  // ── Pulse Animation (idle ring) ────────────────────────────────────────────
  useEffect(() => {
    if (sosConfirmed) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1.6, duration: 900, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1,   duration: 0,   useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 1,   duration: 0,   useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sosConfirmed]);

  // ── Confirm Bounce ─────────────────────────────────────────────────────────
  const playConfirmAnimation = () => {
    Animated.spring(confirmScale, {
      toValue: 1,
      tension: 80,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // ── Start Hold ─────────────────────────────────────────────────────────────
  const startHold = () => {
    if (sosConfirmed || submitting) return;
    setIsHolding(true);
    setHoldProgress(0);
    setSecondsLeft(3);

    let elapsed = 0;
    Vibration.vibrate(50);

    progressInterval.current = setInterval(() => {
      elapsed += HOLD_INTERVAL;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(pct);
      const secs = Math.max(Math.ceil(3 - (elapsed / 1000)), 0);
      setSecondsLeft(secs);

      if (elapsed >= HOLD_DURATION) {
        clearInterval(progressInterval.current);
        triggerSOS();
      }
    }, HOLD_INTERVAL);
  };

  // ── End Hold (released early) ──────────────────────────────────────────────
  const endHold = () => {
    if (sosConfirmed) return;
    setIsHolding(false);
    setHoldProgress(0);
    setSecondsLeft(3);
    clearInterval(progressInterval.current);
    Vibration.cancel();
  };

  // ── Trigger SOS ───────────────────────────────────────────────────────────
  const triggerSOS = async () => {
    Vibration.vibrate([100, 100, 100, 100, 300]);
    setSubmitting(true);

    const payload = {
      emergency_type: emergencyType.id,
      latitude:       location?.latitude  ?? null,
      longitude:      location?.longitude ?? null,
      user_id:        user?.id            ?? null,
      user_name:      user?.name          ?? 'Unknown',
      timestamp:      new Date().toISOString(),
    };

    try {
      if (isConnected) {
        await api.post(ENDPOINTS.SOS, payload);
      } else {
        await saveSOSOffline(payload);
      }
    } catch {
      try {
        await saveSOSOffline(payload);
      } catch {}
    } finally {
      setSubmitting(false);
      setIsHolding(false);
      setSosConfirmed(true);
      playConfirmAnimation();
    }
  };

  // ── Cancel SOS ────────────────────────────────────────────────────────────
  const handleCancel = () => {
    Alert.alert(
      t('sos.cancelTitle'),
      t('sos.cancelMsg'),
      [
        { text: t('sos.cancelNo'), style: 'cancel' },
        {
          text: t('sos.cancelYes'),
          style: 'destructive',
          onPress: () => {
            setSosConfirmed(false);
            setHoldProgress(0);
            confirmScale.setValue(0);
          },
        },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Derived values
  // ─────────────────────────────────────────────────────────────────────────
  const gradientColors = sosConfirmed
    ? ['#1a0000', '#3B0000', '#1a0000']
    : isHolding
    ? ['#1a0010', '#2D0000', '#0A1628']
    : ['#0A1628', '#0F2044', '#0A1628'];

  const circumference = 2 * Math.PI * 88; // r=88
  const strokeDash    = (holdProgress / 100) * circumference;

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isHolding}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={styles.headerWrap}>
            <Text style={styles.screenTitle}>{t('sos.title')}</Text>
            <Text style={styles.screenSubtitle}>
              {sosConfirmed
                ? t('sos.subtitleSent')
                : t('sos.subtitleHold')}
            </Text>
          </View>

          {/* ── Connectivity Banner ───────────────────────────────────────── */}
          {!isConnected && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={14} color="#78350F" />
              <Text style={styles.offlineBannerText}>{t('sos.pendingSync')}</Text>
            </View>
          )}

          {/* ── SOS Button Section ────────────────────────────────────────── */}
          <View style={styles.sosBtnSection}>
            {/* Pulsing ring */}
            {!sosConfirmed && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: ringScale }],
                    opacity: ringOpacity,
                    borderColor: isHolding ? '#FF3300' : '#EF444466',
                  },
                ]}
              />
            )}

            {/* Main SOS circle */}
            {sosConfirmed ? (
              // ── Confirmed State ──────────────────────────────────────────
              <Animated.View
                style={[
                  styles.sosCircle,
                  styles.sosCircleConfirmed,
                  { transform: [{ scale: confirmScale }] },
                ]}
              >
                <Ionicons name="checkmark-circle" size={64} color="#fff" />
                <Text style={styles.sosCircleConfirmedText}>{t('sos.sent')}</Text>
              </Animated.View>
            ) : (
              // ── Hold Button ──────────────────────────────────────────────
              <TouchableOpacity
                style={[styles.sosCircle, isHolding && styles.sosCircleHolding]}
                onPressIn={startHold}
                onPressOut={endHold}
                activeOpacity={1}
              >
                {/* SVG-style progress ring via border trick */}
                {isHolding && (
                  <View style={styles.progressRingWrap} pointerEvents="none">
                    <View
                      style={[
                        styles.progressArc,
                        { borderTopColor: '#FF3300', transform: [{ rotate: `${(holdProgress * 3.6)}deg` }] },
                      ]}
                    />
                  </View>
                )}

                {submitting ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.sosLabel}>{t('sos.button')}</Text>
                    {isHolding ? (
                      <Text style={styles.sosCountdown}>{secondsLeft}</Text>
                    ) : (
                      <Text style={styles.sosSubLabel}>{t('sos.hold')}</Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── Confirm / Cancel ─────────────────────────────────────────── */}
          {sosConfirmed && (
            <View style={styles.confirmedSection}>
              <View style={styles.helpOnWayCard}>
                <Ionicons name="shield-checkmark" size={28} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.helpOnWayTitle}>{t('sos.helpOnWay')}</Text>
                  <Text style={styles.helpOnWayDesc}>
                    {t('sos.sentMsg')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.cancelSosBtn} onPress={handleCancel} activeOpacity={0.8}>
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.cancelSosBtnText}>{t('sos.cancelAlert')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Emergency Type Picker ─────────────────────────────────────── */}
          {!sosConfirmed && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('sos.emergencyType')}</Text>
              <View style={styles.emergencyGrid}>
                {EMERGENCY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.emergencyChip,
                      emergencyType.id === type.id && { borderColor: type.color, backgroundColor: type.color + '22' },
                    ]}
                    onPress={() => setEmergencyType(type)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={type.icon} size={18} color={emergencyType.id === type.id ? type.color : COLORS.textMuted} />
                    <Text
                      style={[
                        styles.emergencyChipText,
                        emergencyType.id === type.id && { color: type.color, fontWeight: '700' },
                      ]}
                    >
                      {t('sos.types.' + type.id)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── GPS Coordinates ───────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sos.yourLocation')}</Text>
            <View style={styles.locationCard}>
              <View style={styles.locationIconWrap}>
                <Ionicons name="location" size={22} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                {locLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : location ? (
                  <>
                    <Text style={styles.coordMain}>
                      {location.latitude.toFixed(5)}°N, {location.longitude.toFixed(5)}°E
                    </Text>
                    <Text style={styles.coordSub}>
                      {t('sos.accuracy')}: ±{Math.round(location.accuracy ?? 0)}m
                    </Text>
                  </>
                ) : (
                  <Text style={styles.coordMain}>{t('sos.locationUnavailable')}</Text>
                )}
              </View>
              <View
                style={[
                  styles.locStatusDot,
                  { backgroundColor: location ? '#10B981' : '#EF4444' },
                ]}
              />
            </View>
          </View>

          {/* ── Emergency Contacts ────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sos.emergencyContacts')}</Text>
            {COASTGUARD_CONTACTS.map((contact, idx) => {
              const contactKey = idx === 0 ? 'coastguard' : idx === 1 ? 'national' : 'helpline';
              return (
                <View key={idx} style={styles.contactCard}>
                  <View style={styles.contactIconWrap}>
                    <Ionicons name={contact.icon} size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactLabel}>{t('sos.contacts.' + contactKey)}</Text>
                    <Text style={styles.contactNumber}>{contact.number}</Text>
                  </View>
                  <Ionicons name="call-outline" size={18} color="#10B981" />
                </View>
              );
            })}
          </View>

          {/* ── Safety Tips ───────────────────────────────────────────────── */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={16} color="#F59E0B" />
              <Text style={styles.tipsTitleText}>{t('sos.safetyTips.title')}</Text>
            </View>
            <Text style={styles.tipText}>• {t('sos.safetyTips.tip1')}</Text>
            <Text style={styles.tipText}>• {t('sos.safetyTips.tip2')}</Text>
            <Text style={styles.tipText}>• {t('sos.safetyTips.tip3')}</Text>
            <Text style={styles.tipText}>• {t('sos.safetyTips.tip4')}</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  gradient: {
    flex: 1,
  },

  // Back Button
  backBtn: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15,32,68,0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: SPACING.xl + 30,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 20,
  },

  // Header
  headerWrap: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  screenTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  screenSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Offline Banner
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  offlineBannerText: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '600',
  },

  // SOS Button
  sosBtnSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    height: 240,
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
  },
  sosCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#CC0000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FF4444',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  sosCircleHolding: {
    backgroundColor: '#FF0000',
    shadowOpacity: 1,
    shadowRadius: 50,
    transform: [{ scale: 1.05 }],
  },
  sosCircleConfirmed: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
    shadowColor: '#10B981',
    shadowOpacity: 0.9,
  },
  sosCircleConfirmedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 3,
  },
  sosLabel: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 4,
    lineHeight: 48,
  },
  sosSubLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  sosCountdown: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    marginTop: -4,
  },
  progressRingWrap: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressArc: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 102,
    borderWidth: 6,
    borderColor: 'transparent',
  },

  // Confirmed
  confirmedSection: {
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  helpOnWayCard: {
    backgroundColor: '#10B98122',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  helpOnWayTitle: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  helpOnWayDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  cancelSosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#EF444466',
    backgroundColor: '#EF444411',
  },
  cancelSosBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },

  // Section
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },

  // Emergency Type Grid
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  emergencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  emergencyChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  // Location Card
  locationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF444422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordMain: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  coordSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  locStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Contacts
  contactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactNumber: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },

  // Tips
  tipsCard: {
    backgroundColor: '#F59E0B11',
    borderWidth: 1,
    borderColor: '#F59E0B44',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  tipsTitleText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  tipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
});
