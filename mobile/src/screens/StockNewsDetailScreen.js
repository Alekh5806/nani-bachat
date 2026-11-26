import React from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ExportSquare } from 'iconsax-react-native';

import { CompanyLogo } from '../components/CompanyLogo';
import { formatDateDisplay } from '../components/DatePickerField';
import { ScreenHeader } from '../components/ScreenHeader';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { Alert } from '../utils/alert';
import { fmtFull } from '../utils/currency';
import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';

function SourceLink({ label, url, primary }) {
  if (!url?.startsWith('https://')) return null;
  const linkProps = Platform.OS === 'web'
    ? { href: url, hrefAttrs: { target: '_blank', rel: 'noopener noreferrer' } }
    : { onPress: () => Linking.openURL(url).catch(() => Alert.alert('Couldn’t open source', 'Please try again.')) };

  return (
    <Pressable
      {...linkProps}
      accessibilityRole="link"
      style={({ pressed }) => [styles.link, primary ? styles.primary : styles.secondaryLink, pressed && styles.pressed]}
    >
      <Text style={[styles.linkText, primary && styles.primaryText]}>{label}</Text>
      <ExportSquare size={17} color={primary ? COLORS.onAccent : COLORS.accent} />
    </Pressable>
  );
}

function DetailRow({ label, value }) {
  if (value == null) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function DividendDetails({ item }) {
  const amount = item.rate == null ? null : Number(item.rate).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 10,
  });
  return (
    <>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Dividend details</Text>
      <View style={styles.card}>
        <DetailRow label="Ex-date" value={formatDateDisplay(item.date)} />
        <DetailRow label="Record date" value={item.record_date && formatDateDisplay(item.record_date)} />
        <DetailRow label="Scheduled payment" value={item.payment_date && formatDateDisplay(item.payment_date)} />
        <View style={styles.divider} />
        <DetailRow label="Dividend per share" value={amount == null ? 'Unavailable' : `₹${amount}`} />
        <DetailRow label="Eligible shares" value={item.shares == null ? 'Unavailable' : Number(item.shares).toLocaleString('en-IN')} />
        <DetailRow
          label={item.projected ? 'Projected gross' : 'Estimated gross'}
          value={item.expected == null ? 'Unavailable' : fmtFull(item.expected)}
        />
        {Number(item.received) > 0 && <DetailRow label="Recorded with a payment date" value={fmtFull(item.received)} />}
        {Number(item.undated) > 0 && <DetailRow label="Recorded without a payment date" value={fmtFull(item.undated)} />}
        {item.projected && <Text style={styles.note}>Based on shares currently recorded in the pool.</Text>}
      </View>
    </>
  );
}

export function StockNewsDetailScreen({ navigation, route }) {
  const item = route.params?.item;
  const filing = item?.kind === 'Filing';

  return (
    <View style={styles.screen}>
      <View style={styles.column}>
        <ScreenHeader title={filing ? 'Filing' : item?.kind || 'News update'} inset={SPACING.lg}
          showBack onBack={() => navigation.goBack()} />
      </View>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {item ? (
          <>
            <View style={styles.identity}>
              <CompanyLogo symbol={item.symbol} name={item.company} />
              <View style={styles.identityText}>
                <Text style={styles.company}>{item.company}</Text>
                <Text style={styles.meta}>{item.symbol}{item.active ? '' : ' · Sold holding'}</Text>
              </View>
            </View>
            <Text accessibilityRole="header" style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.kind === 'Dividend'
                ? item.source
                : `${item.source} · ${item.display_date_label} ${formatDateDisplay(item.display_date)}`}
            </Text>
            {item.kind === 'Dividend' && <DividendDetails item={item} />}
            <View style={styles.links}>
              <SourceLink label={filing ? 'Open original filing' : 'View original source'} url={item.url} primary />
              {item.calendar_url !== item.url && <SourceLink label="View dividend calendar" url={item.calendar_url} />}
            </View>
          </>
        ) : (
          <Text style={styles.meta}>This update is unavailable.</Text>
        )}
        <TabBarSpacer />
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, minHeight: 0, backgroundColor: COLORS.background },
  column: { alignSelf: 'center', width: '100%', maxWidth: 700 },
  content: {
    alignSelf: 'center', width: '100%', maxWidth: 700,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs, gap: SPACING.md,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  identityText: { flex: 1, minWidth: 0, gap: SPACING.xs },
  company: { ...TYPE.rowTitle, color: COLORS.textPrimary },
  title: { ...TYPE.screenTitle, color: COLORS.textPrimary },
  meta: { ...TYPE.caption, color: COLORS.textSecondary },
  sectionTitle: { ...TYPE.sectionTitle, color: COLORS.textPrimary, marginTop: SPACING.sm },
  card: {
    backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.md,
  },
  divider: { height: 1, backgroundColor: COLORS.divider },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACING.sm },
  detailLabel: { ...TYPE.secondary, color: COLORS.textSecondary, flexGrow: 1, flexShrink: 1, flexBasis: 120 },
  detailValue: { ...TYPE.smallValue, color: COLORS.textPrimary, marginLeft: 'auto', maxWidth: '100%', textAlign: 'right' },
  note: { ...TYPE.caption, color: COLORS.textSecondary },
  links: { gap: SPACING.sm, marginTop: SPACING.sm },
  link: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.sm,
    minHeight: 48, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  primary: { backgroundColor: COLORS.accent },
  secondaryLink: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border },
  linkText: { ...TYPE.button, color: COLORS.accent, textAlign: 'center', flexShrink: 1 },
  primaryText: { color: COLORS.onAccent },
  pressed: { opacity: 0.8 },
}));
