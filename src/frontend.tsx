/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import './index.css';
import './types/router.d.ts';

import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './components/auth-guard';
import { ThemeProvider } from './components/theme-provider';
// @ts-ignore
import { routeTree } from './routeTree.gen';

// Create a new query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Create a new router instance
const router = createRouter({ routeTree });

// Get Clerk publishable key from config API
async function getClerkPublishableKey(): Promise<string> {
  try {
    // Use the same API base URL pattern as the rest of the app
    // In development (localhost), use the API server port, otherwise use relative path
    const API_BASE =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api'
        : '/api';
    const response = await fetch(`${API_BASE}/config`);
    const config = await response.json();
    return config.clerkPublishableKey;
  } catch (error) {
    console.error('Failed to fetch config:', error);
    throw new Error('Failed to load application configuration');
  }
}

// Initialize app with config
async function initializeApp() {
  const clerkPubKey = await getClerkPublishableKey();

  if (!clerkPubKey) {
    console.error(
      'Missing Clerk Publishable Key. Please add VITE_CLERK_PUBLISHABLE_KEY to your .env file'
    );
    throw new Error('Missing Clerk Publishable Key');
  }

  // Render the app
  const rootElement = document.getElementById('root');
  if (rootElement && !rootElement.innerHTML) {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ClerkProvider publishableKey={clerkPubKey}>
          <AuthProvider>
            <ThemeProvider>
              <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
              </QueryClientProvider>
            </ThemeProvider>
          </AuthProvider>
        </ClerkProvider>
      </StrictMode>
    );
  }
}

// Initialize the app
initializeApp().catch(console.error);
