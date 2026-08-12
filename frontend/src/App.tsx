/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AppProvider, useApp, logAuth } from './context/AppContext';
import { LandingView } from './components/LandingView';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { HashRouter } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

const ResetPassword = lazy(() => import('./components/ResetPassword').then(m => ({ default: m.ResetPassword })));
const AboutPage = lazy(() => import('./components/pages/PublicPages').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./components/pages/PublicPages').then(m => ({ default: m.ContactPage })));
const FAQPage = lazy(() => import('./components/pages/PublicPages').then(m => ({ default: m.FAQPage })));
const HowToDepositPage = lazy(() => import('./components/pages/PublicPages').then(m => ({ default: m.HowToDepositPage })));
const HowToWithdrawPage = lazy(() => import('./components/pages/PublicPages').then(m => ({ default: m.HowToWithdrawPage })));
const PolicyPage = lazy(() => import('./components/pages/PublicPages').then(m => ({ default: m.PolicyPage })));

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
    const search = window.location.search.toLowerCase();

    if (hash.includes('deposit/callback') || path.includes('/deposit/callback') || search.includes('reference=') || search.includes('ref=')) {
      return 'dashboard';
    }

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

  const pageFallback = (
    <div className="bg-slate-950 min-h-screen flex flex-col items-center justify-center text-slate-400 space-y-4">
      <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
      <p className="font-mono text-xs uppercase tracking-widest text-slate-500 animate-pulse">
        Loading requested page...
      </p>
    </div>
  );

  // If user opened a reset password link, render ResetPassword directly
  if (isResetRoute && !user) {
    return (
      <Suspense fallback={pageFallback}>
        <ResetPassword 
          onBackToLogin={() => {
            // Clear query params and return to clean login page
            window.history.pushState({}, '', window.location.pathname);
            setIsResetRoute(false);
            setScreen('login');
          }} 
        />
      </Suspense>
    );
  }

  // Render Public Pages if active screen is a public page
  if (screen === 'about') return <Suspense fallback={pageFallback}><AboutPage onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;
  if (screen === 'contact') return <Suspense fallback={pageFallback}><ContactPage onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;
  if (screen === 'faq') return <Suspense fallback={pageFallback}><FAQPage onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;
  if (screen === 'how-to-deposit') return <Suspense fallback={pageFallback}><HowToDepositPage onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;
  if (screen === 'how-to-withdraw') return <Suspense fallback={pageFallback}><HowToWithdrawPage onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;
  if (screen === 'privacy') return <Suspense fallback={pageFallback}><PolicyPage type="privacy" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;
  if (screen === 'terms') return <Suspense fallback={pageFallback}><PolicyPage type="terms" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;
  if (screen === 'risk') return <Suspense fallback={pageFallback}><PolicyPage type="risk" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;
  if (screen === 'aml') return <Suspense fallback={pageFallback}><PolicyPage type="aml" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;
  if (screen === 'kyc') return <Suspense fallback={pageFallback}><PolicyPage type="kyc" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;
  if (screen === 'cookie') return <Suspense fallback={pageFallback}><PolicyPage type="cookie" onBack={() => setScreen(user ? 'dashboard' : 'landing')} onNavigate={navigateToPage} onEnterApp={(m) => setScreen(m)} /></Suspense>;

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
