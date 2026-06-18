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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { saveComplaintOffline } from '../../db/helpers';
import { useNetwork } from '../../store/NetworkContext';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const CATEGORIES = [
  { id: 'illegal_fishing', label: 'Illegal Fishing', icon: 'fish', color: '#EF4444' },
  { id: 'pollution', label: 'Pollution', icon: 'water', color: '#F59E0B' },
  { id: 'equipment', label: 'Equipment', icon: 'construct', color: '#0066CC' },
  { id: 'safety', label: 'Safety', icon: 'shield-checkmark', color: '#10B981' },
  { id: 'corruption', label: 'Corruption', icon: 'alert-circle', color: '#8B5CF6' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle', color: '#94A3B8' },
];

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', color: '#0066CC', bg: '#0066CC22', icon: 'time' },
  under_review: { label: 'Under Review', color: '#F59E0B', bg: '#F59E0B22', icon: 'eye' },
  resolved: { label: 'Resolved', color: '#10B981', bg: '#10B98122', icon: 'checkmark-circle' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#EF444422', icon: 'close-circle' },
};

export default function ComplaintScreen() {
  const { isConnected } = useNetwork();
  const { t, lang } = useLanguage();

  // Form state
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // History state
  const [complaints, setComplaints] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchComplaints();
    }
  }, [activeTab]);

  const fetchComplaints = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get(ENDPOINTS.COMPLAINTS || '/complaints');
      setComplaints(res.data?.complaints || res.data || []);
    } catch (err) {
      console.log('Fetch complaints error:', err);
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  };

  const detectLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('catch.permissionDenied'), t('catch.locationPermissionMsg'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (err) {
      Alert.alert(t('common.error'), t('catch.locationErrorMsg'));
    } finally {
      setLocationLoading(false);
    }
  };

  const validate = () => {
    if (!selectedCategory) {
      Alert.alert(t('complaint.valCategoryTitle'), t('complaint.valCategoryMsg'));
      return false;
    }
    if (!title.trim()) {
      Alert.alert(t('complaint.valTitleTitle'), t('complaint.valTitleMsg'));
      return false;
    }
    if (description.trim().length < 20) {
      Alert.alert(t('complaint.valDescTitle'), t('complaint.valDescMsg'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      category: selectedCategory,
      title: title.trim(),
      description: description.trim(),
      location: location || null,
      submittedAt: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      if (isConnected) {
        await api.post(ENDPOINTS.COMPLAINTS || '/complaints', payload);
      } else {
        await saveComplaintOffline(payload);
      }
      setSubmitted(true);
    } catch (err) {
      if (!isConnected) {
        try {
          await saveComplaintOffline(payload);
          setSubmitted(true);
        } catch (dbErr) {
          Alert.alert(t('common.error'), t('complaint.saveFailed'));
        }
      } else {
        Alert.alert(t('complaint.submitFailed'), err?.response?.data?.message || t('catch.valError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setTitle('');
    setDescription('');
    setLocation(null);
    setSubmitted(false);
  };

  // Success screen
  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>{t('complaint.submittedTitle')}</Text>
          <Text style={styles.successSub}>
            {isConnected
              ? t('complaint.submittedDescOnline')
              : t('complaint.submittedDescOffline')}
          </Text>
          <TouchableOpacity style={styles.successBtn} onPress={resetForm}>
            <Text style={styles.successBtnText}>{t('complaint.submitAnother')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.successBtn, { backgroundColor: 'transparent', borderColor: COLORS.border, borderWidth: 1, marginTop: 10 }]}
            onPress={() => { resetForm(); setActiveTab('history'); }}
          >
            <Text style={[styles.successBtnText, { color: COLORS.textMuted }]}>{t('complaint.viewHistory')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('complaint.title')}</Text>
          <Text style={styles.headerSub}>{t('complaint.subtitle')}</Text>
        </View>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline" size={12} color="#F59E0B" />
            <Text style={styles.offlineText}>{t('common.offline')}</Text>
          </View>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'submit' && styles.tabBtnActive]}
          onPress={() => setActiveTab('submit')}
        >
          <Ionicons name="create" size={16} color={activeTab === 'submit' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, activeTab === 'submit' && styles.tabTextActive]}>{t('complaint.newComplaint')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons name="list" size={16} color={activeTab === 'history' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>{t('complaint.myComplaints')}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'submit' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Category */}
          <Text style={styles.sectionLabel}>{t('complaint.category')} <Text style={styles.required}>*</Text></Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '22' },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Ionicons name={cat.icon} size={15} color={selectedCategory === cat.id ? cat.color : COLORS.textMuted} />
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat.id && { color: cat.color },
                  ]}
                >
                  {t('complaint.categories.' + cat.id)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.sectionLabel}>{t('complaint.titleField')} <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder={t('complaint.titlePlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />

          {/* Description */}
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>{t('complaint.description')} <Text style={styles.required}>*</Text></Text>
            <Text style={styles.charCount}>{description.length} {lang === 'ta' ? 'எழுத்துக்கள்' : 'chars'}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('complaint.descPlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            maxLength={2000}
            textAlignVertical="top"
          />

          {/* Location */}
          <Text style={styles.sectionLabel}>{t('complaint.location')}</Text>
          <TouchableOpacity style={styles.locationCard} onPress={detectLocation} disabled={locationLoading}>
            {locationLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : location ? (
              <>
                <Ionicons name="location" size={18} color="#10B981" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.locationText}>{t('complaint.locationDetected')}</Text>
                  <Text style={styles.locationCoords}>
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setLocation(null)}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="locate" size={18} color={COLORS.primary} />
                <Text style={[styles.locationText, { marginLeft: 10 }]}>{t('complaint.detectLocation')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>{t('complaint.submit')}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
        >
          {historyLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>{t('complaint.loadingHistory')}</Text>
            </View>
          ) : complaints.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyTitle}>{t('complaint.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('complaint.emptyDesc')}</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('submit')}>
                <Text style={styles.emptyBtnText}>{t('complaint.submitAComplaint')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            complaints.map((item, idx) => {
              const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.submitted;
              const cat = CATEGORIES.find((c) => c.id === item.category);
              return (
                <View key={item._id || idx} style={styles.complaintCard}>
                  <View style={styles.complaintCardHeader}>
                    <View style={[styles.catBadge, { backgroundColor: (cat?.color || '#94A3B8') + '22' }]}>
                      <Ionicons name={cat?.icon || 'help-circle'} size={12} color={cat?.color || '#94A3B8'} />
                      <Text style={[styles.catBadgeText, { color: cat?.color || '#94A3B8' }]}>
                        {cat ? t('complaint.categories.' + cat.id) : item.category}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Ionicons name={status.icon} size={11} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>{t('complaint.status.' + (item.status || 'submitted'))}</Text>
                    </View>
                  </View>
                  <Text style={styles.complaintTitle}>{item.title}</Text>
                  <Text style={styles.complaintDesc} numberOfLines={2}>{item.description}</Text>
                  <Text style={styles.complaintDate}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
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
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING?.md || 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B22',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  offlineText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING?.md || 16,
    backgroundColor: '#0F2044',
    borderRadius: RADIUS?.lg || 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: (RADIUS?.lg || 12) - 2,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#0A1628',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0066CC',
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING?.md || 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
  },
  required: { color: '#EF4444' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    backgroundColor: '#0F2044',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0F2044',
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    borderRadius: RADIUS?.md || 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F1F5F9',
    fontSize: 15,
  },
  textArea: {
    minHeight: 130,
    paddingTop: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F2044',
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    borderRadius: RADIUS?.md || 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 0,
  },
  locationText: {
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  locationCoords: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    borderRadius: RADIUS?.lg || 12,
    paddingVertical: 16,
    marginTop: 24,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  // History
  complaintCard: {
    backgroundColor: '#0F2044',
    borderRadius: RADIUS?.lg || 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  complaintCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  complaintTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  complaintDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 8,
  },
  complaintDate: {
    fontSize: 11,
    color: '#1E3A5F',
    color: '#64748B',
  },
  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B98122',
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
  successBtn: {
    backgroundColor: '#0066CC',
    borderRadius: RADIUS?.lg || 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  successBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 24,
    backgroundColor: '#0066CC',
    borderRadius: RADIUS?.lg || 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  centered: {
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
});
