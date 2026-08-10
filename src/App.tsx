import { useEffect, useState } from 'react';
import { UserDonationPage } from './components/UserDonationPage';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { ObsOverlay } from './components/ObsOverlay';

export default function App() {
  const [route, setRoute] = useState<'user' | 'admin' | 'overlay'>('user');
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Sync initial route based on window URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('overlay')) {
      setRoute('overlay');
    } else if (path.startsWith('/donate')) {
      setRoute('user');
    } else {
      setRoute('admin');
    }

    checkAdminAuth();

    const handlePopState = () => {
      const p = window.location.pathname;
      if (p.includes('overlay')) setRoute('overlay');
      else if (p.startsWith('/donate')) setRoute('user');
      else setRoute('admin');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const checkAdminAuth = async () => {
    try {
      setAuthChecking(true);
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        setAdminAuthenticated(Boolean(data.authenticated));
      } else {
        setAdminAuthenticated(false);
      }
    } catch (e) {
      setAdminAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  };

  const navigateTo = (newRoute: 'user' | 'admin' | 'overlay') => {
    setRoute(newRoute);
    let path = '/';
    if (newRoute === 'user') path = '/donate';
    if (newRoute === 'overlay') path = '/overlay';
    window.history.pushState({}, '', path);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('obs_admin_token');
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setAdminAuthenticated(false);
  };

  if (route === 'overlay') {
    return <ObsOverlay />;
  }

  if (route === 'admin') {
    if (authChecking) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] flex items-center justify-center text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Verifying admin session...</span>
          </div>
        </div>
      );
    }

    if (!adminAuthenticated) {
      return (
        <AdminLogin
          onLoginSuccess={() => setAdminAuthenticated(true)}
          onNavigateHome={() => navigateTo('user')}
        />
      );
    }

    return (
      <AdminDashboard
        onLogout={handleLogout}
        onNavigateHome={() => navigateTo('user')}
        onNavigateOverlay={() => navigateTo('overlay')}
      />
    );
  }

  return (
    <UserDonationPage
      onNavigateAdmin={() => navigateTo('admin')}
      onNavigateOverlay={() => navigateTo('overlay')}
    />
  );
}
