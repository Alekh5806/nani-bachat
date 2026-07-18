import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../config/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const getProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.easConfig?.projectId;

export const registerForPushNotificationsAsync = async (accessToken) => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Nani Bachat',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D09C',
    });
    await Notifications.setNotificationChannelAsync('payment', {
      name: 'Payments',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#00D09C',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('stock', {
      name: 'Stock Purchases',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#3B82F6',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('dividend', {
      name: 'Dividends',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250, 150, 250],
      lightColor: '#F5B300',
      sound: 'default',
    });
  }

  // Constants.appOwnership is deprecated since SDK 53 — use executionEnvironment instead.
  // 'storeClient' means running inside Expo Go where FCM is not available on Android.
  if (Constants.executionEnvironment === 'storeClient' && Platform.OS === 'android') {
    return { success: false, reason: 'development_build_required' };
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (existing.status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    return { success: false, reason: 'permission_denied' };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return { success: false, reason: 'missing_project_id' };
  }

  let tokenResponse;
  try {
    tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  } catch (error) {
    return {
      success: false,
      reason: 'token_generation_failed',
      error: error?.message || String(error),
    };
  }

  const token = tokenResponse.data;

  try {
    await api.post(
      '/auth/push-token/',
      {
        token,
        platform: Platform.OS,
        device_id: Device.osInternalBuildId || Device.deviceName || '',
      },
      accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined
    );
  } catch (error) {
    return {
      success: false,
      reason: 'token_registration_failed',
      token,
      error: error.response?.data || error?.message || String(error),
    };
  }

  return { success: true, token };
};

export const addNotificationListeners = ({ onReceived, onResponse } = {}) => {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    onReceived?.(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse?.(response);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};
