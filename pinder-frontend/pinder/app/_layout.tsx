import { useEffect } from 'react';
import { Alert, BackHandler, Modal, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveProfileProvider, useActiveProfile } from '../src/contexts/ActiveProfileContext';
import { LoadingProvider } from '../src/contexts/LoadingContext';
import { registerForPushNotifications } from "../src/services/notifications";

function BackButtonExitGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pathname === '/' || pathname === '/index') {
        return false;
      }

      const shouldConfirmExit = [
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

function BannedSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionStatus, sessionMessage, refreshStoredUser, clearSession } = useActiveProfile();

  useEffect(() => {
    if (pathname !== '/' && pathname !== '/index') {
      refreshStoredUser();
    }
  }, [pathname, refreshStoredUser]);

  if (sessionStatus !== 'banned') {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.banOverlay}>
        <View style={styles.banCard}>
          <Text style={styles.banTitle}>Conta banida</Text>
          <Text style={styles.banMessage}>{sessionMessage || 'A tua conta foi banida. Contacta o suporte.'}</Text>
          <TouchableOpacity
            style={styles.banButton}
            onPress={async () => {
              await clearSession();
              router.replace('/');
            }}
          >
            <Text style={styles.banButtonText}>Voltar ao login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function Layout() {

useEffect(() => {

  const setupNotifications = async () => {

    try {

      const token =
        await registerForPushNotifications();

      if (!token) return;

      console.log("Push token:", token);

      const userStr =
        await AsyncStorage.getItem("user");

      if (!userStr) return;

      const user = JSON.parse(userStr);

      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/users/push-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: user.user_id,
            token
          })
        }
      );

    } catch (err) {
      console.log(err);
    }
  };

  setupNotifications();

}, []);

  return (
    <SafeAreaProvider>
      <LoadingProvider>
        <ActiveProfileProvider>
          <BackButtonExitGuard />
          <BannedSessionGuard />
          <Stack screenOptions={{ headerShown: false }} />
        </ActiveProfileProvider>
      </LoadingProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  banOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  banCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF7F0',
    borderRadius: 24,
    padding: 24,
  },
  banTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8B1E3F',
    marginBottom: 12,
  },
  banMessage: {
    fontSize: 16,
    lineHeight: 22,
    color: '#5B4636',
    marginBottom: 20,
  },
  banButton: {
    backgroundColor: '#8B1E3F',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  banButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});