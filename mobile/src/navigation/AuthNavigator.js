/**
 * Authentication Navigator
 * Login screen for unauthenticated users
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { withScreenTheme } from './withScreenTheme';

const Stack = createNativeStackNavigator();
const ThemedLoginScreen = withScreenTheme(LoginScreen);

export const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={ThemedLoginScreen} />
  </Stack.Navigator>
);
