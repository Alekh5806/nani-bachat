import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

import { DashboardScreen } from '../screens/DashboardScreen';
import { InvestmentsScreen } from '../screens/InvestmentsScreen';
import { AddStockScreen } from '../screens/AddStockScreen';
import { MembersScreen } from '../screens/MembersScreen';
import { AddMemberScreen } from '../screens/AddMemberScreen';
import { ContributionsScreen } from '../screens/ContributionsScreen';
import { DividendsScreen } from '../screens/DividendsScreen';
import { AddDividendScreen } from '../screens/AddDividendScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ name, label, focused }) => {
  const icons = {
    Dashboard: { active: 'stats-chart', inactive: 'stats-chart-outline' },
    Investments: { active: 'trending-up', inactive: 'trending-up-outline' },
    Members: { active: 'people', inactive: 'people-outline' },
    Dividends: { active: 'cash', inactive: 'cash-outline' },
    Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
  };
  const icon = icons[name] || { active: 'ellipse', inactive: 'ellipse-outline' };
  const color = focused ? COLORS.tabBarActive : COLORS.tabBarInactive;

  return (
    <View style={styles.tabIconContainer}>
      {focused && <View style={styles.activeGlow} />}
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Ionicons
          name={focused ? icon.active : icon.inactive}
          size={22}
          color={color}
        />
      </View>
      <Text
        style={[styles.tabLabel, focused ? styles.tabLabelActive : styles.tabLabelInactive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
};

const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardHome" component={DashboardScreen} />
  </Stack.Navigator>
);

const InvestmentsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="InvestmentsHome" component={InvestmentsScreen} />
    <Stack.Screen name="AddStock" component={AddStockScreen} />
  </Stack.Navigator>
);

const MembersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MembersHome" component={MembersScreen} />
    <Stack.Screen name="AddMember" component={AddMemberScreen} />
    <Stack.Screen name="Contributions" component={ContributionsScreen} />
  </Stack.Navigator>
);

const DividendsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DividendsHome" component={DividendsScreen} />
    <Stack.Screen name="AddDividend" component={AddDividendScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileHome" component={ProfileScreen} />
  </Stack.Navigator>
);

export const MainNavigator = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} label={route.name} focused={focused} />
        ),
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: [
          styles.tabBar,
          {
            height: Platform.OS === 'android' ? 64 + Math.max(insets.bottom, 10) : 64 + insets.bottom,
            paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 10) : insets.bottom,
          },
        ],
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Investments" component={InvestmentsStack} />
      <Tab.Screen name="Members" component={MembersStack} />
      <Tab.Screen name="Dividends" component={DividendsStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1A1A1A',
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    paddingTop: 7,
  },
  tabBarItem: {
    flex: 1,
    minWidth: 0,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    minHeight: 52,
    position: 'relative',
  },
  activeGlow: {
    position: 'absolute',
    top: -3,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.accent,
    opacity: 0.1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(0, 208, 156, 0.12)',
  },
  tabLabel: {
    width: 58,
    fontSize: 10,
    lineHeight: 12,
    marginTop: 1,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: { color: COLORS.accent, fontWeight: '700' },
  tabLabelInactive: { color: COLORS.tabBarInactive },
});
