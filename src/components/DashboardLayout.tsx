import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogOut, ChevronRight, User, Bell } from 'lucide-react';
import { OrionLogo } from './System';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { NAV_ITEMS } from '../lib/navigation';
import { NotificationProvider } from './NotificationProvider';
import { NotificationBell } from './NotificationBell';

interface DashboardLayoutProps {
  children: React.ReactNode;
  profile: Profile | null;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, profile }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (!item.minRole) return true;
    if (!profile) return false;
    return profile.role === item.minRole || profile.role === 'Root';
  });

  return (
    <NotificationProvider profile={profile}>
      <div className="h-[100dvh] text-white flex flex-col relative overflow-hidden bg-transparent">
        {/* System Status Bar */}
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-white/5 z-[100] overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/3"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Global Header */}
        <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-black/20 backdrop-blur-xl z-50 flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-4 md:hidden">
            <OrionLogo size={20} />
            <span className="text-[10px] font-display tracking-[0.3em] uppercase font-bold text-white">ORION</span>
          </div>
          <div className="hidden md:block" /> {/* Spacer for desktop sidebar */}
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-white/10 mx-2 hidden md:block" />
            <div className="hidden md:flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">{profile?.username}</span>
                <span className="text-[7px] text-white/30 uppercase tracking-tighter font-bold">{profile?.role}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-orion-blue overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} strokeWidth={1.5} />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 relative z-10 h-full overflow-hidden pt-16">
          {/* Sidebar for Desktop */}
          <aside className="hidden md:flex w-72 border-r border-white/10 bg-black/10 backdrop-blur-3xl flex-col shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-8 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/5 border border-white/10 rounded-sm">
                  <OrionLogo size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-display tracking-[0.3em] uppercase font-bold text-white">ORION</span>
                  <span className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-bold">Mainframe_v2.4</span>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-6 space-y-2">
              {filteredNavItems.map((item, i) => (
                <SidebarItem 
                  key={i}
                  icon={item.icon(18)} 
                  label={item.label} 
                  active={location.pathname === item.path} 
                  onClick={() => navigate(item.path)} 
                />
              ))}
            </nav>

            <div className="p-8 border-t border-white/5 bg-white/[0.02]">
              {profile ? (
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-sm border border-red-500/10 bg-red-500/5 text-red-500/40 hover:text-red-400 hover:border-red-500/30 transition-all text-[10px] uppercase tracking-[0.3em] font-bold"
                >
                  <LogOut size={14} />
                  Disconnect
                </button>
              ) : (
                <div className="flex items-center gap-4 mb-8 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10" />
                  <div className="flex flex-col gap-2">
                    <div className="h-3 w-20 bg-white/5 rounded" />
                    <div className="h-2 w-12 bg-white/5 rounded" />
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 rounded-sm border transition-all group ${
      active 
        ? 'border-white/10 bg-white/5 text-white' 
        : 'border-transparent text-white/40 hover:border-white/10 hover:bg-white/5 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`${active ? 'text-orion-blue' : 'text-inherit'} transition-colors`}>
        {icon}
      </div>
      <span className="text-[11px] uppercase tracking-[0.3em] font-bold">
        {label}
      </span>
    </div>
    <ChevronRight size={14} className={`transition-all ${active ? 'text-orion-blue opacity-100' : 'text-white/10 opacity-0 group-hover:opacity-40 group-hover:translate-x-1'}`} />
  </button>
);
