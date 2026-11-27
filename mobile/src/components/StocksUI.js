import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { InfoCircle, Refresh2 } from 'iconsax-react-native';

import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';
import { priceStatus } from '../utils/stockDisplay';
import { AmountText } from './AmountText';
import { DialogCard } from './DialogCard';
import { LoadingSkeleton } from './LoadingSkeleton';

const INFO_SIZE = 48;

export const stockReturnColor = (value) =>
  Number(value) > 0 ? COLORS.profit : Number(value) < 0 ? COLORS.loss : COLORS.textSecondary;

export const StockAction = ({ label, onPress, disabled, primary, danger, icon, busy }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: !!disabled, busy: !!busy }}
    onPress={onPress}
    disabled={disabled}
    style={({ pressed, focused }) => [
      stockStyles.action, primary && stockStyles.actionPrimary,
      pressed && stockStyles.pressed, focused && stockStyles.focused,
    ]}
  >
    {busy ? <ActivityIndicator size="small" color={COLORS.textSecondary} /> : icon}
    <Text style={[stockStyles.actionText, primary && stockStyles.onAccent, danger && { color: COLORS.loss }]}>{label}</Text>
  </Pressable>
);

export const StockTabs = ({ value, onChange, options }) => (
  <View accessibilityRole="tablist" style={stockStyles.tabs}>
    {options.map(([key, title]) => (
      <Pressable
        key={key}
        accessibilityRole="tab"
        aria-selected={value === key}
        onPress={() => onChange(key)}
        style={({ pressed, focused }) => [
          stockStyles.tab, value === key && stockStyles.currentTab,
          pressed && stockStyles.pressed, focused && stockStyles.focused,
        ]}
      >
        <Text style={[stockStyles.tabLabel, value === key && stockStyles.selectedLabel]}>{title}</Text>
      </Pressable>
    ))}
  </View>
);

export const StockFields = ({ rows }) => (
  <View>
    {rows.map(({ label, value, color, metadata }) => (
      <View key={label} style={[stockStyles.line, stockStyles.field]}>
        <Text style={stockStyles.fieldLabel}>{label}</Text>
        <Text style={[metadata ? stockStyles.meta : stockStyles.fieldValue, stockStyles.trailing, color && { color }]}>{value}</Text>
      </View>
    ))}
  </View>
);

