/**
 * Fonts
 * Inter is the only UI font. Custom fonts are separate families per
 * weight, so every text style gets the family that matches its fontWeight.
 * This is applied centrally in `themedStyles`, so screens keep writing
 * fontWeight.
 *
 * Inter has 400, 500, 600, 700 and 800: 900 maps to 800.
 */
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';

export const FONT_ASSETS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
};

const FAMILY_BY_WEIGHT = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  bold: 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_800ExtraBold',
};

export const fontFamilyFor = (weight) => FAMILY_BY_WEIGHT[String(weight || '400')] || 'Inter_400Regular';

/**
 * Give every text style in a style object (anything with a fontSize or a
 * fontWeight) the Inter family for its weight, and drop fontWeight so the
 * platform does not fake-bold a font that is already the right weight.
 */
export const applyFont = (styles) => {
  const result = {};
  Object.keys(styles).forEach((key) => {
    const style = styles[key];
    if (style && typeof style === 'object' && ('fontSize' in style || 'fontWeight' in style)) {
      const { fontWeight, ...rest } = style;
      result[key] = { ...rest, fontFamily: fontFamilyFor(fontWeight) };
    } else {
      result[key] = style;
    }
  });
  return result;
};
