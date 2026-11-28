import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { ClerkProvider, useAuth, useClerk } from '@clerk/react';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ClerkEnabledApp() {
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  return <App onClerkSignOut={signOut} getClerkToken={getToken} />;
}

createRoot(document.getElementById('root')!).render(
  clerkPublishableKey ? (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ClerkEnabledApp />
    </ClerkProvider>
  ) : (
    <App />
  )
);
