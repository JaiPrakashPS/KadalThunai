import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { saveIncidentOffline } from '../../db/helpers';
import { useNetwork } from '../../store/NetworkContext';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const INCIDENT_TYPES = [
  { id: 'storm', label: 'Storm', icon: 'thunderstorm', color: '#F59E0B' },
  { id: 'oil_spill', label: 'Oil Spill', icon: 'water', color: '#EF4444' },
  { id: 'debris', label: 'Debris', icon: 'trash', color: '#94A3B8' },
  { id: 'boat_accident', label: 'Boat Accident', icon: 'boat', color: '#EF4444' },
  { id: 'obstacle', label: 'Obstacle', icon: 'warning', color: '#F59E0B' },
  { id: 'suspicious_activity', label: 'Suspicious Activity', icon: 'eye', color: '#8B5CF6' },
];

const SEVERITY_LEVELS = [
  { id: 'low', label: 'Low', color: '#10B981', bg: '#10B98120', icon: 'checkmark-circle' },
  { id: 'medium', label: 'Medium', color: '#F59E0B', bg: '#F59E0B20', icon: 'alert' },
  { id: 'high', label: 'High', color: '#EF4444', bg: '#EF444420', icon: 'warning' },
  { id: 'critical', label: 'Critical', color: '#FF0033', bg: '#FF003320', icon: 'skull' },
];

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', color: '#0066CC', bg: '#0066CC22', icon: 'time' },
  under_review: { label: 'Under Review', color: '#F59E0B', bg: '#F59E0B22', icon: 'eye' },
  resolved: { label: 'Resolved', color: '#10B981', bg: '#10B98122', icon: 'checkmark-circle' },
  closed: { label: 'Closed', color: '#64748B', bg: '#64748B22', icon: 'archive' },
};

