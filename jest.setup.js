// Global Jest setup helpers
// Mock minimal Expo constants used by the app
jest.doMock('expo-constants', () => ({
  manifest: {},
  manifest2: {},
  getWebViewUserAgentAsync: async () => 'jest-agent',
}));

// Provide a lightweight mock for Supabase client factory used in tests
// Mock the '@supabase/supabase-js' package so the real createClient is
// replaced with a lightweight test client. This ensures importing
// SupabaseService (which calls createClient at module init) doesn't throw
// when environment variables are missing and provides a chainable API.
jest.doMock('@supabase/supabase-js', () => {
  const tables = new Map();

  // Default test user for authentication flows in components
  global.__SUPABASE_USER = global.__SUPABASE_USER || {
    id: 'test-user',
    email: 'test@example.com',
  };
  global.__SUPABASE_SESSION = global.__SUPABASE_SESSION || null;

  function makeQuery(tableName) {
    let chain = { table: tableName };
    const execute = async () => ({
      data: tables.get(chain.table) || [],
      error: null,
    });
    const api = {
      select: () => api,
      eq: () => api,
      gte: () => api,
      lte: () => api,
      in: () => api,
      order: () => api,
      limit: () => api,
      single: async () => {
        const { data } = await execute();
        return { data: data && data[0] ? data[0] : null, error: null };
      },
      upsert: async (payload) => {
        const tbl = tables.get(chain.table) || [];
        if (Array.isArray(payload)) payload.forEach((p) => tbl.push(p));
        else tbl.push(payload);
        tables.set(chain.table, tbl);
        return { data: payload, error: null };
      },
      insert: async (payload) => {
        const tbl = tables.get(chain.table) || [];
        if (Array.isArray(payload)) payload.forEach((p) => tbl.push(p));
        else tbl.push(payload);
        tables.set(chain.table, tbl);
        return { data: payload, error: null };
      },
      update: async (payload) => ({ data: payload, error: null }),
      delete: async () => ({ data: [], error: null }),
      then: (cb) => execute().then(cb),
      catch: (cb) => execute().catch(cb),
    };
    return api;
  }

  const createClient = () => ({
    from: jest.fn((table) => makeQuery(table)),
    rpc: jest.fn(async () => ({ data: null, error: null })),
    functions: { invoke: jest.fn(async () => ({ data: null, error: null })) },
    auth: {
      getUser: async () => ({ data: { user: global.__SUPABASE_USER || null } }),
      getSession: async () => ({
        data: { session: global.__SUPABASE_SESSION || null },
      }),
      onAuthStateChange: (cb) => {
        // Immediately invoke with a signed-out state unless overridden
        cb('SIGNED_OUT', { user: global.__SUPABASE_USER || null });
        return { data: null, error: null };
      },
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({
        data: { user: global.__SUPABASE_USER || null },
        error: null,
      }),
    },
  });

  return { createClient };
});

// Also ensure the local SupabaseService module exports `supabase` as the
// SupabaseStorageService imports it. This avoids situations where the
// real SupabaseService runs createClient during module init and throws.
jest.doMock('./src/services/storage/SupabaseService', () => {
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient();
  return { supabase: client };
});

// Prevent Jest from trying to import real native modules for react-native-vector-icons
jest.doMock('react-native-vector-icons', () => ({}));

// Mock MaterialCommunityIcons specifically (many components import it directly)
jest.doMock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  return function MockIcon(props) {
    return React.createElement('Icon', props, props.children || null);
  };
});

