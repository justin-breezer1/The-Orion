import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LoadingOverlay, SystemMessage, OrionLogo } from '../components/System';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

const GlitchText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 orion-text">{text}</span>
      <motion.span
        animate={{
          x: [0, -2, 2, -1, 0],
          opacity: [0, 0.5, 0.2, 0.5, 0],
        }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          repeatDelay: Math.random() * 5 + 2,
        }}
        className="absolute inset-0 text-red-500 z-0"
      >
        {text}
      </motion.span>
      <motion.span
        animate={{
          x: [0, 2, -2, 1, 0],
          opacity: [0, 0.5, 0.2, 0.5, 0],
        }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          repeatDelay: Math.random() * 5 + 2,
        }}
        className="absolute inset-0 text-blue-500 z-0"
      >
        {text}
      </motion.span>
    </span>
  );
};

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [credential, setCredential] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "The Orion | Login";
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email.includes('@')) {
        setError('Access Denied: Valid email required for constellation entry');
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: credential,
      });

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          navigate(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        if (authError.message === 'Invalid login credentials') {
          setError('Access Denied: Unrecognized identity pattern or invalid credential');
        } else {
          setError(authError.message || 'Unrecognized pattern detected');
        }
        setLoading(false);
        return;
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login Error Details:', err);
      setError(err.message || 'Unrecognized pattern detected');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {loading && <LoadingOverlay message="Verifying Identity" />}
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full space-y-8 md:space-y-10 relative z-10"
      >
        <div className="text-center space-y-3 md:space-y-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-center gap-[0.5em] mb-6 md:mb-8 text-4xl md:text-7xl font-display font-light tracking-[0.1em] md:tracking-[0.2em] glow-text">
              <GlitchText text="THE" />
              <div className="flex items-center gap-[0.1em]">
                <OrionLogo className="w-[1em] h-[1em]" />
                <GlitchText text="RION" />
              </div>
            </div>
            <div className="h-px w-16 md:w-24 bg-white/20 mx-auto mb-3 md:mb-6" />
            <p className="text-[10px] md:text-[11px] text-white/40 tracking-[0.3em] md:tracking-[0.6em] uppercase font-light">Secure Constellation Interface</p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin(e as any)}
          className="orion-panel p-6 md:p-8 space-y-6 md:space-y-8 border-white/20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"
        >
          <div className="space-y-6 md:space-y-8">
            <div className="space-y-2 md:space-y-3">
              <label className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.4em] text-white/40 ml-1 font-bold">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="orion-input w-full !py-3 md:!py-4"
                placeholder="EMAIL@CONSTELLATION.ORG"
                required
              />
            </div>
            <div className="space-y-2 md:space-y-3">
              <label className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.4em] text-white/40 ml-1 font-bold">Credential</label>
              <input 
                type="password" 
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className="orion-input w-full !py-3 md:!py-4"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 md:p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-[10px] uppercase tracking-widest font-medium leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="button" 
            onClick={handleLogin as any}
            className="btn-orion w-full mt-4 md:mt-6 shadow-2xl group"
          >
            <span>Initiate Access</span>
            <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <div className="pt-6 md:pt-8 border-t border-white/5">
            <p className="text-[9px] text-center text-white/40 uppercase tracking-[0.15em] md:tracking-[0.3em] leading-relaxed px-4">
              Unauthorized access attempts are monitored and recorded by the Orion Security Protocol
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center"
        >
          <p className="text-[9px] md:text-[10px] text-white/10 uppercase tracking-[0.3em] md:tracking-[0.5em]">System Version 4.2.0 // Stable</p>
        </motion.div>
      </motion.div>
    </div>
  );
};
