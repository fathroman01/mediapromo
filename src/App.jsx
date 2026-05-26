import React from 'react';
import { AppProvider } from './store/AppContext';
import MainLayout from './layouts/MainLayout';
import './styles/App.css';

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
