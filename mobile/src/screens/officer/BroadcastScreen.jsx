import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../store/LanguageContext';

const ROLES = ['all', 'fisherman', 'officer'];
const TYPES = ['announcement', 'weather', 'emergency'];
const TYPE_ICONS = { announcement: 'megaphone', weather: 'partly-sunny', emergency: 'warning' };
const TYPE_COLORS = { announcement: COLORS.secondary, weather: COLORS.info, emergency: COLORS.danger };

export default function BroadcastScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState({ title: '', titleTamil: '', body: '', bodyTamil: '', targetRole: 'all', type: 'announcement', priority: false });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentInfo, setSentInfo] = useState('');

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const getTargetLabelLocal = (role) => {
    if (role === 'all') return lang === 'ta' ? 'அனைவரும்' : 'Everyone';
    if (role === 'fisherman') return t('officer.fishermen') || 'Fishermen';
    if (role === 'officer') return lang === 'ta' ? 'அதிகாரிகள்' : 'Officers';
    return role;
  };

  const handleSend = async () => {
    if (!form.title || !form.body) { Alert.alert(t('common.required') || 'Required', lang === 'ta' ? 'தலைப்பு மற்றும் செய்தி உடல் தேவை' : 'Title and message body are required'); return; }
    Alert.alert(
      lang === 'ta' ? 'ஒளிபரப்பை உறுதிப்படுத்து' : 'Confirm Broadcast',
      lang === 'ta' ? `அறிவிப்பை அனுப்புவதற்கான இலக்கு: ${getTargetLabelLocal(form.targetRole)}\n\n"${form.title}"` : `Send notification to: ${getTargetLabelLocal(form.targetRole)}\n\n"${form.title}"`,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: lang === 'ta' ? 'அனுப்பு' : 'Send', style: 'destructive', onPress: async () => {
            setSending(true);
            try {
              const res = await api.post(ENDPOINTS.NOTIFICATIONS_BROADCAST, { ...form, priority: form.priority ? 'high' : 'normal' });
              setSentInfo(res.data.message);
              setSent(true);
              setForm({ title: '', titleTamil: '', body: '', bodyTamil: '', targetRole: 'all', type: 'announcement', priority: false });
            } catch (e) { Alert.alert(t('common.error') || 'Error', e.response?.data?.message || (lang === 'ta' ? 'அனுப்ப முடியவில்லை' : 'Send failed')); }
            finally { setSending(false); }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('officer.broadcast') || 'Broadcast'}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {sent && (
          <View style={styles.sentBanner}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.sentText}>{sentInfo || (lang === 'ta' ? 'அறிவிப்பு அனுப்பப்பட்டது!' : 'Notification sent!')}</Text>
          </View>
        )}
        {/* Type selector */}
        <Text style={styles.sectionLabel}>{lang === 'ta' ? 'அறிவிப்பு வகை' : 'Notification Type'}</Text>
        <View style={styles.typeRow}>
          {TYPES.map(ty => {
            const translatedType = ty === 'announcement' ? (t('notifications.types.announcement') || 'Announcement') : ty === 'weather' ? (t('notifications.types.weather') || 'Weather') : (t('notifications.types.emergency') || 'Emergency');
            return (
              <TouchableOpacity key={ty} style={[styles.typeChip, form.type === ty && { backgroundColor: TYPE_COLORS[ty], borderColor: TYPE_COLORS[ty] }]} onPress={() => setField('type', ty)}>
                <Ionicons name={TYPE_ICONS[ty]} size={16} color={form.type === ty ? COLORS.white : COLORS.textMuted} />
                <Text style={[styles.typeChipText, form.type === ty && { color: COLORS.white, fontWeight: '700' }]}>{translatedType}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Target */}
        <Text style={styles.sectionLabel}>{lang === 'ta' ? 'இலக்கு பார்வையாளர்கள்' : 'Target Audience'}</Text>
        <View style={styles.roleRow}>
          {ROLES.map(r => (
            <TouchableOpacity key={r} style={[styles.roleChip, form.targetRole === r && styles.roleChipActive]} onPress={() => setField('targetRole', r)}>
              <Text style={[styles.roleChipText, form.targetRole === r && styles.roleChipTextActive]}>{getTargetLabelLocal(r)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Priority */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>{lang === 'ta' ? 'உயர் முன்னுரிமை' : 'High Priority'}</Text>
            <Text style={styles.switchSub}>{lang === 'ta' ? 'அவசர அறிவிப்பாகக் காண்பிக்கப்படும்' : 'Will show as urgent notification'}</Text>
          </View>
          <Switch value={form.priority} onValueChange={v => setField('priority', v)} trackColor={{ false: COLORS.border, true: COLORS.danger + '66' }} thumbColor={form.priority ? COLORS.danger : COLORS.textMuted} />
        </View>
        {/* Fields */}
        {[
          ['title', lang === 'ta' ? 'தலைப்பு (ஆங்கிலம்)' : 'Title (English)'], 
          ['titleTamil', lang === 'ta' ? 'தலைப்பு (தமிழ்)' : 'Title (Tamil)'], 
          ['body', lang === 'ta' ? 'செய்தி (ஆங்கிலம்)' : 'Message (English)'], 
          ['bodyTamil', lang === 'ta' ? 'செய்தி (தமிழ்)' : 'Message (Tamil)']
        ].map(([key, label]) => (
          <View key={key} style={{ marginBottom: SPACING.md }}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
              style={[styles.input, ['body', 'bodyTamil'].includes(key) && { height: 100, textAlignVertical: 'top' }]}
              value={form[key]}
              onChangeText={v => setField(key, v)}
              multiline={['body', 'bodyTamil'].includes(key)}
              placeholder={label}
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        ))}
        {/* Preview */}
        {(form.title || form.body) && (
          <View style={[styles.preview, { borderColor: TYPE_COLORS[form.type] + '55' }]}>
            <Text style={styles.previewLabel}>{lang === 'ta' ? 'முன்னோட்டம்' : 'Preview'}</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewTop}>
                <Ionicons name={TYPE_ICONS[form.type]} size={16} color={TYPE_COLORS[form.type]} />
                <Text style={[styles.previewTitle, { color: TYPE_COLORS[form.type] }]}>{form.title || (lang === 'ta' ? 'அறிவிப்பு தலைப்பு' : 'Notification Title')}</Text>
              </View>
              <Text style={styles.previewBody}>{form.body || (lang === 'ta' ? 'செய்தி உள்ளடக்கம்...' : 'Message content...')}</Text>
              {form.bodyTamil ? <Text style={styles.previewBodyTamil}>{form.bodyTamil}</Text> : null}
            </View>
          </View>
        )}
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: TYPE_COLORS[form.type] }]} onPress={handleSend} disabled={sending}>
          {sending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="send" size={18} color={COLORS.white} />}
          <Text style={styles.sendBtnText}>{sending ? (lang === 'ta' ? 'அனுப்பப்படுகிறது...' : 'Sending...') : (lang === 'ta' ? 'அறிவிப்பை ஒளிபரப்பு' : 'Broadcast Notification')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  content: { padding: SPACING.md, paddingBottom: 60 },
  sentBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.success + '22', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.success + '44' },
  sentText: { fontSize: 13, color: COLORS.success, fontWeight: '600', flex: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.backgroundLight, borderRadius: RADIUS.md, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  typeChipText: { fontSize: 12, color: COLORS.textMuted, textTransform: 'capitalize', fontWeight: '500' },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
  roleChip: { flex: 1, alignItems: 'center', backgroundColor: COLORS.backgroundLight, borderRadius: RADIUS.md, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  roleChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleChipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  roleChipTextActive: { color: COLORS.white, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  switchLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  switchSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: 14 },
  preview: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, marginBottom: SPACING.lg },
  previewLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase' },
  previewCard: { gap: 6 },
  previewTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewTitle: { fontSize: 15, fontWeight: '700' },
  previewBody: { fontSize: 13, color: COLORS.textSecondary },
  previewBodyTamil: { fontSize: 12, color: COLORS.textMuted },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: RADIUS.lg, paddingVertical: 16, ...SHADOWS.lg },
  sendBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