// Provide an inline mock for 'react-native' to ensure consistent test behavior
jest.doMock('react-native', () => {
  const React = require('react');

  const AppState = {
    addEventListener: (_event, _cb) => ({ remove: () => {} }),
  };

  const Image = {
    resolveAssetSource: (_asset) => ({ uri: 'file://test-asset' }),
  };

  const StyleSheet = {
    create: (styles) => styles,
    // Minimal flatten implementation used by testing-library
    flatten: (style) => {
      if (!style) return {};
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.map((s) => s || {}));
      }
      if (typeof style === 'object') return style;
      return {};
    },
  };

  const Dimensions = {
    get: (key) => {
      if (key === 'window') return { width: 800, height: 600 };
      return { width: 800, height: 600 };
    },
  };

  function MockView(props) {
    return React.createElement('View', props, props.children || null);
  }

  function MockText(props) {
    if (
      typeof props.children === 'string' ||
      typeof props.children === 'number'
    ) {
      return React.createElement('Text', props, props.children);
    }
    return React.createElement('Text', props, props.children || null);
  }

  function MockTextInput(props) {
    return React.createElement('TextInput', props, null);
  }

  function MockScrollView(props) {
    return React.createElement('ScrollView', props, props.children || null);
  }

  function MockTouchableOpacity(props) {
    return React.createElement(
      'TouchableOpacity',
      props,
      props.children || null,
    );
  }

  function MockButton(props) {
    const { title, onPress } = props || {};
    return React.createElement('Button', { onPress }, title || null);
  }

  function MockFlatList(props) {
    const { data = [], renderItem } = props || {};
    const children = data.map((item, index) => {
      if (renderItem) return renderItem({ item, index });
      return React.createElement(
        'View',
        { key: index },
        item && item.toString(),
      );
    });
    return React.createElement('FlatList', props, children);
  }

  const Platform = {
    OS: 'ios',
    select: (obj) => (obj.ios ? obj.ios : obj.default),
  };
  const PixelRatio = { get: () => 1 };
  const NativeModules = {};
  const Alert = { alert: jest.fn() };

  // Minimal Animated mock used by services relying on Animated.Value
  const Animated = {
    Value: class MockAnimatedValue {
      constructor(v) {
        this._value = v;
      }
      setValue(v) {
        this._value = v;
      }
      // provide a minimal addListener/removeListener shape
      addListener() {
        return 0;
      }
      removeListener() {}
    },
    // timing/spring helpers can return a noop or identity for tests
    timing: (value, _config) => ({ start: (cb) => cb && cb() }),
    spring: (value, _config) => ({ start: (cb) => cb && cb() }),
  };

  return {
    __esModule: true,
    AppState,
    Animated,
    Image,
    StyleSheet,
    Dimensions,
    View: MockView,
    Text: MockText,
    TextInput: MockTextInput,
    ScrollView: MockScrollView,
    TouchableOpacity: MockTouchableOpacity,
    TouchableHighlight: MockTouchableOpacity,
    Pressable: MockTouchableOpacity,
    Button: MockButton,
    FlatList: MockFlatList,
    Platform,
    PixelRatio,
    NativeModules,
    Alert,
  };
});

// Mock react-native-reanimated with the provided mock plus lightweight implementations
jest.doMock('react-native-reanimated', () => {
  const React = require('react');

  const mock = {
    View: (props) =>
      React.createElement('ReanimatedView', props, props.children || null),
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
    withTiming: (v) => v,
    withSpring: (v) => v,
    withRepeat: (v) => v,
    runOnJS: (fn) => fn,
  };

  return { __esModule: true, default: mock, ...mock };
});

// Mock react-native-chart-kit LineChart
jest.doMock('react-native-chart-kit', () => {
  const React = require('react');
  return {
    LineChart: (props) => React.createElement('LineChart', props, null),
  };
});

// Mock expo-blur BlurView
jest.doMock('expo-blur', () => {
  const React = require('react');
  return {
    BlurView: (props) =>
      React.createElement('View', props, props.children || null),
  };
});

// Silence some console noise in tests
global.console.debug = global.console.debug || ((...args) => {});

// Diagnostic check: ensure critical mocks export expected shapes
try {
  const rn = require('react-native');
  const elg = require('expo-linear-gradient');
  const rnr = require('react-native-reanimated');
  const icon = require('react-native-vector-icons/MaterialCommunityIcons');

  console.debug('JEST-MOCK-CHK', {
    reactNativeKeys: Object.keys(rn || {}),
    expoLinearGradient_hasLinearGradient: !!(elg && elg.LinearGradient),
    reanimatedKeys: Object.keys(rnr || {}),
    materialIcon_type: typeof icon,
  });
} catch (err) {
  console.debug('JEST-MOCK-CHK-ERR', err && err.message);
}
