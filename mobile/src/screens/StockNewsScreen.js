import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, Pressable, SectionList, Text, TextInput, View,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowDown2, ArrowRight2, DocumentText, Element3, InfoCircle, Refresh2, SearchNormal1, TickCircle,
} from 'iconsax-react-native';

import { CompanyLogo } from '../components/CompanyLogo';
import { DialogCard } from '../components/DialogCard';
import { formatDateDisplay } from '../components/DatePickerField';
import { ScreenHeader } from '../components/ScreenHeader';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { usePortfolioNews } from '../services/usePortfolioNews';
import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';

const UPCOMING_PREVIEW = 3;
const IS_WEB = Platform.OS === 'web';

function CompanyPicker({ stocks, symbol, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();
  const results = stocks.filter((stock) => `${stock.name} ${stock.symbol}`.toLowerCase().includes(search));
  const { height } = useWindowDimensions();

  const renderOption = (stock) => {
    const value = stock?.symbol ?? null;
    const selected = symbol === value;
    return (
      <Pressable
        accessibilityRole="button"
        aria-selected={selected}
        onPress={() => onPick(value)}
        style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
      >
        {stock ? (
          <CompanyLogo symbol={stock.symbol} name={stock.name} size={32} />
        ) : (
          <View style={styles.optionIcon}>
            <Element3 size={20} color={COLORS.textSecondary} />
          </View>
        )}
        <View style={styles.grow}>
          <Text style={styles.body} numberOfLines={2}>{stock?.name ?? 'All holdings'}</Text>
          {stock && (
            <Text style={styles.meta}>
              {stock.symbol}{stock.active ? '' : ' · Sold holding'}
            </Text>
          )}
        </View>
        {selected && <TickCircle size={18} color={COLORS.accent} variant="Bold" />}
      </Pressable>
    );
  };

  return (
    <DialogCard visible title="Filter by holding" onDismiss={onClose}>
      <View style={styles.search}>
        <SearchNormal1 size={16} color={COLORS.textSecondary} />
        <TextInput
          accessibilityLabel="Search companies"
          placeholder="Search company or ticker"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          value={query}
          onChangeText={setQuery}
          style={styles.input}
        />
      </View>
      {renderOption(null)}
      <FlatList
        style={{ maxHeight: Math.min(340, height * 0.42) }}
        data={results}
        keyExtractor={(stock) => stock.symbol}
        renderItem={({ item }) => renderOption(item)}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.noResults}>No companies match your search.</Text>}
      />
    </DialogCard>
  );
}

function NewsRow({ item, upcoming, last, asOf, onPress }) {
  const fullDate = formatDateDisplay(item.display_date);
  const date = item.display_date.slice(0, 4) === asOf.slice(0, 4) ? fullDate.slice(0, -5) : fullDate;
  const dateText = `${item.display_date_label} ${date}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.company}, ${item.title}. ${item.source}, ${dateText}`}
      onPress={onPress}
      style={({ pressed }) => [styles.newsRow, !last && styles.divided, pressed && styles.pressed]}
    >
      <CompanyLogo symbol={item.symbol} name={item.company} />
      <View style={styles.rowText}>
        <Text style={styles.company}>{item.company}</Text>
        <Text style={styles.headline}>{item.title}</Text>
        <Text style={styles.meta}>
          <Text style={upcoming ? styles.upcomingDate : undefined}>{dateText}</Text>
          {' · '}{item.source}
        </Text>
      </View>
      <ArrowRight2 size={15} color={COLORS.textMuted} />
    </Pressable>
  );
}

