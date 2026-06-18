import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNetwork } from '../../store/NetworkContext';
import { useLanguage } from '../../store/LanguageContext';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { saveCatchOffline, getCachedBoats } from '../../db/helpers';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

// ─── Weight Unit Options ─────────────────────────────────────────────────────
const WEIGHT_UNITS = ['kg', 'quintal'];

// ─── Common Fish Species (quick-select) ─────────────────────────────────────
const COMMON_SPECIES = [
  { en: 'Tuna',     ta: 'சூரை' },
  { en: 'Sardine',  ta: 'மத்தி' },
  { en: 'Mackerel', ta: 'அயலை' },
  { en: 'Pomfret',  ta: 'வாவல்' },
  { en: 'Prawn',    ta: 'இறால்' },
  { en: 'Squid',    ta: 'கணவாய்' },
];

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ label, required }) => (
  <Text style={styles.fieldLabel}>
    {label}
    {required && <Text style={styles.required}> *</Text>}
  </Text>
);

// ═══════════════════════════════════════════════════════════════════════════════
//  CatchRecordScreen
// ═══════════════════════════════════════════════════════════════════════════════
export default function CatchRecordScreen({ navigation }) {
  const { isConnected } = useNetwork();
  const { t, lang } = useLanguage();

  // Boats State
  const [boats, setBoats] = useState([]);
  const [selectedBoat, setSelectedBoat] = useState(null);
  const [loadingBoats, setLoadingBoats] = useState(true);

  // Form State
  const [species,      setSpecies]      = useState('');
  const [tamilName,    setTamilName]    = useState('');
  const [quantity,     setQuantity]     = useState('');
  const [weight,       setWeight]       = useState('');
  const [weightUnit,   setWeightUnit]   = useState('kg');
  const [earnings,     setEarnings]     = useState('');
  const [catchDate,    setCatchDate]    = useState(
    new Date().toISOString().split('T')[0]
  );
  const [locationText, setLocationText] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [notes,        setNotes]        = useState('');

  // UI State
  const [submitting,       setSubmitting]       = useState(false);
  const [detectingLoc,     setDetectingLoc]     = useState(false);
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);

  // ── Fetch Registered Boats ────────────────────────────────────────────────
  useEffect(() => {
    const fetchBoats = async () => {
      setLoadingBoats(true);
      try {
        let list = [];
        if (isConnected) {
          const res = await api.get(ENDPOINTS.BOATS);
          list = res.data.data || [];
        } else {
          list = getCachedBoats() || [];
        }
        
        if (list.length === 0) {
          Alert.alert(
            t('catch.noBoatsTitle'),
            t('catch.noBoatsMsg'),
            [
              {
                text: t('catch.goToProfile'),
                onPress: () => {
                  // Navigate to Profile tab via parent bottom tab navigator
                  navigation.getParent()?.navigate('Profile');
                },
              },
              {
                text: t('common.cancel'),
                onPress: () => navigation.goBack(),
                style: 'cancel',
              },
            ],
            { cancelable: false }
          );
        } else {
          setBoats(list);
          setSelectedBoat(list[0]);
        }
      } catch (err) {
        console.warn('Fetch boats error in CatchRecord:', err);
        const cached = getCachedBoats() || [];
        if (cached.length === 0) {
          Alert.alert(
            t('catch.noBoatsFound'),
            t('catch.noBoatsFoundMsg'),
            [{ text: t('catch.goToProfile'), onPress: () => navigation.getParent()?.navigate('Profile') }],
            { cancelable: false }
          );
        } else {
          setBoats(cached);
          setSelectedBoat(cached[0]);
        }
      } finally {
        setLoadingBoats(false);
      }
    };
    fetchBoats();
  }, [isConnected]);

  // ── Auto-detect Location ───────────────────────────────────────────────────
  const detectLocation = async () => {
    setDetectingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('catch.permissionDenied'), t('catch.locationPermissionMsg'));
        setDetectingLoc(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      setLocationCoords({ latitude, longitude });

      // Reverse geocode
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        const parts = [geo.name, geo.city, geo.region].filter(Boolean);
        setLocationText(parts.join(', '));
      } else {
        setLocationText(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (err) {
      Alert.alert(t('catch.locationError'), t('catch.locationErrorMsg'));
    } finally {
      setDetectingLoc(false);
    }
  };

  // ── Select Species from quick-pick ─────────────────────────────────────────
  const selectSpecies = (item) => {
    setSpecies(item.en);
    setTamilName(item.ta);
    setShowSpeciesPicker(false);
  };

  // ── Validate Form ──────────────────────────────────────────────────────────
  const validate = () => {
    if (!selectedBoat) {
      Alert.alert(t('catch.validationTitle'), t('catch.valBoat'));
      return false;
    }
    if (!species.trim()) {
      Alert.alert(t('catch.validationTitle'), t('catch.valSpecies'));
      return false;
    }
    if (!weight.trim() || isNaN(parseFloat(weight))) {
      Alert.alert(t('catch.validationTitle'), t('catch.valWeight'));
      return false;
    }
    if (!quantity.trim() || isNaN(parseInt(quantity, 10))) {
      Alert.alert(t('catch.validationTitle'), t('catch.valQuantity'));
      return false;
    }
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      boatId: selectedBoat?._id || selectedBoat?.server_id || selectedBoat?.id || null,
      species: species.trim(),
      speciesTamil: tamilName.trim() || undefined,
      quantity: parseInt(quantity, 10),
      weight: parseFloat(weight),
      weightUnit,
      earnings: earnings ? parseFloat(earnings) : 0,
      catchDate,
      location: locationText.trim()
        ? {
            lat: locationCoords?.latitude ?? null,
            lng: locationCoords?.longitude ?? null,
            name: locationText.trim(),
          }
        : null,
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (isConnected) {
        await api.post(ENDPOINTS.CATCHES, payload);
        Alert.alert('✅ ' + t('catch.success'), t('catch.successMsg'), [
          { text: t('common.done'), onPress: () => navigation.goBack() },
        ]);
      } else {
        await saveCatchOffline(payload);
        Alert.alert(
          '📦 ' + t('catch.savedOfflineTitle'),
          t('catch.savedOfflineMsg'),
          [{ text: t('common.done'), onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      // Fallback: try offline save
      try {
        await saveCatchOffline(payload);
        Alert.alert(
          '📦 ' + t('catch.savedOfflineTitle'),
          t('catch.savedOfflineFallback'),
          [{ text: t('common.done'), onPress: () => navigation.goBack() }]
        );
      } catch {
        Alert.alert(t('common.error'), t('catch.valError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBoats) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>{t('catch.checkingBoats')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('catch.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Offline indicator */}
      {!isConnected && (
        <View style={styles.offlinePill}>
          <Ionicons name="cloud-offline-outline" size={12} color="#78350F" />
          <Text style={styles.offlinePillText}>{t('catch.offlinePill')}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Boat Selection ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="boat" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>{t('catch.boatSelection')}</Text>
          </View>

          <SectionLabel label={t('catch.selectBoat')} required />
          <View style={styles.boatSelectorWrap}>
            {boats.map((boat) => {
              const isSel = selectedBoat?.registrationNo === boat.registrationNo || selectedBoat?.registration_no === boat.registration_no;
              return (
                <TouchableOpacity
                  key={boat._id || boat.id}
                  style={[
                    styles.boatChip,
                    isSel && styles.boatChipActive,
                  ]}
                  onPress={() => setSelectedBoat(boat)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="boat-outline"
                    size={18}
                    color={isSel ? '#fff' : COLORS.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.boatChipName,
                        isSel && styles.boatChipNameActive,
                      ]}
                    >
                      {boat.name}
                    </Text>
                    <Text
                      style={[
                        styles.boatChipReg,
                        isSel && styles.boatChipRegActive,
                      ]}
                    >
                      {boat.registrationNo || boat.registration_no}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Fish Species ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="fish" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>{t('catch.fishDetails')}</Text>
          </View>

          <SectionLabel label={t('catch.speciesName')} required />
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('catch.speciesPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={species}
              onChangeText={setSpecies}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={styles.quickPickBtn}
              onPress={() => setShowSpeciesPicker((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name={showSpeciesPicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Quick Species Picker */}
          {showSpeciesPicker && (
            <View style={styles.speciesPicker}>
              {COMMON_SPECIES.map((item) => (
                <TouchableOpacity
                  key={item.en}
                  style={styles.speciesChip}
                  onPress={() => selectSpecies(item)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.speciesChipEn}>{item.en}</Text>
                  <Text style={styles.speciesChipTa}>{item.ta}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <SectionLabel label={t('catch.tamilName')} />
          <TextInput
            style={styles.input}
            placeholder={t('catch.tamilPlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            value={tamilName}
            onChangeText={setTamilName}
          />
        </View>

        {/* ── Quantity & Weight ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="scale" size={18} color="#10B981" />
            <Text style={styles.cardTitle}>{t('catch.weightLabel')}</Text>
          </View>

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <SectionLabel label={t('catch.quantity')} required />
              <TextInput
                style={styles.input}
                placeholder={t('catch.quantityPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: SPACING.md }} />
            <View style={{ flex: 1 }}>
              <SectionLabel label={t('catch.weightLabel')} required />
              <TextInput
                style={styles.input}
                placeholder={t('catch.weightPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Weight Unit Selector */}
          <SectionLabel label={t('catch.weightUnit')} />
          <View style={styles.unitSelector}>
            {WEIGHT_UNITS.map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[styles.unitBtn, weightUnit === unit && styles.unitBtnActive]}
                onPress={() => setWeightUnit(unit)}
                activeOpacity={0.8}
              >
                <Text style={[styles.unitBtnText, weightUnit === unit && styles.unitBtnTextActive]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Earnings ─────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash" size={18} color="#F59E0B" />
            <Text style={styles.cardTitle}>{t('catch.earnings')}</Text>
          </View>

          <SectionLabel label={t('catch.amountEarned')} />
          <View style={styles.inputRow}>
            <View style={styles.currencyPrefix}>
              <Text style={styles.currencyText}>₹</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputPrefixed]}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              value={earnings}
              onChangeText={setEarnings}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* ── Date & Location ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={18} color="#EC4899" />
            <Text style={styles.cardTitle}>{t('catch.dateLocation')}</Text>
          </View>

          <SectionLabel label={t('catch.catchDate')} />
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
            value={catchDate}
            onChangeText={setCatchDate}
            keyboardType={Platform.OS === 'android' ? 'default' : 'numbers-and-punctuation'}
          />

          <SectionLabel label={t('catch.location')} />
          <View style={styles.locationRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('catch.locationPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={locationText}
              onChangeText={setLocationText}
            />
            <TouchableOpacity
              style={styles.locBtn}
              onPress={detectLocation}
              disabled={detectingLoc}
              activeOpacity={0.8}
            >
              {detectingLoc ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="locate" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          {locationCoords && (
            <Text style={styles.coordText}>
              📍 {locationCoords.latitude.toFixed(5)}, {locationCoords.longitude.toFixed(5)}
            </Text>
          )}
        </View>

        {/* ── Notes ─────────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={18} color="#8B5CF6" />
            <Text style={styles.cardTitle}>{t('catch.additionalNotes')}</Text>
          </View>

          <SectionLabel label={t('catch.notesOptional')} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('catch.notesPlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── Submit Button ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={isConnected ? 'cloud-upload' : 'save'} size={20} color="#fff" />
              <Text style={styles.submitBtnText}>
                {isConnected ? t('catch.submit') : t('catch.saveOffline')}
              </Text>
            </>
          )}
        </TouchableOpacity>

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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Offline Pill
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingVertical: 5,
    paddingHorizontal: SPACING.md,
  },
  offlinePillText: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '600',
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },

  // Boat selection styling
  boatSelectorWrap: {
    gap: 10,
    marginTop: 6,
  },
  boatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  boatChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  boatChipName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  boatChipNameActive: {
    color: '#fff',
  },
  boatChipReg: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  boatChipRegActive: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Form Fields
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  inputPrefixed: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeftWidth: 0,
  },
  textArea: {
    minHeight: 90,
    paddingTop: SPACING.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowFields: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  // Quick Species Picker
  quickPickBtn: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopRightRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
    borderLeftWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speciesPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  speciesChip: {
    backgroundColor: COLORS.primary + '22',
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
    borderRadius: RADIUS.sm,
    paddingVertical: 5,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
  },
  speciesChipEn: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  speciesChipTa: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },

  // Unit Selector
  unitSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  unitBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  unitBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  unitBtnTextActive: {
    color: '#fff',
  },

  // Currency
  currencyPrefix: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: RADIUS.md,
    borderBottomLeftRadius: RADIUS.md,
    height: 48,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0,
  },
  currencyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  locBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  coordText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },

  // Submit
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    ...SHADOWS.medium,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
