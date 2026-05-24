import React from "react";
// 1. Ferramentas de navegação
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// O "Stack" é o que empilha as páginas umas por cima das outras
const Stack = createNativeStackNavigator();
const token = await registerForPushNotifications();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login" // A primeira página a abrir
        screenOptions={{
          // Esconde a barra cinzenta horrível que os telemóveis metem no topo por defeito
          headerShown: false,
          // Ativa a animação de deslizar suave em todos os ecrãs
          animation: "slide_from_right",
        }}
      ></Stack.Navigator>
    </NavigationContainer>
  );
}
