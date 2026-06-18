import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../store/LanguageContext';

const STATUS_CONFIG = {
  submitted: { color: COLORS.info, label: 'Submitted' },
  under_review: { color: COLORS.warning, label: 'Under Review' },
  resolved: { color: COLORS.success, label: 'Resolved' },
  rejected: { color: COLORS.danger, label: 'Rejected' },
};

const TABS = ['submitted', 'under_review', 'resolved'];

export default function ComplaintResolveScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('submitted');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [officerResponse, setOfficerResponse] = useState('');
  const [updating, setUpdating] = useState(false);

  const getStatusLabelLocal = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'submitted') return t('complaint.status.submitted') || 'Submitted';
    if (s === 'under_review') return t('complaint.status.under_review') || 'Under Review';
    if (s === 'resolved') return t('complaint.status.resolved') || 'Resolved';
    if (s === 'rejected') return t('complaint.status.rejected') || 'Rejected';
    return status;
  };

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.COMPLAINTS, { params: { status: activeTab, limit: 50 } });
      setComplaints(res.data.data || []);
    } catch (e) { console.warn(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    setUpdating(true);
    try {
      await api.put(ENDPOINTS.COMPLAINT_BY_ID(id), { status, officerResponse });
      setSelectedComplaint(null);
      setOfficerResponse('');
      load();
    } catch (e) { Alert.alert(t('common.error') || 'Error', e.response?.data?.message || (lang === 'ta' ? 'புதுப்பித்தல் தோல்வியுற்றது' : 'Update failed')); }
    finally { setUpdating(false); }
  };

  const renderItem = ({ item }) => {
    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.submitted;
    return (
      <TouchableOpacity style={styles.card} onPress={() => { setSelectedComplaint(item); setOfficerResponse(item.officerResponse || ''); }}>
        <View style={styles.cardTop}>
          <View style={[styles.catBadge, { backgroundColor: COLORS.primary + '22' }]}>
            <Text style={[styles.catText, { color: COLORS.primary }]}>
              {item.category ? (t(`complaint.categories.${item.category}`) || item.category.replace('_', ' ')) : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.color + '22' }]}>
            <Text style={[styles.statusText, { color: sc.color }]}>{getStatusLabelLocal(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.meta}>{item.submittedBy?.name || (lang === 'ta' ? 'அறியப்படாதவர்' : 'Unknown')}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('officer.complaints') || 'Complaints'}</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{getStatusLabelLocal(tab)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} /> : (
        <FlatList
          data={complaints}
          renderItem={renderItem}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{lang === 'ta' ? 'புகார்கள் எதுவும் இல்லை' : 'No complaints'}</Text></View>}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selectedComplaint} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{selectedComplaint?.title}</Text>
            <Text style={styles.modalDesc}>{selectedComplaint?.description}</Text>
            <Text style={styles.label}>{lang === 'ta' ? 'அதிகாரி பதில்' : 'Officer Response'}</Text>
            <TextInput style={styles.input} value={officerResponse} onChangeText={setOfficerResponse} multiline numberOfLines={3} placeholder={lang === 'ta' ? 'உங்கள் பதிலை எழுதவும்...' : 'Write your response...'} placeholderTextColor={COLORS.textMuted} />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedComplaint(null)}>
                <Text style={styles.actionBtnText}>{t('common.cancel') || 'Close'}</Text>
              </TouchableOpacity>
              {activeTab === 'submitted' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.warning }]} onPress={() => updateStatus(selectedComplaint._id, 'under_review')}>
                  <Text style={[styles.actionBtnText, { color: '#000' }]}>{getStatusLabelLocal('under_review')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => updateStatus(selectedComplaint._id, 'resolved')} disabled={updating}>
                {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.actionBtnText, { color: '#fff' }]}>{lang === 'ta' ? 'தீர்வு காண்' : 'Resolve'}</Text>}
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
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginHorizontal: SPACING.md },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500', textTransform: 'capitalize' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  list: { padding: SPACING.md, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  catBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  catText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 'auto' },
  statusText: { fontSize: 11, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  desc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: 12, color: COLORS.textMuted },
  metaDot: { color: COLORS.textMuted },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.backgroundMid, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, borderTopWidth: 1, borderTopColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  modalDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: 14, marginBottom: SPACING.md, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  actionBtn: { flex: 1, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
});
