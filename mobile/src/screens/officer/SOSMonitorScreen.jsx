import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../store/LanguageContext';

const getActionLabel = (label, lang) => {
  if (lang === 'ta') {
    if (label === 'Acknowledge') return 'பதிலளிக்கவும்';
    if (label === 'False Alarm') return 'தவறான எச்சரிக்கை';
    if (label === 'Mark Dispatched') return 'உதவி அனுப்பப்பட்டது எனக் குறி';
    if (label === 'Mark Resolved') return 'தீர்க்கப்பட்டது எனக் குறி';
  }
  return label;
};

const THEME = {
  background: '#0A1628',
  surface: '#0F2044',
  primary: '#0066CC',
  secondary: '#F59E0B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#1E3A5F',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

const TABS = ['Pending', 'Acknowledged', 'Resolved'];

const STATUS_ACTIONS = {
  Pending: [
    { label: 'Acknowledge', status: 'acknowledged', color: THEME.warning, icon: 'checkmark-circle' },
    { label: 'False Alarm', status: 'false_alarm', color: THEME.textMuted, icon: 'close-circle' },
  ],
  Acknowledged: [
    { label: 'Mark Dispatched', status: 'dispatched', color: THEME.primary, icon: 'navigate' },
    { label: 'False Alarm', status: 'false_alarm', color: THEME.textMuted, icon: 'close-circle' },
  ],
  Dispatched: [
    { label: 'Mark Resolved', status: 'resolved', color: THEME.success, icon: 'shield-checkmark' },
  ],
};

const urgencyColor = (level) => {
  if (!level) return THEME.textMuted;
  const l = level.toLowerCase();
  if (l === 'critical' || l === 'high') return THEME.danger;
  if (l === 'medium') return THEME.warning;
  return THEME.success;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const formatCoords = (location) => {
  if (!location?.coordinates) return 'N/A';
  return `${location.coordinates[1]?.toFixed(5)}, ${location.coordinates[0]?.toFixed(5)}`;
};

const openMaps = (location) => {
  if (!location?.coordinates) return;
  const [lng, lat] = location.coordinates;
  const url = `https://maps.google.com/?q=${lat},${lng}`;
  Linking.openURL(url).catch(() => {});
};

function SOSCard({ item, onAction, onViewDetails }) {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const statusKey = item.status?.charAt(0).toUpperCase() + item.status?.slice(1);
  const actions = STATUS_ACTIONS[statusKey] || STATUS_ACTIONS[item.status] || [];
  const urgColor = urgencyColor(item.urgency || item.priority);

  return (
    <View style={[styles.sosCard, { borderLeftColor: urgColor }]}>
      {/* Top row */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <View style={[styles.urgBadge, { backgroundColor: urgColor + '22' }]}>
              <Ionicons name="warning" size={14} color={urgColor} />
              <Text style={[styles.urgText, { color: urgColor }]}>
                {(item.urgency || item.priority || 'Unknown').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.emergType}>
              {item.emergencyType ? (t(`sos.types.${item.emergencyType}`) || item.emergencyType) : (t('sos.button') || 'Emergency')}
            </Text>
          </View>
          <View style={styles.cardTopRight}>
            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={THEME.textMuted}
            />
          </View>
        </View>

        <View style={styles.fisherRow}>
          <Ionicons name="person" size={15} color={THEME.primary} />
          <Text style={styles.fisherName}>
            {item.fishermenId?.name || item.userId?.name || item.fisherman?.name || item.userName || (lang === 'ta' ? 'அறியப்படாத மீனவர்' : 'Unknown Fisherman')}
          </Text>
        </View>

        {(item.fishermenId?.phone || item.userId?.phone || item.fisherman?.phone) && (
          <View style={styles.fisherRow}>
            <Ionicons name="call" size={13} color={THEME.textMuted} />
            <Text style={styles.fisherMeta}>
              {item.fishermenId?.phone || item.userId?.phone || item.fisherman?.phone}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.locationRow}
          onPress={() => openMaps(item.location)}
          activeOpacity={0.7}
        >
          <Ionicons name="location" size={14} color={THEME.danger} />
          <Text style={[styles.locationText, { color: THEME.danger }]}>
            {formatCoords(item.location)}
          </Text>
          <Ionicons name="open-outline" size={12} color={THEME.danger} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Expanded details */}
      {expanded && (
        <View style={styles.expandedBody}>
          <View style={styles.divider} />

          {item.boat && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>{lang === 'ta' ? 'படகு விவரங்கள்' : 'Boat Info'}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>{t('boat.name') || 'Name'}</Text>
                <Text style={styles.detailVal}>{item.boat.name || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>{t('boat.regNo') || 'Registration'}</Text>
                <Text style={styles.detailVal}>{item.boat.registrationNumber || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>{t('boat.type') || 'Type'}</Text>
                <Text style={styles.detailVal}>
                  {item.boat.type ? (t(`boat.types.${item.boat.type.toLowerCase()}`) || item.boat.type) : '—'}
                </Text>
              </View>
            </View>
          )}

          {item.description && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>{lang === 'ta' ? 'விளக்கம்' : 'Description'}</Text>
              <Text style={styles.descText}>{item.description}</Text>
            </View>
          )}

          {item.officerNotes && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>{lang === 'ta' ? 'அதிகாரி குறிப்புகள்' : 'Officer Notes'}</Text>
              <Text style={styles.descText}>{item.officerNotes}</Text>
            </View>
          )}

          {/* Action buttons */}
          {actions.length > 0 && (
            <View style={styles.actionsRow}>
              {actions.map((a) => {
                const translatedActionLabel = getActionLabel(a.label, lang);
                return (
                  <TouchableOpacity
                    key={a.status}
                    style={[styles.actionBtn, { borderColor: a.color }]}
                    onPress={() => onAction(item, a.status, translatedActionLabel)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={a.icon} size={15} color={a.color} />
                    <Text style={[styles.actionBtnText, { color: a.color }]}>{translatedActionLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={styles.notesBtn}
            onPress={() => onViewDetails(item)}
          >
            <Ionicons name="create" size={15} color={THEME.primary} />
            <Text style={styles.notesBtnText}>{lang === 'ta' ? 'அதிகாரி குறிப்புகளைச் சேர்' : 'Add Officer Notes'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function SOSMonitorScreen() {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('Pending');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSOS, setSelectedSOS] = useState(null);
  const [officerNotes, setOfficerNotes] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const intervalRef = useRef(null);

  const fetchSOS = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await api.get(ENDPOINTS.SOS || '/sos');
      const list = res.data?.data || res.data || [];

      const grouped = {
        Pending: list.filter((s) =>
          ['pending', 'new'].includes(s.status?.toLowerCase())
        ),
        Acknowledged: list.filter((s) =>
          ['acknowledged', 'dispatched'].includes(s.status?.toLowerCase())
        ),
        Resolved: list.filter((s) =>
          ['resolved', 'false_alarm'].includes(s.status?.toLowerCase())
        ),
      };
      setData(grouped);
    } catch (err) {
      console.error('SOS fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSOS();
    intervalRef.current = setInterval(() => fetchSOS(true), 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchSOS]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSOS(true);
  }, [fetchSOS]);

  const handleAction = useCallback(async (item, newStatus, label) => {
    Alert.alert(
      lang === 'ta' ? `உறுதிப்படுத்துக: ${label}` : `Confirm: ${label}`,
      lang === 'ta' ? `அவசர நிலையை "${label}" ஆக புதுப்பிக்கவா?` : `Update SOS status to "${label}"?`,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.confirm') || 'Confirm',
          style: 'default',
          onPress: async () => {
            try {
              setUpdatingId(item._id);
              await api.put(`${ENDPOINTS.SOS || '/sos'}/${item._id}/status`, {
                status: newStatus,
              });
              fetchSOS(true);
            } catch (err) {
              Alert.alert(t('common.error') || 'Error', lang === 'ta' ? 'அவசர நிலையை புதுப்பிக்க முடியவில்லை.' : 'Failed to update SOS status.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  }, [fetchSOS, lang, t]);

  const handleViewDetails = useCallback((item) => {
    setSelectedSOS(item);
    setOfficerNotes(item.officerNotes || '');
    setModalVisible(true);
  }, []);

  const handleSaveNotes = useCallback(async () => {
    if (!selectedSOS) return;
    try {
      setUpdatingId(selectedSOS._id);
      await api.put(`${ENDPOINTS.SOS || '/sos'}/${selectedSOS._id}/status`, {
        status: selectedSOS.status, // keep current status
        officerNotes,
      });
      setModalVisible(false);
      fetchSOS(true);
    } catch {
      Alert.alert(t('common.error') || 'Error', lang === 'ta' ? 'குறிப்புகளைச் சேமிக்க முடியவில்லை.' : 'Failed to save notes.');
    } finally {
      setUpdatingId(null);
    }
  }, [selectedSOS, officerNotes, fetchSOS, lang, t]);

  const tabData = data[activeTab] || [];
  const pendingCount = (data.Pending || []).length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('officer.sosAlerts') || 'SOS Monitor'}</Text>
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{lang === 'ta' ? 'நேரடி' : 'LIVE'}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const count = tab === 'Pending' ? pendingCount : null;
          const translatedTab = tab === 'Pending' ? (t('sos.status.pending') || 'Pending') : tab === 'Acknowledged' ? (t('sos.status.acknowledged') || 'Acknowledged') : (t('sos.status.resolved') || 'Resolved');
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {translatedTab}
              </Text>
              {count > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>{lang === 'ta' ? 'அவசர எச்சரிக்கைகளை ஏற்றுகிறது...' : 'Loading SOS alerts…'}</Text>
        </View>
      ) : (
        <FlatList
          data={tabData}
          keyExtractor={(item) => item._id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.primary}
              colors={[THEME.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                name={activeTab === 'Resolved' ? 'checkmark-done-circle' : 'radio'}
                size={48}
                color={activeTab === 'Pending' ? THEME.success : THEME.textMuted}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'Pending'
                  ? (lang === 'ta' ? 'நிலυவையில் உள்ள அவசர எச்சரிக்கைகள் எதுவும் இல்லை' : 'No pending SOS alerts')
                  : (lang === 'ta' ? 'குறிப்பிடப்பட்ட அவசர எச்சரிக்கைகள் எதுவும் இல்லை' : `No ${activeTab.toLowerCase()} alerts`)}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'Pending'
                  ? (lang === 'ta' ? 'எல்லாம் பாதுகாப்பானது! கடல் அமைதியாக உள்ளது.' : 'All clear! Sea is safe.')
                  : (lang === 'ta' ? 'இங்கு காண்பிக்க எதுவும் இல்லை.' : 'Nothing to show here.')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <SOSCard
              item={item}
              onAction={handleAction}
              onViewDetails={handleViewDetails}
            />
          )}
        />
      )}

      {/* Notes Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{lang === 'ta' ? 'அதிகாரி குறிப்புகள்' : 'Officer Notes'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>

            {selectedSOS && (
              <View style={styles.modalSosSummary}>
                <Text style={styles.modalSosName}>
                  {selectedSOS.fishermenId?.name || selectedSOS.userId?.name || selectedSOS.fisherman?.name || selectedSOS.userName || (lang === 'ta' ? 'அறியப்படாத மீனவர்' : 'Unknown')}
                </Text>
                <Text style={styles.modalSosType}>
                  {selectedSOS.emergencyType ? (t(`sos.types.${selectedSOS.emergencyType}`) || selectedSOS.emergencyType) : (t('sos.button') || 'Emergency')}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>{lang === 'ta' ? 'குறிப்புகள் / அவதானிப்புகள்' : 'Notes / Observations'}</Text>
            <TextInput
              style={styles.notesInput}
              placeholder={lang === 'ta' ? 'இந்த SOS பற்றிய உங்கள் குறிப்புகளை உள்ளிடவும்...' : 'Enter your notes about this SOS…'}
              placeholderTextColor={THEME.textMuted}
              value={officerNotes}
              onChangeText={setOfficerNotes}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.saveBtn, updatingId && styles.saveBtnDisabled]}
              onPress={handleSaveNotes}
              disabled={!!updatingId}
            >
              {updatingId ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>{lang === 'ta' ? 'குறிப்புகளைச் சேமி' : 'Save Notes'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: THEME.text },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.danger + '22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.danger,
  },
  liveText: { fontSize: 11, fontWeight: '700', color: THEME.danger },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  activeTab: { backgroundColor: THEME.primary },
  tabText: { fontSize: 13, color: THEME.textMuted, fontWeight: '600' },
  activeTabText: { color: '#fff' },
  tabBadge: {
    backgroundColor: THEME.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  sosCard: {
    backgroundColor: THEME.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 14,
    paddingBottom: 8,
  },
  cardTopLeft: { gap: 6 },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: { fontSize: 12, color: THEME.textMuted },
  urgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  urgText: { fontSize: 11, fontWeight: '700' },
  emergType: { fontSize: 15, fontWeight: '700', color: THEME.text },
  fisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  fisherName: { fontSize: 14, color: THEME.text, fontWeight: '600' },
  fisherMeta: { fontSize: 13, color: THEME.textMuted },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingBottom: 14,
    marginTop: 4,
  },
  locationText: { fontSize: 12, fontWeight: '600', flex: 1 },

  expandedBody: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 10 },
  detailSection: { marginBottom: 12 },
  detailSectionTitle: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: { flexDirection: 'row', marginBottom: 4 },
  detailKey: { width: 110, fontSize: 13, color: THEME.textMuted },
  detailVal: { flex: 1, fontSize: 13, color: THEME.text, fontWeight: '500' },
  descText: { fontSize: 13, color: THEME.text, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  notesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: THEME.primary + '18',
    alignSelf: 'flex-start',
  },
  notesBtnText: { fontSize: 13, color: THEME.primary, fontWeight: '600' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { color: THEME.textMuted, marginTop: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.text, marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: THEME.textMuted, marginTop: 6 },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: THEME.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: THEME.text },
  modalSosSummary: { marginBottom: 16 },
  modalSosName: { fontSize: 15, fontWeight: '700', color: THEME.text },
  modalSosType: { fontSize: 13, color: THEME.textMuted },
  inputLabel: { fontSize: 13, color: THEME.textMuted, fontWeight: '600', marginBottom: 8 },
  notesInput: {
    backgroundColor: THEME.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    color: THEME.text,
    fontSize: 14,
    padding: 14,
    minHeight: 120,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
