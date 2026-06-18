import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import api from '../../api/axios';
import { ENDPOINTS } from '../../constants/api';
import { useLanguage } from '../../store/LanguageContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const THEME = {
  background: '#0A1628',
  surface: '#0F2044',
  primary: '#0066CC',
  secondary: '#F59E0B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#1E3A5F',
  success: '#22C55E',
  danger: '#EF4444',
  card: '#112352',
  chartGradientFrom: '#0066CC',
  chartGradientTo: '#003D7A',
};

const CHART_CONFIG = {
  backgroundColor: THEME.card,
  backgroundGradientFrom: '#112352',
  backgroundGradientTo: '#0A1628',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: {
    r: '5',
    strokeWidth: '2',
    stroke: '#0066CC',
  },
  propsForBackgroundLines: {
    stroke: '#1E3A5F',
    strokeDasharray: '4',
  },
};

const LINE_CHART_CONFIG = {
  ...CHART_CONFIG,
  color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
  propsForDots: {
    r: '5',
    strokeWidth: '2',
    stroke: '#F59E0B',
  },
};

const PLACEHOLDER_MONTHLY = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  earnings: [18000, 22000, 15000, 30000, 27000, 34000],
  catches: [12, 18, 10, 24, 20, 28],
};

const PLACEHOLDER_SPECIES = [
  { name: 'Seer Fish', tamil: 'வஞ்சிரம்', earnings: 14200, count: 8 },
  { name: 'Tuna', tamil: 'சூரை', earnings: 11800, count: 12 },
  { name: 'Red Snapper', tamil: 'சங்கரா', earnings: 9600, count: 6 },
  { name: 'Mackerel', tamil: 'அயிலை', earnings: 7400, count: 18 },
  { name: 'Pomfret', tamil: 'வாவல்', earnings: 6200, count: 5 },
];

const PLACEHOLDER_WEEKLY = [
  { week: 'Week 1', earnings: 8200, catches: 7 },
  { week: 'Week 2', earnings: 11400, catches: 9 },
  { week: 'Week 3', earnings: 7800, catches: 6 },
  { week: 'Week 4', earnings: 9600, catches: 8 },
];

