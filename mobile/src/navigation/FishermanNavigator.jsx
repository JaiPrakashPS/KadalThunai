import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/colors';
import { useLanguage } from '../store/LanguageContext';

// Screens
import HomeScreen from '../screens/fisherman/HomeScreen';
import CatchRecordScreen from '../screens/fisherman/CatchRecordScreen';
import CatchHistoryScreen from '../screens/fisherman/CatchHistoryScreen';
import FishingZoneScreen from '../screens/fisherman/FishingZoneScreen';
import WeatherScreen from '../screens/fisherman/WeatherScreen';
import SOSScreen from '../screens/fisherman/SOSScreen';
import MarketPriceScreen from '../screens/fisherman/MarketPriceScreen';
import SchemesScreen from '../screens/fisherman/SchemesScreen';
import LicenseScreen from '../screens/fisherman/LicenseScreen';
import ComplaintScreen from '../screens/fisherman/ComplaintScreen';
import IncidentScreen from '../screens/fisherman/IncidentScreen';
import CompassScreen from '../screens/fisherman/CompassScreen';
import NearbyBoatsScreen from '../screens/fisherman/NearbyBoatsScreen';
import RevenueScreen from '../screens/fisherman/RevenueScreen';
import ProfileScreen from '../screens/fisherman/ProfileScreen';
import NotificationsScreen from '../screens/fisherman/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Weather" component={WeatherScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Schemes" component={SchemesScreen} />
      <Stack.Screen name="License" component={LicenseScreen} />
      <Stack.Screen name="NearbyBoats" component={NearbyBoatsScreen} />
    </Stack.Navigator>
  );
}

function CatchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CatchHistory" component={CatchHistoryScreen} />
      <Stack.Screen name="CatchRecord" component={CatchRecordScreen} />
      <Stack.Screen name="Revenue" component={RevenueScreen} />
    </Stack.Navigator>
  );
}

function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FishingZone" component={FishingZoneScreen} />
      <Stack.Screen name="Compass" component={CompassScreen} />
    </Stack.Navigator>
  );
}

function MarketStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MarketPrice" component={MarketPriceScreen} />
      <Stack.Screen name="Complaint" component={ComplaintScreen} />
      <Stack.Screen name="Incident" component={IncidentScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

export default function FishermanNavigator() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Catch: focused ? 'fish' : 'fish-outline',
            Map: focused ? 'map' : 'map-outline',
            Market: focused ? 'storefront' : 'storefront-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: t('nav.home') || 'Home' }} />
      <Tab.Screen name="Catch" component={CatchStack} options={{ tabBarLabel: t('nav.catch') || 'Catch' }} />
      <Tab.Screen
        name="SOS"
        component={SOSScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={styles.sosTab}>
              <Ionicons name="alert-circle" size={28} color={COLORS.white} />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Map" component={MapStack} options={{ tabBarLabel: t('nav.map') || 'Map' }} />
      <Tab.Screen name="Market" component={MarketStack} options={{ tabBarLabel: t('nav.market') || 'Market' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: t('nav.profile') || 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.backgroundMid,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 65,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  sosTab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.sos,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.sos,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
});
