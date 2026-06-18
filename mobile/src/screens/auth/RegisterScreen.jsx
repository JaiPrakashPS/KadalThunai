import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  background:  '#0A1628',
  surface:     '#0F2044',
  card:        '#162340',
  primary:     '#0066CC',
  primaryDark: '#0052A3',
  secondary:   '#F59E0B',
  text:        '#F1F5F9',
  textMuted:   '#94A3B8',
  border:      '#1E3A5F',
  error:       '#EF4444',
  success:     '#10B981',
};

// ─── Language Strings ─────────────────────────────────────────────────────────
const STRINGS = {
  en: {
    title:        'Create Account',
    subtitle:     'Join the KadalThunai community',
    langToggle:   'தமிழ்',
    fullName:     'Full Name',
    fullNamePh:   'Enter your full name',
    email:        'Email Address',
    emailPh:      'Enter your email',
    phone:        'Phone Number',
    phonePh:      'Enter your phone number',
    password:     'Password',
    passwordPh:   'Create a password',
    confirmPwd:   'Confirm Password',
    confirmPwdPh: 'Re-enter your password',
    register:     'Create Account',
    haveAccount:  'Already have an account? ',
    signIn:       'Sign In',
    terms:        'By registering you agree to our Terms of Service & Privacy Policy.',
  },
  ta: {
    title:        'கணக்கு உருவாக்கு',
    subtitle:     'கடல் துணை சமூகத்தில் சேரு',
    langToggle:   'English',
    fullName:     'முழு பெயர்',
    fullNamePh:   'உங்கள் முழு பெயரை உள்ளிடவும்',
    email:        'மின்னஞ்சல் முகவரி',
    emailPh:      'மின்னஞ்சலை உள்ளிடவும்',
    phone:        'தொலைபேசி எண்',
    phonePh:      'தொலைபேசி எண்ணை உள்ளிடவும்',
    password:     'கடவுச்சொல்',
    passwordPh:   'கடவுச்சொல் உருவாக்கவும்',
    confirmPwd:   'கடவுச்சொல் உறுதிப்படுத்து',
    confirmPwdPh: 'மீண்டும் கடவுச்சொல் உள்ளிடவும்',
    register:     'கணக்கு உருவாக்கு',
    haveAccount:  'ஏற்கனவே கணக்கு உள்ளதா? ',
    signIn:       'உள்நுழைக',
    terms:        'பதிவு செய்வதன் மூலம் எங்கள் விதிமுறைகளை ஒப்புக்கொள்கிறீர்கள்.',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  const [lang,           setLang]           = useState('en');
  const [fullName,       setFullName]       = useState('');
  const [email,          setEmail]          = useState('');
  const [phone,          setPhone]          = useState('');
  const [password,       setPassword]       = useState('');
  const [confirmPwd,     setConfirmPwd]     = useState('');
  const [showPwd,        setShowPwd]        = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [fieldErrors,    setFieldErrors]    = useState({});

  const s = STRINGS[lang];

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!fullName.trim())       errs.fullName   = 'Full name is required.';
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim())          errs.email      = 'Email is required.';
    else if (!emailRx.test(email.trim())) errs.email = 'Invalid email address.';
    if (!phone.trim())          errs.phone      = 'Phone number is required.';
    else if (!/^\d{10,15}$/.test(phone.replace(/\s/g, '')))
                                errs.phone      = 'Enter a valid phone number.';
    if (!password)              errs.password   = 'Password is required.';
    else if (password.length < 6) errs.password = 'At least 6 characters required.';
    if (!confirmPwd)            errs.confirmPwd = 'Please confirm your password.';
    else if (password !== confirmPwd) errs.confirmPwd = 'Passwords do not match.';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    setError('');
    if (!validate()) return;

    try {
      setLoading(true);
      await register({
        name:     fullName.trim(),
        email:    email.trim().toLowerCase(),
        phone:    phone.trim(),
        password,
      });
      // Navigation handled by root navigator after auth state changes
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header bar ── */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>

            {/* Language toggle */}
            <TouchableOpacity
              style={styles.langToggle}
              onPress={() => setLang((l) => (l === 'en' ? 'ta' : 'en'))}
            >
              <Ionicons name="language-outline" size={16} color={C.secondary} />
              <Text style={styles.langToggleText}>{s.langToggle}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Hero ── */}
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Ionicons name="fish" size={38} color={C.secondary} />
            </View>
            <Text style={styles.heroTitle}>{s.title}</Text>
            <Text style={styles.heroSubtitle}>{s.subtitle}</Text>

            {/* Step indicators */}
            <View style={styles.stepRow}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.stepDot, i === 0 && styles.stepDotActive]} />
              ))}
            </View>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>
            {/* Global error */}
            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={C.error} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Full Name */}
            <FormField
              label={s.fullName}
              placeholder={s.fullNamePh}
              value={fullName}
              onChangeText={(v) => { setFullName(v); clearFieldError('fullName'); }}
              icon="person-outline"
              error={fieldErrors.fullName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            {/* Email */}
            <FormField
              label={s.email}
              placeholder={s.emailPh}
              value={email}
              onChangeText={(v) => { setEmail(v); clearFieldError('email'); }}
              icon="mail-outline"
              error={fieldErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            {/* Phone */}
            <FormField
              label={s.phone}
              placeholder={s.phonePh}
              value={phone}
              onChangeText={(v) => { setPhone(v); clearFieldError('phone'); }}
              icon="call-outline"
              error={fieldErrors.phone}
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            {/* Password */}
            <FormField
              label={s.password}
              placeholder={s.passwordPh}
              value={password}
              onChangeText={(v) => { setPassword(v); clearFieldError('password'); }}
              icon="lock-closed-outline"
              error={fieldErrors.password}
              secureTextEntry={!showPwd}
              showToggle
              onToggle={() => setShowPwd((p) => !p)}
              showValue={showPwd}
              autoCapitalize="none"
              returnKeyType="next"
            />

            {/* Strength bar */}
            {!!password && <PasswordStrength password={password} />}

            {/* Confirm Password */}
            <FormField
              label={s.confirmPwd}
              placeholder={s.confirmPwdPh}
              value={confirmPwd}
              onChangeText={(v) => { setConfirmPwd(v); clearFieldError('confirmPwd'); }}
              icon="shield-checkmark-outline"
              error={fieldErrors.confirmPwd}
              secureTextEntry={!showConfirmPwd}
              showToggle
              onToggle={() => setShowConfirmPwd((p) => !p)}
              showValue={showConfirmPwd}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            {/* Terms */}
            <Text style={styles.terms}>{s.terms}</Text>

            {/* Register button */}
            <TouchableOpacity
              style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.registerBtnText}>{s.register}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Sign in link */}
            <View style={styles.signInRow}>
              <Text style={styles.signInPrompt}>{s.haveAccount}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signInLink}>{s.signIn}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={14} color={C.textMuted} />
            <Text style={styles.footerText}>  Secured with 256-bit encryption</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-component: FormField ─────────────────────────────────────────────────
