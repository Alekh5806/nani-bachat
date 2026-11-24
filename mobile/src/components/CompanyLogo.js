/**
 * CompanyLogo
 * Shows a company logo for a Yahoo symbol (for example TCS.NS). While the logo
 * is unknown, missing or fails to load, it shows the company's first letter, so
 * layouts never break and no broken-image icon appears.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { useLogoStore } from '../store/logoStore';
import { COLORS, themedStyles } from '../theme/colors';

export const CompanyLogo = ({ symbol, name, size = 40, style }) => {
  const url = useLogoStore((state) => state.logos[symbol]);
  const ensure = useLogoStore((state) => state.ensure);
  const [failed, setFailed] = useState(false);

  useEffect(() => { ensure(symbol); }, [symbol, ensure]);
  useEffect(() => { setFailed(false); }, [url]);

  const letter = (name || (symbol || '').replace(/\.(NS|BO)$/, '') || '?').charAt(0).toUpperCase();
  const showImage = !!url && !failed;
  const box = { width: size, height: size, borderRadius: 8 };

  return (
    <View style={[styles.tile, box, style]}>
      {showImage ? (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.letter, { fontSize: Math.round(size * 0.4) }]}>{letter}</Text>
      )}
    </View>
  );
};

const styles = themedStyles(() => ({
  tile: {
    backgroundColor: COLORS.logoBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letter: { fontWeight: '600', color: COLORS.neutral },
}));
