import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActiveProfileProvider } from '../src/contexts/ActiveProfileContext';
import { LoadingProvider } from '../src/contexts/LoadingContext';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <LoadingProvider>
        <ActiveProfileProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ActiveProfileProvider>
      </LoadingProvider>
    </SafeAreaProvider>
  );
}