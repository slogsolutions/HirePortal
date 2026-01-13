export const getMessaging = () => ({
  getToken: () => Promise.resolve("test-token"),
  onMessage: () => {},
});
