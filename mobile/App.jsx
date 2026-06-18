import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import { NetworkProvider } from './src/store/NetworkContext';
import { LanguageProvider } from './src/store/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/db/database';
import { initI18n } from './src/i18n';

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errStyles.container}>
          <Text style={errStyles.emoji}>⚠️</Text>
          <Text style={errStyles.title}>Something went wrong</Text>
          <Text style={errStyles.message}>{this.state.error?.message}</Text>
          <TouchableOpacity style={errStyles.btn} onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={errStyles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628', justifyContent: 'center', alignItems: 'center', padding: 32 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { color: '#F1F5F9', fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  message: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: '#0066CC', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const setup = async () => {
      try {
        await initI18n();
      } catch (e) {
        console.warn('i18n init warning:', e.message);
      }
      try {
        await initDatabase();
      } catch (e) {
        console.warn('SQLite init warning:', e.message);
        // Continue anyway — offline features may not work but auth/api still works
      }
      setDbReady(true);
    };
    setup();
  }, []);

  if (!dbReady) {
    return (
      <View style={errStyles.container}>
        <Text style={{ color: '#F1F5F9', fontSize: 16 }}>Starting KadalThunai...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <NetworkProvider>
              <LanguageProvider>
                <StatusBar style="light" backgroundColor="#0A1628" />
                <AppNavigator />
              </LanguageProvider>
            </NetworkProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
