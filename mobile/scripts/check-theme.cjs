// Run with: node scripts/check-theme.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');
const appDir = path.join(__dirname, '..');

function load(file, dependencies) {
  const filename = path.join(appDir, file);
  const { code } = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, cwd: appDir, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => dependencies[name] }, { filename });
  return exports;
}

function luminance(color) {
  const [red, green, blue] = color.slice(1).match(/../g).map((hex) => {
    const channel = parseInt(hex, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

let appearance = 'dark';
let savedPreference = null;
const theme = load('src/theme/colors.js', {
  'react-native': { Appearance: { getColorScheme: () => appearance }, StyleSheet: { create: (sheet) => sheet } },
  './fonts': { applyFont: (sheet) => sheet },
});
const { useThemeStore: store } = load('src/store/themeStore.js', {
  zustand: require('zustand'),
  '@react-native-async-storage/async-storage': {
    getItem: async () => savedPreference,
    setItem: async (_, value) => { savedPreference = value; },
  },
  '../theme/colors': theme,
});

function checkContrast() {
  for (const [mode, colors] of Object.entries(theme.PALETTES)) {
    const check = (foreground, background, minimum) => {
      const a = luminance(colors[foreground] ?? foreground);
      const b = luminance(colors[background]);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      assert.ok(ratio >= minimum, `${mode} ${foreground} against ${background}: ${ratio.toFixed(2)} < ${minimum}`);
    };
    for (const background of ['background', 'cardBg', 'surface', 'surfaceLight']) {
      for (const text of ['textPrimary', 'textSecondary', 'textMuted', 'accent', 'profit', 'loss', 'warning']) {
        check(text, background, 4.5);
      }
      check('inputBorder', background, 3);
      check('inputFocus', background, 3);
    }
    for (const role of ['profit', 'loss', 'warning']) check(role, role + 'Bg', 4.5);
    for (const fill of ['buttonPrimary', 'buttonPrimaryPressed', 'buttonDanger']) check('onAccent', fill, 4.5);
    for (const swatch of colors.chartCategories) check(swatch, 'cardBg', 3);
    check('placeholder', 'inputBg', 4.5);
    check('tabBarActive', 'surfaceLight', 4.5);
    check('tabBarInactive', 'tabBarBg', 4.5);
  }
}

async function checkPreference() {
  const styles = theme.themedStyles(() => ({ page: { backgroundColor: theme.COLORS.background } }));
  assert.equal(store.getState().mode, 'dark');
  const darkStyle = styles.page;
  appearance = 'light';
  await store.getState().load();
  assert.equal(store.getState().mode, 'light');
  assert.notEqual(styles.page, darkStyle);
  assert.equal(styles.page.backgroundColor, theme.PALETTES.light.background);

  store.getState().setPreference('dark');
  await store.getState().load();
  assert.equal(savedPreference, 'dark');
  assert.equal(store.getState().mode, 'dark');
  const overrideStyle = styles.page;
  store.getState().setPreference('dark', false);
  assert.equal(styles.page, overrideStyle);

  store.getState().setPreference('system');
  assert.equal(store.getState().mode, 'light');
  appearance = 'dark';
  store.getState().setPreference('system', false);
  assert.equal(store.getState().mode, 'dark');
  assert.equal(savedPreference, 'system');
}

checkContrast();
checkPreference().then(() => {
  console.log('Light and dark contrast, saved preference, and theme updates passed.');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
