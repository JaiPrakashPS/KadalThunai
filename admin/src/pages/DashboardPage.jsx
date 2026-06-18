import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from './Dashboard.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [catchData, setCatchData] = useState(null);
  const [sosData, setSosData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = api.get('/weather', { params: { lat: 13.0827, lon: 80.2707 } })
      .then(res => res.data.data)
      .catch(() => null);

    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/catches', { params: { year: new Date().getFullYear() } }),
      api.get('/analytics/sos'),
      fetchWeather,
    ]).then(([ov, cd, sd, wt]) => {
      setOverview(ov.data.data);
      setCatchData(cd.data.data);
      setSosData(sd.data.data);
      setWeather(wt);
    }).catch(console.warn).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading analytics...</div>;

  const monthlyData = MONTHS.map((m, i) => {
    const found = catchData?.monthlyStats?.find(s => s._id.month === i + 1);
    return { month: m, earnings: found?.totalEarnings || 0, catches: found?.catchCount || 0 };
  });

  const stats = [
    { label: 'Fishermen', value: overview?.fishermen?.total || 0, icon: '🎣', color: '#0066CC', bg: 'rgba(0,102,204,0.15)' },
    { label: 'Officers', value: overview?.officers?.total || 0, icon: '🎖️', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Active Boats', value: overview?.boats?.total || 0, icon: '⛵', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Total Catches', value: overview?.catches?.total || 0, icon: '🐟', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    { label: 'SOS Pending', value: overview?.sos?.pending || 0, icon: '🆘', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
    { label: 'Open Incidents', value: overview?.incidents?.open || 0, icon: '⚠️', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Open Complaints', value: overview?.complaints?.open || 0, icon: '📋', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  ];

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Dashboard Overview</h2>
      <p className={styles.subtitle}>KadalThunai – Tamil Nadu Fisheries Management</p>

      {/* Weather Strip */}
      {weather && (
        <div className={styles.weatherStrip}>
          <div className={styles.weatherItem}>
            <span className={styles.weatherIcon}>🌦️</span>
            <div>
              <div className={styles.weatherLabel}>Chennai Coast Weather</div>
              <div className={styles.weatherVal}>{Math.round(weather.temperature ?? weather.temp ?? 28)}°C · {weather.condition || 'Clear'}</div>
            </div>
          </div>
          <div className={styles.weatherDivider} />
          <div className={styles.weatherItem}>
            <span className={styles.weatherIcon}>💨</span>
            <div>
              <div className={styles.weatherLabel}>Wind Speed</div>
              <div className={styles.weatherVal}>{weather.windSpeed ?? weather.wind_speed ?? 5.2} km/h</div>
            </div>
          </div>
          <div className={styles.weatherDivider} />
          <div className={styles.weatherItem}>
            <span className={styles.weatherIcon}>💧</span>
            <div>
              <div className={styles.weatherLabel}>Humidity</div>
              <div className={styles.weatherVal}>{weather.humidity ?? 78}%</div>
            </div>
          </div>
          <div className={styles.weatherDivider} />
          <div className={styles.weatherItem}>
            <span className={styles.weatherIcon}>👁️</span>
            <div>
              <div className={styles.weatherLabel}>Visibility</div>
              <div className={styles.weatherVal}>{(weather.visibility ?? 10000) / 1000} km</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {stats.map(s => (
          <div key={s.label} className={styles.statCard} style={{ borderColor: s.color + '44' }}>
            <div className={styles.statIcon} style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className={styles.statValue} style={{ color: s.color }}>{s.value.toLocaleString()}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        {/* Monthly Earnings */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Monthly Earnings ({new Date().getFullYear()})</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ left: -20 }}>
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Earnings']} contentStyle={{ background: '#0F2044', border: '1px solid #1E3A5F', borderRadius: 8, color: '#F1F5F9' }} />
              <Bar dataKey="earnings" radius={[4, 4, 0, 0]}>
                {monthlyData.map((_, i) => <Cell key={i} fill={`rgba(0,102,204,${0.4 + (i / 24)})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Catches Line */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Monthly Catch Count</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData} margin={{ left: -20 }}>
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [v, 'Catches']} contentStyle={{ background: '#0F2044', border: '1px solid #1E3A5F', borderRadius: 8, color: '#F1F5F9' }} />
              <Line type="monotone" dataKey="catches" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SOS Status + Top Species */}
      <div className={styles.bottomRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>SOS by Emergency Type</h3>
          {sosData?.byType?.length ? (
            <div className={styles.barList}>
              {sosData.byType.map(s => (
                <div key={s._id} className={styles.barItem}>
                  <span className={styles.barLabel}>{s._id || 'Other'}</span>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${Math.min((s.count / Math.max(...sosData.byType.map(x => x.count), 1)) * 100, 100)}%` }} />
                  </div>
                  <span className={styles.barValue}>{s.count}</span>
                </div>
              ))}
            </div>
          ) : <p className={styles.empty}>No SOS data</p>}
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Top Species Caught</h3>
          {catchData?.topSpecies?.length ? (
            <div className={styles.speciesList}>
              {catchData.topSpecies.slice(0, 7).map((s, i) => (
                <div key={s._id} className={styles.speciesItem}>
                  <span className={styles.speciesRank}>#{i + 1}</span>
                  <span className={styles.speciesName}>{s._id}</span>
                  <span className={styles.speciesWeight}>{(s.totalWeight || 0).toFixed(0)} kg</span>
                </div>
              ))}
            </div>
          ) : <p className={styles.empty}>No species data</p>}
        </div>
      </div>
    </div>
  );
}
