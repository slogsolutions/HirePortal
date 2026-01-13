import { NotificationProvider } from "@/context/NotificationContext";

export function AllProviders({ children }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}
