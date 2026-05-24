const { Expo } = require("expo-server-sdk");

const expo = new Expo();

async function sendPushNotification(expoPushToken, title, body) {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.error("Invalid Expo push token");

    return;
  }

  const messages = [
    {
      to: expoPushToken,
      sound: "default",
      title,
      body,
    },
  ];

  await expo.sendPushNotificationsAsync(messages);
}

module.exports = {
  sendPushNotification,
};
