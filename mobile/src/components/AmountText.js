import React from 'react';
import { Platform, Text } from 'react-native';

// Fit complete amounts when enlarged Android text exceeds the available width.
const fitAmount = Platform.OS === 'android' ? { numberOfLines: 1, adjustsFontSizeToFit: true } : {};

export const AmountText = (props) => <Text {...fitAmount} {...props} />;
