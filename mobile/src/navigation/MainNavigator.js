/**
 * Main Tab Navigator
 * Bottom tab navigation with Groww-style modern styling
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme/colors';

// Screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { InvestmentsScreen } from '../screens/InvestmentsScreen';
import { AddStockScreen } from '../screens/AddStockScreen';
import { MembersScreen } from '../screens/MembersScreen';
import { DividendsScreen } from '../screens/DividendsScreen';
import { AddDividendScreen } from '../screens/AddDividendScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ContributionsScreen } from '../screens/ContributionsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab Icon Component — clean SVG-style text icons ──
const TabIcon = ({ name, label, focused }) => {
  const icons = {
    Dashboard: { active: '▣', inactive: '▢' },
    Investments: { active: '◉', inactive: '○' },
    Members: { active: '⬟', inactive: '⬡' },
    Dividends: { active: '◆', inactive: '◇' },
    Profile: { active: '●', inactive: '◌' },
  };

  const icon = icons[name] || { active: '■', inactive: '□' };

  return (
    <View style={styles.tabIconContainer}>
      {focused && <View style={styles.activeGlow} />}
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Text style={[
          styles.tabIcon,
          focused ? styles.tabIconActive : styles.tabIconInactive,
        ]}>
          {focused ? icon.active : icon.inactive}
        </Text>
      </View>
      <Text style={[
        styles.tabLabel,
        focused ? styles.tabLabelActive : styles.tabLabelInactive,
      ]}>
        {label}
      </Text>
    </View>
  );
};

// ── Stack Navigators for each tab ──
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

// ── Main Tab Navigator ──
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
        tabBarStyle: [
          styles.tabBar,
          {
            height: Platform.OS === 'android' ? 60 + Math.max(insets.bottom, 10) : 60 + insets.bottom,
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
    paddingTop: 6,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    position: 'relative',
  },
  activeGlow: {
    position: 'absolute',
    top: -6,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    opacity: 0.08,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(0, 208, 156, 0.12)',
  },
  tabIcon: {
    fontSize: 18,
    textAlign: 'center',
  },
  tabIconActive: {
    color: COLORS.accent,
  },
  tabIconInactive: {
    color: '#666666',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#666666',
  },
});
