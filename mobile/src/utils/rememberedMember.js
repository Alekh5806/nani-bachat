import AsyncStorage from '@react-native-async-storage/async-storage';

const MEMBER_KEY = 'remembered_member';

export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

export const greetingForHour = (hour) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const phoneDigits = (phone) => String(phone || '').replace(/\D/g, '');

export const isRememberedPhone = (member, phone) => Boolean(
  member?.phone && phoneDigits(member.phone) === phoneDigits(phone)
);

// Keep only the display details needed to welcome this device's last member.
// Never retain a password or portfolio data for the signed-out screen.
export const rememberMember = async (member) => {
  if (!member?.name || !member?.phone) return;
  try {
    await AsyncStorage.multiSet([
      [MEMBER_KEY, JSON.stringify({
        name: String(member.name),
        phone: String(member.phone),
        avatar: member.avatar || '',
        avatar_color: member.avatar_color || '',
      })],
      ['saved_phone', String(member.phone)],
    ]);
    await AsyncStorage.removeItem('saved_password');
  } catch {
    // Personalization is optional; storage trouble must not prevent sign-in.
  }
};

export const loadRememberedMember = async () => {
  try {
    const entries = await AsyncStorage.multiGet([MEMBER_KEY, 'saved_phone']);
    const saved = Object.fromEntries(entries);
    let member = null;
    try {
      const parsed = JSON.parse(saved[MEMBER_KEY] || 'null');
      if (typeof parsed?.name === 'string' && typeof parsed?.phone === 'string') {
        member = parsed;
      }
    } catch {
      // A malformed profile should still allow the ordinary login form.
    }
    await AsyncStorage.removeItem('saved_password').catch(() => {});
    return { member, phone: member?.phone || saved.saved_phone || '' };
  } catch {
    return { member: null, phone: '' };
  }
};

export const forgetRememberedMember = () => AsyncStorage.multiRemove([
  MEMBER_KEY, 'saved_phone', 'saved_password',
]);
