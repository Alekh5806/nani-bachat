/**
 * Toast configuration
 * Sileo-style toast: a dark pill with a coloured state icon, a coloured title,
 * a muted description and a springy entrance. Works on iOS, Android and web.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { TickCircle, CloseCircle, InfoCircle } from 'iconsax-react-native';
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';

// The pill is dark in both themes, like Sileo's default.
const PILL_BG = '#0B0B0C';
const STATES = {
  success: { color: '#22C55E', Glyph: TickCircle },
  error: { color: '#F87171', Glyph: CloseCircle },
  info: { color: '#7C93FF', Glyph: InfoCircle },
};

const SileoToast = ({ text1, text2, state }) => {
  const { color, Glyph } = STATES[state];
  const enter = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(badge, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start();
  }, [enter, badge]);

  return (
    <Animated.View
      style={[
        styles.pill,
        {
          opacity: enter.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.badge,
          { backgroundColor: color + '26', transform: [{ scale: badge }] },
        ]}
      >
        <Glyph size={18} color={color} variant="Bold" />
      </Animated.View>
      <View style={styles.text}>
        {!!text1 && <Text style={[styles.title, { color }]} numberOfLines={1}>{text1}</Text>}
        {!!text2 && <Text style={styles.message} numberOfLines={2}>{text2}</Text>}
      </View>
    </Animated.View>
  );
};

export const toastConfig = {
  success: (props) => <SileoToast {...props} state="success" />,
  error: (props) => <SileoToast {...props} state="error" />,
  info: (props) => <SileoToast {...props} state="info" />,
};

const styles = themedStyles(() => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 220,
    maxWidth: '92%',
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.lg,
    borderRadius: 999,
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  text: {
    flexShrink: 1,
  },
  title: {
    ...TYPE.cardTitle,
    fontSize: 14,
  },
  message: {
    ...TYPE.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
}));
