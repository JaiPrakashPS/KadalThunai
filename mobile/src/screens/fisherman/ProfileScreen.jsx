import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../store/AuthContext';
import { useNetwork } from '../../store/NetworkContext';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { useLanguage } from '../../store/LanguageContext';
import { cacheBoats, getCachedBoats } from '../../db/helpers';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const INFO_ITEMS = [
  { key: 'email', icon: 'mail-outline', label: { en: 'Email', ta: 'மின்னஞ்சல்' } },
  { key: 'phone', icon: 'call-outline', label: { en: 'Phone', ta: 'தொலைபேசி' } },
  { key: 'role', icon: 'person-circle-outline', label: { en: 'Role', ta: 'பங்கு' } },
];

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { isConnected } = useNetwork();
  const { lang, changeLanguage } = useLanguage();
  
  const [profile, setProfile] = useState(null);
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Boat Registration Form State
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [boatSubmitting, setBoatSubmitting] = useState(false);
  const [boatForm, setBoatForm] = useState({
    name: '',
    registrationNo: '',
    type: 'motorized',
    capacity: '',
    engineNo: '',
  });

  const L = {
    en: {
      title: 'Profile', myProfile: 'My Profile', personalInfo: 'Personal Information',
      licenseInfo: 'License & Boat', officerInfo: 'Officer Details', settings: 'Settings',
      language: 'Language', logout: 'Logout', editProfile: 'Edit Profile',
      noLicense: 'No license info', noBoat: 'No boat registered',
      license: 'License No', expiry: 'Expiry', village: 'Village', district: 'District',
      designation: 'Designation', badge: 'Badge No', changePass: 'Change Password',
      english: 'English', tamil: 'Tamil',
      boatsTitle: 'Registered Boats', noBoats: 'No boats registered yet.',
      addBoat: 'Register Boat', boatName: 'Boat Name *', boatReg: 'Registration No *',
      boatType: 'Boat Type', boatCap: 'Crew Capacity', boatEng: 'Engine Number',
      cancel: 'Cancel', register: 'Register',
    },
    ta: {
      title: 'சுயவிவரம்', myProfile: 'என் சுயவிவரம்', personalInfo: 'தனிப்பட்ட தகவல்',
      licenseInfo: 'உரிமம் & படகு', officerInfo: 'அதிகாரி விவரம்', settings: 'அமைப்புகள்',
      language: 'மொழி', logout: 'வெளியேறு', editProfile: 'திருத்து',
      noLicense: 'உரிம தகவல் இல்லை', noBoat: 'படகு பதிவு இல்லை',
      license: 'உரிம எண்', expiry: 'காலாவதி', village: 'கிராமம்', district: 'மாவட்டம்',
      designation: 'பதவி', badge: 'பேட்ஜ் எண்', changePass: 'கடவுச்சொல் மாற்று',
      english: 'ஆங்கிலம்', tamil: 'தமிழ்',
      boatsTitle: 'பதிவுசெய்யப்பட்ட படகுகள்', noBoats: 'படகுகள் எதுவும் பதிவு செய்யப்படவில்லை.',
      addBoat: 'படகு பதிவு செய்', boatName: 'படகு பெயர் *', boatReg: 'பதிவு எண் *',
      boatType: 'படகு வகை', boatCap: 'ஊழியர்கள் கொள்ளளவு', boatEng: 'இயந்திர எண்',
      cancel: 'ரத்து', register: 'பதிவு செய்',
    },
  }[lang];

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      if (isConnected) {
        const [profileRes, boatsRes] = await Promise.all([
          api.get(ENDPOINTS.MY_PROFILE),
          api.get(ENDPOINTS.BOATS),
        ]);
        setProfile(profileRes.data.data);
        const fetchedBoats = boatsRes.data.data || [];
        setBoats(fetchedBoats);
        cacheBoats(fetchedBoats); // Update SQLite cache
      } else {
        // Fetch offline details
        const cached = getCachedBoats();
        setBoats(cached || []);
      }
    } catch (e) {
      console.warn('Profile load error:', e.message);
      const cached = getCachedBoats();
      setBoats(cached || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const switchLang = async (newLang) => {
    await changeLanguage(newLang);
    if (user) {
      try { await api.put(ENDPOINTS.MY_PROFILE, { preferredLanguage: newLang }); } catch {}
    }
  };

  const handleLogout = () => {
    Alert.alert(
      lang === 'ta' ? 'வெளியேறுகிறீர்களா?' : 'Logout?',
      lang === 'ta' ? 'உறுதிப்படுத்துக' : 'Are you sure you want to logout?',
      [
        { text: lang === 'ta' ? 'ரத்து' : 'Cancel', style: 'cancel' },
        { text: lang === 'ta' ? 'வெளியேறு' : 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleRegisterBoat = async () => {
    if (!boatForm.name.trim() || !boatForm.registrationNo.trim()) {
      Alert.alert(
        lang === 'ta' ? 'விடுபட்ட புலங்கள்' : 'Missing Fields',
        lang === 'ta' ? 'பெயர் மற்றும் பதிவு எண் தேவை' : 'Boat Name and Registration Number are required.'
      );
      return;
    }

    setBoatSubmitting(true);
    try {
      if (!isConnected) {
        Alert.alert(
          lang === 'ta' ? 'இணையம் இல்லை' : 'Offline Mode',
          lang === 'ta' ? 'படகு பதிவு செய்ய இணைய இணைப்பு தேவை' : 'Internet connection is required to register a boat.'
        );
        setBoatSubmitting(false);
        return;
      }

      await api.post(ENDPOINTS.BOATS, {
        name: boatForm.name.trim(),
        registrationNo: boatForm.registrationNo.trim(),
        type: boatForm.type,
        capacity: parseInt(boatForm.capacity, 10) || 1,
        engineNo: boatForm.engineNo.trim() || undefined,
      });

      Alert.alert(
        lang === 'ta' ? 'வெற்றி' : 'Success',
        lang === 'ta' ? 'படகு வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : 'Boat registered successfully!'
      );
      setShowBoatModal(false);
      setBoatForm({ name: '', registrationNo: '', type: 'motorized', capacity: '', engineNo: '' });
      loadProfile(true);
    } catch (err) {
      Alert.alert(
        lang === 'ta' ? 'பிழை' : 'Error',
        err?.response?.data?.message || (lang === 'ta' ? 'படகை சேமிக்க முடியவில்லை' : 'Failed to register boat.')
      );
    } finally {
      setBoatSubmitting(false);
    }
  };

  const avatarLetter = (user?.name || 'U').charAt(0).toUpperCase();
  const isOfficer = user?.role === 'officer';

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );

  const SectionTitle = ({ children }) => (
    <Text style={styles.sectionTitle}>{children}</Text>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const profileData = profile?.profile || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{L.title}</Text>
        <TouchableOpacity style={styles.headerLogout} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfile(true); }} tintColor={COLORS.primary} />}
      >
        {/* Avatar Card */}
        <View style={[styles.avatarCard, isOfficer && styles.avatarCardOfficer]}>
          <View style={[styles.avatarCircle, isOfficer && styles.avatarCircleOfficer]}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={[styles.rolePill, isOfficer && styles.rolePillOfficer]}>
            <Text style={styles.rolePillText}>{isOfficer ? (lang === 'ta' ? 'மீன்வள அதிகாரி' : 'Fisheries Officer') : (lang === 'ta' ? 'மீனவர்' : 'Fisherman')}</Text>
          </View>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Personal Info */}
        <View style={styles.card}>
          <SectionTitle>{L.personalInfo}</SectionTitle>
          <InfoRow icon="mail-outline" label={lang === 'ta' ? 'மின்னஞ்சல்' : 'Email'} value={user?.email} />
          <InfoRow icon="call-outline" label={lang === 'ta' ? 'தொலைபேசி' : 'Phone'} value={user?.phone} />
          <InfoRow icon="person-circle-outline" label={lang === 'ta' ? 'பங்கு' : 'Role'} value={isOfficer ? (lang === 'ta' ? 'அதிகாரி' : 'Officer') : (lang === 'ta' ? 'மீனவர்' : 'Fisherman')} />
        </View>

        {/* Fisherman-specific */}
        {!isOfficer && (
          <View style={styles.card}>
            <SectionTitle>{L.licenseInfo}</SectionTitle>
            <InfoRow icon="id-card-outline" label={L.license} value={profileData.licenseNo || profileData.license_no} />
            <InfoRow icon="calendar-outline" label={L.expiry} value={profileData.licenseExpiry ? new Date(profileData.licenseExpiry).toLocaleDateString('en-IN') : null} />
            <InfoRow icon="home-outline" label={L.village} value={profileData.village} />
            <InfoRow icon="map-outline" label={L.district} value={profileData.district} />
            
            {/* Registered Boats */}
            <View style={styles.boatsDivider} />
            <View style={styles.boatsHeader}>
              <Text style={styles.boatsTitle}>{L.boatsTitle}</Text>
              <TouchableOpacity style={styles.addBoatBtn} onPress={() => setShowBoatModal(true)}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.addBoatBtnText}>{lang === 'ta' ? 'பதிவு செய்' : 'Register'}</Text>
              </TouchableOpacity>
            </View>

            {boats.length === 0 ? (
              <Text style={styles.noBoatsText}>{L.noBoats}</Text>
            ) : (
              boats.map((boat, idx) => (
                <View key={boat._id || boat.id || idx} style={styles.boatItem}>
                  <Ionicons name="boat-outline" size={18} color={COLORS.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.boatName}>{boat.name}</Text>
                    <Text style={styles.boatReg}>{boat.registrationNo || boat.registration_no}</Text>
                    <Text style={styles.boatDetails}>
                      {boat.type} • {lang === 'ta' ? `கொள்ளளவு: ${boat.capacity} பேர்` : `Cap: ${boat.capacity} crew`}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Officer-specific */}
        {isOfficer && (
          <View style={styles.card}>
            <SectionTitle>{L.officerInfo}</SectionTitle>
            <InfoRow icon="briefcase-outline" label={L.designation} value={profileData.designation} />
            <InfoRow icon="map-outline" label={L.district} value={profileData.district} />
            <InfoRow icon="shield-outline" label={L.badge} value={profileData.badgeNumber || profileData.badgeNo || profileData.badge_number} />
          </View>
        )}

        {/* Language Settings */}
        <View style={styles.card}>
          <SectionTitle>{L.settings}</SectionTitle>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={20} color={COLORS.primary} />
              <Text style={styles.settingLabel}>{L.language}</Text>
            </View>
            <View style={styles.langToggle}>
              <TouchableOpacity
                style={[styles.langChip, lang === 'en' && styles.langChipActive]}
                onPress={() => switchLang('en')}
              >
                <Text style={[styles.langChipText, lang === 'en' && styles.langChipTextActive]}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langChip, lang === 'ta' && styles.langChipActive]}
                onPress={() => switchLang('ta')}
              >
                <Text style={[styles.langChipText, lang === 'ta' && styles.langChipTextActive]}>தமிழ்</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>{L.logout}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Register Boat Modal */}
      <Modal visible={showBoatModal} transparent animationType="slide" onRequestClose={() => setShowBoatModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{L.addBoat}</Text>
            
            <Text style={styles.fieldLabel}>{L.boatName}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={lang === 'ta' ? 'எ.கா. கடல் அரசி' : 'e.g. Sea Queen'}
              placeholderTextColor={COLORS.textMuted}
              value={boatForm.name}
              onChangeText={val => setBoatForm(f => ({ ...f, name: val }))}
            />

            <Text style={styles.fieldLabel}>{L.boatReg}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. IND-TN-01-M-1234"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              value={boatForm.registrationNo}
              onChangeText={val => setBoatForm(f => ({ ...f, registrationNo: val }))}
            />

            <Text style={styles.fieldLabel}>{L.boatType}</Text>
            <View style={styles.typeRow}>
              {['motorized', 'mechanized', 'trawler'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, boatForm.type === t && styles.typeChipActive]}
                  onPress={() => setBoatForm(f => ({ ...f, type: t }))}
                >
                  <Text style={[styles.typeChipText, boatForm.type === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{L.boatCap}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 5"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={boatForm.capacity}
              onChangeText={val => setBoatForm(f => ({ ...f, capacity: val }))}
            />

            <Text style={styles.fieldLabel}>{L.boatEng}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. ENG-998877"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              value={boatForm.engineNo}
              onChangeText={val => setBoatForm(f => ({ ...f, engineNo: val }))}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowBoatModal(false)}>
                <Text style={styles.modalBtnCancelText}>{L.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleRegisterBoat} disabled={boatSubmitting}>
                {boatSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalBtnSubmitText}>{L.register}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  headerLogout: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  content: { padding: SPACING.md, gap: SPACING.md },

  avatarCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 28, alignItems: 'center', borderWidth: 2, borderColor: `${COLORS.primary}40`, ...SHADOWS.md },
  avatarCardOfficer: { borderColor: `${COLORS.success}40` },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarCircleOfficer: { backgroundColor: COLORS.success },
  avatarLetter: { fontSize: 36, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  rolePill: { backgroundColor: `${COLORS.primary}22`, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 8 },
  rolePillOfficer: { backgroundColor: `${COLORS.success}22` },
  rolePillText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  userEmail: { fontSize: 13, color: COLORS.textMuted },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: `${COLORS.border}66` },
  infoIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${COLORS.primary}22`, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500', marginTop: 2 },

  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  langToggle: { flexDirection: 'row', gap: 8 },
  langChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  langChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  langChipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  langChipTextActive: { color: '#fff' },

  logoutBtn: { backgroundColor: COLORS.danger, borderRadius: RADIUS.lg, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Boats styling
  boatsDivider: { height: 1, backgroundColor: `${COLORS.border}66`, marginVertical: 14 },
  boatsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  boatsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  addBoatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBoatBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  noBoatsText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: 4 },
  boatItem: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: `${COLORS.border}33` },
  boatName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  boatReg: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 1 },
  boatDetails: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Modal styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: 20, ...SHADOWS.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  modalInput: { backgroundColor: COLORS.background, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 16 },
  modalBtnCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  modalBtnCancelText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 14 },
  modalBtnSubmit: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, minWidth: 90, alignItems: 'center', justifyContent: 'center' },
  modalBtnSubmitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'capitalize', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
});
