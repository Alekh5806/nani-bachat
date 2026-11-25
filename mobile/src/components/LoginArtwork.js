import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

export const LoginArtwork = () => (
  <View
    style={styles.scene}
    pointerEvents="none"
    aria-hidden
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <Svg width="100%" height="100%" viewBox="0 0 420 340" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="loginArtLight">
          <Stop offset="0" stopColor="#C0834A" stopOpacity="0.26" />
          <Stop offset="0.56" stopColor="#9C673A" stopOpacity="0.09" />
          <Stop offset="1" stopColor="#9C673A" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="loginArtShadow">
          <Stop offset="0" stopColor="#080B12" stopOpacity="0.86" />
          <Stop offset="1" stopColor="#080B12" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="210" cy="167" rx="197" ry="164" fill="url(#loginArtLight)" />
      <Circle cx="210" cy="158" r="134" fill="none" stroke="#D7AB7C" strokeOpacity="0.17" />
      <Circle cx="210" cy="158" r="156" fill="none" stroke="#D7AB7C" strokeOpacity="0.1" />
      <Ellipse cx="210" cy="285" rx="122" ry="29" fill="url(#loginArtShadow)" />
      <Ellipse cx="210" cy="287" rx="132" ry="22" fill="none" stroke="#D7AB7C" strokeOpacity="0.2" />
    </Svg>
    <Image
      source={require('../../assets/login/pot.webp')}
      style={styles.pot}
      resizeMode="contain"
      accessible={false}
    />
  </View>
);

const styles = StyleSheet.create({
  scene: { width: '100%', maxWidth: 446, aspectRatio: 420 / 340 },
  pot: { position: 'absolute', top: '9%', left: '27%', width: '46%', height: '76%' },
});
