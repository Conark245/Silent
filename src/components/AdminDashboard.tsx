import React, { useEffect, useState } from 'react';
import {
  Donation,
  PaymentMethod,
  DonationItem,
  MediaAsset,
  AuditLog,
  TelegramSettings,
  SystemSettings,
} from '../types';
import { DonationAnalytics } from './DonationAnalytics';
import {
  LayoutDashboard,
  BarChart3,
  CreditCard,
  Sparkles,
  Image as ImageIcon,
  Send,
  History,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Upload,
  RefreshCw,
  Info,
  Tv,
  Search,
  ShieldAlert,
  Filter,
  BookOpen,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  Sliders,
  Volume2,
  ShieldCheck,
  Smartphone,
  Radio,
  Sun,
  Moon,
  Download,
  Archive,
  Palette,
} from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateOverlay: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onNavigateHome,
  onNavigateOverlay,
}) => {
  const [activeTab, setActiveTab] = useState<
    'donations' | 'analytics' | 'payment-methods' | 'items' | 'media' | 'telegram' | 'audit' | 'obs-guide'
  >('donations');

  const [copiedObsUrl, setCopiedObsUrl] = useState<string | null>(null);

  // Theme state
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkTheme]);

  // Data states
  const [donations, setDonations] = useState<Donation[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [donationItems, setDonationItems] = useState<DonationItem[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    botToken: '',
    adminIds: [],
    webhookUrl: '',
    isWebhookActive: false,
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    defaultSoundId: '',
  });
  const [isSavingSystemSettings, setIsSavingSystemSettings] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategory, setAuditCategory] = useState<'ALL' | 'LOGIN' | 'ITEM' | 'MEDIA' | 'PAYMENT' | 'TELEGRAM' | 'DONATION'>('ALL');

  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DECLINED'>(
    'ALL'
  );

  // Modal / Form state for payment method
  const [editingPm, setEditingPm] = useState<Partial<PaymentMethod> | null>(null);
  // Modal / Form state for donation item
  const [editingItem, setEditingItem] = useState<Partial<DonationItem> | null>(null);
  // Media upload modal
  const [mediaUploadType, setMediaUploadType] = useState<'sticker' | 'sound' | 'video'>('sticker');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [mediaName, setMediaName] = useState('');
  const [mediaDuration, setMediaDuration] = useState('8');
  const [mediaVolume, setMediaVolume] = useState('0.8');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Telegram settings form
  const [telegramFormToken, setTelegramFormToken] = useState('');
  const [telegramFormAdminIds, setTelegramFormAdminIds] = useState('');

  // Preview / Test OBS alert state
  const [triggeringTest, setTriggeringTest] = useState(false);
  const [testAlertToast, setTestAlertToast] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [copiedObsHeaderUrl, setCopiedObsHeaderUrl] = useState(false);
  const [obsQueueCount, setObsQueueCount] = useState<number>(0);

  const handleCopyObsUrl = () => {
    const url = `${window.location.origin}/overlay`;
    navigator.clipboard.writeText(url);
    setCopiedObsHeaderUrl(true);
    setCopyToast(`OBS Overlay URL copied to clipboard: ${url}`);
    setTimeout(() => {
      setCopiedObsHeaderUrl(false);
    }, 2500);
    setTimeout(() => {
      setCopyToast(null);
    }, 4500);
  };

  const fetchObsQueueCount = async () => {
    try {
      const res = await fetch('/api/overlay/queue');
      if (res.ok) {
        const queue = await safeParseJson(res);
        if (Array.isArray(queue)) {
          setObsQueueCount(queue.length);
        }
      }
    } catch (err) {
      // console.error('Failed to fetch OBS overlay queue:', err); // Suppress polling error on dev server restart
    }
  };

  useEffect(() => {
    fetchObsQueueCount();
    const interval = setInterval(fetchObsQueueCount, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerPreviewAlert = async (donationItemId?: string) => {
    try {
      setTriggeringTest(true);
      const res = await fetch('/api/admin/trigger-preview-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: 'VIP Supporter (Preview)',
          amount: 10000,
          message: '🎉 Test donation alert broadcasted live to OBS Overlay!',
          donationItemId,
        }),
      });

      if (res.ok) {
        setTestAlertToast('✨ Test donation alert broadcasted live to OBS stream overlay!');
        setTimeout(() => setTestAlertToast(null), 4000);
        fetchObsQueueCount();
        if (activeTab === 'donations') {
          loadTabContent();
        }
      } else {
        alert('Failed to trigger preview alert');
      }
    } catch (err) {
      console.error('Error triggering test alert:', err);
      alert('Error triggering test alert');
    } finally {
      setTriggeringTest(false);
    }
  };

  useEffect(() => {
    loadTabContent();
  }, [activeTab, statusFilter]);

  const safeParseJson = async (res: Response) => {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return null;
  };

  const loadTabContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'donations') {
        const res = await fetch(`/api/admin/donations?status=${statusFilter}`);
        if (res.status === 401) { onLogout(); return; }
        if (res.ok) {
          const data = await safeParseJson(res);
          if (data) setDonations(data);
        }
      } else if (activeTab === 'history') {
        // Fetch all processed donations (APPROVED or DECLINED)
        const res = await fetch(`/api/admin/donations`);
        if (res.status === 401) { onLogout(); return; }
        if (res.ok) {
          const data = await safeParseJson(res);
          if (data) {
             setDonations(data.filter((d: any) => d.status === 'APPROVED' || d.status === 'DECLINED'));
          }
        }
      } else if (activeTab === 'payment-methods') {
        const res = await fetch('/api/admin/payment-methods');
        if (res.status === 401) { onLogout(); return; }
        if (res.ok) {
          const data = await safeParseJson(res);
          if (data) setPaymentMethods(data);
        }
      } else if (activeTab === 'items') {
        const [itemsRes, mediaRes] = await Promise.all([
          fetch('/api/admin/donation-items'),
          fetch('/api/admin/media'),
        ]);
        if (itemsRes.status === 401 || mediaRes.status === 401) { onLogout(); return; }
        if (itemsRes.ok) {
          const data = await safeParseJson(itemsRes);
          if (data) setDonationItems(data);
        }
        if (mediaRes.ok) {
          const data = await safeParseJson(mediaRes);
          if (data) setMediaAssets(data);
        }
      } else if (activeTab === 'theme') {
        const sysRes = await fetch('/api/admin/system-settings');
        if (sysRes.status === 401) { onLogout(); return; }
        if (sysRes.ok) {
          const sysData = await safeParseJson(sysRes);
          if (sysData) setSystemSettings(sysData);
        }
      } else if (activeTab === 'media') {
        const [mediaRes, sysRes] = await Promise.all([
          fetch('/api/admin/media'),
          fetch('/api/admin/system-settings')
        ]);
        if (mediaRes.status === 401 || sysRes.status === 401) { onLogout(); return; }
        if (mediaRes.ok) {
          const data = await safeParseJson(mediaRes);
          if (data) setMediaAssets(data);
        }
        if (sysRes.ok) {
          const sysData = await safeParseJson(sysRes);
          if (sysData) setSystemSettings(sysData);
        }
      } else if (activeTab === 'telegram') {
        const res = await fetch('/api/admin/telegram-settings');
        if (res.status === 401) { onLogout(); return; }
        if (res.ok) {
          const data: TelegramSettings | null = await safeParseJson(res);
          if (data) {
            setTelegramSettings(data);
            setTelegramFormToken(data.botToken || '');
            setTelegramFormAdminIds(data.adminIds ? data.adminIds.join(', ') : '');
          }
        }
      } else if (activeTab === 'audit') {
        const res = await fetch('/api/admin/audit-logs');
        if (res.status === 401) { onLogout(); return; }
        if (res.ok) {
          const data = await safeParseJson(res);
          if (data) setAuditLogs(data);
        }
      }
    } catch (err) {
      console.error('Error loading tab content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDonationStatus = async (donationId: string, action: 'approve' | 'decline') => {
    try {
      const res = await fetch(`/api/admin/donations/${donationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approve' ? 'APPROVED' : 'DECLINED' }),
      });

      if (res.ok) {
        loadTabContent();
      } else {
        const err = await res.json();
        alert(`Action failed: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Error updating donation status');
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to delete all processed donation history? This action cannot be undone.')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/donations/history', { method: 'DELETE' });
      if (res.ok) {
        loadTabContent(); // Refresh history
      } else {
        alert('Failed to clear history');
      }
    } catch (err) {
      alert('Error clearing history');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all audit logs? This action cannot be undone.')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/audit-logs', { method: 'DELETE' });
      if (res.ok) {
        loadTabContent(); // Refresh logs
      } else {
        alert('Failed to clear logs');
      }
    } catch (err) {
      alert('Error clearing logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPm) return;

    try {
      const url = editingPm.id
        ? `/api/admin/payment-methods/${editingPm.id}`
        : '/api/admin/payment-methods';
      const method = editingPm.id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPm),
      });

      if (res.ok) {
        setEditingPm(null);
        loadTabContent();
      } else {
        alert('Failed to save payment method');
      }
    } catch (err) {
      alert('Error saving payment method');
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    try {
      const res = await fetch(`/api/admin/payment-methods/${id}`, { method: 'DELETE' });
      if (res.ok) loadTabContent();
    } catch (err) {
      alert('Delete error');
    }
  };

  const handleSaveDonationItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const url = editingItem.id
        ? `/api/admin/donation-items/${editingItem.id}`
        : '/api/admin/donation-items';
      const method = editingItem.id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });

      if (res.ok) {
        setEditingItem(null);
        loadTabContent();
      } else {
        alert('Failed to save item');
      }
    } catch (e) {
      alert('Save item error');
    }
  };

  const handleDeleteDonationItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      const res = await fetch(`/api/admin/donation-items/${id}`, { method: 'DELETE' });
      if (res.ok) loadTabContent();
    } catch (e) {
      alert('Delete error');
    }
  };

  const handleUploadMediaAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return alert('Select a file to upload');

    try {
      setIsUploadingMedia(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', mediaName || uploadFile.name);
      formData.append('type', mediaUploadType);
      formData.append('duration', mediaDuration);
      formData.append('volume', mediaVolume);

      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setUploadFile(null);
        setMediaName('');
        loadTabContent();
      } else {
        const err = await res.json();
        alert(err.error || 'Upload failed');
      }
    } catch (err) {
      alert('Upload error');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleDeleteMediaAsset = async (id: string) => {
    if (!confirm('Delete media asset?')) return;
    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
      if (res.ok) loadTabContent();
    } catch (e) {
      alert('Delete error');
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      setIsSavingSystemSettings(true);
      const res = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultSoundId: systemSettings.defaultSoundId }),
      });
      if (!res.ok) {
        alert('Failed to save default sound settings');
      } else {
        alert('Default sound settings saved');
      }
    } catch (err) {
      alert('Error saving system settings');
    } finally {
      setIsSavingSystemSettings(false);
    }
  };


  const handleTestTelegramConnection = async () => {
    try {
      const adminIds = telegramFormAdminIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (!telegramFormToken || adminIds.length === 0) {
        return alert('Please enter Bot Token and at least one Admin ID before testing.');
      }

      const res = await fetch('/api/admin/telegram-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: telegramFormToken, adminIds }),
      });

      if (res.ok) {
        const data = await res.json();
        alert('Test message sent successfully to ' + data.sentCount + ' admin(s).');
      } else {
        const err = await res.json();
        alert('Failed to send test message: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error sending test message');
    }
  };

  const handleSaveTelegramSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const adminIds = telegramFormAdminIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/telegram-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramFormToken,
          adminIds,
        }),
      });

      if (res.ok) {
        alert('Telegram Bot Settings saved successfully');
        loadTabContent();
      }
    } catch (err) {
      alert('Error saving Telegram settings');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Admin Header */}
                  <header className="h-16 px-6 md:px-8 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]/90 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md">
            D
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">DonationLive</span>
          <span className="text-[10px] uppercase tracking-wider bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 ml-2 font-bold hidden sm:inline-block">
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border border-transparent dark:border-slate-700/50"
            title="Toggle Theme"
          >
            {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onNavigateHome}
            className="p-2.5 md:px-4 md:py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-2 border border-transparent dark:border-slate-700/50 font-semibold text-xs"
            title="User Page"
          >
            <span className="hidden md:inline">User Page</span>
            <LayoutDashboard className="w-4 h-4 md:hidden" />
          </button>
          <button
            onClick={onLogout}
            className="p-2.5 md:px-4 md:py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-white dark:bg-[#1E293B] border-b md:border-b-0 md:border-r border-slate-300 dark:border-slate-700 flex flex-col shrink-0 z-30 sticky top-16 md:static overflow-hidden">
          <nav className="p-2 md:p-4 flex flex-row md:flex-col gap-1 md:gap-0 md:space-y-1 overflow-x-auto w-full scrollbar-hide">
            <button
              onClick={() => setActiveTab('donations')}
              className={`shrink-0 md:w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'donations'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-5 h-5" />
                <span className="whitespace-nowrap">Dashboard Queue</span>
              </div>
              <span className="bg-rose-500 text-slate-900 dark:text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {donations.filter((d) => d.status === 'PENDING').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span className="whitespace-nowrap">Analytics & Charts</span>
            </button>

            <button
              onClick={() => setActiveTab('payment-methods')}
              className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'payment-methods'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="whitespace-nowrap">Payment Methods</span>
            </button>

            <button
              onClick={() => setActiveTab('items')}
              className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'items'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="whitespace-nowrap">Reward Items</span>
            </button>

            <button
              onClick={() => setActiveTab('media')}
              className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'media'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
              <span className="whitespace-nowrap">Media Assets</span>
            </button>

            <button
              onClick={() => setActiveTab('theme')}
              className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'theme'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Palette className="w-5 h-5" />
              <span className="whitespace-nowrap">Theme Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('telegram')}
              className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'telegram'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Send className="w-5 h-5" />
              <span className="whitespace-nowrap">Telegram Bot</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="whitespace-nowrap">Audit Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('obs-guide')}
              className={`shrink-0 md:w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'obs-guide'
                  ? 'bg-amber-500/10 text-amber-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span className="whitespace-nowrap">OBS Setup Guide</span>
              </div>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                GUIDE
              </span>
            </button>
          </nav>

          <div className="p-4 border-t border-slate-300 dark:border-slate-700 mt-auto">
            <div className="flex items-center gap-3 p-3 bg-slate-200 dark:bg-slate-800/50 rounded-xl border border-slate-300 dark:border-slate-700/50">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Telegram Bot</p>
                <p className="text-xs text-emerald-400 font-medium">Active & Synchronized</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full bg-slate-50 dark:bg-[#0F172A] relative">
          {copyToast && (
            <div className="mb-6 bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/50 rounded-2xl p-4 text-emerald-300 font-semibold text-xs flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-2.5">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{copyToast}</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-mono font-bold">
                Ready to paste into OBS Studio
              </span>
            </div>
          )}

          {testAlertToast && (
            <div className="mb-6 bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-500/50 rounded-2xl p-4 text-amber-300 font-semibold text-xs flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
                <span>{testAlertToast}</span>
              </div>
              <button
                onClick={onNavigateOverlay}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg transition cursor-pointer"
              >
                Launch OBS Stream
              </button>
            </div>
          )}
          {/* TAB 1: DONATIONS MONITOR */}
          {activeTab === 'donations' && (
            <div className="space-y-6">
              {/* Summary Stats Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Pending Review</p>
                  <h3 className="text-3xl font-bold text-rose-400">
                    {donations.filter((d) => d.status === 'PENDING').length}
                  </h3>
                </div>
                <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Approved</p>
                  <h3 className="text-3xl font-bold text-emerald-400">
                    {donations.filter((d) => d.status === 'APPROVED').length}
                  </h3>
                </div>
                <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Revenue</p>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {donations
                      .filter((d) => d.status === 'APPROVED')
                      .reduce((acc, curr) => acc + curr.amount, 0)
                      .toLocaleString()}{' '}
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400">MMK</span>
                  </h3>
                </div>
                <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>OBS Overlay Queue</span>
                    <Tv className="w-4 h-4 text-amber-400" />
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-amber-400">
                      {obsQueueCount}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {obsQueueCount === 1 ? 'alert pending' : 'alerts pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* OBS Overlay Live Testing Bar */}
              <div className="bg-white dark:bg-[#1E293B] border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg bg-gradient-to-r from-[#1E293B] via-[#1E293B] to-amber-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      OBS Overlay Live Alert Tester
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wide">
                        Real-time SSE
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Trigger a test donation alert directly to test how audio, animations, stickers & videos render on live stream.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleTriggerPreviewAlert()}
                    disabled={triggeringTest}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>{triggeringTest ? 'Broadcasting...' : 'Trigger Test Alert'}</span>
                  </button>
                </div>
              </div>

              {/* Status Filters & Toolbar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {(['ALL', 'PENDING', 'APPROVED', 'DECLINED'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        statusFilter === filter
                          ? 'bg-indigo-600 text-slate-900 dark:text-white'
                          : 'bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <button
                  onClick={loadTabContent}
                  className="px-3.5 py-1.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Queue</span>
                </button>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">Recent Activity Queue</h2>
                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">Official approval required via Telegram</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-200 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">
                      <tr>
                        <th className="px-6 py-3">Donor</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Reward Item</th>
                        <th className="px-6 py-3">Payment</th>
                        <th className="px-6 py-3 text-right">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-800">
                      {donations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                            No donations found in queue.
                          </td>
                        </tr>
                      ) : (
                        donations.map((d) => (
                          <tr
                            key={d.id}
                            className={`transition ${
                              d.status === 'PENDING' ? 'bg-indigo-500/5' : 'hover:bg-slate-200 dark:hover:bg-slate-800/30'
                            }`}
                          >
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                              <div>{d.donorName}</div>
                              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{d.publicId}</div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                              {d.amount.toLocaleString()} {d.currency}
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 text-xs">
                                {d.donationItemName || 'Standard Donation'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                              <div>{d.paymentMethodName || 'N/A'}</div>
                              {d.paymentReference && (
                                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Ref: {d.paymentReference}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {d.status === 'PENDING' && (
                                <span className="text-rose-400 bg-rose-400/10 px-2 py-1 rounded text-xs uppercase font-bold inline-block">
                                  Waiting for TG
                                </span>
                              )}
                              {d.status === 'APPROVED' && (
                                <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs uppercase font-bold inline-block">
                                  Approved
                                </span>
                              )}
                              {d.status === 'DECLINED' && (
                                <span className="text-slate-400 dark:text-slate-500 bg-slate-500/10 px-2 py-1 rounded text-xs uppercase font-bold inline-block">
                                  Declined
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {d.status === 'PENDING' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleUpdateDonationStatus(d.id, 'approve')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white rounded text-xs font-semibold transition cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleUpdateDonationStatus(d.id, 'decline')}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-slate-900 dark:text-white rounded text-xs font-semibold transition cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Completed</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-indigo-400" />
                  Donation History
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Log of all processed (approved or declined) donations.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                   <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total records: {donations.length}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadTabContent}
                    className="px-3.5 py-1.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear History</span>
                  </button>
                  <button
                    onClick={() => {
                      const csvContent = [
                        ['ID', 'Date', 'Donor Name', 'Amount', 'Currency', 'Item', 'Payment Method', 'Reference', 'Status', 'Processed By'].join(','),
                        ...donations.map(d => [
                          d.publicId,
                          new Date(d.createdAt).toLocaleString().replace(/,/g, ''),
                          `"${(d.donorName || '').replace(/"/g, '""')}"`,
                          d.amount,
                          d.currency,
                          `"${(d.donationItemName || '').replace(/"/g, '""')}"`,
                          `"${(d.paymentMethodName || '').replace(/"/g, '""')}"`,
                          `"${(d.paymentReference || '').replace(/"/g, '""')}"`,
                          d.status,
                          `"${(d.approvedBy || d.declinedBy || '').replace(/"/g, '""')}"`
                        ].join(','))
                      ].join('\n');

                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `donations_history_${new Date().toISOString().slice(0, 10)}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-200 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Donor</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Payment</th>
                        <th className="px-6 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-800">
                      {donations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                            No processed donations found.
                          </td>
                        </tr>
                      ) : (
                        donations.map((d) => (
                          <tr
                            key={d.id}
                            className="transition hover:bg-slate-200 dark:hover:bg-slate-800/30"
                          >
                            <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                              {new Date(d.createdAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                              <div>{d.donorName}</div>
                              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{d.publicId}</div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                              {d.amount.toLocaleString()} {d.currency}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                              <div>{d.paymentMethodName || 'N/A'}</div>
                              {d.paymentReference && (
                                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Ref: {d.paymentReference}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {d.status === 'APPROVED' && (
                                <div className="flex flex-col items-end">
                                  <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs uppercase font-bold inline-block">
                                    Approved
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">by {d.approvedBy || d.declinedBy}</span>
                                </div>
                              )}
                              {d.status === 'DECLINED' && (
                                <div className="flex flex-col items-end">
                                  <span className="text-slate-400 dark:text-slate-500 bg-slate-500/10 px-2 py-1 rounded text-xs uppercase font-bold inline-block">
                                    Declined
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">by {d.approvedBy || d.declinedBy}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ANALYTICS & CHARTS */}
          {activeTab === 'analytics' && (
            <DonationAnalytics
              donations={donations}
              paymentMethods={paymentMethods}
              donationItems={donationItems}
            />
          )}

          {/* TAB 2: PAYMENT METHODS */}
          {activeTab === 'payment-methods' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Payment Methods</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage payment options shown to donors</p>
                </div>

                <button
                  onClick={() =>
                    setEditingPm({
                      name: '',
                      accountName: '',
                      accountNumber: '',
                      phone: '',
                      instructions: '',
                      enabled: true,
                      sortOrder: paymentMethods.length + 1,
                    })
                  }
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Payment Method</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 relative space-y-3 shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{pm.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{pm.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            pm.enabled
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {pm.enabled ? 'Active' : 'Disabled'}
                        </span>

                        <button
                          onClick={() => setEditingPm(pm)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-700 rounded-lg text-xs cursor-pointer"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeletePaymentMethod(pm.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg text-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#0F172A] p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500">Account Name: </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{pm.accountName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500">Account / Phone: </span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          {pm.accountNumber}
                        </span>
                      </div>
                      {pm.instructions && (
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] pt-1 italic">{pm.instructions}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit / Add Payment Method Modal */}
              {editingPm && (
                <div className="fixed inset-0 bg-slate-50 dark:bg-[#0F172A]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <form
                    onSubmit={handleSavePaymentMethod}
                    className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-xs"
                  >
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingPm.id ? 'Edit Payment Method' : 'Add New Payment Method'}
                    </h3>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Name *</label>
                      <input
                        type="text"
                        required
                        value={editingPm.name || ''}
                        onChange={(e) => setEditingPm({ ...editingPm, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. KBZ Pay"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                          Account Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingPm.accountName || ''}
                          onChange={(e) =>
                            setEditingPm({ ...editingPm, accountName: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                          Account / Phone *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingPm.accountNumber || ''}
                          onChange={(e) =>
                            setEditingPm({ ...editingPm, accountNumber: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                        Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={editingPm.instructions || ''}
                        onChange={(e) =>
                          setEditingPm({ ...editingPm, instructions: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Include reference note in transaction..."
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="pmEnabled"
                        checked={editingPm.enabled ?? true}
                        onChange={(e) => setEditingPm({ ...editingPm, enabled: e.target.checked })}
                      />
                      <label htmlFor="pmEnabled" className="text-slate-700 dark:text-slate-300 font-semibold">
                        Enabled / Active
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingPm(null)}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-700 rounded-lg font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white rounded-lg font-semibold shadow cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DONATION ITEMS */}
          {activeTab === 'items' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Donation Items & Rewards</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure donation tiers, stickers, sounds, videos and display durations
                  </p>
                </div>

                <button
                  onClick={() =>
                    setEditingItem({
                      name: '',
                      price: 5000,
                      currency: 'MMK',
                      displayDuration: 8,
                      enabled: true,
                      sortOrder: donationItems.length + 1,
                    })
                  }
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Reward Item</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {donationItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{item.name}</h3>
                        <span className="text-sm font-mono font-bold text-emerald-400">
                          {item.price.toLocaleString()} {item.currency}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTriggerPreviewAlert(item.id)}
                          disabled={triggeringTest}
                          className="px-2.5 py-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold rounded-lg border border-amber-500/30 flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                          title="Preview this item's stream alert on OBS Overlay"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Preview Alert</span>
                        </button>

                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-700 rounded-lg text-xs cursor-pointer"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteDonationItem(item.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg text-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                    )}

                    <div className="bg-slate-50 dark:bg-[#0F172A] p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                      <div>
                        ⏱️ <span className="text-slate-500 dark:text-slate-400">Display Duration: </span>
                        <span className="font-semibold text-indigo-300">
                          {item.displayDuration} seconds
                        </span>
                      </div>
                      <div>
                        🎨 <span className="text-slate-500 dark:text-slate-400">Sticker: </span>
                        <span>
                          {mediaAssets.find((m) => m.id === item.stickerId)?.name || 'None'}
                        </span>
                      </div>
                      <div>
                        🔊 <span className="text-slate-500 dark:text-slate-400">Sound: </span>
                        <span>
                          {mediaAssets.find((m) => m.id === item.soundId)?.name || 'None'}
                        </span>
                      </div>
                      <div>
                        🎬 <span className="text-slate-500 dark:text-slate-400">Video: </span>
                        <span>
                          {mediaAssets.find((m) => m.id === item.videoId)?.name || 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit / Add Item Modal */}
              {editingItem && (
                <div className="fixed inset-0 bg-slate-50 dark:bg-[#0F172A]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <form
                    onSubmit={handleSaveDonationItem}
                    className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-xs max-h-[90vh] overflow-y-auto"
                  >
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingItem.id ? 'Edit Donation Item' : 'Add New Item'}
                    </h3>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. Super Star 🌟"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Price *</label>
                        <input
                          type="number"
                          required
                          value={editingItem.price || 1000}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, price: Number(e.target.value) })
                          }
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                          OBS Duration (Seconds)
                        </label>
                        <input
                          type="number"
                          value={editingItem.displayDuration || 8}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              displayDuration: Number(e.target.value),
                            })
                          }
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Sticker</label>
                      <select
                        value={editingItem.stickerId || ''}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, stickerId: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- No Sticker --</option>
                        {mediaAssets
                          .filter((m) => m.type === 'sticker')
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                        Sound Effect
                      </label>
                      <select
                        value={editingItem.soundId || ''}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, soundId: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- No Sound --</option>
                        {mediaAssets
                          .filter((m) => m.type === 'sound')
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Video Asset</label>
                      <select
                        value={editingItem.videoId || ''}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, videoId: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- No Video --</option>
                        {mediaAssets
                          .filter((m) => m.type === 'video')
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white rounded-lg font-semibold shadow cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MEDIA LIBRARY */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Media Assets Library</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload & manage stickers (WebM/GIF/PNG/SVG), sounds (MP3/WAV), and videos
                  (MP4/WebM)
                </p>
              </div>

              {/* Default Sound Settings */}
              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span>Default Sound Effect</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a default MP3 sound to play automatically whenever a new donation alert is triggered, if the donation tier doesn't specify a custom sound.
                </p>
                <div className="flex items-end gap-3 max-w-md">
                  <div className="flex-1">
                    <select
                      value={systemSettings.defaultSoundId || ''}
                      onChange={(e) => setSystemSettings({ ...systemSettings, defaultSoundId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="">-- No Default Sound --</option>
                      {mediaAssets.filter(m => m.type === 'sound').map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleSaveSystemSettings}
                    disabled={isSavingSystemSettings}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                  >
                    {isSavingSystemSettings ? 'Saving...' : 'Save Default'}
                  </button>
                </div>
              </div>

              {/* Upload Card */}
              <form
                onSubmit={handleUploadMediaAsset}
                className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 text-xs shadow-xl"
              >
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Upload New Media Asset</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Asset Type</label>
                    <select
                      value={mediaUploadType}
                      onChange={(e) =>
                        setMediaUploadType(e.target.value as 'sticker' | 'sound' | 'video')
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="sticker">Sticker (SVG/WebM/GIF/PNG)</option>
                      <option value="sound">Sound (MP3/WAV/OGG)</option>
                      <option value="video">Video (MP4/WebM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                      Custom Asset Name
                    </label>
                    <input
                      type="text"
                      value={mediaName}
                      onChange={(e) => setMediaName(e.target.value)}
                      placeholder="Optional name..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold font-mono">
                      Choose File
                    </label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploadingMedia}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white font-semibold rounded-lg flex items-center gap-2 shadow cursor-pointer transition"
                >
                  {isUploadingMedia ? (
                    <span>Uploading File...</span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Asset</span>
                    </>
                  )}
                </button>
              </form>

              {/* Assets List */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {mediaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {asset.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                          {asset.type}
                        </span>
                      </div>

                      {/* Preview Element */}
                      <div className="bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 p-3 h-28 flex items-center justify-center overflow-hidden">
                        {asset.type === 'sticker' && (
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="max-h-24 max-w-full object-contain"
                          />
                        )}
                        {asset.type === 'sound' && (
                          <audio controls src={asset.url} className="w-full h-8" />
                        )}
                        {asset.type === 'video' && (
                          <video
                            controls
                            src={asset.url}
                            className="max-h-24 max-w-full object-contain"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                      <span className="truncate max-w-[150px] font-mono">{asset.url}</span>
                      <button
                        onClick={() => handleDeleteMediaAsset(asset.id)}
                        className="text-rose-400 hover:text-rose-300 p-1 bg-rose-500/10 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: TELEGRAM BOT SETUP */}
          {activeTab === 'telegram' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Telegram Bot Integration</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure Telegram Bot token and allowed Admin User IDs for official approval
                </p>
              </div>

              <form
                onSubmit={handleSaveTelegramSettings}
                className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs shadow-xl"
              >
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    value={telegramFormToken}
                    onChange={(e) => setTelegramFormToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Obtained from Telegram @BotFather. Set as TELEGRAM_BOT_TOKEN in .env or here.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Allowed Admin Telegram IDs (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={telegramFormAdminIds}
                    onChange={(e) => setTelegramFormAdminIds(e.target.value)}
                    placeholder="123456789, 987654321"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Only messages from these Telegram User IDs will be authorized to approve or
                    decline donations.
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition cursor-pointer shadow-md"
                  >
                    Save Telegram Configuration
                  </button>
                  <button
                    type="button"
                    onClick={handleTestTelegramConnection}
                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg transition cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Test Connection
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" />
                    <span>Security & Audit Logs</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comprehensive server-side records of admin logins, donation item modifications, media asset management, and approval actions.
                  </p>
                </div>

                <div className="flex gap-2 self-start md:self-auto">
                  <button
                    onClick={handleClearLogs}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                  <button
                    onClick={loadTabContent}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Logs</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs shadow-lg">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Filter logs by action, actor, or metadata keyword..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                  <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  {(['ALL', 'LOGIN', 'ITEM', 'MEDIA', 'PAYMENT', 'TELEGRAM', 'DONATION'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAuditCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                        auditCategory === cat
                          ? 'bg-indigo-600 text-slate-900 dark:text-white shadow'
                          : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-200 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Actor</th>
                      <th className="p-3.5">Action Type</th>
                      <th className="p-3.5">Target ID</th>
                      <th className="p-3.5">Event Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditLogs
                      .filter((log) => {
                        const searchLower = auditSearch.toLowerCase();
                        const matchesSearch =
                          !auditSearch ||
                          log.action.toLowerCase().includes(searchLower) ||
                          (log.adminId && log.adminId.toLowerCase().includes(searchLower)) ||
                          (log.telegramUserId && log.telegramUserId.toLowerCase().includes(searchLower)) ||
                          (log.targetId && log.targetId.toLowerCase().includes(searchLower)) ||
                          (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchLower));

                        if (!matchesSearch) return false;

                        if (auditCategory === 'LOGIN') {
                          return log.action.includes('LOGIN') || log.action.includes('LOGOUT') || log.action.includes('PASSWORD');
                        }
                        if (auditCategory === 'ITEM') {
                          return log.action.includes('ITEM');
                        }
                        if (auditCategory === 'MEDIA') {
                          return log.action.includes('MEDIA');
                        }
                        if (auditCategory === 'PAYMENT') {
                          return log.action.includes('PAYMENT');
                        }
                        if (auditCategory === 'TELEGRAM') {
                          return log.action.includes('TELEGRAM');
                        }
                        if (auditCategory === 'DONATION') {
                          return log.action.includes('DONATION') || log.action.includes('ALERT');
                        }

                        return true;
                      })
                      .map((log) => {
                        const isError = log.action.includes('FAILED') || log.action.includes('UNAUTHORIZED');
                        const isLogin = log.action.includes('LOGIN') || log.action.includes('LOGOUT');
                        const isItem = log.action.includes('ITEM');
                        const isMedia = log.action.includes('MEDIA');
                        const isPayment = log.action.includes('PAYMENT');
                        const isTelegram = log.action.includes('TELEGRAM');

                        let badgeColor = 'bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
                        if (isError) badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                        else if (isLogin) badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
                        else if (isItem) badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                        else if (isMedia) badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                        else if (isPayment) badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
                        else if (isTelegram) badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';

                        return (
                          <tr key={log.id} className="hover:bg-slate-200 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-3.5 text-indigo-300 font-semibold whitespace-nowrap">
                              {log.telegramUserId
                                ? `Telegram:${log.telegramUserId}`
                                : log.adminId
                                ? `Admin:${log.adminId}`
                                : 'System'}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-[10px] whitespace-nowrap">
                              {log.targetId || '-'}
                            </td>
                            <td className="p-3.5 text-slate-700 dark:text-slate-300 font-mono text-[10px] max-w-md break-all">
                              {log.metadata ? JSON.stringify(log.metadata) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                {auditLogs.length === 0 && (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <ShieldAlert className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                    <p>No audit log records available yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: OBS STUDIO SETUP GUIDE */}
          {activeTab === 'obs-guide' && (
            <div className="space-y-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-slate-900 border border-amber-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Tv className="w-64 h-64 text-amber-400" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>OBS Studio Setup Guide</span>
                    </span>
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-3 py-1 rounded-full text-xs font-medium">
                      မြန်မာဘာသာ လမ်းညွှန်
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    OBS Studio ဖြင့် Live Stream တွင် Donation Alert များ ထည့်သွင်းနည်း
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 text-sm max-w-3xl leading-relaxed">
                    သင့် Stream တွင် Donor များ ငွေလွှဲအတည်ပြုလိုက်သည်နှင့် ပျော်ရွှင်ဖွယ် Animated Sticker၊ အသံ Sound Effect၊ Donator အမည်နှင့် Message များ OBS Screen ပေါ်သို့ တိုက်ရိုက် ပေါ်ထွက်လာစေရန် အောက်ပါအတိုင်း အလွယ်တကူ ဆက်လုပ်နိုင်ပါသည်။
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleTriggerPreviewAlert()}
                      disabled={triggeringTest}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer transition disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 fill-current" />
                      <span>{triggeringTest ? 'Broadcasting...' : '⚡ Test Alert တိုက်ရိုက် စမ်းသပ်မည်'}</span>
                    </button>

                    <button
                      onClick={onNavigateOverlay}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer transition"
                    >
                      <Tv className="w-4 h-4" />
                      <span>OBS Overlay ကို Window သီးသန့် ဖွင့်မည်</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* URL Generator & Copy Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* OBS Browser Source URL */}
                <div className="bg-white dark:bg-[#1E293B] border border-amber-500/30 rounded-2xl p-6 shadow-xl relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                        <Tv className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">OBS Browser Source URL</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">OBS Studio ၏ Browser Source တွင် ထည့်ရန် Link</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                      Transparent Overlay
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 mt-4">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/overlay`}
                      className="w-full bg-transparent text-amber-300 font-mono text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/overlay`);
                        setCopiedObsUrl('overlay');
                        setTimeout(() => setCopiedObsUrl(null), 2500);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                    >
                      {copiedObsUrl === 'overlay' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Streamer Profile / Public Donation Link */}
                <div className="bg-white dark:bg-[#1E293B] border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Streamer Profile & Donation Link</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Viewer / Donor များအတွက် ငွေလှူဒါန်းရန် Link (motephoe Style)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                      Public Page
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 mt-4">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/live/zhik19qx`}
                      className="w-full bg-transparent text-indigo-300 font-mono text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/live/zhik19qx`);
                        setCopiedObsUrl('live');
                        setTimeout(() => setCopiedObsUrl(null), 2500);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                    >
                      {copiedObsUrl === 'live' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Cards */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <span>OBS Studio တွင် ထည့်သွင်းနည်း အဆင့်ဆင့် (Step-by-Step Setup Instructions)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Step 1 */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between hover:border-amber-500/40 transition">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold text-sm flex items-center justify-center border border-amber-500/30">
                          1
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Add Source</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">OBS Studio ကိုဖွင့်ပြီး Browser Source ထည့်ပါ</h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        1. OBS Studio ဆော့ဖ်ဝဲလ်ကို ဖွင့်ပါ။<br />
                        2. အောက်ဘက် <strong>Sources</strong> Box အောက်ရှိ <strong>`+` (Plus)</strong> ခလုတ်ကို နှိပ်ပါ။<br />
                        3. <strong>`Browser`</strong> (သို့မဟုတ် Browser Source) ကို ရွေးပါ။<br />
                        4. အမည်ကို <strong>"Donation Alert Overlay"</strong> ဟု ပေးပြီး <strong>OK</strong> နှိပ်ပါ။
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between hover:border-amber-500/40 transition">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold text-sm flex items-center justify-center border border-amber-500/30">
                          2
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Settings Config</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">URL နှင့် Dimension များ ထည့်သွင်းပါ</h4>
                      <div className="bg-slate-50 dark:bg-[#0F172A] p-3 rounded-xl border border-slate-300 dark:border-slate-700/80 font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                        <p><strong className="text-amber-300">URL:</strong> {window.location.origin}/overlay</p>
                        <p><strong className="text-amber-300">Width:</strong> 1920</p>
                        <p><strong className="text-amber-300">Height:</strong> 1080</p>
                        <p><strong className="text-amber-300">FPS:</strong> 60</p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between hover:border-amber-500/40 transition">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold text-sm flex items-center justify-center border border-amber-500/30">
                          3
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Audio Control</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">Audio & Refresh Option အမှန်ခြစ်ပါ</h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        ✅ <strong>Control audio via OBS</strong> (OBS Audio Mixer မှ Alert အသံ အတိုးအကျယ် ထိန်းချုပ်ရန်)<br />
                        ✅ <strong>Shutdown source when not visible</strong><br />
                        ✅ <strong>Refresh browser when scene becomes active</strong>
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between hover:border-amber-500/40 transition">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold text-sm flex items-center justify-center border border-amber-500/30">
                          4
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Live Approval</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">Telegram သို့မဟုတ် Admin မှ Approve လိုက်သည်နှင့် Live တက်မည်</h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        Donor က KBZ Pay / Wave Pay ဖြင့် လှူဒါန်းပြီးပါက Telegram Bot သို့ အလိုအလျောက် သတိပေးစာ ရောက်ပါမည်။ Phone တွင် <strong>"✅ Approve"</strong> ခလုတ် နှိပ်လိုက်သည်နှင့် 0.1 စက္ကန့်အတွင်း OBS Screen ပေါ်တွင် Sound & Alert တိုက်ရိုက် ပေါ်လာမည်ဖြစ်သည်။
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting FAQ Section */}
              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                  <span>မကြာခဏ ကြုံတွေ့ရတတ်သော အခက်အခဲများနှင့် ဖြေရှင်းနည်းများ (Troubleshooting & FAQ)</span>
                </h3>

                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-[#0F172A] p-4 rounded-xl border border-slate-300 dark:border-slate-700/80 space-y-1.5">
                    <h5 className="font-bold text-amber-300 text-xs flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      <span>မေး - OBS Studio မှာ Alert အသံ မထွက်လာရင် ဘာလုပ်ရမလဲ?</span>
                    </h5>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                      ဖြေ - OBS Sources ထဲမှ Browser Source ကို Right-click နှိပ်ပါ -&gt; <strong>Interact</strong> ကို နှိပ်ပြီး တက်လာသော Window Screen ပေါ်ကို Click တစ်ချက် နှိပ်ပေးပါ။ (Chrome/OBS Audio Security Policy ကြောင့်ဖြစ်ပါသည်။) ထို့အပြင် OBS Audio Mixer တွင် `Donation Alert Overlay` ကို Mute လုပ်ထားမိခြင်း ရှိမရှိ စစ်ဆေးပါ။
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0F172A] p-4 rounded-xl border border-slate-300 dark:border-slate-700/80 space-y-1.5">
                    <h5 className="font-bold text-indigo-300 text-xs flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-400" />
                      <span>မေး - ဖုန်း သို့မဟုတ် Tablet ကနေ မည်သို့ အသုံးပြုနိုင်ပါသနည်း?</span>
                    </h5>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                      ဖြေ - ဤ Website သည် Mobile Phone၊ Tablet၊ Laptop နှင့် Desktop ဘယ် Device ကမဆို သုံးသုံး အပြည့်အဝ ကြည့်ကောင်းအောင် Fully Responsive ပြုလုပ်ထားပါသည်။ Donor က ဖုန်းမှနေ၍ လွယ်ကူစွာ Qr Code Scan ဖတ် ငွေလွှဲပြေစာ Upload တင်နိုင်ပြီး Admin ကလည်း Phone Telegram မှနေ၍ 1-Click Approve လုပ်နိုင်ပါသည်။
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0F172A] p-4 rounded-xl border border-slate-300 dark:border-slate-700/80 space-y-1.5">
                    <h5 className="font-bold text-emerald-300 text-xs flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400" />
                      <span>မေး - Alert Duration နှင့် အသံ အတိုးအကျယ်ကို ဘယ်မှာ ပြင်ရမလဲ?</span>
                    </h5>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                      ဖြေ - Admin Dashboard ၏ <strong>"Media Assets"</strong> သို့မဟုတ် <strong>"Reward Items"</strong> Tab တွင် Sticker / Sound / Video စက္ကန့်နှင့် Volume Level များကို အလိုရှိသလို စိတ်ကြိုက် ပြင်ဆင်သတ်မှတ်နိုင်ပါသည်။
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
