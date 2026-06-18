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
import axios from 'axios';

// ─── API Base (adjust to your env) ───────────────────────────────────────────
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

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

// ─── Screen states ────────────────────────────────────────────────────────────
const STATE = {
  IDLE:    'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR:   'error',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ForgotPasswordScreen({ navigation }) {
  const [email,     setEmail]     = useState('');
  const [uiState,   setUiState]   = useState(STATE.IDLE);
  const [error,     setError]     = useState('');

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    if (!validate()) return;

    try {
      setUiState(STATE.LOADING);
      await axios.post(`${API_BASE}/auth/forgot-password`, {
        email: email.trim().toLowerCase(),
      });
      setUiState(STATE.SUCCESS);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong. Please try again.';
      setError(msg);
      setUiState(STATE.ERROR);
    }
  };

  const handleRetry = () => {
    setUiState(STATE.IDLE);
    setError('');
  };

  // ── Render: Success ───────────────────────────────────────────────────────
  if (uiState === STATE.SUCCESS) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[styles.scroll, styles.centred]}
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtnAbsolute}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>

          {/* Success card */}
          <View style={styles.successCard}>
            {/* Animated checkmark circle */}
            <View style={styles.successRingOuter}>
              <View style={styles.successRingInner}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={40} color={C.success} />
                </View>
              </View>
            </View>

            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successSubtitle}>
              We've sent password reset instructions to:
            </Text>
            <View style={styles.emailPill}>
              <Ionicons name="mail" size={16} color={C.primary} />
              <Text style={styles.emailPillText}>{email.trim().toLowerCase()}</Text>
            </View>

            <View style={styles.successInfo}>
              <InfoRow icon="time-outline"   text="The link expires in 30 minutes." />
              <InfoRow icon="folder-outline" text="Check your spam/junk folder if not received." />
              <InfoRow icon="refresh-outline" text="Resend if you don't see it after a few minutes." />
            </View>

            {/* Back to login */}
            <TouchableOpacity
              style={styles.backToLoginBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.backToLoginBtnText}>Back to Sign In</Text>
            </TouchableOpacity>

            {/* Resend */}
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleRetry}
            >
              <Ionicons name="refresh-outline" size={16} color={C.textMuted} />
              <Text style={styles.resendBtnText}> Resend Email</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: Main ──────────────────────────────────────────────────────────
  const isLoading = uiState === STATE.LOADING;

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
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                <View style={styles.iconCircle}>
                  <Ionicons name="key" size={38} color={C.secondary} />
                </View>
              </View>
            </View>

            <View style={styles.waveRow}>
              <Ionicons name="water" size={16} color={C.primary} />
              <View style={styles.waveLine} />
              <Ionicons name="water" size={16} color={C.primary} />
            </View>

            <Text style={styles.heroTitle}>Forgot Password?</Text>
            <Text style={styles.heroSubtitle}>
              No worries! Enter your registered email{'\n'}and we'll send you reset instructions.
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {/* Error */}
            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={C.error} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Email input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, !!error && styles.inputWrapperError]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={error ? C.error : C.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your registered email"
                  placeholderTextColor={C.textMuted}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(''); setUiState(STATE.IDLE); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Help text */}
            <View style={styles.helpRow}>
              <Ionicons name="information-circle-outline" size={15} color={C.textMuted} />
              <Text style={styles.helpText}>
                {'  '}We'll send a secure link to reset your password.{'\n'}
                {'  '}The link will expire after 30 minutes.
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Send Reset Link</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Back to login */}
            <TouchableOpacity
              style={styles.backLinkRow}
              onPress={() => navigation.navigate('Login')}
            >
              <Ionicons name="arrow-back-outline" size={16} color={C.primary} />
              <Text style={styles.backLinkText}> Back to Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Steps */}
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>How it works</Text>
            <StepItem step="1" icon="mail-outline"       text="Enter your registered email address" />
            <StepItem step="2" icon="link-outline"       text="Receive a secure reset link in your inbox" />
            <StepItem step="3" icon="lock-open-outline"  text="Click the link and set your new password" />
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

// ─── Sub-component: InfoRow ───────────────────────────────────────────────────
function InfoRow({ icon, text }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={C.textMuted} />
      <Text style={styles.infoRowText}>{text}</Text>
    </View>
  );
}

// ─── Sub-component: StepItem ──────────────────────────────────────────────────
function StepItem({ step, icon, text }) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <View style={styles.stepIconCircle}>
        <Ionicons name={icon} size={18} color={C.primary} />
      </View>
      <Text style={styles.stepText}>{text}</Text>
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
  centred: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
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
  backBtnAbsolute: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 28,
  },
  ringOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: `${C.secondary}30`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ringInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1.5,
    borderColor: `${C.secondary}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${C.secondary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  waveLine: {
    height: 1,
    width: 50,
    backgroundColor: `${C.primary}55`,
    marginHorizontal: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 22,
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

  // Error
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
    marginBottom: 12,
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

  // Help
  helpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${C.primary}10`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${C.primary}20`,
  },
  helpText: {
    color: C.textMuted,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  // Submit
  submitBtn: {
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
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    color: C.textMuted,
    fontSize: 13,
    marginHorizontal: 12,
  },

  // Back link
  backLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLinkText: {
    color: C.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Steps card
  stepsCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 20,
  },
  stepsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  stepIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${C.primary}15`,
    borderWidth: 1,
    borderColor: `${C.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    color: C.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  // ── Success state ──────────────────────────────────────────────────────────
  successCard: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  successRingOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: `${C.success}35`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successRingInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1.5,
    borderColor: `${C.success}60`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: `${C.success}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${C.primary}18`,
    borderWidth: 1,
    borderColor: `${C.primary}40`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
    gap: 8,
  },
  emailPillText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  successInfo: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoRowText: {
    color: C.textMuted,
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  backToLoginBtn: {
    width: '100%',
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
    marginBottom: 14,
  },
  backToLoginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendBtnText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: '500',
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
