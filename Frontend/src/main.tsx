import './style.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route } from 'react-router-dom';
import App from './App';

// Créer le routeur principal
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="*" element={<App />} />
  )
);

// Rendu de l'application avec StrictMode désactivé pour éviter les doubles rendus
ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);