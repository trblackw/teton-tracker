/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import './index.css';
import './types/router.d.ts';

import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { routeTree } from './routeTree.gen';

// Create a new router instance
const router = createRouter({ routeTree });

// Initialize app
function initializeApp() {
  // Render the app
  const rootElement = document.getElementById('root');
  if (rootElement && !rootElement.innerHTML) {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>
    );
  }
}

// Initialize the app
initializeApp();