export default function IncidentScreen() {
  const { isConnected } = useNetwork();
  const { t, lang } = useLanguage();

  const [activeTab, setActiveTab] = useState('report');
  const [incidentType, setIncidentType] = useState(null);
  const [severity, setSeverity] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [incidents, setIncidents] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    detectLocation();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchIncidents();
  }, [activeTab]);

  const fetchIncidents = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get(ENDPOINTS.INCIDENTS || '/incidents');
      // Backend returns { success, data: [...], pagination }
      const list = res.data?.data || res.data?.incidents || [];
      setIncidents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Fetch incidents error:', err);
      setIncidents([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const detectLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (err) {
      console.log('Location error:', err);
    } finally {
      setLocationLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'ta' ? 'அனுமதி தேவை' : 'Permission Required',
        lang === 'ta' ? 'புகைப்படங்களை இணைக்க புகைப்பட கேலரி அணுகலை அனுமதிக்கவும்.' : 'Please grant photo library access to attach images.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'ta' ? 'அனுமதி தேவை' : 'Permission Required',
        lang === 'ta' ? 'புகைப்படம் எடுக்க கேமரா அணுகலை அனுமதிக்கவும்.' : 'Please grant camera access to take photos.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      t('incident.addPhoto') || 'Attach Photo',
      lang === 'ta' ? 'விருப்பத்தைத் தேர்ந்தெடுக்கவும்' : 'Choose an option',
      [
        { text: lang === 'ta' ? 'புகைப்படம் எடு' : 'Take Photo', onPress: takePhoto },
        { text: lang === 'ta' ? 'கேலரியில் இருந்து தேர்ந்தெடு' : 'Choose from Library', onPress: pickImage },
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
      ]
    );
  };

  const validate = () => {
    if (!incidentType) {
      Alert.alert(
        lang === 'ta' ? 'வகையைத் தேர்ந்தெடுக்கவும்' : 'Select Type',
        t('incident.validation.type') || 'Please select the incident type.'
      );
      return false;
    }
    if (!severity) {
      Alert.alert(
        lang === 'ta' ? 'தீவிரத்தைத் தேர்ந்தெடுக்கவும்' : 'Select Severity',
        t('incident.validation.severity') || 'Please select the severity level.'
      );
      return false;
    }
    if (description.trim().length < 10) {
      Alert.alert(
        lang === 'ta' ? 'விளக்கம் தேவை' : 'Description Required',
        t('incident.validation.description') || 'Please describe the incident in more detail.'
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      type: incidentType,
      severity,
      description: description.trim(),
      location: location ? { lat: location.latitude, lng: location.longitude } : null,
      photoUrl: null, // Cloudinary upload would happen here
      reportedAt: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      if (isConnected) {
        await api.post(ENDPOINTS.INCIDENTS || '/incidents', payload);
      } else {
        await saveIncidentOffline(payload);
      }
      setSubmitted(true);
    } catch (err) {
      try {
        await saveIncidentOffline(payload);
        setSubmitted(true);
      } catch (dbErr) {
        Alert.alert(
          lang === 'ta' ? 'பிழை' : 'Error',
          lang === 'ta' ? 'சம்பவத்தை சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Failed to submit incident. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setIncidentType(null);
    setSeverity(null);
    setDescription('');
    setPhoto(null);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconRing}>
            <Ionicons name="warning" size={52} color="#F59E0B" />
          </View>
          <Text style={styles.successTitle}>{t('incident.submitted') || 'Incident Reported'}</Text>
          <Text style={styles.successSub}>
            {isConnected
              ? (t('incident.successOnline') || 'Your incident report has been submitted to the Coast Guard.')
              : (t('incident.successOffline') || 'Saved offline. Will sync automatically when connection is restored.')}
          </Text>
          <View style={styles.successActions}>
            <TouchableOpacity style={styles.successBtnPrimary} onPress={resetForm}>
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.successBtnPrimaryText}>{t('incident.reportAnother') || 'Report Another'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.successBtnSecondary} onPress={() => { resetForm(); setActiveTab('history'); }}>
              <Text style={styles.successBtnSecondaryText}>{t('complaint.viewHistory') || 'View History'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('incident.title') || 'Incident Report'}</Text>
          <Text style={styles.headerSub}>{t('incident.subtitle') || 'Sea hazard & emergency reporting'}</Text>
        </View>
        {!isConnected && (
          <View style={styles.offlinePill}>
            <Ionicons name="cloud-offline-outline" size={12} color="#F59E0B" />
            <Text style={styles.offlineTxt}>{t('common.offline') || 'Offline'}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'report' && styles.tabActive]}
          onPress={() => setActiveTab('report')}
        >
          <Ionicons name="warning" size={15} color={activeTab === 'report' ? '#0066CC' : '#94A3B8'} />
          <Text style={[styles.tabLabel, activeTab === 'report' && styles.tabLabelActive]}>
            {t('incident.reportTab') || 'Report'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons name="time" size={15} color={activeTab === 'history' ? '#0066CC' : '#94A3B8'} />
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>
            {t('incident.historyTab') || 'History'}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'report' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Incident Type */}
          <Text style={styles.sectionTitle}>
            {t('incident.type') || 'Incident Type'} <Text style={styles.req}>*</Text>
          </Text>
          <View style={styles.typeGrid}>
            {INCIDENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  incidentType === type.id && { borderColor: type.color, backgroundColor: type.color + '18' },
                ]}
                onPress={() => setIncidentType(type.id)}
              >
                <View style={[styles.typeIconBox, { backgroundColor: type.color + '22' }]}>
                  <Ionicons name={type.icon} size={22} color={type.color} />
                </View>
                <Text style={[styles.typeLabel, incidentType === type.id && { color: type.color }]}>
                  {t('incident.types.' + type.id) || type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Severity */}
          <Text style={styles.sectionTitle}>
            {t('incident.severity') || 'Severity'} <Text style={styles.req}>*</Text>
          </Text>
          <View style={styles.severityRow}>
            {SEVERITY_LEVELS.map((sev) => (
              <TouchableOpacity
                key={sev.id}
                style={[
                  styles.severityPill,
                  { borderColor: sev.color },
                  severity === sev.id && { backgroundColor: sev.bg },
                ]}
                onPress={() => setSeverity(sev.id)}
              >
                <Ionicons name={sev.icon} size={13} color={sev.color} />
                <Text style={[styles.severityLabel, { color: sev.color }]}>
                  {t('incident.severities.' + sev.id) || sev.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>
              {t('incident.description') || 'Description'} <Text style={styles.req}>*</Text>
            </Text>
            <Text style={styles.charCount}>{description.length}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('incident.descPlaceholder') || 'Describe the incident, surroundings, and any immediate dangers...'}
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            maxLength={1500}
            textAlignVertical="top"
          />

          {/* Location */}
          <Text style={styles.sectionTitle}>{t('catch.location') || 'GPS Location'}</Text>
          <View style={styles.locationBox}>
            {locationLoading ? (
              <ActivityIndicator size="small" color="#0066CC" />
            ) : location ? (
              <>
                <View style={styles.locationDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationLabel}>{t('sos.yourLocation') || 'Current Position'}</Text>
                  <Text style={styles.locationVal}>
                    {location.latitude.toFixed(5)}° N, {location.longitude.toFixed(5)}° E
                  </Text>
                </View>
                <TouchableOpacity onPress={detectLocation}>
                  <Ionicons name="refresh" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.detectBtn} onPress={detectLocation}>
                <Ionicons name="locate" size={16} color="#0066CC" />
                <Text style={styles.detectBtnText}>
                  {lang === 'ta' ? 'எனது இருப்பிடத்தைக் கண்டறி' : 'Detect My Location'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Photo Attachment */}
          <Text style={styles.sectionTitle}>{t('incident.addPhoto') || 'Photo (Optional)'}</Text>
          {photo ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photo }} style={styles.photoImg} resizeMode="cover" />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhoto(null)}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
              <View style={styles.cloudinaryNote}>
                <Ionicons name="information-circle" size={14} color="#94A3B8" />
                <Text style={styles.cloudinaryNoteText}>{t('incident.photoNote') || 'Photo upload requires Cloudinary configuration'}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoBtn} onPress={showPhotoOptions}>
              <Ionicons name="camera" size={22} color="#94A3B8" />
              <Text style={styles.photoBtnText}>{t('incident.photoBtn') || 'Attach a Photo'}</Text>
              <Text style={styles.photoBtnSub}>{t('incident.photoSub') || 'Tap to capture or choose from gallery'}</Text>
            </TouchableOpacity>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>{t('incident.submit') || 'Submit Report'}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {historyLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#0066CC" />
              <Text style={styles.loadingText}>{lang === 'ta' ? 'அறிக்கைகளை ஏற்றுகிறது...' : 'Loading reports...'}</Text>
            </View>
          ) : incidents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={64} color="#1E3A5F" />
              <Text style={styles.emptyTitle}>{t('incident.noReports') || 'No Reports Yet'}</Text>
              <Text style={styles.emptyText}>{t('incident.noReportsText') || 'Incidents you report will appear here.'}</Text>
              <TouchableOpacity style={styles.emptyAction} onPress={() => setActiveTab('report')}>
                <Text style={styles.emptyActionText}>{t('incident.title') || 'Report an Incident'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            incidents.map((item, idx) => {
              const typeInfo = INCIDENT_TYPES.find((t) => t.id === item.type);
              const sevInfo = SEVERITY_LEVELS.find((s) => s.id === item.severity);
              const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.submitted;
              const statusLabel = item.status === 'closed' ? (t('common.done') || 'Closed') : (t('complaint.status.' + item.status) || statusInfo.label);
              return (
                <View key={item._id || idx} style={styles.incidentCard}>
                  <View style={styles.incidentCardTop}>
                    <View style={[styles.incidentTypeBadge, { backgroundColor: (typeInfo?.color || '#94A3B8') + '22' }]}>
                      <Ionicons name={typeInfo?.icon || 'alert'} size={13} color={typeInfo?.color || '#94A3B8'} />
                      <Text style={[styles.incidentTypeText, { color: typeInfo?.color || '#94A3B8' }]}>
                        {t('incident.types.' + item.type) || typeInfo?.label || item.type}
                      </Text>
                    </View>
                    <View style={[styles.severityTag, { backgroundColor: sevInfo?.bg || '#64748B22' }]}>
                      <Text style={[styles.severityTagText, { color: sevInfo?.color || '#94A3B8' }]}>
                        {t('incident.severities.' + item.severity) || sevInfo?.label || item.severity}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.incidentDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.incidentFooter}>
                    <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                      <Ionicons name={statusInfo.icon} size={11} color={statusInfo.color} />
                      <Text style={[styles.statusPillText, { color: statusInfo.color }]}>{statusLabel}</Text>
                    </View>
                    <Text style={styles.incidentDate}>
                      {item.reportedAt ? new Date(item.reportedAt).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN') : '—'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  headerSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B22',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  offlineTxt: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#0F2044',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#0A1628',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  tabLabelActive: { color: '#0066CC', fontWeight: '700' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10,
  },
  req: { color: '#EF4444' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  charCount: { fontSize: 12, color: '#64748B' },
  // Type grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#0F2044',
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
  },
  // Severity
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 8,
    gap: 4,
  },
  severityLabel: { fontSize: 12, fontWeight: '700' },
  // Input
  input: {
    backgroundColor: '#0F2044',
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F1F5F9',
    fontSize: 15,
  },
  textArea: { minHeight: 120, paddingTop: 12 },
  // Location
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F2044',
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  locationLabel: { fontSize: 13, color: '#F1F5F9', fontWeight: '600' },
  locationVal: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detectBtnText: { fontSize: 14, color: '#0066CC', fontWeight: '600' },
  // Photo
  photoBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F2044',
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 24,
    gap: 6,
  },
  photoBtnText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  photoBtnSub: { fontSize: 12, color: '#1E3A5F', color: '#64748B' },
  photoPreview: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: 160,
    borderRadius: 10,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#0A1628CC',
    borderRadius: 12,
  },
  cloudinaryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  cloudinaryNoteText: { fontSize: 11, color: '#94A3B8' },
  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  // History
  incidentCard: {
    backgroundColor: '#0F2044',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  incidentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  incidentTypeText: { fontSize: 11, fontWeight: '700' },
  severityTag: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  severityTagText: { fontSize: 11, fontWeight: '700' },
  incidentDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 20, marginBottom: 10 },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  incidentDate: { fontSize: 11, color: '#64748B' },
  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F59E0B20',
    borderWidth: 2,
    borderColor: '#F59E0B44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  successSub: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  successActions: { width: '100%', gap: 10 },
  successBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  successBtnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  successBtnSecondary: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 14,
  },
  successBtnSecondaryText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
  // Misc
  centered: { alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, color: '#94A3B8', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#F1F5F9', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  emptyAction: {
    marginTop: 24,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  emptyActionText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
