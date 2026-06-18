import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../store/AuthContext';
import { setLanguage } from '../../i18n';

const C = {
  background: '#0A1628', surface: '#0F2044', card: '#162340',
  primary: '#0066CC', primaryDark: '#0052A3', secondary: '#F59E0B',
  success: '#10B981', text: '#F1F5F9', textMuted: '#94A3B8',
  border: '#1E3A5F', error: '#EF4444',
};

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [lang, setLang] = useState('ta');
  const [role, setRole] = useState('fisherman');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const labels = {
    en: {
      welcome: 'Welcome Back', subtitle: 'Sign in to continue',
      emailPlaceholder: 'Enter your email', passwordPlaceholder: 'Enter your password',
      signIn: 'Sign In', forgotPassword: 'Forgot Password?',
      noAccount: "Don't have an account?", register: 'Register',
      fisherman: 'Fisherman', officer: 'Officer',
      emailLabel: 'Email Address', passwordLabel: 'Password',
    },
    ta: {
      welcome: 'மீண்டும் வரவேற்கிறோம்', subtitle: 'தொடர உள்நுழைக',
      emailPlaceholder: 'மின்னஞ்சல் உள்ளிடுக', passwordPlaceholder: 'கடவுச்சொல் உள்ளிடுக',
      signIn: 'உள்நுழை', forgotPassword: 'கடவுச்சொல் மறந்தீர்களா?',
      noAccount: 'கணக்கு இல்லையா?', register: 'பதிவு செய்யுங்கள்',
      fisherman: 'மீனவர்', officer: 'அதிகாரி',
      emailLabel: 'மின்னஞ்சல்', passwordLabel: 'கடவுச்சொல்',
    },
  };
  const L = labels[lang];

  const switchLang = async (l) => {
    setLang(l);
    await setLanguage(l);
    await AsyncStorage.setItem('preferredLanguage', l);
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    try {
      setLoading(true);
      const user = await login(email.trim().toLowerCase(), password);
      // Navigation handled by root navigator based on user.role
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Language Toggle */}
          <View style={styles.langRow}>
            <TouchableOpacity style={[styles.langBtn, lang === 'en' && styles.langBtnActive]} onPress={() => switchLang('en')}>
              <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.langBtn, lang === 'ta' && styles.langBtnActive]} onPress={() => switchLang('ta')}>
              <Text style={[styles.langText, lang === 'ta' && styles.langTextActive]}>தமிழ்</Text>
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                <View style={styles.iconCircle}>
                  <Ionicons name="fish" size={44} color={C.secondary} />
                </View>
              </View>
            </View>
            <Text style={styles.appName}>KadalThunai</Text>
            <Text style={styles.appTagline}>கடல் துணை</Text>
          </View>

          {/* Role Selector */}
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'fisherman' && styles.roleBtnActive]}
              onPress={() => setRole('fisherman')}
            >
              <Text style={styles.roleEmoji}>🎣</Text>
              <Text style={[styles.roleText, role === 'fisherman' && styles.roleTextActive]}>{L.fisherman}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'officer' && styles.roleBtnActive, role === 'officer' && styles.roleBtnOfficer]}
              onPress={() => setRole('officer')}
            >
              <Text style={styles.roleEmoji}>🎖️</Text>
              <Text style={[styles.roleText, role === 'officer' && styles.roleTextActive]}>{L.officer}</Text>
            </TouchableOpacity>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{L.welcome}</Text>
            <Text style={styles.cardSubtitle}>{L.subtitle}</Text>

            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={C.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{L.emailLabel}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={C.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={L.emailPlaceholder}
                  placeholderTextColor={C.textMuted}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{L.passwordLabel}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={C.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={L.passwordPlaceholder}
                  placeholderTextColor={C.textMuted}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(''); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotRow} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>{L.forgotPassword}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginBtn, role === 'officer' && styles.loginBtnOfficer, loading && { opacity: 0.65 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.loginBtnText}>{L.signIn}</Text>
                </>
              )}
            </TouchableOpacity>

            {role === 'fisherman' && (
              <View style={styles.registerRow}>
                <Text style={styles.registerPrompt}>{L.noAccount} </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerLink}>{L.register}</Text>
                </TouchableOpacity>
              </View>
            )}

            {role === 'officer' && (
              <View style={styles.officerNote}>
                <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                <Text style={styles.officerNoteText}>
                  {lang === 'ta' ? 'அதிகாரி கணக்கை நிர்வாகி உருவாக்குவார்' : 'Officer accounts are created by admin'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={14} color={C.textMuted} />
            <Text style={styles.footerText}>  {lang === 'ta' ? '256-பிட் குறியாக்கம்' : 'Secured with 256-bit encryption'}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  langRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 16, gap: 8 },
  langBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  langBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  langText: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
  langTextActive: { color: '#fff' },

  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
  ringOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: `${C.primary}40`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ringInner: { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: `${C.primary}70`, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 62, height: 62, borderRadius: 31, backgroundColor: `${C.primary}25`, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: 1, marginBottom: 4 },
  appTagline: { fontSize: 16, fontWeight: '600', color: C.secondary },

  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: C.border, backgroundColor: C.card },
  roleBtnActive: { borderColor: C.primary, backgroundColor: `${C.primary}22` },
  roleBtnOfficer: { borderColor: C.success, backgroundColor: `${C.success}22` },
  roleEmoji: { fontSize: 20 },
  roleText: { fontSize: 15, fontWeight: '700', color: C.textMuted },
  roleTextActive: { color: C.text },

  card: { backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: C.textMuted, marginBottom: 20 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${C.error}15`, borderWidth: 1, borderColor: `${C.error}40`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, gap: 8 },
  errorText: { color: C.error, fontSize: 13, flex: 1 },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: C.text, fontSize: 15, height: '100%' },
  eyeBtn: { padding: 4 },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { color: C.primary, fontSize: 13, fontWeight: '600' },

  loginBtn: { backgroundColor: C.primary, borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 6, marginBottom: 16 },
  loginBtnOfficer: { backgroundColor: C.success, shadowColor: C.success },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  registerPrompt: { color: C.textMuted, fontSize: 14 },
  registerLink: { color: C.secondary, fontSize: 14, fontWeight: '700' },

  officerNote: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8 },
  officerNoteText: { color: C.textMuted, fontSize: 12 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  footerText: { color: C.textMuted, fontSize: 12 },
});
