// Run with: node scripts/check-login.cjs
// Exercise authentication and returning-member behavior without a live account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');
const axios = require('axios');

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
    exports, console, process, __DEV__: true,
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
  let cacheClears = 0;
  let access = 'test-access';
  let refresh = 'test-refresh';
  let expired = false;
  let refreshUnavailable = false;
  const refreshAttempts = [];
  const revoked = [];
  const reject = (config, status, detail) => {
    throw new axios.AxiosError(detail, undefined, config, undefined, { status, data: { detail } });
  };
  const adapter = async (config) => {
    const url = config.url;
    const body = config.data && JSON.parse(config.data);
    if (url === '/auth/login/') {
      if (rejectLogin) reject(config, 401, 'Invalid credentials');
      await new Promise((resolve) => { releaseLogin = resolve; });
      expired = false;
      return { data: { access, refresh, member } };
    }
    if (url.endsWith('/auth/token/refresh/')) {
      refreshAttempts.push(body.refresh);
      if (refreshUnavailable) reject(config, 503, 'Service unavailable');
      if (body.refresh !== refresh) reject(config, 401, 'Invalid refresh token');
      access = `access-${refreshAttempts.length}`;
      refresh = `refresh-${refreshAttempts.length}`;
      expired = false;
      return { data: { access, refresh } };
    }
    if (expired || config.headers.Authorization !== `Bearer ${access}`) {
      reject(config, 401, 'Invalid access token');
    }
    if (url === '/auth/logout/') {
      assert.equal(body.refresh, refresh);
      revoked.push(body.refresh);
      return { data: {} };
    }
    return { data: { ...member, name: 'Asha Shah' } };
  };
  const backend = axios.create({ adapter });
  const startApp = () => {
    const client = load('src/config/api.js', {
      axios: {
        create: (config) => axios.create({ ...config, adapter }),
        post: backend.post,
        CanceledError: axios.CanceledError,
      },
      '@react-native-async-storage/async-storage': storage,
    });
    const { useAuthStore } = load('src/store/authStore.js', {
      zustand: require('zustand'),
      '@react-native-async-storage/async-storage': storage,
      './portfolioStore': { usePortfolioStore: { getState: () => ({ clearCache: async () => { cacheClears += 1; } }) } },
      '../config/api': client,
      '../utils/rememberedMember': helpers,
    });
    return { store: useAuthStore, api: client.default };
  };

  let { store, api } = startApp();
  const pending = store.getState().login(member.phone, 'test-password');
  assert.equal(store.getState().isLoading, true);
  await new Promise(setImmediate);
  releaseLogin();
  const result = await pending;
  assert.equal(result.success, true);
  assert.equal(result.member.name, member.name);
  assert.equal(store.getState().isLoading, false);
  assert.equal(values.get('access_token'), 'test-access');
  assert.equal(values.has('saved_password'), false);
  assert.ok(cacheClears > 0);

  expired = true;
  await Promise.all([api.get('/portfolio/dashboard/'), api.get('/portfolio/dashboard/')]);
  assert.deepEqual(refreshAttempts, ['test-refresh']);
  assert.equal(values.get('access_token'), access);
  assert.equal(values.get('refresh_token'), refresh);

  ({ store, api } = startApp());
  expired = true;
  await store.getState().loadToken();
  await api.get('/portfolio/dashboard/');
  assert.deepEqual(refreshAttempts, ['test-refresh', 'refresh-1']);
  assert.equal(values.get('refresh_token'), refresh);

  expired = true;
  refreshUnavailable = true;
  await assert.rejects(api.get('/portfolio/dashboard/'), /Service unavailable/);
  assert.ok(store.getState().token);
  assert.equal(values.get('refresh_token'), refresh);
  refreshUnavailable = false;

  await store.getState().logout();
  assert.deepEqual(revoked, [refresh]);
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
  await new Promise(setImmediate);
  releaseLogin();
  await temporary;
  expired = true;
  const profile = await store.getState().fetchProfile();
  assert.equal(profile.name, 'Asha Shah');
  assert.equal(values.has('access_token'), false);
  assert.equal(values.has('refresh_token'), false);
  assert.equal(values.has('user'), false);
  assert.equal(values.has('remembered_member'), false);
  await store.getState().logout();
  assert.equal(revoked.at(-1), refresh);

  // Existing sessions acquire a greeting when the upgraded app is opened.
  values.set('access_token', access);
  values.set('refresh_token', refresh);
  values.set('user', JSON.stringify(member));
  ({ store, api } = startApp());
  await store.getState().loadToken();
  assert.equal((await helpers.loadRememberedMember()).member.name, member.name);
  await store.getState().fetchProfile();
  assert.equal((await helpers.loadRememberedMember()).member.name, 'Asha Shah');
  expired = true;
  refresh = 'revoked-server-side';
  await assert.rejects(api.get('/portfolio/dashboard/'), /Invalid refresh token/);
  assert.equal(store.getState().token, null);
  assert.equal(values.has('refresh_token'), false);
  assert.equal((await helpers.loadRememberedMember()).member.name, 'Asha Shah');
  console.log('Login checks passed for remembered and temporary sessions, reload, refresh rotation, and logout.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
