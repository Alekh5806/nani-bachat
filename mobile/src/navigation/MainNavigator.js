import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackActions } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { View, Text, StyleSheet, Platform, Animated, PanResponder, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Home2, Chart1, Chart21, DocumentText, Profile2User, Wallet3, Profile } from 'iconsax-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, TYPE, themedStyles } from '../theme/colors';

import { DashboardScreen } from '../screens/DashboardScreen';
import { AssetStocksScreen } from '../screens/AssetStocksScreen';
import { StockNewsScreen } from '../screens/StockNewsScreen';
import { StockNewsDetailScreen } from '../screens/StockNewsDetailScreen';
import { InvestmentsScreen } from '../screens/InvestmentsScreen';
import { AddStockScreen } from '../screens/AddStockScreen';
import { SellStockScreen } from '../screens/SellStockScreen';
import { EditStockScreen } from '../screens/EditStockScreen';
import { HoldingDetailScreen } from '../screens/HoldingDetailScreen';
import { StockTransactionScreen } from '../screens/StockTransactionScreen';
import { MemberDetailScreen } from '../screens/MemberDetailScreen';
import { MembersScreen } from '../screens/MembersScreen';
import { AddMemberScreen } from '../screens/AddMemberScreen';
import { ContributionsScreen } from '../screens/ContributionsScreen';
import { DividendsScreen } from '../screens/DividendsScreen';
import { AddDividendScreen } from '../screens/AddDividendScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { getTabBarOffset, TAB_BAR_HEIGHT, TabBarHeightContext } from '../components/TabBarSpacer';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Screens slide in from the right and slide out on back (swipe back works too),
// on iOS, Android and web alike.
const stackOptions = () => ({
  headerShown: false,
  // The swipe gesture blocks touch scrolling on the web, so it is native-only.
  gestureEnabled: Platform.OS !== 'web',
  // The stack turns animation off on the web unless an animation is named.
  animation: 'slide_from_right',
  // On the web the stack card grows with its content, which stops inner scrolling.
  // Pinning it to the screen height lets each screen's ScrollView scroll.
  cardStyle: {
    backgroundColor: COLORS.background,
    ...(Platform.OS === 'web' ? { flex: 1, minHeight: 0, height: '100%' } : null),
  },
  ...TransitionPresets.SlideFromRightIOS,
});

const TAB_LABELS = {
  Dashboard: 'Home',
  Investments: 'Stocks',
  News: 'News',
  Members: 'Members',
  Dividends: 'Dividend',
  Profile: 'Profile',
};

// Iconsax icons: Linear when inactive, Bold (filled) when active.
const TAB_ICONS = {
  Dashboard: Home2,
  Investments: Chart1,
  News: DocumentText,
  Members: Profile2User,
  Dividends: Wallet3,
  Profile: Profile,
};

// True on iOS 26+ builds: the bar uses the system Liquid Glass material.
// Everywhere else (Android, web, older iOS) it falls back to a blur.
// Chart1's Bold is a different shape, so Invest uses Chart21's Bold (filled bars) when active.
const ACTIVE_ICONS = {
  Investments: Chart21,
};

const HAS_LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

const BAR_PADDING = 5;

/**
 * Floating capsule tab bar. The highlight is one capsule behind the active
 * item; it slides to the next tab with a spring when the tab changes.
 */
