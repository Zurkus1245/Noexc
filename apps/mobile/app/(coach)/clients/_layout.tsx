import { Stack } from 'expo-router';

// The Clients tab owns a stack: list → client → plan / calendar, so back returns within the tab.
export default function ClientsStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
