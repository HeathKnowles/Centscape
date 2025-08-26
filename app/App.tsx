import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from './src/navigation';
import { useWishlistStore } from './src/store/wishlist';

export default function App() {
  // Initialize store on app start
  React.useEffect(() => {
    useWishlistStore.getState().initializeStore();
  }, []);

  return (
    <SafeAreaProvider>
      <Navigation />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}