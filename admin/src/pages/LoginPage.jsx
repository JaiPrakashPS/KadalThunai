import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎣</span>
          <h1 className={styles.logoTitle}>KadalThunai</h1>
          <p className={styles.logoSub}>Admin Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label className={styles.label}>Email Address</label>
            <input type="email" className={styles.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@kadalthunai.gov.in" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input type="password" className={styles.input} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className={styles.footer}>கடல் துணை · Tamil Nadu Fisheries Department</p>
      </div>
    </div>
  );
}
