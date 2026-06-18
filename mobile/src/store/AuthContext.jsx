import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';
import { ENDPOINTS } from '../constants/api';
import { setLanguage } from '../i18n';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const [storedUser, accessToken] = await AsyncStorage.multiGet(['user', 'accessToken']);
      const parsedUser = storedUser[1] ? JSON.parse(storedUser[1]) : null;

      if (parsedUser && accessToken[1]) {
        setUser(parsedUser);
        if (parsedUser.preferredLanguage) {
          await setLanguage(parsedUser.preferredLanguage);
        }
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post(ENDPOINTS.LOGIN, { email, password });
    const { user: userData, accessToken, refreshToken } = res.data.data;

    await AsyncStorage.multiSet([
      ['user', JSON.stringify(userData)],
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
    ]);

    if (userData.preferredLanguage) {
      await setLanguage(userData.preferredLanguage);
    }

    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await api.post(ENDPOINTS.REGISTER, data);
    const { user: userData, accessToken, refreshToken } = res.data.data;

    await AsyncStorage.multiSet([
      ['user', JSON.stringify(userData)],
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
    ]);

    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['user', 'accessToken', 'refreshToken']);
    setUser(null);
  };

  const updateUser = async (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    await AsyncStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