export default function RevenueScreen({ navigation }) {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState(PLACEHOLDER_MONTHLY);
  const [topSpecies, setTopSpecies] = useState(PLACEHOLDER_SPECIES);
  const [weekly, setWeekly] = useState(PLACEHOLDER_WEEKLY);
  const [activeChart, setActiveChart] = useState('earnings');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const endpoint =
        ENDPOINTS.CATCHES_SUMMARY ||
        ENDPOINTS.REVENUE_SUMMARY ||
        '/catches/summary/monthly';
      const res = await api.get(endpoint);
      const data = res.data?.data || res.data;
      if (data) {
        setSummary(data.summary || data);
        if (data.monthly) setMonthly(data.monthly);
        if (data.top_species) setTopSpecies(data.top_species);
        if (data.weekly) setWeekly(data.weekly);
      }
    } catch {
      // Use placeholders
    } finally {
      setLoading(false);
    }
  };

  const barData = {
    labels: monthly.labels || [],
    datasets: [{ data: monthly.earnings || [] }],
  };

  const lineData = {
    labels: monthly.labels || [],
    datasets: [{ data: monthly.catches || [], strokeWidth: 2 }],
  };

  const chartWidth = SCREEN_WIDTH - 48;

  const todayEarnings = summary?.today_earnings ?? 0;
  const monthEarnings = summary?.month_earnings ?? (monthly.earnings?.slice(-1)[0] ?? 0);
  const monthCatches = summary?.month_catches ?? (monthly.catches?.slice(-1)[0] ?? 0);

  const renderStatCard = (icon, label, value, sublabel, color) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sublabel ? <Text style={styles.statSublabel}>{sublabel}</Text> : null}
    </View>
  );

  const renderTopSpeciesItem = (item, index) => {
    const maxEarnings = topSpecies[0]?.earnings || 1;
    const barWidth = (item.earnings / maxEarnings) * 100;
    const medals = ['🥇', '🥈', '🥉'];
    const speciesName = lang === 'ta' ? (item.tamil || item.name) : item.name;
    const speciesSub = lang === 'ta' && item.tamil ? item.name : (item.tamil || '');

    return (
      <View key={index} style={styles.speciesRow}>
        <Text style={styles.speciesRank}>
          {index < 3 ? medals[index] : `#${index + 1}`}
        </Text>
        <View style={styles.speciesInfo}>
          <View style={styles.speciesNameRow}>
            <Text style={styles.speciesName}>{speciesName}</Text>
            {speciesSub ? <Text style={styles.speciesTamil}>{speciesSub}</Text> : null}
          </View>
          <View style={styles.speciesBarBg}>
            <View
              style={[styles.speciesBarFill, { width: `${barWidth}%` }]}
            />
          </View>
        </View>
        <View style={styles.speciesEarnings}>
          <Text style={styles.speciesEarningsValue}>
            ₹{(item.earnings / 1000).toFixed(1)}k
          </Text>
          <Text style={styles.speciesCount}>{item.count} {t('revenue.catches') || 'catches'}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t('revenue.title') || 'Revenue Dashboard'}</Text>
          <Text style={styles.headerSub}>{lang === 'ta' ? 'வருவாய் மற்றும் மீன்பிடி புள்ளிவிவரங்கள்' : 'Revenue and catch analytics'}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchSummary}>
          <Ionicons name="refresh-outline" size={20} color={THEME.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>{lang === 'ta' ? 'வருவாய் புள்ளிவிவரங்களை ஏற்றுகிறது...' : 'Loading revenue data...'}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stat Cards */}
          <View style={styles.statsRow}>
            {renderStatCard(
              'cash-outline',
              t('revenue.todayEarnings') || "Today's Earnings",
              `₹${todayEarnings.toLocaleString('en-IN')}`,
              null,
              THEME.success,
            )}
            {renderStatCard(
              'trending-up-outline',
              t('revenue.thisMonth') || 'This Month',
              `₹${(monthEarnings / 1000).toFixed(1)}k`,
              null,
              THEME.primary,
            )}
            {renderStatCard(
              'fish-outline',
              t('revenue.monthlyCatches') || 'Monthly Catches',
              monthCatches.toString(),
              t('revenue.tripsCount') || 'trips',
              THEME.secondary,
            )}
          </View>

          {/* Chart Toggle */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('revenue.sixMonthOverview') || '6-Month Overview'}</Text>
              <View style={styles.chartToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    activeChart === 'earnings' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setActiveChart('earnings')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      activeChart === 'earnings' && styles.toggleBtnTextActive,
                    ]}
                  >
                    {t('revenue.earnings') || 'Earnings'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    activeChart === 'catches' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setActiveChart('catches')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      activeChart === 'catches' && styles.toggleBtnTextActive,
                    ]}
                  >
                    {t('revenue.catches') || 'Catches'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.chartCard}>
              {activeChart === 'earnings' ? (
                <>
                  <Text style={styles.chartLabel}>{t('revenue.monthlyEarningsLabel') || 'Monthly Earnings (₹)'}</Text>
                  <BarChart
                    data={barData}
                    width={chartWidth}
                    height={200}
                    chartConfig={CHART_CONFIG}
                    style={styles.chart}
                    fromZero
                    showValuesOnTopOfBars
                    withInnerLines
                    yAxisLabel="₹"
                    yAxisSuffix=""
                  />
                </>
              ) : (
                <>
                  <Text style={styles.chartLabel}>{t('revenue.monthlyCatchCountLabel') || 'Monthly Catch Count'}</Text>
                  <LineChart
                    data={lineData}
                    width={chartWidth}
                    height={200}
                    chartConfig={LINE_CHART_CONFIG}
                    style={styles.chart}
                    bezier
                    withInnerLines
                    withDots
                  />
                </>
              )}
            </View>
          </View>

          {/* Top Species */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('revenue.topSpecies') || 'Top 5 Species'}</Text>
              <Text style={styles.sectionSubtitle}>{t('revenue.byEarnings') || 'by earnings'}</Text>
            </View>
            <View style={styles.speciesCard}>
              {topSpecies.slice(0, 5).map(renderTopSpeciesItem)}
            </View>
          </View>

          {/* Weekly Breakdown */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('revenue.weeklyBreakdown') || 'Weekly Breakdown'}</Text>
              <Text style={styles.sectionSubtitle}>{t('revenue.thisMonth') || 'this month'}</Text>
            </View>
            <View style={styles.weeklyGrid}>
              {weekly.map((w, i) => (
                <View key={i} style={styles.weeklyCard}>
                  <Text style={styles.weekLabel}>
                    {w.week ? (lang === 'ta' ? w.week.replace('Week', t('revenue.weekLabel') || 'வாரம்') : w.week) : ''}
                  </Text>
                  <Text style={styles.weekEarnings}>
                    ₹{(w.earnings / 1000).toFixed(1)}k
                  </Text>
                  <View style={styles.weekCatchRow}>
                    <Ionicons name="fish-outline" size={11} color={THEME.textMuted} />
                    <Text style={styles.weekCatches}>{w.catches}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 1,
  },
  refreshBtn: {
    marginLeft: 'auto',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0066CC22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: THEME.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 14,
  },
  statSublabel: {
    fontSize: 9,
    color: THEME.border,
    marginTop: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  chartToggle: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 18,
  },
  toggleBtnActive: {
    backgroundColor: THEME.primary,
  },
  toggleBtnText: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  chartCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  chartLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  chart: {
    borderRadius: 12,
    marginLeft: -10,
  },
  speciesCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 14,
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  speciesRank: {
    fontSize: 16,
    width: 28,
    textAlign: 'center',
  },
  speciesInfo: {
    flex: 1,
  },
  speciesNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 5,
  },
  speciesName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  speciesTamil: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  speciesBarBg: {
    height: 4,
    backgroundColor: THEME.border,
    borderRadius: 2,
  },
  speciesBarFill: {
    height: 4,
    backgroundColor: THEME.primary,
    borderRadius: 2,
  },
  speciesEarnings: {
    alignItems: 'flex-end',
    minWidth: 56,
  },
  speciesEarningsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.success,
  },
  speciesCount: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 2,
  },
  weeklyGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  weeklyCard: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  weekLabel: {
    fontSize: 10,
    color: THEME.textMuted,
    fontWeight: '600',
    marginBottom: 6,
  },
  weekEarnings: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.secondary,
  },
  weekCatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  weekCatches: {
    fontSize: 11,
    color: THEME.textMuted,
  },
});
