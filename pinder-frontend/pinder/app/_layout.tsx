import { useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveProfileProvider } from '../src/contexts/ActiveProfileContext';
import { LoadingProvider } from '../src/contexts/LoadingContext';

function BackButtonExitGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const shouldConfirmExit = [
        '/',
        '/feedSwipe',
        '/dashboard',
        '/chat',
        '/matches',
        '/adoptions',
        '/grupos',
        '/register',
      ].includes(pathname);

      if (!shouldConfirmExit) {
        return false;
      }

      Alert.alert(
        'Terminar sessão?',
        'Queres sair da app e terminar a sessão?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Terminar sessão',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.removeItem('user');
              router.replace('/');
            },
          },
        ],
      );

      return true;
    });

    return () => subscription.remove();
  }, [pathname, router]);

  return null;
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <LoadingProvider>
        <ActiveProfileProvider>
          <BackButtonExitGuard />
          <Stack screenOptions={{ headerShown: false }} />
        </ActiveProfileProvider>
      </LoadingProvider>
    </SafeAreaProvider>
  );
}