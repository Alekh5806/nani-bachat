import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { InfoCircle, Refresh2 } from 'iconsax-react-native';

import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';
import { priceStatus } from '../utils/stockDisplay';
import { DialogCard } from './DialogCard';
import { LoadingSkeleton } from './LoadingSkeleton';

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
    {rows.map(({ label, value, color }) => (
      <View key={label} style={stockStyles.field}>
        <Text style={stockStyles.fieldLabel}>{label}</Text>
        <Text style={[stockStyles.fieldValue, color && { color }]}>{value}</Text>
      </View>
    ))}
  </View>
);

export const StockOverview = ({ label, value, rows, description, note, children }) => {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <View style={stockStyles.overview}>
      <View style={stockStyles.overviewHeader}>
        <View style={stockStyles.overviewLead}>
          <Text style={stockStyles.fieldLabel}>{label}</Text>
          <Text style={stockStyles.heroValue}>{value}</Text>
        </View>
        {!!description && (
          <Pressable accessibilityRole="button" accessibilityLabel="How returns are calculated" onPress={() => setShowInfo(true)}
            style={({ pressed, focused }) => [stockStyles.info, pressed && stockStyles.pressed, focused && stockStyles.focused]}>
            <InfoCircle size={20} color={COLORS.textSecondary} />
          </Pressable>
        )}
      </View>
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
      <Text style={[stockStyles.muted, stockStyles.statusText]} accessibilityLiveRegion="polite">
        {priceStatus(holdings) || 'Quote time unavailable'}
      </Text>
      <StockAction
        label={refreshing ? 'Refreshing' : 'Refresh'}
        onPress={onRefresh}
        disabled={refreshing}
        busy={refreshing}
        icon={<Refresh2 size={16} color={COLORS.textPrimary} />}
      />
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
  header: { width: '100%', maxWidth: 800, alignSelf: 'center' },
  content: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: SPACING.lg },
  heading: { ...TYPE.sectionTitle, color: COLORS.textPrimary },
  muted: { ...TYPE.secondary, color: COLORS.textSecondary, lineHeight: 19 },
  value: { ...TYPE.cardTitle, color: COLORS.textPrimary, fontVariant: ['tabular-nums'] },
  overview: {
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.lg, gap: SPACING.sm,
  },
  overviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  overviewLead: { flex: 1, minWidth: 0, gap: SPACING.xs },
  heroValue: { ...TYPE.portfolioValue, fontSize: 32, color: COLORS.textPrimary, fontVariant: ['tabular-nums'] },
  overviewFields: { marginTop: SPACING.xs, paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.divider },
  info: {
    width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, borderColor: 'transparent', borderWidth: 1, backgroundColor: COLORS.surface,
  },
  field: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm, paddingVertical: 6 },
  fieldLabel: { ...TYPE.secondary, color: COLORS.textSecondary, flexShrink: 1 },
  fieldValue: {
    ...TYPE.secondaryMedium, color: COLORS.textPrimary, flex: 1, textAlign: 'right', fontVariant: ['tabular-nums'],
  },
  grouped: {
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  section: { marginTop: SPACING.xl, gap: SPACING.sm },
  statusBlock: { gap: SPACING.xs },
  statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  statusText: { flex: 1 },
  tabs: {
    flexDirection: 'row', padding: SPACING.xs, gap: SPACING.xs, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, marginBottom: SPACING.md,
  },
  tab: {
    flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACING.xs, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: 'transparent',
    borderRadius: RADIUS.md,
  },
  currentTab: { backgroundColor: COLORS.cardElevated, borderColor: COLORS.border },
  tabLabel: { ...TYPE.secondaryMedium, color: COLORS.textSecondary, textAlign: 'center' },
  selectedLabel: { color: COLORS.textPrimary },
  action: {
    flexDirection: 'row', gap: 6, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'transparent',
  },
  actionPrimary: { backgroundColor: COLORS.accent },
  actionText: { ...TYPE.secondaryMedium, color: COLORS.textPrimary, flexShrink: 1 },
  onAccent: { color: COLORS.onAccent },
  focused: { borderColor: COLORS.accent },
  pressed: { opacity: 0.72 },
  state: {
    alignItems: 'flex-start', padding: SPACING.lg, gap: SPACING.sm,
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  skeleton: { gap: SPACING.sm },
}));
