import { Stack } from 'expo-router';
import { ActiveProfileProvider } from '../src/contexts/ActiveProfileContext';
import { LoadingProvider } from '../src/contexts/LoadingContext';

export default function Layout() {
  return (
    <LoadingProvider>
      <ActiveProfileProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ActiveProfileProvider>
    </LoadingProvider>
  );
}