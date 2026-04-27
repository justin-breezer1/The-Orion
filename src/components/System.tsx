import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export const StarField: React.FC = () => {
  const [stars, setStars] = useState<{ id: number; x: number; y: number; size: number; opacity: number; duration: number; delay: number; type: 'steady' | 'twinkle' | 'flash' }[]>([]);

  useEffect(() => {
    const newStars = Array.from({ length: 300 }).map((_, i) => {
      const typeRand = Math.random();
      let type: 'steady' | 'twinkle' | 'flash' = 'steady';
      if (typeRand > 0.95) type = 'flash';
      else if (typeRand > 0.7) type = 'twinkle';

      return {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        duration: type === 'flash' ? 3 : 15,
        delay: 3 + Math.random() * 10,
        type
      };
    });
    setStars(newStars);
  }, []);

  return (
    <div className="star-field">
      <div className="constellation-bg" />
      <svg width="100%" height="100%" className="absolute inset-0">
        {stars.map(star => (
          <motion.circle
            key={star.id}
            cx={`${star.x}%`}
            cy={`${star.y}%`}
            r={star.size}
            fill="white"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: star.type === 'steady' 
                ? [star.opacity, star.opacity * 0.7, star.opacity]
                : star.type === 'twinkle'
                ? [star.opacity, star.opacity * 0.05, star.opacity]
                : [0, star.opacity, 0],
              scale: star.type === 'flash' ? [1, 2, 1] : [1, 1.2, 1]
            }}
            transition={{ 
              duration: star.duration, 
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut" 
            }}
            style={{
              filter: star.size > 1.5 ? 'blur(0.5px) drop-shadow(0 0 3px rgba(255,255,255,0.8))' : 'none'
            }}
          />
        ))}
        {/* Orion-inspired constellation lines - more complex */}
        <g className="opacity-20">
          <line x1="48%" y1="35%" x2="52%" y2="35%" className="constellation-line" />
          <line x1="52%" y1="35%" x2="50%" y2="55%" className="constellation-line" />
          <line x1="50%" y1="55%" x2="48%" y2="35%" className="constellation-line" />
          <line x1="48%" y1="35%" x2="45%" y2="20%" className="constellation-line" />
          <line x1="52%" y1="35%" x2="55%" y2="20%" className="constellation-line" />
          <line x1="50%" y1="55%" x2="47%" y2="75%" className="constellation-line" />
          <line x1="50%" y1="55%" x2="53%" y2="75%" className="constellation-line" />
        </g>
      </svg>
    </div>
  );
};

interface LoadingOverlayProps {
  message: string;
  onComplete?: () => void;
  duration?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, onComplete, duration = 500 }) => {
  useEffect(() => {
    const timeout = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timeout);
  }, [onComplete, duration]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="orion-panel p-16 max-w-md w-full border-white/20 shadow-2xl relative overflow-hidden">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            rotate: { duration: 4, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
          className="w-24 h-24 border-2 border-black/5 border-t-black/40 rounded-full mb-12 mx-auto relative"
        >
          <div className="absolute inset-0 border border-black/5 border-b-black/20 rounded-full rotate-45" />
        </motion.div>
        
        <div className="space-y-6">
          <p className="text-sm font-bold tracking-[0.5em] text-white uppercase">{message}</p>
          <div className="w-full bg-black/5 h-[2px] rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: duration / 1000, ease: "easeInOut" }}
              className="bg-orion-blue h-full shadow-[0_0_20px_rgba(0,242,255,0.2)]"
            />
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">Orion Protocol Initializing...</p>
        </div>
      </div>
    </motion.div>
  );
};

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}> = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="orion-panel p-10 max-w-md w-full border-white/20 shadow-2xl space-y-8"
      >
        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-[0.2em] text-white uppercase !-webkit-text-fill-color-current">{title}</h3>
          <p className="text-sm text-white/60 leading-relaxed">{message}</p>
        </div>
        
        <div className="flex gap-4 pt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-white/60 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white/5 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 px-6 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl transition-all ${
              isDestructive 
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/20' 
                : 'btn-orion'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="orion-panel p-8 md:p-10 max-w-lg w-full border-white/20 shadow-2xl space-y-8 relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 blur-[80px] rounded-full" />
        
        <div className="flex justify-between items-center relative z-10">
          <h3 className="text-xl font-bold tracking-[0.2em] text-white uppercase">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const OrionLogo: React.FC<{ size?: number; className?: string }> = ({ size, className = "" }) => {
  const id = React.useId().replace(/:/g, "");
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={size ? { width: size, height: size } : {}}
    >
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`metal-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#00f2ff" />
            <stop offset="100%" stopColor="#00a2ff" />
          </linearGradient>
        </defs>
        {/* Outer Ring */}
        <circle cx="50" cy="50" r="42" stroke={`url(#metal-${id})`} strokeWidth="4" />
        {/* Constellation Lines */}
        <g stroke="white" strokeWidth="1.5" opacity="0.8">
          <line x1="50" y1="25" x2="30" y2="55" />
          <line x1="30" y1="55" x2="55" y2="75" />
          <line x1="55" y1="75" x2="75" y2="35" />
          <line x1="75" y1="35" x2="50" y2="25" />
          <line x1="50" y1="25" x2="55" y2="75" />
        </g>
        {/* Stars */}
        <circle cx="50" cy="25" r="4" fill="white" />
        <circle cx="30" cy="55" r="3.5" fill="white" />
        <circle cx="55" cy="75" r="3.5" fill="white" />
        <circle cx="75" cy="35" r="5" fill="white" />
      </svg>
    </motion.div>
  );
};

export const Nebula: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-60">
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-900/30 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-900/30 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
      <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-15" />
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-white/5 rounded-2xl border border-white/5 ${className}`} />
);

export const SystemMessage: React.FC<{ children: React.ReactNode; type?: 'info' | 'error' }> = ({ children, type = 'info' }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className={`p-10 my-10 rounded-3xl border backdrop-blur-2xl shadow-2xl relative overflow-hidden ${
      type === 'error' 
        ? 'border-red-500/30 bg-red-500/5 text-red-100' 
        : 'orion-panel !bg-none !bg-white/5 !border-white/10 text-white/90'
    }`}
  >
    {/* Subtle background glow */}
    <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[100px] opacity-20 rounded-full ${type === 'error' ? 'bg-red-500' : 'bg-slate-400'}`} />
    
    <div className="flex items-center gap-5 mb-5 relative z-10">
      <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${type === 'error' ? 'bg-red-500 animate-ping' : 'bg-slate-300 shadow-white/20'}`} />
      <span className="text-[11px] uppercase tracking-[0.5em] opacity-60 font-bold">
        {type === 'error' ? 'Critical Alert' : 'Orion System Log'}
      </span>
    </div>
    <div className="text-sm leading-relaxed font-light tracking-wide relative z-10 opacity-90">
      {children}
    </div>
  </motion.div>
);
