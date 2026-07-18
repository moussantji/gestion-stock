import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { LocaleProvider } from './src/context/LocaleContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

export default function App() {
  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <AuthProvider>
          <NetworkProvider>
            <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
            <AppNavigator />
          </NetworkProvider>
        </AuthProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
