import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, ChevronRight, Menu, X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { OrionLogo } from './System';
import { NAV_ITEMS } from '../lib/navigation';

export const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let channel: any = null;

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);

        // Subscribe to profile changes
        channel = supabase
          .channel(`profile_sync_${user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, (payload) => {
            setProfile(payload.new);
          })
          .subscribe();
      }
    };
    fetchProfile();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setIsOpen(false);
  };

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (!item.minRole) return true;
    if (!profile) return false;
    return profile.role === item.minRole || profile.role === 'Root';
  });

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 z-[70] flex items-center justify-between px-6 pointer-events-none md:hidden">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={() => setIsOpen(true)}
            className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-sm text-white/60 hover:text-white hover:border-white/30 transition-all shadow-2xl group"
          >
            <Menu size={20} className="group-hover:scale-110 transition-transform" />
          </button>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-sm hidden sm:flex">
             <OrionLogo size={16} />
             <span className="text-[10px] font-display tracking-[0.4em] uppercase font-bold text-white/40">Orion_OS</span>
          </div>
        </div>

        <div className="flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-5 py-2.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-sm text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all text-[10px] uppercase tracking-[0.2em] font-bold shadow-2xl group"
          >
            <LogOut size={14} className="group-hover:scale-110 transition-transform" />
            <span className="hidden xs:inline">Disconnect</span>
          </button>
        </div>
      </header>

      {/* Slide-out Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80]"
            />
            
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-full max-w-[320px] bg-black/20 backdrop-blur-3xl border-r border-white/10 z-[90] flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.5)]"
            >
              {/* Menu Header */}
              <div className="p-8 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/5 border border-white/10 rounded-sm">
                    <OrionLogo size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-display tracking-[0.3em] uppercase font-bold text-white">ORION</span>
                    <span className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-bold">Mainframe_v2.4</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-white/20 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 p-6 space-y-2">
                {filteredNavItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      navigate(item.path);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-sm border border-transparent hover:border-white/10 hover:bg-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-white/40 group-hover:text-orion-blue transition-colors">
                        {item.icon(20)}
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.3em] font-bold text-white/60 group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </nav>

              {/* User Profile Section */}
              <div className="p-8 border-t border-white/5 bg-white/[0.02]">
                {profile ? (
                  <>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[12px] font-bold text-orion-blue shadow-inner overflow-hidden">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider truncate text-white">{profile.username}</span>
                        <span className="text-[8px] text-white/30 uppercase tracking-tighter font-bold">{profile.role}</span>
                      </div>
                    </div>
                    
                    <div className="h-px bg-white/5 mb-8" />
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-sm border border-red-500/10 bg-red-500/5 text-red-500/40 hover:text-red-400 hover:border-red-500/30 transition-all text-[10px] uppercase tracking-[0.3em] font-bold"
                    >
                      <LogOut size={14} />
                      Disconnect
                    </button>
                  </>
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

              {/* Decorative Elements */}
              <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-orion-blue/20 to-transparent" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
