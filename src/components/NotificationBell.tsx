import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellOff, Check, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from './NotificationProvider';
import { useNavigate } from 'react-router-dom';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif: any) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-sm border transition-all relative ${
          isOpen ? 'bg-orion-blue/10 border-orion-blue/30 text-orion-blue' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'
        }`}
      >
        {unreadCount > 0 ? <Bell size={18} className="animate-pulse" /> : <Bell size={18} />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-orion-blue text-black text-[8px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(0,242,255,0.5)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-4 w-80 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-sm shadow-2xl z-[100] overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Bell size={12} className="text-orion-blue" />
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/80">System_Alerts</span>
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[8px] uppercase tracking-widest text-orion-blue hover:text-white transition-colors flex items-center gap-1"
                >
                  <Check size={10} />
                  Clear_All
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full p-4 flex flex-col items-start gap-2 text-left transition-all hover:bg-white/5 group ${!notif.is_read ? 'bg-orion-blue/[0.02]' : ''}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[8px] uppercase tracking-[0.2em] font-bold ${
                          notif.type === 'mention' ? 'text-purple-400' : notif.type === 'message' ? 'text-orion-blue' : 'text-white/40'
                        }`}>
                          [{notif.type.toUpperCase()}]
                        </span>
                        <span className="text-[7px] text-white/20 font-bold uppercase">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-[10px] leading-relaxed tracking-wide ${!notif.is_read ? 'text-white' : 'text-white/40'}`}>
                        {notif.content}
                      </p>
                      {!notif.is_read && (
                        <div className="w-1 h-1 rounded-full bg-orion-blue shadow-[0_0_5px_rgba(0,242,255,0.5)]" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <BellOff size={32} className="mx-auto text-white/5" />
                  <p className="text-[9px] text-white/20 uppercase tracking-[0.3em]">No Active Alerts</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/10 bg-white/[0.02] text-center">
              <span className="text-[7px] text-white/10 uppercase tracking-[0.4em] font-bold">Secure_Link_Active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
