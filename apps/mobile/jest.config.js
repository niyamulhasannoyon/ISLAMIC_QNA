const path = require('path');
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|@sentry/.*|native-base|react-native-svg|@repo/.*)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    ...(expoPreset.moduleNameMapper || {}),
    '^react$': path.resolve(__dirname, 'node_modules/react'),
    '^react/(.*)$': path.resolve(__dirname, 'node_modules/react/$1'),
  },
};
