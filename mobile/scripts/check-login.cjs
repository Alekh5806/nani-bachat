// Run with: node scripts/check-login.cjs
// Exercise authentication and returning-member behavior without a live account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');

const values = new Map();
const storage = {
  getItem: async (key) => values.get(key) ?? null,
  setItem: async (key, value) => { values.set(key, value); },
  removeItem: async (key) => { values.delete(key); },
  multiGet: async (keys) => keys.map((key) => [key, values.get(key) ?? null]),
  multiSet: async (entries) => { entries.forEach(([key, value]) => values.set(key, value)); },
  multiRemove: async (keys) => { keys.forEach((key) => values.delete(key)); },
};

function load(file, dependencies) {
  const filename = path.join(__dirname, '..', file);
  const { code } = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports, console,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename });
  return exports;
}

async function main() {
  const helpers = load('src/utils/rememberedMember.js', {
    '@react-native-async-storage/async-storage': storage,
  });
  const member = {
    id: 1, name: 'Asha Patel', phone: '9000000001', avatar: 'avatar-3',
    avatar_color: '#4164DA', current_value: 100000,
  };
  values.set('saved_password', 'legacy-password');
  await helpers.rememberMember(member);
  const saved = await helpers.loadRememberedMember();
  assert.equal(saved.member.name, member.name);
  assert.equal(saved.phone, member.phone);
  assert.equal(values.has('saved_password'), false);
  assert.equal('current_value' in saved.member, false);
  assert.equal(helpers.firstName('  Asha   Patel  '), 'Asha');
  assert.equal(helpers.isRememberedPhone(saved.member, '90000 00001'), true);
  assert.equal(helpers.isRememberedPhone(saved.member, '9000000002'), false);
  assert.equal(helpers.isRememberedPhone(null, ''), false);
  assert.equal(helpers.greetingForHour(8), 'Good morning');
  assert.equal(helpers.greetingForHour(12), 'Good afternoon');
  assert.equal(helpers.greetingForHour(17), 'Good evening');

  values.set('remembered_member', '{broken');
  assert.equal((await helpers.loadRememberedMember()).member, null);
  values.set('remembered_member', JSON.stringify({ name: 42, phone: {} }));
  assert.equal((await helpers.loadRememberedMember()).member, null);

  let rejectLogin = false;
  let releaseLogin;
  let logoutCallback;
  let cacheClears = 0;
  const api = {
    post: async (url) => {
      if (url === '/auth/logout/') return {};
      if (rejectLogin) throw { response: { data: { detail: 'Invalid credentials' } } };
      await new Promise((resolve) => { releaseLogin = resolve; });
      return { data: { access: 'test-access', refresh: 'test-refresh', member } };
    },
    get: async () => ({ data: { ...member, name: 'Asha Shah' } }),
  };
  const { useAuthStore } = load('src/store/authStore.js', {
    zustand: require('zustand'),
    '@react-native-async-storage/async-storage': storage,
    './portfolioStore': { usePortfolioStore: { getState: () => ({ clearCache: async () => { cacheClears += 1; } }) } },
    '../config/api': {
      __esModule: true, default: api,
      setLogoutCallback: (callback) => { logoutCallback = callback; },
      setSessionTokens: () => {},
    },
    '../utils/rememberedMember': helpers,
  });
  const store = useAuthStore;
  const pending = store.getState().login(member.phone, 'test-password');
  assert.equal(store.getState().isLoading, true);
  releaseLogin();
  const result = await pending;
  assert.equal(result.success, true);
  assert.equal(result.member.name, member.name);
  assert.equal(store.getState().isLoading, false);
  assert.equal(values.get('access_token'), 'test-access');
  assert.equal(values.has('saved_password'), false);
  assert.ok(cacheClears > 0);

  await store.getState().logout();
  assert.equal(store.getState().token, null);
  assert.equal(values.has('access_token'), false);
  assert.equal((await helpers.loadRememberedMember()).member.name, member.name);

  rejectLogin = true;
  assert.equal((await store.getState().login(member.phone, 'wrong')).success, false);
  assert.equal(store.getState().isLoading, false);
  assert.equal(store.getState().error, 'Invalid credentials');
  assert.equal(values.has('access_token'), false);
  store.getState().clearError();
  assert.equal(store.getState().error, null);

  await helpers.forgetRememberedMember();
  assert.equal((await helpers.loadRememberedMember()).member, null);
  assert.equal((await helpers.loadRememberedMember()).phone, '');

  rejectLogin = false;
  const temporary = store.getState().login(member.phone, 'test-password', false);
  releaseLogin();
  await temporary;
  assert.equal(values.has('access_token'), false);
  assert.equal(values.has('remembered_member'), false);

  // Existing sessions acquire a greeting when the upgraded app is opened.
  values.set('access_token', 'existing-access');
  values.set('refresh_token', 'existing-refresh');
  values.set('user', JSON.stringify(member));
  await store.getState().loadToken();
  assert.equal((await helpers.loadRememberedMember()).member.name, member.name);
  await store.getState().fetchProfile();
  assert.equal((await helpers.loadRememberedMember()).member.name, 'Asha Shah');
  logoutCallback();
  assert.equal(store.getState().token, null);
  assert.equal((await helpers.loadRememberedMember()).member.name, 'Asha Shah');
  console.log('Login checks passed: greetings, identity matching, migration, loading, success, failure, logout, account switching, and profile refresh.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
