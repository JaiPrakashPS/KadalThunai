import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../store/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

export default function LicenseScreen({ navigation }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(ENDPOINTS.MY_PROFILE).then(r => setProfile(r.data.data)).catch(console.warn).finally(() => setLoading(false));
  }, []);

  const p = profile?.profile || {};
  const licenseExpiry = p.licenseExpiry;
  const daysLeft = licenseExpiry ? Math.ceil((new Date(licenseExpiry) - new Date()) / 86400000) : null;
  const status = !licenseExpiry ? 'unknown' : daysLeft < 0 ? 'expired' : daysLeft < 30 ? 'expiring' : 'valid';

  const statusConfig = {
    valid: { color: COLORS.success, icon: 'checkmark-circle', label: 'Valid' },
    expiring: { color: COLORS.warning, icon: 'warning', label: 'Expiring Soon' },
    expired: { color: COLORS.danger, icon: 'close-circle', label: 'Expired' },
    unknown: { color: COLORS.textMuted, icon: 'help-circle', label: 'Not Set' },
  };
  const sc = statusConfig[status];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>மீனவ உரிமம்</Text>
        <View style={{ width: 36 }} />
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* License Card */}
          <View style={styles.licenseCard}>
            <View style={styles.licenseTopRow}>
              <View>
                <Text style={styles.cardLabel}>GOVERNMENT OF TAMIL NADU</Text>
                <Text style={styles.cardSubLabel}>Department of Fisheries</Text>
              </View>
              <Ionicons name="fish" size={32} color={COLORS.secondary} />
            </View>
            <Text style={styles.licenseTitle}>Fishing License</Text>
            <Text style={styles.licenseNo}>{p.licenseNo || 'TN-XXXX-XXXX'}</Text>
            <View style={styles.licenseDivider} />
            <View style={styles.licenseInfoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.licenseInfoLabel}>LICENSE HOLDER</Text>
                <Text style={styles.licenseInfoValue}>{profile?.user?.name || user?.name}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.licenseInfoLabel}>DISTRICT</Text>
                <Text style={styles.licenseInfoValue}>{p.district || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.licenseInfoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.licenseInfoLabel}>VILLAGE</Text>
                <Text style={styles.licenseInfoValue}>{p.village || 'N/A'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.licenseInfoLabel}>EXPIRY DATE</Text>
                <Text style={[styles.licenseInfoValue, { color: sc.color }]}>
                  {licenseExpiry ? new Date(licenseExpiry).toLocaleDateString('en-IN') : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Status Banner */}
          <View style={[styles.statusBanner, { backgroundColor: sc.color + '22', borderColor: sc.color + '44' }]}>
            <Ionicons name={sc.icon} size={22} color={sc.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: sc.color }]}>{sc.label}</Text>
              {daysLeft !== null && daysLeft >= 0 && (
                <Text style={styles.statusSub}>{daysLeft} days remaining</Text>
              )}
              {status === 'expired' && <Text style={styles.statusSub}>Please renew your license immediately</Text>}
              {status === 'expiring' && <Text style={styles.statusSub}>Renew before it expires to avoid penalties</Text>}
            </View>
          </View>

          {/* Renewal info */}
          {(status === 'expired' || status === 'expiring') && (
            <View style={styles.renewalCard}>
              <Text style={styles.renewalTitle}>🔄 Renewal Information</Text>
              <Text style={styles.renewalText}>Visit your nearest Fisheries Department office or the Tamil Nadu Fisheries Online Portal to renew your license.</Text>
              <Text style={styles.renewalContact}>📞 Helpline: 1800-XXX-XXXX</Text>
            </View>
          )}

          {/* Steps */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 License Steps</Text>
            {['Obtain from District Fisheries Office', 'Submit required documents', 'Pay prescribed fee', 'License issued within 7 days'].map((s, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  licenseCard: { backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.primary, ...SHADOWS.primary },
  licenseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  cardLabel: { fontSize: 9, fontWeight: '700', color: COLORS.secondary, letterSpacing: 1 },
  cardSubLabel: { fontSize: 10, color: COLORS.primaryMuted, marginTop: 2 },
  licenseTitle: { fontSize: 12, fontWeight: '600', color: COLORS.primaryMuted, letterSpacing: 1, marginBottom: 6 },
  licenseNo: { fontSize: 26, fontWeight: '900', color: COLORS.white, letterSpacing: 2, marginBottom: SPACING.md },
  licenseDivider: { height: 1, backgroundColor: COLORS.primary + '55', marginBottom: SPACING.md },
  licenseInfoRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  licenseInfoLabel: { fontSize: 9, fontWeight: '700', color: COLORS.primaryMuted, letterSpacing: 0.8, marginBottom: 3 },
  licenseInfoValue: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1 },
  statusLabel: { fontSize: 15, fontWeight: '700' },
  statusSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  renewalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.warning + '44' },
  renewalTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  renewalText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 8 },
  renewalContact: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  stepText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
});
