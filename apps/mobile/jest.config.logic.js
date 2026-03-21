module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|expo-router|lucide-react-native)/)',
  ],
  setupFiles: ['./jest.setup.js'],
  testEnvironment: 'node',
};