const FloatingTabBar = ({ state, navigation, onHeight }) => {
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = React.useState(0);
  const [preview, setPreview] = React.useState(null); // tab under the finger while dragging
  const rowRef = React.useRef(null);
  const rowX = React.useRef(0);
  // Profile is reached from the header avatar, so it has no tab in the bar.
  const routes = state.routes.filter((route) => route.name !== 'Profile');
  const count = routes.length;
  const activeKey = state.routes[state.index]?.key;
  const currentIndex = routes.findIndex((route) => route.key === activeKey); // -1 on Profile
  const itemWidth = rowWidth / count;
  const slide = React.useRef(new Animated.Value(0)).current;
  const live = React.useRef({ itemWidth: 0, index: 0 });
  live.current = { itemWidth, index: currentIndex };

  const springTo = (index) =>
    Animated.spring(slide, {
      toValue: index * live.current.itemWidth,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    }).start();

  React.useEffect(() => {
    if (itemWidth && currentIndex >= 0) springTo(currentIndex);
  }, [currentIndex, itemWidth]);

  const indexAt = (pageX) => {
    const w = live.current.itemWidth;
    if (!w) return 0;
    return Math.max(0, Math.min(count - 1, Math.floor((pageX - rowX.current) / w)));
  };

  const selectTab = (index, dragging = false) => {
    const route = routes[index];
    if (index !== live.current.index) {
      navigation.navigate(route.name);
    } else if (dragging) {
      springTo(index);
    } else if (route.state?.key && route.state.index > 0) {
      navigation.dispatch({ ...StackActions.pop(), target: route.state.key });
    }
  };

  // Let buttons own taps and accessibility activation. The row takes over on a horizontal drag.
  const drag = React.useRef({ lastX: 0, shown: null });
  const showPreview = (index) => {
    if (drag.current.shown !== index) {
      drag.current.shown = index;
      setPreview(index);
    }
  };
  const responder = React.useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.pageX;
        drag.current = { lastX: x, shown: null };
        slide.stopAnimation();
        showPreview(indexAt(x));
      },
      onPanResponderMove: (_, g) => {
        drag.current.lastX = g.moveX;
        const w = live.current.itemWidth;
        const x = g.moveX - rowX.current;
        slide.setValue(Math.max(0, Math.min((count - 1) * w, x - w / 2)));
        showPreview(indexAt(g.moveX));
      },
      onPanResponderRelease: () => {
        const target = indexAt(drag.current.lastX);
        drag.current.shown = null;
        setPreview(null);
        selectTab(target, true);
      },
      onPanResponderTerminate: () => {
        drag.current.shown = null;
        setPreview(null);
        springTo(live.current.index);
      },
    }),
    [count, navigation, state.routes]
  );

  const activeIndex = preview ?? currentIndex;

  return (
    <View
      onLayout={({ nativeEvent }) => onHeight(nativeEvent.layout.height)}
      style={[
        styles.bar,
        HAS_LIQUID_GLASS && styles.barGlass,
        Platform.OS === 'web' && styles.barWeb,
        { bottom: getTabBarOffset(insets.bottom), left: insets.left + 8, right: insets.right + 8 },
      ]}
    >
      {HAS_LIQUID_GLASS ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme={COLORS.isDark ? 'dark' : 'light'}
          isInteractive
          style={StyleSheet.absoluteFill}
        />
      ) : Platform.OS === 'web' ? null : (
        <BlurView
          intensity={70}
          tint={COLORS.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        ref={rowRef}
        accessibilityRole="tablist"
        style={styles.row}
        onLayout={(e) => {
          setRowWidth(e.nativeEvent.layout.width);
          rowRef.current?.measureInWindow?.((x) => { rowX.current = x; });
        }}
        {...responder.panHandlers}
      >
        {itemWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.capsule, { width: itemWidth, opacity: activeIndex < 0 ? 0 : 1, transform: [{ translateX: slide }] }]}
          />
        )}
        {routes.map((route, index) => {
          const focused = activeIndex === index;
          const Glyph = (focused && ACTIVE_ICONS[route.name]) || TAB_ICONS[route.name];
          const color = focused ? COLORS.accent : COLORS.textPrimary;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={TAB_LABELS[route.name] || route.name}
              aria-selected={currentIndex === index}
              style={styles.item}
              onPress={() => selectTab(index)}
            >
              {Glyph && <Glyph size={24} color={color} variant={focused ? 'Bold' : 'Linear'} />}
              <Text style={[styles.label, { color }]}>
                {TAB_LABELS[route.name] || route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const DashboardStack = () => (
  <Stack.Navigator screenOptions={stackOptions()}>
    <Stack.Screen name="DashboardHome" component={DashboardScreen} />
    <Stack.Screen name="AssetStocks" component={AssetStocksScreen} />
    <Stack.Screen name="HoldingDetail" component={HoldingDetailScreen} />
    <Stack.Screen name="AddStock" component={AddStockScreen} />
    <Stack.Screen name="SellStock" component={SellStockScreen} />
    <Stack.Screen name="EditStock" component={EditStockScreen} />
  </Stack.Navigator>
);

const InvestmentsStack = () => (
  <Stack.Navigator screenOptions={stackOptions()}>
    <Stack.Screen name="InvestmentsHome" component={InvestmentsScreen} />
    <Stack.Screen name="HoldingDetail" component={HoldingDetailScreen} />
    <Stack.Screen name="StockTransaction" component={StockTransactionScreen} />
    <Stack.Screen name="AddStock" component={AddStockScreen} />
    <Stack.Screen name="SellStock" component={SellStockScreen} />
    <Stack.Screen name="EditStock" component={EditStockScreen} />
  </Stack.Navigator>
);

const NewsStack = () => (
  <Stack.Navigator screenOptions={stackOptions()}>
    <Stack.Screen name="NewsHome" component={StockNewsScreen} />
    <Stack.Screen name="NewsDetail" component={StockNewsDetailScreen} />
  </Stack.Navigator>
);

const MembersStack = () => (
  <Stack.Navigator screenOptions={stackOptions()}>
    <Stack.Screen name="MembersHome" component={MembersScreen} />
    <Stack.Screen name="MemberDetail" component={MemberDetailScreen} />
    <Stack.Screen name="AddMember" component={AddMemberScreen} />
    <Stack.Screen name="Contributions" component={ContributionsScreen} />
  </Stack.Navigator>
);

const DividendsStack = () => (
  <Stack.Navigator screenOptions={stackOptions()}>
    <Stack.Screen name="DividendsHome" component={DividendsScreen} />
    <Stack.Screen name="AddDividend" component={AddDividendScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={stackOptions()}>
    <Stack.Screen name="ProfileHome" component={ProfileScreen} />
  </Stack.Navigator>
);

export const MainNavigator = () => {
  const [tabBarHeight, setTabBarHeight] = React.useState(TAB_BAR_HEIGHT);
  return (
    <TabBarHeightContext.Provider value={tabBarHeight}>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} onHeight={setTabBarHeight} />}
        backBehavior="history"
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Dashboard" component={DashboardStack} />
        <Tab.Screen name="Investments" component={InvestmentsStack} />
        <Tab.Screen name="News" component={NewsStack} />
        <Tab.Screen name="Members" component={MembersStack} />
        <Tab.Screen name="Dividends" component={DividendsStack} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
    </TabBarHeightContext.Provider>
  );
};

const styles = themedStyles(() => ({
  bar: {
    position: 'absolute',
    minHeight: TAB_BAR_HEIGHT,
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    padding: BAR_PADDING,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.isDark ? 'rgba(30, 30, 30, 0.72)' : 'rgba(255, 255, 255, 0.78)',
  },
  // Web has no native glass, so the material is built with a backdrop filter,
  // a bright top rim and a soft shadow. Android and older iOS use BlurView.
  barWeb: {
    backgroundColor: COLORS.isDark ? 'rgba(40, 40, 42, 0.45)' : 'rgba(255, 255, 255, 0.5)',
    borderColor: COLORS.isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(28px) saturate(180%)',
    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
    boxShadow: COLORS.isDark
      ? 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.45)'
      : 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(255,255,255,0.4), 0 12px 32px rgba(0,0,0,0.14)',
  },
  barGlass: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    minHeight: TAB_BAR_HEIGHT - BAR_PADDING * 2 - 2,
  },
  capsule: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)',
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    ...TYPE.navLabel,
    width: '100%',
    textAlign: 'center',
  },
}));
