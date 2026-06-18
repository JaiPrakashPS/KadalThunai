import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const TYPE_CONFIG = {
  weather: { icon: 'partly-sunny', color: COLORS.info },
  emergency: { icon: 'alert-circle', color: COLORS.danger },
  scheme: { icon: 'document-text', color: COLORS.success },
  announcement: { icon: 'megaphone', color: COLORS.secondary },
  sos_update: { icon: 'warning', color: COLORS.danger },
  system: { icon: 'settings', color: COLORS.textMuted },
};

export default function NotificationsScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.NOTIFICATIONS, { params: { limit: 50 } });
      setNotifications(res.data.data || []);
    } catch (e) { console.warn(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await api.put(ENDPOINTS.NOTIFICATION_READ(id));
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (_) {}
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderItem = ({ item }) => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.announcement;
    const title = lang === 'ta' ? (item.titleTamil || item.title) : item.title;
    const body = lang === 'ta' ? (item.bodyTamil || item.body) : item.body;

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.notifUnread]}
        onPress={() => markRead(item._id)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconCircle, { backgroundColor: cfg.color + '22' }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle} numberOfLines={1}>{title}</Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>{body}</Text>
          <Text style={styles.notifTime}>{new Date(item.createdAt).toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-IN')}</Text>
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
        <Text style={styles.headerTitle}>{t('notifications.title') || 'Notifications'}</Text>
        {unreadCount > 0 ? (
          <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unreadCount}</Text></View>
        ) : <View style={{ width: 36 }} />}
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={56} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{lang === 'ta' ? 'அறிவிப்புகள் எதுவும் இல்லை' : 'No notifications yet'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  unreadBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center' },
  unreadBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 40 },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  notifUnread: { borderColor: COLORS.primary + '55', backgroundColor: COLORS.backgroundLight },
  iconCircle: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  notifBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 3 },
  notifBodyTamil: { fontSize: 12, color: COLORS.textMuted, marginBottom: 3 },
  notifTime: { fontSize: 11, color: COLORS.textMuted },
  empty: { alignItems: 'center', marginTop: 100, gap: 14 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
});
