import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../store/LanguageContext';

const emptyForm = () => ({ species: '', speciesTamil: '', price: '', minPrice: '', maxPrice: '', unit: 'kg', market: '', district: '' });

export default function PriceManageScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.MARKET_PRICES, { params: { limit: 100 } });
      setPrices(res.data.data || []);
    } catch (e) { console.warn(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fetchLive = async () => {
    setFetching(true);
    try {
      const res = await api.get(ENDPOINTS.MARKET_PRICES_LIVE);
      Alert.alert(lang === 'ta' ? 'வெற்றி' : 'Success', res.data.message);
      load();
    } catch (e) { Alert.alert(t('common.error') || 'Error', e.response?.data?.message || (lang === 'ta' ? 'பெறுதல் தோல்வியுற்றது' : 'Fetch failed')); }
    finally { setFetching(false); }
  };

  const openCreate = () => { setEditItem(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ species: item.species, speciesTamil: item.speciesTamil || '', price: String(item.price), minPrice: String(item.minPrice || ''), maxPrice: String(item.maxPrice || ''), unit: item.unit || 'kg', market: item.market, district: item.district }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.species || !form.price || !form.market) { Alert.alert(t('common.required') || 'Required', lang === 'ta' ? 'மீன் வகை, விலை மற்றும் சந்தை தேவை' : 'Species, Price, and Market are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price), minPrice: form.minPrice ? parseFloat(form.minPrice) : undefined, maxPrice: form.maxPrice ? parseFloat(form.maxPrice) : undefined };
      if (editItem) await api.put(`${ENDPOINTS.MARKET_PRICES}/${editItem._id}`, payload);
      else await api.post(ENDPOINTS.MARKET_PRICES, payload);
      setShowModal(false);
      load();
    } catch (e) { Alert.alert(t('common.error') || 'Error', e.response?.data?.message || (lang === 'ta' ? 'சேமிக்க முடியவில்லை' : 'Save failed')); }
    finally { setSaving(false); }
  };

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.species}>{lang === 'ta' ? (item.speciesTamil || item.species) : item.species}</Text>
        {lang !== 'ta' && item.speciesTamil ? <Text style={styles.speciesTamil}>{item.speciesTamil}</Text> : null}
        <Text style={styles.market}>{item.market} · {item.district}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.price}>₹{item.price}</Text>
        <Text style={styles.unit}>/{item.unit === 'kg' && lang === 'ta' ? 'கிலோ' : item.unit}</Text>
        {item.minPrice && item.maxPrice && <Text style={styles.range}>{item.minPrice}–{item.maxPrice}</Text>}
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Ionicons name="create-outline" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('officer.prices') || 'Fish Prices'}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.fetchBtn} onPress={fetchLive} disabled={fetching}>
        {fetching ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="cloud-download-outline" size={18} color={COLORS.white} />}
        <Text style={styles.fetchBtnText}>{fetching ? (lang === 'ta' ? 'பெறுகிறது...' : 'Fetching...') : (lang === 'ta' ? 'நேரடி விலைகளைப் பெறுங்கள்' : 'Fetch Live Prices')}</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} /> : (
        <FlatList
          data={prices}
          renderItem={renderItem}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="fish-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{lang === 'ta' ? 'விலைகள் எதுவும் சேர்க்கப்படவில்லை' : 'No prices added'}</Text></View>}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editItem ? (lang === 'ta' ? 'விலையைத் திருத்து' : 'Edit Price') : (lang === 'ta' ? 'விலையைச் சேர்' : 'Add Price')}</Text>
            {[
              ['species', lang === 'ta' ? 'மீன் வகை (ஆங்கிலம்)' : 'Species (English)', false], 
              ['speciesTamil', lang === 'ta' ? 'மீன் வகை (தமிழ்)' : 'Species (Tamil)', false], 
              ['price', lang === 'ta' ? 'விலை (₹)' : 'Price (₹)', true], 
              ['minPrice', lang === 'ta' ? 'குறைந்தபட்ச விலை' : 'Min Price', true], 
              ['maxPrice', lang === 'ta' ? 'அதிகபட்ச விலை' : 'Max Price', true], 
              ['market', lang === 'ta' ? 'சந்தை பெயர்' : 'Market Name', false], 
              ['district', t('profile.district') || 'District', false]
            ].map(([key, label, numeric]) => (
              <View key={key} style={{ marginBottom: 12 }}>
                <Text style={styles.label}>{label}</Text>
                <TextInput style={styles.input} value={form[key]} onChangeText={v => setField(key, v)} keyboardType={numeric ? 'numeric' : 'default'} placeholder={label} placeholderTextColor={COLORS.textMuted} />
              </View>
            ))}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>{t('common.cancel') || 'Cancel'}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>}
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
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  fetchBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.success, marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.md, padding: 12, justifyContent: 'center' },
  fetchBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: SPACING.md, gap: 10, paddingBottom: 40 },
  card: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cardLeft: { flex: 1 },
  species: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  speciesTamil: { fontSize: 12, color: COLORS.textSecondary },
  market: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  price: { fontSize: 22, fontWeight: '800', color: COLORS.secondary },
  unit: { fontSize: 11, color: COLORS.textMuted },
  range: { fontSize: 11, color: COLORS.textMuted },
  editBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary + '22', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.backgroundMid, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, borderTopWidth: 1, borderTopColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 5, textTransform: 'uppercase' },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, color: COLORS.textPrimary, fontSize: 14 },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveModalBtn: { flex: 1, padding: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontWeight: '700' },
});
