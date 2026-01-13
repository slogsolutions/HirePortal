export const initializeApp = () => ({});
export const getAnalytics = () => ({});
export const getMessaging = () => ({
  getToken: () => Promise.resolve("test-token"),
  onMessage: () => {},
});
