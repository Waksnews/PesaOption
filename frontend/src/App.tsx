/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp, logAuth } from './context/AppContext';
import { LandingView } from './components/LandingView';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { ResetPassword } from './components/ResetPassword';
import { 
  AboutPage, ContactPage, FAQPage, HowToDepositPage, HowToWithdrawPage, PolicyPage 
} from './components/pages/PublicPages';
import { HashRouter } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

const InnerRouter: React.FC = () => {
  const { user, loading } = useApp();
  const [screen, setScreen] = useState<string>('landing');

  // Route Guard: Redirect authenticated users away from guest pages (login, register, landing)
  useEffect(() => {
    if (user && (screen === 'login' || screen === 'register' || screen === 'landing')) {
      logAuth('Redirecting to dashboard');
      setScreen('dashboard');
      if (window.location.hash.includes('login') || window.location.hash.includes('register') || window.location.hash.includes('landing')) {
        window.location.hash = '#dashboard';
      }
    }
  }, [user, screen]);

  // Helper to determine route from window.location.hash or window.location.pathname
  const getActiveRouteFromUrl = () => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    if (hash.includes('about') || path.includes('/about')) return 'about';
    if (hash.includes('contact') || path.includes('/contact')) return 'contact';
    if (hash.includes('faq') || path.includes('/faq')) return 'faq';
    if (hash.includes('how-to-deposit') || path.includes('/how-to-deposit')) return 'how-to-deposit';
    if (hash.includes('how-to-withdraw') || path.includes('/how-to-withdraw')) return 'how-to-withdraw';
    if (hash.includes('privacy-policy') || path.includes('/privacy-policy')) return 'privacy';
    if (hash.includes('terms-of-service') || path.includes('/terms-of-service')) return 'terms';
    if (hash.includes('risk-disclosure') || path.includes('/risk-disclosure')) return 'risk';
    if (hash.includes('aml-policy') || path.includes('/aml-policy')) return 'aml';
    if (hash.includes('kyc-policy') || path.includes('/kyc-policy')) return 'kyc';
    if (hash.includes('cookie-policy') || path.includes('/cookie-policy')) return 'cookie';
    if (hash.includes('login') || path.includes('/login')) return 'login';
    if (hash.includes('register') || path.includes('/register')) return 'register';
    return null;
  };

  const isResetUrl = () => {
    return (
      window.location.pathname.includes('/reset-password') ||
      window.location.search.includes('token=') ||
      window.location.hash.includes('token=')
    );
  };

  const [isResetRoute, setIsResetRoute] = useState(isResetUrl());

  useEffect(() => {
    const initialRoute = getActiveRouteFromUrl();
    if (initialRoute) {
      setScreen(initialRoute);
    }

    const handleLocationChange = () => {
      setIsResetRoute(isResetUrl());
      const route = getActiveRouteFromUrl();
      if (route) setScreen(route);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateToPage = (pageName: string) => {
    window.location.hash = `#${pageName}`;
    setScreen(pageName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // Render Public Pages if active screen is a public page
  if (screen === 'about') return <AboutPage onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;
  if (screen === 'contact') return <ContactPage onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;
  if (screen === 'faq') return <FAQPage onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;
  if (screen === 'how-to-deposit') return <HowToDepositPage onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;
  if (screen === 'how-to-withdraw') return <HowToWithdrawPage onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;
  if (screen === 'privacy') return <PolicyPage type="privacy" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;
  if (screen === 'terms') return <PolicyPage type="terms" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;
  if (screen === 'risk') return <PolicyPage type="risk" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;
  if (screen === 'aml') return <PolicyPage type="aml" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;
  if (screen === 'kyc') return <PolicyPage type="kyc" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;
  if (screen === 'cookie') return <PolicyPage type="cookie" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} />;

  // If user is authenticated, route to trading dashboard
  if (user) {
    return <DashboardView />;
  }

  // Guest screen handling
  if (screen === 'landing') {
    return (
      <LandingView 
        onEnterApp={(mode) => setScreen(mode)} 
        onNavigate={navigateToPage}
      />
    );
  }

  return (
    <AuthView 
      initialMode={screen as 'login' | 'register'} 
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
