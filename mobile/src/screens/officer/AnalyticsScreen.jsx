import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../store/LanguageContext';

const W = Dimensions.get('window').width - SPACING.md * 2;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_TAMIL = ['ஜன', 'பிப்', 'மார்', 'ஏப்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக', 'செப்', 'அக்', 'நவ', 'டிச'];

const chartConfig = {
  backgroundGradientFrom: COLORS.surface,
  backgroundGradientTo: COLORS.surface,
  color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
  labelColor: () => COLORS.textSecondary,
  strokeWidth: 2,
  barPercentage: 0.6,
  propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.primary },
};

export default function AnalyticsScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [catchData, setCatchData] = useState(null);
  const [sosData, setSosData] = useState(null);
  const [incidentData, setIncidentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, s, i] = await Promise.all([
          api.get(ENDPOINTS.ANALYTICS_CATCHES, { params: { year: new Date().getFullYear() } }),
          api.get(ENDPOINTS.ANALYTICS_SOS),
          api.get(ENDPOINTS.ANALYTICS_INCIDENTS),
        ]);
        setCatchData(c.data.data);
        setSosData(s.data.data);
        setIncidentData(i.data.data);
      } catch (e) { console.warn(e.message); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const buildMonthlyChart = (summary) => {
    const dataMap = {};
    (summary || []).forEach(s => { dataMap[s._id.month] = s.totalEarnings; });
    const labels = lang === 'ta' ? MONTHS_TAMIL.slice(0, 12) : MONTHS.slice(0, 12);
    const data = Array.from({ length: 12 }, (_, i) => dataMap[i + 1] || 0);
    return { labels: labels.filter((_, i) => data[i] > 0 || true).slice(0, 6), datasets: [{ data: data.slice(0, 6) }] };
  };

  const buildBarChart = (arr, key) => {
    if (!arr || arr.length === 0) return { labels: ['N/A'], datasets: [{ data: [0] }] };
    return {
      labels: arr.slice(0, 5).map(a => {
        const typeKey = a._id ? a._id.toLowerCase() : '';
        const rawLabel = t(`sos.types.${typeKey}`) || a._id || (lang === 'ta' ? 'இதர' : 'Other');
        return rawLabel.toString().slice(0, 10);
      }),
      datasets: [{ data: arr.slice(0, 5).map(a => a.count || a[key] || 0) }],
    };
  };

  const totalCatches = catchData?.monthlyStats?.reduce((s, m) => s + m.catchCount, 0) || 0;
  const totalEarnings = catchData?.monthlyStats?.reduce((s, m) => s + m.totalEarnings, 0) || 0;
  const totalSOS = sosData?.byStatus?.reduce((s, a) => s + a.count, 0) || 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="analytics" size={22} color={COLORS.secondary} />
        <Text style={styles.headerTitle}>{t('officer.analytics') || 'Analytics'}</Text>
        <View style={{ width: 36 }} />
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Overview Stats */}
          <View style={styles.statsRow}>
            {[
              { label: lang === 'ta' ? 'மொத்த மீன்பிடிப்பு' : 'Total Catches', value: totalCatches, icon: 'fish', color: COLORS.primary },
              { label: t('revenue.earnings') || 'Earnings', value: `₹${(totalEarnings / 1000).toFixed(0)}K`, icon: 'cash', color: COLORS.success },
              { label: t('officer.sosAlerts') || 'SOS Alerts', value: totalSOS, icon: 'warning', color: COLORS.danger },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { borderColor: s.color + '44' }]}>
                <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
                  <Ionicons name={s.icon} size={18} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Monthly Catches Chart */}
          {catchData?.monthlyStats?.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{lang === 'ta' ? 'மாதாந்திர வருவாய்' : 'Monthly Earnings'} ({new Date().getFullYear()})</Text>
              <BarChart
                data={buildMonthlyChart(catchData.monthlyStats)}
                width={W - SPACING.lg * 2}
                height={200}
                chartConfig={chartConfig}
                style={styles.chart}
                fromZero
              />
            </View>
          )}

          {/* Top Species */}
          {catchData?.topSpecies?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🐟 {lang === 'ta' ? 'அதிகம் பிடிக்கப்பட்ட மீன் வகைகள்' : 'Top Catch Species'}</Text>
              {catchData.topSpecies.slice(0, 5).map((s, i) => (
                <View key={s._id} style={styles.speciesRow}>
                  <Text style={styles.rank}>#{i + 1}</Text>
                  <Text style={styles.speciesName}>{s._id}</Text>
                  <Text style={styles.speciesWeight}>{s.totalWeight?.toFixed(0)} kg</Text>
                </View>
              ))}
            </View>
          )}

          {/* SOS by Type Chart */}
          {sosData?.byType?.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{lang === 'ta' ? 'அவசர நிலை வகை வாரியாக SOS' : 'SOS by Emergency Type'}</Text>
              <BarChart
                data={buildBarChart(sosData.byType, 'count')}
                width={W - SPACING.lg * 2}
                height={180}
                chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})` }}
                style={styles.chart}
                fromZero
              />
            </View>
          )}

          {/* Incidents by Status */}
          {incidentData?.byStatus?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚠️ {lang === 'ta' ? 'சம்பவங்கள் (நிலை வாரியாக)' : 'Incidents by Status'}</Text>
              {incidentData.byStatus.map(s => {
                const translatedStatus = s._id ? (
                  s._id.toLowerCase() === 'pending' ? (t('sos.status.pending') || 'Pending') :
                  s._id.toLowerCase() === 'in_progress' || s._id.toLowerCase() === 'in progress' ? (lang === 'ta' ? 'செயல்பாட்டில்' : 'In Progress') :
                  s._id.toLowerCase() === 'resolved' ? (t('sos.status.resolved') || 'Resolved') :
                  (lang === 'ta' ? 'நிராகரிக்கப்பட்டது' : 'Dismissed')
                ) : (lang === 'ta' ? 'அறியப்படாதது' : 'Unknown');
                return (
                  <View key={s._id} style={styles.statusRow}>
                    <Text style={styles.statusName}>{translatedStatus}</Text>
                    <View style={styles.statusBar}>
                      <View style={[styles.statusFill, { width: `${Math.min((s.count / (incidentData.byStatus.reduce((a, x) => a + x.count, 0) || 1)) * 100, 100)}%`, backgroundColor: COLORS.warning }]} />
                    </View>
                    <Text style={styles.statusCount}>{s.count}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 60, gap: SPACING.md },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, ...SHADOWS.sm },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  chartCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm, overflow: 'hidden' },
  chartTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  chart: { borderRadius: RADIUS.md, marginLeft: -SPACING.md },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  speciesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.border + '66' },
  rank: { width: 24, fontSize: 13, fontWeight: '800', color: COLORS.secondary, textAlign: 'center' },
  speciesName: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  speciesWeight: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  statusName: { width: 90, fontSize: 12, color: COLORS.textSecondary, textTransform: 'capitalize' },
  statusBar: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  statusFill: { height: '100%', borderRadius: 4 },
  statusCount: { width: 30, fontSize: 12, color: COLORS.textPrimary, fontWeight: '700', textAlign: 'right' },
});
