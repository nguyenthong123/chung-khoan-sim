import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Trade from './components/Trade';
import Portfolio from './components/Portfolio';
import History from './components/History';
import Wallet from './components/Wallet';
import Login from './components/Login';
import Finance from './components/Finance';
import Settings from './components/Settings';
import { api } from './api';
import { Search, Bell, User } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(sessionStorage.getItem('userEmail'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const fetchProfile = async (email) => {
    const data = await api.call('getProfile', { email: email || userEmail });
    setProfile(data);
    fetchNotifications(email || userEmail);
    setLoading(false);
  };

  const fetchNotifications = async (email) => {
    const res = await api.call('getNotifications', { email: email || userEmail }, 'trading', { silent: true });
    if (res && Array.isArray(res)) setNotifications(res);
  };

  const handleMarkRead = async () => {
    if (notifications.some(n => !n.isRead)) {
      await api.call('markNotificationsRead', { email: userEmail });
      fetchNotifications();
    }
    setShowNotif(!showNotif);
    setShowProfile(false);
  };

  useEffect(() => {
    if (userEmail) {
      fetchProfile(userEmail);
      // Polling notifications every 30s
      const timer = setInterval(() => fetchNotifications(), 30000);
      return () => clearInterval(timer);
    } else {
      setLoading(false);
    }
  }, [userEmail]);

  const handleLogin = (email) => {
    sessionStorage.setItem('userEmail', email);
    setUserEmail(email);
    setLoading(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('userEmail');
    setProfile(null);
    setUserEmail(null);
  };

  if (loading) return (
    <div className="h-screen w-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textSecondary font-medium animate-pulse">Đang kết nối hệ thống...</p>
      </div>
    </div>
  );

  if (!userEmail || !profile) return (
    <div className="min-h-screen bg-background text-textPrimary">
      <Login onLogin={handleLogin} />
    </div>
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard profile={profile} refreshProfile={fetchProfile} />;
      case 'trade': return <Trade balance={profile.balance} refreshProfile={fetchProfile} />;
      case 'portfolio': return <Portfolio holdings={profile.holdings} refreshProfile={fetchProfile} />;
      case 'history': return <History profile={profile} refreshProfile={fetchProfile} />;
      case 'wallet': return <Wallet profile={profile} refreshProfile={fetchProfile} />;
      case 'finance': return <Finance userEmail={profile.email} />;
      case 'settings': return <Settings theme={theme} setTheme={setTheme} />;
      default: return <Dashboard profile={profile} />;
    }
  };

  const formatNotifDate = (d) => {
    const date = new Date(d);
    return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0') + ' - ' + date.getDate() + '/' + (date.getMonth() + 1);
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary flex overflow-x-hidden transition-colors duration-500">
      {/* Sidebar - Responsive */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
          onLogout={handleLogout}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <main className="flex-1 lg:ml-64 min-h-screen transition-all duration-300">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex justify-between items-center p-4 lg:p-8 bg-surface/40 backdrop-blur-xl border-b border-faint mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 lg:hidden bg-surface rounded-xl text-textSecondary hover:text-textPrimary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div className="relative w-48 md:w-80 lg:w-96 hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="w-full bg-surface border border-faint rounded-2xl py-2.5 pl-11 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative">
              <button
                onClick={handleMarkRead}
                className={`p-2.5 rounded-xl transition-all relative ${showNotif ? 'bg-primary text-white' : 'bg-surface hover:bg-muted text-textSecondary'}`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-danger text-[9px] font-bold rounded-full border-2 border-surface flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 mt-3 w-80 glass rounded-3xl border border-faint shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-faint flex justify-between items-center bg-muted">
                    <h3 className="font-black text-xs uppercase tracking-widest text-textSecondary">Thông báo mới</h3>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{notifications.length} tin</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((n, i) => (
                        <div key={i} className={`p-4 border-b border-faint hover:bg-white/[0.04] transition-colors relative ${!n.isRead ? 'bg-primary/[0.03]' : ''}`}>
                          {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                          <p className="text-sm font-bold text-textPrimary/90 leading-tight mb-1">{n.message}</p>
                          <p className="text-[10px] text-textSecondary font-medium">{formatNotifDate(n.date)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 text-center opacity-20">
                        <Bell size={32} className="mx-auto mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest">Không có thông báo</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <div
                onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
                className={`flex items-center gap-2 md:gap-3 p-1.5 md:pr-4 rounded-xl md:rounded-2xl border transition-all cursor-pointer ${showProfile ? 'bg-primary/10 border-primary/30' : 'bg-surface border-faint hover:bg-muted'}`}
              >
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-primaryHover rounded-lg md:rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
                  <User size={18} />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-black leading-none mb-0.5 uppercase tracking-tighter">{profile.email.split('@')[0]}</p>
                  <p className="text-[9px] text-textSecondary font-bold uppercase tracking-[0.15em] opacity-50">Tài khoản Live</p>
                </div>
              </div>

              {showProfile && (
                <div className="absolute right-0 mt-3 w-72 glass rounded-[32px] border border-faint shadow-3xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-6 bg-gradient-to-br from-primary/10 to-transparent border-b border-faint">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-primary/20">
                        {profile.email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-black text-textPrimary truncate tracking-tight">{profile.email}</p>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">Thành viên Pro</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted p-3 rounded-2xl border border-faint">
                        <p className="text-[8px] font-black text-textSecondary uppercase tracking-widest mb-1">Tổng tài sản</p>
                        <p className="text-xs font-black text-textPrimary">{(profile.totalAssets || 0).toLocaleString()}đ</p>
                      </div>
                      <div className="bg-muted p-3 rounded-2xl border border-faint">
                        <p className="text-[8px] font-black text-textSecondary uppercase tracking-widest mb-1">Vốn khởi tạo</p>
                        <p className="text-xs font-black text-textPrimary">100.000.000đ</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { setActiveTab('wallet'); setShowProfile(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-textSecondary hover:bg-muted hover:text-textPrimary transition-all text-xs font-black uppercase tracking-widest"
                    >
                      <div className="p-1.5 bg-muted rounded-lg"><User size={14} /></div>
                      Hồ sơ cá nhân
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-textSecondary hover:bg-muted hover:text-textPrimary transition-all text-xs font-black uppercase tracking-widest">
                      <div className="p-1.5 bg-muted rounded-lg"><Search size={14} /></div>
                      Bảo mật tài khoản
                    </button>
                    <div className="h-px bg-muted mx-4 my-2"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-danger hover:bg-danger/10 transition-all text-xs font-black uppercase tracking-widest"
                    >
                      <div className="p-1.5 bg-danger/10 rounded-lg"><Bell size={14} className="rotate-45" /></div>
                      Đăng xuất ngay
                    </button>
                  </div>

                  <div className="p-4 bg-muted text-center border-t border-faint">
                    <p className="text-[8px] font-black text-textSecondary uppercase tracking-[0.3em]">StockSim v2.0 © 2024</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="px-4 lg:px-8 pb-10 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
