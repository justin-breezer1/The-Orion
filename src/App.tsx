import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { InvitePage } from './pages/InvitePage';
import { Dashboard } from './pages/Dashboard';
import { VaultsPage } from './pages/VaultsPage';
import { AccountPage } from './pages/AccountPage';
import { CommunicationsPage } from './pages/CommunicationsPage';
import { AdminPanel } from './pages/AdminPanel';
import { VaultItemPage } from './pages/VaultItemPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { SyncProvider } from './components/SyncProvider';
import { Navigation } from './components/Navigation';
import { StarField, Nebula } from './components/System';
import { supabase } from './lib/supabase';
import { AnimatePresence, motion } from 'motion/react';

function AnimatedRoutes({ session, isEmailVerified }: { session: any, isEmailVerified: boolean }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/" element={
          <PageWrapper animationKey="login">
            {session ? (isEmailVerified ? <Navigate to="/dashboard" /> : <Navigate to="/verify-email" />) : <LoginPage />}
          </PageWrapper>
        } />
        <Route path="/invite" element={<PageWrapper animationKey="invite"><InvitePage /></PageWrapper>} />
        <Route path="/verify-email" element={<PageWrapper animationKey="verify"><VerifyEmailPage /></PageWrapper>} />
        <Route path="/dashboard" element={
          <PageWrapper animationKey="dashboard">
            {session ? (isEmailVerified ? <Dashboard /> : <Navigate to="/verify-email" />) : <Navigate to="/" />}
          </PageWrapper>
        } />
        <Route path="/vaults" element={
          <PageWrapper animationKey="vaults">
            {session ? (isEmailVerified ? <VaultsPage /> : <Navigate to="/verify-email" />) : <Navigate to="/" />}
          </PageWrapper>
        } />
        <Route path="/account" element={
          <PageWrapper animationKey="account">
            {session ? (isEmailVerified ? <AccountPage /> : <Navigate to="/verify-email" />) : <Navigate to="/" />}
          </PageWrapper>
        } />
        <Route path="/communications" element={
          <PageWrapper animationKey="communications">
            {session ? (isEmailVerified ? <CommunicationsPage /> : <Navigate to="/verify-email" />) : <Navigate to="/" />}
          </PageWrapper>
        } />
        <Route path="/vault-item/:id" element={
          <PageWrapper animationKey="vault-item">
            {session ? (isEmailVerified ? <VaultItemPage /> : <Navigate to="/verify-email" />) : <Navigate to="/" />}
          </PageWrapper>
        } />
        <Route path="/system" element={
          <PageWrapper animationKey="system">
            {session ? (isEmailVerified ? <AdminPanel /> : <Navigate to="/verify-email" />) : <Navigate to="/" />}
          </PageWrapper>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

function PageWrapper({ children, animationKey }: { children: React.ReactNode, animationKey?: string }) {
  return (
    <motion.div
      key={animationKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(err => {
      console.error('Initial Session Error:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (loading) return null;

  const isEmailVerified = session?.user?.email_confirmed_at != null;

  return (
    <Router>
      <div className="min-h-screen selection:bg-orion-blue selection:text-bg relative">
        <StarField />
        <Nebula />
        <div className="grid-bg" />
        <div className="scan-line" />
        <div className="relative z-10">
          <SyncProvider>
            {session && isEmailVerified && <Navigation />}
            <AnimatedRoutes session={session} isEmailVerified={isEmailVerified} />
          </SyncProvider>
        </div>
      </div>
    </Router>
  );
}
