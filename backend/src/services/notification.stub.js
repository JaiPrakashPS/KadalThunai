/**
 * Notification stub — replace with Firebase Admin SDK when ready.
 * These functions log the intent and return a mock result.
 */

const sendTopicNotification = async ({ topic, title, body }) => {
  console.log(`[FCM STUB] Topic: ${topic} | Title: ${title} | Body: ${body}`);
  return { success: true, stub: true };
};

const sendMulticastNotification = async ({ fcmTokens, title, body }) => {
  console.log(`[FCM STUB] Multicast to ${fcmTokens.length} tokens | Title: ${title}`);
  return { successCount: fcmTokens.length, failureCount: 0, stub: true };
};

const sendToDevice = async ({ token, title, body }) => {
  console.log(`[FCM STUB] To device | Title: ${title}`);
  return { success: true, stub: true };
};

module.exports = { sendTopicNotification, sendMulticastNotification, sendToDevice };
