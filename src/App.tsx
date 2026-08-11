import { useEffect, useState } from 'react';
import { UserDonationPage } from './components/UserDonationPage';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { ObsOverlay } from './components/ObsOverlay';

export default function App() {
  const [route, setRoute] = useState<'user' | 'admin' | 'overlay' | '404'>('404');
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  const resolveRoute = (path: string): 'user' | 'admin' | 'overlay' | '404' => {
    if (path === '/overlay' || path.startsWith('/overlay/')) return 'overlay';
    if (path === '/live/zhik19qx' || path.startsWith('/live/zhik19qx/')) return 'user';
    if (path === '/admin' || path.startsWith('/admin/') || path === '/login' || path.startsWith('/login/')) return 'admin';
    return '404';
  };

  // Sync initial route based on window URL
  useEffect(() => {
    setRoute(resolveRoute(window.location.pathname));

    checkAdminAuth();

    const handlePopState = () => {
      setRoute(resolveRoute(window.location.pathname));
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

  const navigateTo = (newRoute: 'user' | 'admin' | 'overlay' | '404') => {
    setRoute(newRoute);
    let path = '/404';
    if (newRoute === 'user') path = '/live/zhik19qx';
    if (newRoute === 'overlay') path = '/overlay';
    if (newRoute === 'admin') path = '/admin';
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

  if (route === 'user') {
    return (
      <UserDonationPage
        onNavigateAdmin={() => navigateTo('admin')}
        onNavigateOverlay={() => navigateTo('overlay')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 text-indigo-500 mb-6 mx-auto opacity-20">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-3">404 - Not Found</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        The page you are looking for does not exist or has been moved.
      </p>
    </div>
  );
}