function Notice({ title, message, onRetry }) {
  return (
    <View style={styles.notice}>
      <InfoCircle size={19} color={COLORS.textSecondary} />
      <View style={styles.grow} aria-live="polite">
        <Text style={styles.body}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.textButton}>
            <Text style={styles.action}>Retry</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function NewsSkeleton() {
  return (
    <View style={styles.loading} accessible accessibilityLabel="Loading news" aria-busy>
      <View style={styles.skeletonHeading} />
      <View style={styles.surface}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={[styles.newsRow, index < 2 && styles.divided]}>
            <View style={styles.skeletonLogo} />
            <View style={styles.rowText}>
              <View style={[styles.skeletonLine, styles.skeletonShort]} />
              <View style={[styles.skeletonLine, styles.skeletonLong]} />
              <View style={[styles.skeletonLine, styles.skeletonMeta]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function StockNewsScreen({ navigation }) {
  const { feed, stocks, symbol, select, pending, error, refresh, loadMore } = usePortfolioNews();
  const [picker, setPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const stock = stocks?.find((entry) => entry.symbol === symbol);
  const upcoming = feed?.upcoming ?? [];
  const shownUpcoming = expanded ? upcoming : upcoming.slice(0, UPCOMING_PREVIEW);
  const sections = [];

  if (shownUpcoming.length) {
    sections.push({ key: 'upcoming', title: 'Upcoming', data: shownUpcoming });
  }
  if (feed && stocks?.length) {
    sections.push({ key: 'recent', title: 'Recent updates', data: feed.recent });
  }

  const issues = feed?.issues ?? [];
  const sourceNames = [...new Set(issues.map((issue) => issue.source))];
  const sourcesUpdating = issues.some((issue) => issue.updating);
  const unavailable = issues.some((issue) => !issue.updating);
  const quietMessage = issues.length
    ? 'No recent updates from the available sources.'
    : stock ? 'No recent updates for this company.' : 'No recent updates across your holdings.';
  const chooseCompany = (value) => {
    setPicker(false);
    if (value !== symbol) {
      setExpanded(false);
      select(value);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.column}>
        <ScreenHeader title="News" inset={SPACING.lg} />
        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={stock ? `Filter holdings, ${stock.name}` : 'All holdings'}
            aria-expanded={picker}
            disabled={!stocks?.length}
            onPress={() => setPicker(true)}
            style={({ pressed }) => [styles.filter, pressed && styles.pressed]}
          >
            <Element3 size={17} color={stock ? COLORS.accent : COLORS.textSecondary} />
            <Text numberOfLines={1} style={styles.filterText}>{stock?.name ?? 'All holdings'}</Text>
            <ArrowDown2 size={14} color={COLORS.textSecondary} />
          </Pressable>
          {stock && (
            <Pressable accessibilityRole="button" onPress={() => chooseCompany(null)} style={styles.textButton}>
              <Text style={styles.action}>Clear</Text>
            </Pressable>
          )}
          {IS_WEB && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh news"
              aria-busy={pending === 'feed'}
              disabled={Boolean(pending)}
              onPress={refresh}
              style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
            >
              {pending === 'feed' ? <ActivityIndicator size="small" color={COLORS.accent} /> : (
                <Refresh2 size={17} color={COLORS.textSecondary} />
              )}
              <Text style={styles.meta}>Refresh</Text>
            </Pressable>
          )}
        </View>
      </View>
      <SectionList
        key={symbol ?? 'all'}
        style={styles.screen}
        contentContainerStyle={styles.list}
        sections={sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item) => item.id}
        refreshing={pending === 'feed' && Boolean(feed)}
        onRefresh={IS_WEB ? undefined : refresh}
        ListHeaderComponent={(
          <>
            {error === 'feed' && (
              <Notice
                title={feed ? 'Couldn’t refresh news' : 'Couldn’t load news'}
                message={feed ? 'You’re viewing the last updates we loaded.' : 'Check your connection and try again.'}
                onRetry={refresh}
              />
            )}
            {issues.length > 0 && error !== 'feed' && (
              <Notice
                title={unavailable ? 'Some sources are delayed' : 'Checking for more updates'}
                message={sourceNames.join(' · ')}
                onRetry={unavailable && !pending ? refresh : undefined}
              />
            )}
            {!feed && error !== 'feed' && <NewsSkeleton />}
            {feed && stocks?.length === 0 && (
              <Notice title="No holdings yet" message="Updates will appear after the pool’s first stock purchase." />
            )}
          </>
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
            {section.key === 'upcoming' && upcoming.length > UPCOMING_PREVIEW && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={expanded ? 'Show fewer upcoming events' : 'See all upcoming events'}
                aria-expanded={expanded}
                onPress={() => setExpanded((value) => !value)}
                style={styles.textButton}
              >
                <Text style={styles.action}>{expanded ? 'Show less' : 'See all'}</Text>
              </Pressable>
            )}
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <View style={[styles.surfaceRow, first && styles.firstRow, last && styles.lastRow]}>
              <NewsRow
                item={item}
                upcoming={section.key === 'upcoming'}
                last={last}
                asOf={feed.as_of_date}
                onPress={() => navigation.navigate('NewsDetail', { item })}
              />
            </View>
          );
        }}
        renderSectionFooter={({ section }) => {
          if (section.key !== 'recent') return null;
          if (!section.data.length) return <Text style={styles.quiet}>{quietMessage}</Text>;
          if (!feed.next_cursor) return null;
          return (
            <Pressable
              accessibilityRole="button"
              aria-busy={pending === 'more'}
              disabled={Boolean(pending)}
              onPress={loadMore}
              style={({ pressed }) => [styles.more, pressed && styles.pressed]}
            >
              {pending === 'more' && <ActivityIndicator size="small" color={COLORS.accent} />}
              <Text style={styles.action}>
                {error === 'more' ? 'Retry loading older updates' : 'Load older updates'}
              </Text>
            </Pressable>
          );
        }}
        ListFooterComponent={TabBarSpacer}
      />
      {picker && stocks && (
        <CompanyPicker stocks={stocks} symbol={symbol} onPick={chooseCompany} onClose={() => setPicker(false)} />
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, minHeight: 0, backgroundColor: COLORS.background },
  grow: { flex: 1, minWidth: 0 },
  column: { alignSelf: 'center', width: '100%', maxWidth: 700 },
  list: {
    alignSelf: 'center', width: '100%', maxWidth: 700,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs,
  },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  filter: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: SPACING.sm, minWidth: 0, flexShrink: 1,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, minHeight: 44,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.cardBg,
  },
  filterText: { ...TYPE.body, color: COLORS.textPrimary, flexShrink: 1, minWidth: 0 },
  refresh: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: SPACING.sm, minHeight: 44, marginLeft: 'auto', paddingLeft: SPACING.xs,
  },
  textButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: SPACING.xs },
  action: { ...TYPE.secondaryMedium, color: COLORS.accent },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md,
    minHeight: 44, marginTop: SPACING.sm, paddingLeft: SPACING.xs,
  },
  sectionTitle: { ...TYPE.sectionTitle, color: COLORS.textPrimary, flexShrink: 1 },
  surface: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.cardBg, overflow: 'hidden',
  },
  surfaceRow: { borderColor: COLORS.border, borderLeftWidth: 1, borderRightWidth: 1, backgroundColor: COLORS.cardBg },
  firstRow: { borderTopWidth: 1, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, overflow: 'hidden' },
  lastRow: { borderBottomWidth: 1, borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl, overflow: 'hidden' },
  newsRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, minHeight: 80,
  },
  divided: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  pressed: { backgroundColor: COLORS.surface },
  rowText: { flex: 1, minWidth: 0, gap: SPACING.xs },
  company: { ...TYPE.captionMedium, color: COLORS.textSecondary },
  headline: { ...TYPE.cardTitle, color: COLORS.textPrimary },
  meta: { ...TYPE.caption, color: COLORS.textSecondary },
  upcomingDate: { ...TYPE.captionMedium, color: COLORS.textPrimary },
  body: { ...TYPE.body, color: COLORS.textPrimary },
  message: { ...TYPE.secondary, color: COLORS.textSecondary, marginTop: SPACING.xs },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginTop: SPACING.sm,
    padding: SPACING.md, borderRadius: RADIUS.lg, borderColor: COLORS.border, borderWidth: 1, backgroundColor: COLORS.cardBg,
  },
  quiet: {
    ...TYPE.secondary, color: COLORS.textSecondary, padding: SPACING.lg,
    borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.xl, backgroundColor: COLORS.cardBg,
  },
  more: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, marginTop: SPACING.sm, minHeight: 48, borderRadius: RADIUS.md,
  },
  option: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.sm, minHeight: 52, borderRadius: RADIUS.md },
  optionSelected: { backgroundColor: COLORS.surface },
  optionIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md,
    marginVertical: SPACING.md, minHeight: 44, borderWidth: 1,
    borderRadius: RADIUS.md, borderColor: COLORS.border, backgroundColor: COLORS.inputBg,
  },
  input: {
    ...TYPE.body, flex: 1, minWidth: 0, minHeight: 44, color: COLORS.textPrimary,
  },
  noResults: { ...TYPE.secondary, color: COLORS.textSecondary, padding: SPACING.md },
  loading: { marginTop: SPACING.lg, gap: SPACING.md },
  skeletonHeading: { width: 104, height: 14, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface },
  skeletonLogo: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  skeletonLine: { borderRadius: RADIUS.sm, backgroundColor: COLORS.surface },
  skeletonShort: { width: '36%', height: 10 },
  skeletonLong: { width: '82%', height: 16 },
  skeletonMeta: { width: '52%', height: 10 },
}));
