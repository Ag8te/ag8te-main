import 'react-native-gesture-handler/jestSetup';

// Completely manual mock for Reanimated to avoid any internal requires
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (component) => component,
      call: jest.fn(),
    },
    useSharedValue: jest.fn((val) => ({ value: val })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSpring: jest.fn((val) => val),
    withTiming: jest.fn((val) => val),
    interpolate: jest.fn((val) => val),
    Extrapolate: { CLAMP: 'clamp' },
  };
});

// Mock Worklets
global.NativeWorklets = {
  createContext: jest.fn(),
  createRunInContext: jest.fn(),
};

jest.mock('react-native-worklets', () => ({
  Worklets: {
    createContext: jest.fn(),
    createRunInContext: jest.fn(),
  },
}));

// Mock Lucide Icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockIcon = (props) => React.createElement(View, props);
  return {
    Mail: MockIcon, Lock: MockIcon, User: MockIcon, UserPlus: MockIcon, 
    ArrowLeft: MockIcon, Phone: MockIcon, Shield: MockIcon, 
    FileText: MockIcon, Camera: MockIcon, Check: MockIcon, 
    X: MockIcon, Info: MockIcon, Globe: MockIcon, Briefcase: MockIcon, 
    Award: MockIcon, ChevronDown: MockIcon, Search: MockIcon
  };
});

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        LinearGradient: ({ children, ...props }) => React.createElement(View, props, children),
    };
});
