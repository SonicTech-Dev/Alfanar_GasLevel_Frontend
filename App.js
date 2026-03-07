import React, { createContext, useContext, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';

import config from './tamagui.config';

import Login from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import ListView from './Pages/ListView';
import CommandView from './Pages/CommandView';
import GasSensors from './Pages/GasSensors';

const Stack = createNativeStackNavigator();

const ViewModeContext = createContext({
  viewMode: 'grid',
  setViewMode: () => {},
  toggleViewMode: () => {},
});

export function useViewMode() {
  return useContext(ViewModeContext);
}

export default function App() {
  const [viewMode, setViewMode] = useState('grid');

  const value = useMemo(
    () => ({
      viewMode,
      setViewMode,
      toggleViewMode: () => {
        setViewMode((prev) => (prev === 'grid' ? 'command' : 'grid'));
      },
    }),
    [viewMode]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={config} defaultTheme="lightLuxury">
          <ViewModeContext.Provider value={value}>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={Login} />
                <Stack.Screen name="Dashboard" component={Dashboard} />
                <Stack.Screen name="ListView" component={ListView} />
                <Stack.Screen name="CommandView" component={CommandView} />
                <Stack.Screen name="GasSensors" component={GasSensors} />
              </Stack.Navigator>
            </NavigationContainer>
          </ViewModeContext.Provider>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}