function FormField({
  label, placeholder, value, onChangeText,
  icon, error, secureTextEntry, showToggle, onToggle, showValue,
  keyboardType = 'default', autoCapitalize = 'none',
  returnKeyType = 'next', onSubmitEditing,
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, !!error && styles.inputWrapperError]}>
        <Ionicons name={icon} size={20} color={error ? C.error : C.textMuted} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, showToggle && styles.inputWithToggle]}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggle} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={showValue ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {!!error && (
        <View style={styles.fieldErrorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={C.error} />
          <Text style={styles.fieldErrorText}> {error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Sub-component: PasswordStrength ─────────────────────────────────────────
function PasswordStrength({ password }) {
  const score = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = [C.error, '#F59E0B', '#3B82F6', C.success];
  const label  = labels[score - 1] || 'Very Weak';
  const color  = colors[score - 1] || C.error;

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.strengthBar,
              { backgroundColor: i <= score ? color : C.border },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  langToggleText: {
    color: C.secondary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: `${C.primary}20`,
    borderWidth: 2,
    borderColor: `${C.primary}50`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
  },
  stepDotActive: {
    backgroundColor: C.primary,
    width: 24,
  },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${C.error}15`,
    borderWidth: 1,
    borderColor: `${C.error}40`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    color: C.error,
    fontSize: 13,
    flex: 1,
  },

  // Input
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperError: {
    borderColor: `${C.error}80`,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    height: '100%',
  },
  inputWithToggle: {
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 2,
  },
  fieldErrorText: {
    color: C.error,
    fontSize: 12,
  },

  // Strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: -6,
    gap: 8,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },

  // Terms
  terms: {
    color: C.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    marginTop: 4,
  },

  // Register button
  registerBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 20,
  },
  registerBtnDisabled: {
    opacity: 0.65,
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Sign in
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInPrompt: {
    color: C.textMuted,
    fontSize: 14,
  },
  signInLink: {
    color: C.secondary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: C.textMuted,
    fontSize: 12,
  },
});
