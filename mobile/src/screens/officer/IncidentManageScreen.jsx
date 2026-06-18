import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../store/LanguageContext';

const getStatusLabel = (status, lang) => {
  const s = (status || '').toLowerCase().replace(/_/g, ' ');
  if (lang === 'ta') {
    if (s === 'pending') return 'நிலுவையில்';
    if (s === 'in progress' || s === 'in_progress') return 'செயல்பாட்டில்';
    if (s === 'resolved') return 'தீர்க்கப்பட்டது';
    if (s === 'dismissed') return 'நிராகரிக்கப்பட்டது';
  }
  return s.toUpperCase();
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

const TABS = ['All', 'Pending', 'In Progress', 'Resolved'];

const SEVERITY_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

const STATUS_COLORS = {
  pending: '#F59E0B',
  'in progress': '#0066CC',
  'in_progress': '#0066CC',
  resolved: '#10B981',
  dismissed: '#94A3B8',
};

const INCIDENT_ICONS = {
  accident: 'boat',
  weather: 'thunderstorm',
  medical: 'medkit',
  fishing: 'fish',
  fire: 'flame',
  mechanical: 'settings',
  missing: 'search',
  collision: 'alert',
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const normalizeStatus = (status) => (status || '').toLowerCase().replace(/_/g, ' ');

function IncidentCard({ item, onStatusUpdate }) {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const sevColor = SEVERITY_COLORS[item.severity?.toLowerCase()] || THEME.textMuted;
  const statColor = STATUS_COLORS[normalizeStatus(item.status)] || THEME.textMuted;
  const iconName = INCIDENT_ICONS[item.type?.toLowerCase()] || 'alert-circle';

  return (
    <View style={[styles.card, { borderLeftColor: sevColor }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.85}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIconWrap, { backgroundColor: sevColor + '22' }]}>
            <Ionicons name={iconName} size={20} color={sevColor} />
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.incidentType}>
              {item.type ? (t(`incident.types.${item.type.toLowerCase()}`) || item.type) : (t('officer.incidents') || 'Incident')}
            </Text>
            <Text style={styles.incidentDesc} numberOfLines={expanded ? undefined : 2}>
              {item.description || (lang === 'ta' ? 'விளக்கம் எதுவும் வழங்கப்படவில்லை.' : 'No description provided.')}
            </Text>
            <View style={styles.cardFooterRow}>
              <View style={[styles.statusBadge, { backgroundColor: statColor + '22' }]}>
                <Text style={[styles.statusBadgeText, { color: statColor }]}>
                  {getStatusLabel(item.status, lang)}
                </Text>
              </View>
              <View style={[styles.severityBadge, { backgroundColor: sevColor + '22' }]}>
                <Text style={[styles.severityBadgeText, { color: sevColor }]}>
                  {item.severity ? (t(`incident.severities.${item.severity.toLowerCase()}`) || item.severity).toUpperCase() : 'UNKNOWN'}
                </Text>
              </View>
            </View>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={THEME.textMuted}
          />
        </View>

        <View style={styles.cardInfoRow}>
          <Ionicons name="person-outline" size={13} color={THEME.textMuted} />
          <Text style={styles.infoText}>
            {item.reporter?.name
              || item.reportedBy?.name
              || (typeof item.reportedBy === 'string' ? item.reportedBy : '')
              || (lang === 'ta' ? 'அறியப்படாதவர்' : 'Unknown')}
          </Text>
          <Ionicons name="time-outline" size={13} color={THEME.textMuted} />
          <Text style={styles.infoText}>{timeAgo(item.createdAt)}</Text>
        </View>

        {item.location && (item.location.name || item.location.lat) && (
          <View style={styles.cardInfoRow}>
            <Ionicons name="location-outline" size={13} color={THEME.textMuted} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.location?.name
                || (item.location?.lat ? `${item.location.lat?.toFixed(4)}, ${item.location.lng?.toFixed(4)}` : (lang === 'ta' ? 'இருப்பிடம் அறியப்படவில்லை' : 'Location unknown'))}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedSection}>
          <View style={styles.divider} />

          {item.description && (
            <View style={styles.expandField}>
              <Text style={styles.expandLabel}>{lang === 'ta' ? 'முழு விளக்கம்' : 'Full Description'}</Text>
              <Text style={styles.expandValue}>{item.description}</Text>
            </View>
          )}

          {item.location && (
            <View style={styles.expandField}>
              <Text style={styles.expandLabel}>{t('catch.location') || 'Location'}</Text>
              <Text style={styles.expandValue}>
                {item.location.name
                  || (item.location.lat ? `Lat: ${item.location.lat?.toFixed(5)}, Lng: ${item.location.lng?.toFixed(5)}` : (lang === 'ta' ? 'பதிவு செய்யப்படவில்லை' : 'Not recorded'))}
              </Text>
            </View>
          )}

          {item.officerNotes && (
            <View style={styles.expandField}>
              <Text style={styles.expandLabel}>{lang === 'ta' ? 'அதிகாரி குறிப்புகள்' : 'Officer Notes'}</Text>
              <Text style={styles.expandValue}>{item.officerNotes}</Text>
            </View>
          )}

          <Text style={styles.expandLabel}>{lang === 'ta' ? 'நிலையை புதுப்பி' : 'Update Status'}</Text>
          <View style={styles.updateBtns}>
            {['in_progress', 'resolved', 'dismissed'].map((s) => {
              const c = STATUS_COLORS[s.replace(/_/g, ' ')] || THEME.textMuted;
              const current = normalizeStatus(item.status) === s.replace(/_/g, ' ');
              const labelText = s === 'in_progress' ? (lang === 'ta' ? 'செயல்பாட்டில்' : 'In Progress') : s === 'resolved' ? (lang === 'ta' ? 'தீர்க்கப்பட்டது' : 'Resolved') : (lang === 'ta' ? 'நிராகரிக்கப்பட்டது' : 'Dismissed');
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.updateBtn,
                    { borderColor: c },
                    current && { backgroundColor: c },
                  ]}
                  onPress={() => !current && onStatusUpdate(item, s)}
                  activeOpacity={current ? 1 : 0.8}
                >
                  <Text
                    style={[
                      styles.updateBtnText,
                      { color: current ? '#fff' : c },
                    ]}
                  >
                    {labelText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

export default function IncidentManageScreen() {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('All');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notesModal, setNotesModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchIncidents = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await api.get(ENDPOINTS.INCIDENTS || '/incidents');
      setIncidents(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Incidents fetch:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents(true);
  };

  const handleStatusUpdate = (item, newStatus) => {
    setSelected(item);
    setPendingStatus(newStatus);
    setNotes(item.officerNotes || '');
    setNotesModal(true);
  };

  const saveStatusUpdate = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      // Use PUT /:id (the existing route handles status + officerNotes)
      await api.put(`${ENDPOINTS.INCIDENTS || '/incidents'}/${selected._id}`, {
        status: pendingStatus,
        officerNotes: notes,
      });
      setNotesModal(false);
      fetchIncidents(true);
    } catch {
      Alert.alert(t('common.error') || 'Error', lang === 'ta' ? 'சம்பவத்தின் நிலையை புதுப்பிக்க முடியவில்லை.' : 'Failed to update incident status.');
    } finally {
      setSaving(false);
    }
  };

  const filteredData = activeTab === 'All'
    ? incidents
    : incidents.filter((i) => {
        const n = normalizeStatus(i.status);
        const tab = activeTab.toLowerCase();
        return n === tab || n === tab.replace(' ', '_');
      });

  const tabCounts = TABS.reduce((acc, tab) => {
    acc[tab] =
      tab === 'All'
        ? incidents.length
        : incidents.filter((i) => {
            const n = normalizeStatus(i.status);
            const t = tab.toLowerCase();
            return n === t || n === t.replace(' ', '_');
          }).length;
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('officer.incidents') || 'Incident Management'}</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchIncidents(true)}
        >
          <Ionicons name="refresh" size={20} color={THEME.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabScrollWrap}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const translatedTab = tab === 'All' ? (lang === 'ta' ? 'அனைத்தும்' : 'All') : tab === 'Pending' ? (t('sos.status.pending') || 'Pending') : tab === 'In Progress' ? (lang === 'ta' ? 'செயல்பாட்டில்' : 'In Progress') : (t('sos.status.resolved') || 'Resolved');
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {translatedTab}
                </Text>
              {tabCounts[tab] > 0 && (
                <View
                  style={[
                    styles.tabCount,
                    activeTab === tab && { backgroundColor: '#ffffff33' },
                  ]}
                >
                  <Text style={styles.tabCountText}>{tabCounts[tab]}</Text>
                </View>
              )}
            </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} colors={[THEME.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="document-outline" size={48} color={THEME.textMuted} />
              <Text style={styles.emptyTitle}>
                {lang === 'ta' ? `${activeTab === 'All' ? 'சம்பவங்கள்' : getStatusLabel(activeTab, lang)} எதுவும் இல்லை` : `No ${activeTab.toLowerCase()} incidents`}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <IncidentCard item={item} onStatusUpdate={handleStatusUpdate} />
          )}
        />
      )}

      {/* Notes Modal */}
      <Modal visible={notesModal} animationType="slide" transparent onRequestClose={() => setNotesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{lang === 'ta' ? 'சம்பவத்தை புதுப்பி' : 'Update Incident'}</Text>
              <TouchableOpacity onPress={() => setNotesModal(false)}>
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusPreview}>
              <Text style={styles.statusPreviewLabel}>{lang === 'ta' ? 'புதிய நிலை' : 'New Status'}</Text>
              <View
                style={[
                  styles.statusPreviewBadge,
                  { backgroundColor: (STATUS_COLORS[pendingStatus?.replace(/_/g, ' ')] || THEME.textMuted) + '22' },
                ]}
              >
                <Text
                  style={[
                    styles.statusPreviewText,
                    { color: STATUS_COLORS[pendingStatus?.replace(/_/g, ' ')] || THEME.textMuted },
                  ]}
                >
                  {getStatusLabel(pendingStatus, lang)}
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>{lang === 'ta' ? 'அதிகாரி குறிப்புகள்' : 'Officer Notes'}</Text>
            <TextInput
              style={styles.notesInput}
              placeholder={lang === 'ta' ? 'தீர்வு பற்றிய குறிப்புகளைச் சேர்க்கவும்...' : 'Add notes about the resolution…'}
              placeholderTextColor={THEME.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveStatusUpdate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{lang === 'ta' ? 'சம்பவத்தை புதுப்பி' : 'Update Incident'}</Text>
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
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tabScrollWrap: { paddingHorizontal: 16, marginBottom: 12 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  activeTab: { backgroundColor: THEME.primary },
  tabText: { fontSize: 12, color: THEME.textMuted, fontWeight: '600' },
  activeTabText: { color: '#fff' },
  tabCount: {
    backgroundColor: THEME.border,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabCountText: { fontSize: 9, color: THEME.text, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  typeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: { flex: 1, gap: 4 },
  incidentType: { fontSize: 15, fontWeight: '700', color: THEME.text },
  incidentDesc: { fontSize: 13, color: THEME.textMuted, lineHeight: 19 },
  cardFooterRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  severityBadgeText: { fontSize: 10, fontWeight: '700' },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  infoText: { fontSize: 12, color: THEME.textMuted, marginRight: 8 },
  expandedSection: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 10 },
  expandField: { marginBottom: 12 },
  expandLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  expandValue: { fontSize: 13, color: THEME.text, lineHeight: 19 },
  updateBtns: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  updateBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  updateBtnText: { fontSize: 12, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 15, color: THEME.textMuted, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: THEME.text },
  statusPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  statusPreviewLabel: { fontSize: 13, color: THEME.textMuted, fontWeight: '600' },
  statusPreviewBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusPreviewText: { fontSize: 13, fontWeight: '700' },
  inputLabel: { fontSize: 13, color: THEME.textMuted, fontWeight: '600', marginBottom: 8 },
  notesInput: {
    backgroundColor: THEME.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    color: THEME.text,
    fontSize: 14,
    padding: 14,
    minHeight: 100,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
