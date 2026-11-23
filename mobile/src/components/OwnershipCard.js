/**
 * OwnershipCard
 * The signed-in member's share of the group: ownership %, current value,
 * profit and loss, contribution, dividends and number of members.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { fmtFull, fmtShort } from '../utils/currency';
import { COLORS, SPACING, RADIUS, TYPE, themedStyles } from '../theme/colors';

export const OwnershipCard = ({ my = {}, members = 0 }) => {
  const pnl = Number(my.profit_loss) || 0;
  const up = pnl >= 0;
  return (
    <View style={styles.shareCard}>
      <View style={styles.shareRow}>
        <View>
          <Text style={styles.shareLabel}>Ownership</Text>
          <Text style={styles.shareSub}>
            {Number(my.ownership_percentage || 0).toFixed(1)}% of the group
          </Text>
        </View>
        <View style={styles.shareRight}>
          <Text style={styles.shareValue}>{fmtFull(my.current_value)}</Text>
          <Text style={[styles.sharePnl, { color: up ? COLORS.profit : COLORS.loss }]}>
            {up ? '+' : ''}{fmtFull(pnl)}
          </Text>
        </View>
      </View>

      <View style={styles.shareMiniRow}>
        <View style={styles.shareMiniItem}>
          <Text style={styles.shareMiniLabel}>Contributed</Text>
          <Text style={styles.shareMiniValue}>{fmtShort(my.total_contribution)}</Text>
        </View>
        <View style={styles.shareMiniItem}>
          <Text style={styles.shareMiniLabel}>Dividends</Text>
          <Text style={styles.shareMiniValue}>{fmtShort(my.dividend_earned)}</Text>
        </View>
        <View style={styles.shareMiniItem}>
          <Text style={styles.shareMiniLabel}>Members</Text>
          <Text style={styles.shareMiniValue}>{members}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = themedStyles(() => ({
  shareCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shareLabel: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
  },
  shareSub: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  shareRight: {
    alignItems: 'flex-end',
  },
  shareValue: {
    ...TYPE.plAmount,
    color: COLORS.textPrimary,
  },
  sharePnl: {
    ...TYPE.plPercent,
    marginTop: 4,
  },
  shareMiniRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  shareMiniItem: {
    flex: 1,
  },
  shareMiniLabel: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  shareMiniValue: {
    ...TYPE.smallValue,
    color: COLORS.textPrimary,
  },
}));
