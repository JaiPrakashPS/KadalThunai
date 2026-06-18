import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl, Modal, TextInput, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../store/LanguageContext';

const CATEGORIES = ['subsidy', 'insurance', 'training', 'equipment', 'welfare', 'financial'];

const emptyForm = () => ({ title: '', titleTamil: '', description: '', descriptionTamil: '', category: 'subsidy', eligibility: '', benefits: '', howToApply: '', deadline: '', isActive: true });

export default function SchemePublishScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editScheme, setEditScheme] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.SCHEMES, { params: { all: 'true', limit: 100 } });
      setSchemes(res.data.data || []);
    } catch (e) { console.warn(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditScheme(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (s) => { setEditScheme(s); setForm({ title: s.title, titleTamil: s.titleTamil || '', description: s.description, descriptionTamil: s.descriptionTamil || '', category: s.category, eligibility: s.eligibility || '', benefits: s.benefits || '', howToApply: s.howToApply || '', deadline: s.deadline ? s.deadline.split('T')[0] : '', isActive: s.isActive }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.title || !form.description) { Alert.alert(t('common.required') || 'Required', lang === 'ta' ? 'தலைப்பு மற்றும் விளக்கம் தேவை' : 'Title and description are required'); return; }
    setSaving(true);
    try {
      if (editScheme) await api.put(ENDPOINTS.SCHEME_BY_ID(editScheme._id), form);
      else await api.post(ENDPOINTS.SCHEMES, form);
      setShowModal(false);
      load();
    } catch (e) { Alert.alert(t('common.error') || 'Error', e.response?.data?.message || (lang === 'ta' ? 'சேமிக்க முடியவில்லை' : 'Save failed')); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s) => {
    try { await api.put(ENDPOINTS.SCHEME_BY_ID(s._id), { isActive: !s.isActive }); load(); }
    catch (e) { Alert.alert(t('common.error') || 'Error', lang === 'ta' ? 'புதுப்பித்தல் தோல்வியுற்றது' : 'Update failed'); }
  };

  const renderScheme = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.catBadge, { backgroundColor: COLORS.secondary + '22' }]}>
          <Text style={[styles.catText, { color: COLORS.secondary }]}>
            {t(`schemes.categories.${item.category}`) || item.category}
          </Text>
        </View>
        <Switch value={item.isActive} onValueChange={() => toggleActive(item)} trackColor={{ false: COLORS.border, true: COLORS.success + '66' }} thumbColor={item.isActive ? COLORS.success : COLORS.textMuted} />
      </View>
      <Text style={styles.schemeTitle}>{lang === 'ta' ? (item.titleTamil || item.title) : item.title}</Text>
      {lang !== 'ta' && item.titleTamil ? <Text style={styles.schemeTitleTamil}>{item.titleTamil}</Text> : null}
      <Text style={styles.schemeDesc} numberOfLines={2}>
        {lang === 'ta' ? (item.descriptionTamil || item.description) : item.description}
      </Text>
      <View style={styles.cardFooter}>
        {item.deadline && <Text style={styles.deadline}>📅 {new Date(item.deadline).toLocaleDateString('en-IN')}</Text>}
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Ionicons name="create-outline" size={14} color={COLORS.primary} />
          <Text style={styles.editBtnText}>{t('common.edit') || 'Edit'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('schemes.title') || 'Government Schemes'}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} /> : (
        <FlatList
          data={schemes}
          renderItem={renderScheme}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{lang === 'ta' ? 'திட்டங்கள் எதுவும் இல்லை' : 'No schemes yet'}</Text></View>}
        />
      )}

      <Modal visible={showModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editScheme ? (lang === 'ta' ? 'திட்டத்தை திருத்து' : 'Edit Scheme') : (lang === 'ta' ? 'புதிய திட்டம்' : 'New Scheme')}</Text>
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveModalBtnText}>{t('common.save') || 'Save'}</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {[
              ['title', lang === 'ta' ? 'தலைப்பு (ஆங்கிலம்)' : 'Title (English)'], 
              ['titleTamil', lang === 'ta' ? 'தலைப்பு (தமிழ்)' : 'Title (Tamil)'], 
              ['description', lang === 'ta' ? 'விளக்கம் (ஆங்கிலம்)' : 'Description (English)'], 
              ['descriptionTamil', lang === 'ta' ? 'விளக்கம் (தமிழ்)' : 'Description (Tamil)'], 
              ['eligibility', t('schemes.eligibility') || 'Eligibility'], 
              ['benefits', t('schemes.benefits') || 'Benefits'], 
              ['howToApply', t('schemes.howToApply') || 'How to Apply'], 
              ['deadline', lang === 'ta' ? 'கடைசி தேதி (YYYY-MM-DD)' : 'Deadline (YYYY-MM-DD)']
            ].map(([key, label]) => (
              <View key={key} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TextInput style={[styles.input, ['description', 'descriptionTamil', 'eligibility', 'benefits', 'howToApply'].includes(key) && { height: 90, textAlignVertical: 'top' }]} value={form[key]} onChangeText={v => setField(key, v)} multiline={['description', 'descriptionTamil', 'eligibility', 'benefits', 'howToApply'].includes(key)} placeholderTextColor={COLORS.textMuted} placeholder={label} />
              </View>
            ))}
            <Text style={styles.inputLabel}>{t('complaint.category') || 'Category'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.catChip, form.category === c && styles.catChipActive]} onPress={() => setField('category', c)}>
                  <Text style={[styles.catChipText, form.category === c && styles.catChipTextActive]}>
                    {t(`schemes.categories.${c}`) || c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{lang === 'ta' ? 'செயல்பாட்டில்' : 'Active'}</Text>
              <Switch value={form.isActive} onValueChange={v => setField('isActive', v)} trackColor={{ false: COLORS.border, true: COLORS.success + '66' }} thumbColor={form.isActive ? COLORS.success : COLORS.textMuted} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  list: { padding: SPACING.md, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  catText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  schemeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  schemeTitleTamil: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  schemeDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deadline: { fontSize: 12, color: COLORS.textMuted },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '22', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  editBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  saveModalBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 8 },
  saveModalBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  modalContent: { padding: SPACING.md, paddingBottom: 40 },
  inputGroup: { marginBottom: SPACING.md },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.backgroundMid, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: 14 },
  catChip: { backgroundColor: COLORS.backgroundLight, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  catChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  catChipText: { fontSize: 13, color: COLORS.textSecondary, textTransform: 'capitalize' },
  catChipTextActive: { color: COLORS.background, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm },
  switchLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
});
