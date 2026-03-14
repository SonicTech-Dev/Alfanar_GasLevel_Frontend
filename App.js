import React, { createContext, useContext, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';

import config from './tamagui.config';

import Login from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import ListView from './Pages/ListView';
import CommandView from './Pages/CommandView';
import GasSensors from './Pages/GasSensors';
import DocumentTracker from './Pages/DocumentTracker';
import AccountCreator from './Pages/AccountCreator';
import FloatingAssistant from './Agent/aiInterface';

const Stack = createNativeStackNavigator();

const ViewModeContext = createContext({
  viewMode: 'grid',
  setViewMode: () => {},
  toggleViewMode: () => {},
});

const AuthContext = createContext({
  authUser: null,
  setAuthUser: () => {},
  permissions: null,
  setPermissions: () => {},
  resetAuth: () => {},
});

export function useViewMode() {
  return useContext(ViewModeContext);
}

export function useAuthState() {
  return useContext(AuthContext);
}

function AppShell() {
  const [viewMode, setViewMode] = useState('grid');
  const navRef = useNavigationContainerRef();
  const [currentRouteName, setCurrentRouteName] = useState('Login');
  const [authUser, setAuthUser] = useState(null);
  const [permissions, setPermissions] = useState(null);

  const viewValue = useMemo(
    () => ({
      viewMode,
      setViewMode,
      toggleViewMode: () => {
        setViewMode((prev) => (prev === 'grid' ? 'command' : 'grid'));
      },
    }),
    [viewMode]
  );

  const authValue = useMemo(
    () => ({
      authUser,
      setAuthUser,
      permissions,
      setPermissions,
      resetAuth: () => {
        setAuthUser(null);
        setPermissions(null);
      },
    }),
    [authUser, permissions]
  );

  return (
    <TamaguiProvider config={config} defaultTheme="lightLuxury">
      <AuthContext.Provider value={authValue}>
        <ViewModeContext.Provider value={viewValue}>
          <NavigationContainer
            ref={navRef}
            onReady={() => {
              const route = navRef.getCurrentRoute();
              setCurrentRouteName(route?.name || 'Login');
            }}
            onStateChange={() => {
              const route = navRef.getCurrentRoute();
              setCurrentRouteName(route?.name || 'Login');
            }}
          >
            <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="Dashboard" component={Dashboard} />
              <Stack.Screen name="ListView" component={ListView} />
              <Stack.Screen name="CommandView" component={CommandView} />
              <Stack.Screen name="GasSensors" component={GasSensors} />
              <Stack.Screen name="DocumentTracker" component={DocumentTracker} />
              <Stack.Screen name="AccountCreator" component={AccountCreator} />
            </Stack.Navigator>

            <FloatingAssistant currentRouteName={currentRouteName} />
          </NavigationContainer>
        </ViewModeContext.Provider>
      </AuthContext.Provider>
    </TamaguiProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppShell />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}