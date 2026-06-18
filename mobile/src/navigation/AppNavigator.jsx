import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../store/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../constants/colors';

import AuthNavigator from './AuthNavigator';
import FishermanNavigator from './FishermanNavigator';
import OfficerNavigator from './OfficerNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user.role === 'officer' || user.role === 'admin' ? (
          <Stack.Screen name="Officer" component={OfficerNavigator} />
        ) : (
          <Stack.Screen name="Fisherman" component={FishermanNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
