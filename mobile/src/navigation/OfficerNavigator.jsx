import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useLanguage } from '../store/LanguageContext';

import OfficerHomeScreen from '../screens/officer/OfficerHomeScreen';
import FishermenListScreen from '../screens/officer/FishermenListScreen';
import BoatMonitorScreen from '../screens/officer/BoatMonitorScreen';
import SOSMonitorScreen from '../screens/officer/SOSMonitorScreen';
import IncidentManageScreen from '../screens/officer/IncidentManageScreen';
import ComplaintResolveScreen from '../screens/officer/ComplaintResolveScreen';
import SchemePublishScreen from '../screens/officer/SchemePublishScreen';
import PriceManageScreen from '../screens/officer/PriceManageScreen';
import BroadcastScreen from '../screens/officer/BroadcastScreen';
import AnalyticsScreen from '../screens/officer/AnalyticsScreen';
import CatchMonitorScreen from '../screens/officer/CatchMonitorScreen';
import ProfileScreen from '../screens/fisherman/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OfficerHomeMain" component={OfficerHomeScreen} />
      <Stack.Screen name="FishermenList" component={FishermenListScreen} />
      <Stack.Screen name="BoatMonitor" component={BoatMonitorScreen} />
      <Stack.Screen name="CatchMonitor" component={CatchMonitorScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
    </Stack.Navigator>
  );
}

function AlertStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SOSMonitor" component={SOSMonitorScreen} />
      <Stack.Screen name="IncidentManage" component={IncidentManageScreen} />
      <Stack.Screen name="ComplaintResolve" component={ComplaintResolveScreen} />
    </Stack.Navigator>
  );
}

function ManageStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SchemePublish" component={SchemePublishScreen} />
      <Stack.Screen name="PriceManage" component={PriceManageScreen} />
      <Stack.Screen name="Broadcast" component={BroadcastScreen} />
    </Stack.Navigator>
  );
}

export default function OfficerNavigator() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.backgroundMid,
          borderTopColor: COLORS.border,
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 10 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Alerts: focused ? 'warning' : 'warning-outline',
            Manage: focused ? 'settings' : 'settings-outline',
            OfficerProfile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} options={{ tabBarLabel: t('nav.dashboard') || 'Dashboard' }} />
      <Tab.Screen name="Alerts" component={AlertStack} options={{ tabBarLabel: t('nav.alerts') || 'Alerts' }} />
      <Tab.Screen name="Manage" component={ManageStack} options={{ tabBarLabel: t('nav.manage') || 'Manage' }} />
      <Tab.Screen name="OfficerProfile" component={ProfileScreen} options={{ tabBarLabel: t('nav.profile') || 'Profile' }} />
    </Tab.Navigator>
  );
}