export const StockOverview = ({ label, value, rows, description, note, children }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [headerWidth, setHeaderWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  // Leave enough room for the full balance alongside the info control.
  const balanceWidth = 214 * Math.max(1, fontScale);
  const fullWidthBalance = !!description && headerWidth < balanceWidth + INFO_SIZE + SPACING.sm;
  const balance = <AmountText style={stockStyles.heroValue}>{value}</AmountText>;
  return (
    <View style={stockStyles.overview}>
      <View style={stockStyles.overviewHeader} onLayout={({ nativeEvent }) => setHeaderWidth(nativeEvent.layout.width)}>
        <View style={stockStyles.overviewLead}>
          <Text style={stockStyles.fieldLabel}>{label}</Text>
          {!fullWidthBalance && balance}
        </View>
        {!!description && (
          <Pressable accessibilityRole="button" accessibilityLabel="How returns are calculated" onPress={() => setShowInfo(true)}
            style={({ pressed, focused }) => [stockStyles.info, pressed && stockStyles.pressed, focused && stockStyles.focused]}>
            <InfoCircle size={20} color={COLORS.textSecondary} />
          </Pressable>
        )}
      </View>
      {fullWidthBalance && balance}
      {!!rows?.length && <View style={stockStyles.overviewFields}><StockFields rows={rows} /></View>}
      {!!note && <Text style={stockStyles.muted}>{note}</Text>}
      {children}
      {!!description && <DialogCard visible={showInfo} title="Stock returns" message={description} onDismiss={() => setShowInfo(false)} />}
    </View>
  );
};

export const StockPriceStatus = ({ holdings, refreshing, onRefresh, failure }) => (
  <View style={stockStyles.statusBlock}>
    <View style={stockStyles.statusLine}>
      <Text style={[stockStyles.meta, stockStyles.statusText]} accessibilityLiveRegion="polite">
        {priceStatus(holdings) || 'Quote time unavailable'}
      </Text>
      <View style={stockStyles.statusAction}>
        <StockAction
          label={refreshing ? 'Refreshing' : 'Refresh'}
          onPress={onRefresh}
          disabled={refreshing}
          busy={refreshing}
          icon={<Refresh2 size={16} color={COLORS.textPrimary} />}
        />
      </View>
    </View>
    {!!failure && <Text style={stockStyles.muted} accessibilityLiveRegion="polite">{failure}</Text>}
  </View>
);

export const StockState = ({ title, description, action, onPress }) => (
  <View style={stockStyles.state}>
    <Text accessibilityRole="header" style={stockStyles.heading}>{title}</Text>
    <Text style={stockStyles.muted}>{description}</Text>
    {!!action && <StockAction label={action} onPress={onPress} />}
  </View>
);

export const StocksSkeleton = ({ summary = true }) => (
  <View accessible accessibilityLabel="Loading stocks" accessibilityState={{ busy: true }} style={stockStyles.skeleton}>
    {summary && <LoadingSkeleton height={174} borderRadius={RADIUS.xl} />}
    <LoadingSkeleton height={60} borderRadius={RADIUS.lg} />
    <LoadingSkeleton height={60} borderRadius={RADIUS.lg} />
    <LoadingSkeleton height={60} borderRadius={RADIUS.lg} />
  </View>
);

export const stockStyles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: COLORS.background },
  viewport: { flex: 1, minHeight: 0 },
  hidden: { display: 'none' },
  header: { width: '100%', maxWidth: 800, alignSelf: 'center' },
  content: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: SPACING.lg },
  heading: { ...TYPE.sectionTitle, color: COLORS.textPrimary, maxWidth: '100%' },
  muted: { ...TYPE.secondary, color: COLORS.textSecondary },
  meta: { ...TYPE.caption, color: COLORS.textSecondary },
  value: { ...TYPE.listAmount, color: COLORS.textPrimary },
  overview: {
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.lg, gap: SPACING.sm,
  },
  overviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  overviewLead: { flex: 1, minWidth: 0, gap: SPACING.xs },
  heroValue: { ...TYPE.portfolioValue, color: COLORS.textPrimary },
  overviewFields: { marginTop: SPACING.xs, paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.divider },
  info: {
    width: INFO_SIZE, minHeight: INFO_SIZE, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, borderColor: 'transparent', borderWidth: 1, backgroundColor: COLORS.surface,
  },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: SPACING.sm, rowGap: SPACING.xs },
  trailing: { maxWidth: '100%', marginLeft: 'auto', textAlign: 'right' },
  field: { paddingVertical: 6 },
  fieldLabel: { ...TYPE.secondaryMedium, color: COLORS.textSecondary, maxWidth: '100%' },
  fieldValue: { ...TYPE.smallValue, color: COLORS.textPrimary },
  grouped: {
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  section: { marginTop: SPACING.xl, gap: SPACING.sm },
  statusBlock: { gap: SPACING.xs },
  statusLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: SPACING.sm },
  statusText: { flexBasis: 140, flexGrow: 1, flexShrink: 1, maxWidth: '100%' },
  statusAction: { maxWidth: '100%', marginLeft: 'auto' },
  tabs: {
    flexDirection: 'row', padding: SPACING.xs, gap: SPACING.xs, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, marginBottom: SPACING.md,
  },
  tab: {
    flex: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACING.xs, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: 'transparent',
    borderRadius: RADIUS.md,
  },
  currentTab: { backgroundColor: COLORS.cardElevated, borderColor: COLORS.border },
  tabLabel: { ...TYPE.tab, color: COLORS.textSecondary, textAlign: 'center', maxWidth: '100%' },
  selectedLabel: { color: COLORS.textPrimary },
  action: {
    flexDirection: 'row', gap: 6, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'transparent',
  },
  actionPrimary: { backgroundColor: COLORS.buttonPrimary },
  actionText: { ...TYPE.button, color: COLORS.textPrimary, flexShrink: 1 },
  onAccent: { color: COLORS.onAccent },
  focused: { borderColor: COLORS.accent },
  pressed: { opacity: 0.9 },
  state: {
    alignItems: 'flex-start', padding: SPACING.lg, gap: SPACING.sm,
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  skeleton: { gap: SPACING.sm },
}));
