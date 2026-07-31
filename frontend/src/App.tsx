/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingView } from './components/LandingView';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { ResetPassword } from './components/ResetPassword';
import { HashRouter } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

const InnerRouter: React.FC = () => {
  const { user, loading } = useApp();
  const [screen, setScreen] = useState<'landing' | 'login' | 'register' | 'forgot' | 'reset'>('landing');

  // Check if current URL contains a reset password token query param or path
  const isResetUrl = () => {
    return (
      window.location.pathname.includes('/reset-password') ||
      window.location.search.includes('token=') ||
      window.location.hash.includes('token=')
    );
  };

  const [isResetRoute, setIsResetRoute] = useState(isResetUrl());

  useEffect(() => {
    const handleLocationChange = () => {
      setIsResetRoute(isResetUrl());
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-950 min-h-screen flex flex-col items-center justify-center text-slate-400 space-y-4">
        <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500 animate-pulse">
          Establishing Secure Workspace Feed...
        </p>
      </div>
    );
  }

  // If user opened a reset password link, render ResetPassword directly
  if (isResetRoute && !user) {
    return (
      <ResetPassword 
        onBackToLogin={() => {
          // Clear query params and return to clean login page
          window.history.pushState({}, '', window.location.pathname);
          setIsResetRoute(false);
          setScreen('login');
        }} 
      />
    );
  }

  // If user is authenticated, route immediately to dashboard
  if (user) {
    return <DashboardView />;
  }

  // Otherwise, route based on current guest screen selection
  if (screen === 'landing') {
    return <LandingView onEnterApp={(mode) => setScreen(mode)} />;
  }

  return (
    <AuthView 
      initialMode={screen} 
      onBackToLanding={() => setScreen('landing')} 
    />
  );
};

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <InnerRouter />
      </AppProvider>
    </HashRouter>
  );
}
