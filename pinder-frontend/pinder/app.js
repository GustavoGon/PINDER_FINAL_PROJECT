import React from "react";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();
const token = await registerForPushNotifications();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login" // A primeira página a abrir
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      ></Stack.Navigator>
    </NavigationContainer>
  );
}
