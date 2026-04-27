import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingOverlay, SystemMessage, OrionLogo } from '../components/System';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, RefreshCw, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(emailParam);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.email_confirmed_at) {
          navigate('/dashboard');
        } else {
          setUserEmail(user.email || emailParam);
        }
      }
    };
    checkUser();
  }, [navigate, emailParam]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || otp.length !== 6) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Using 'email' type as requested by user
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: userEmail,
        token: otp,
        type: 'email',
      });

      if (verifyError) {
        // Fallback to 'signup' type if 'email' fails (common for first-time signup)
        const { error: signupVerifyError } = await supabase.auth.verifyOtp({
          email: userEmail,
          token: otp,
          type: 'signup',
        });
        if (signupVerifyError) throw signupVerifyError;
      }
      
      setMessage('IDENTITY VERIFIED. ACCESS GRANTED.');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      console.error('Verification Error:', err);
      setError(err.message === 'Token has expired or is invalid' 
        ? 'INVALID OR EXPIRED SEQUENCE' 
        : 'VERIFICATION FAILED: ' + err.message.toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userEmail) {
      setError('NO IDENTITY DETECTED TO VERIFY');
      return;
    }

    if (cooldown > 0) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Using signInWithOtp as requested by user
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email: userEmail,
      });

      if (resendError) throw resendError;
      setMessage('VERIFICATION SEQUENCE RE-TRANSMITTED TO ' + maskEmail(userEmail).toUpperCase());
      setCooldown(60); // Start 60s cooldown
    } catch (err: any) {
      console.error('Resend Error Details:', err);
      if (err.message === 'Failed to fetch') {
        setError('NETWORK FAILURE: CONSTELLATION UNREACHABLE');
      } else if (err.message?.includes('security purposes')) {
        const seconds = parseInt(err.message.match(/\d+/)?.[0] || '60', 10);
        setError(`SECURITY PROTOCOL: WAIT ${seconds}s BEFORE RE-TRANSMITTING`);
        setCooldown(seconds);
      } else if (err.message?.includes('email rate limit exceeded')) {
        setError('SECURITY PROTOCOL: TRANSMISSION FREQUENCY EXCEEDED. WAIT BEFORE RE-ATTEMPTING.');
        setCooldown(60);
      } else {
        setError('TRANSMISSION FAILED: ' + err.message.toUpperCase());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const maskEmail = (email: string | null) => {
    if (!email) return 'N/A';
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    const maskedUser = user.length > 2 
      ? user[0] + '*'.repeat(user.length - 2) + user[user.length - 1]
      : user[0] + '*';
    return `${maskedUser}@${domain}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative z-10 overflow-hidden">
      {loading && <LoadingOverlay message="Processing Protocol" />}
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-12"
      >
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block p-5 rounded-3xl bg-white/5 border border-white/10 mb-2 shadow-2xl"
          >
            <ShieldCheck className="text-white/40" size={40} />
          </motion.div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
              <div className="flex items-center gap-[0.3em] text-3xl sm:text-4xl font-display font-light tracking-[0.1em] glow-text">
                <span className="orion-text">THE</span>
                <OrionLogo className="w-[1em] h-[1em] opacity-90" />
                <span className="orion-text">RION</span>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-[12px] font-display font-light tracking-[0.4em] text-white/40 uppercase">IDENTITY VERIFICATION</h2>
              <p className="text-[10px] text-white/20 uppercase tracking-[0.5em]">Confirming access pattern</p>
            </div>
          </div>
        </div>

        <div className="orion-panel p-10 space-y-10 border-white/20 shadow-2xl">
          <div className="space-y-6 text-center">
            <p className="text-sm font-light leading-relaxed text-white/60">
              A verification sequence has been transmitted to your registered email. 
              Enter the 6-digit access code to complete the protocol.
            </p>
            {userEmail && (
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-bold">Target Identity</span>
                <span className="text-xs font-mono text-white tracking-wider bg-white/5 px-6 py-3 rounded-2xl border border-white/10 shadow-inner">
                  {maskEmail(userEmail)}
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleVerify} className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.4em] text-white/40 ml-1 font-bold">Access Code (OTP)</label>
              <input 
                type="text" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="orion-input w-full !py-6 text-center text-3xl tracking-[0.5em] font-mono bg-black/5"
                placeholder="000000"
                autoFocus
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={otp.length !== 6 || loading}
              className={`btn-orion w-full flex items-center justify-center gap-3 shadow-xl ${otp.length !== 6 ? 'opacity-50' : ''}`}
            >
              Verify Identity
              <ShieldCheck size={18} />
            </button>
          </form>

          <AnimatePresence mode="wait">
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SystemMessage type="info">{message}</SystemMessage>
              </motion.div>
            )}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SystemMessage type="error">{error}</SystemMessage>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
            <button 
              onClick={handleResend} 
              disabled={cooldown > 0}
              className={`btn-orion w-full flex items-center justify-center gap-3 shadow-xl ${cooldown > 0 ? 'opacity-50 grayscale' : ''}`}
            >
              <RefreshCw size={18} className={cooldown > 0 ? 'animate-spin' : ''} />
              {cooldown > 0 ? `WAIT ${cooldown}S` : 'RESEND VERIFICATION'}
            </button>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleLogout} 
                className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white hover:bg-white/5 transition-all font-medium"
              >
                <LogOut size={14} />
                Switch
              </button>
              <button 
                onClick={() => navigate('/')} 
                className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white hover:bg-white/5 transition-all font-medium"
              >
                <ArrowLeft size={14} />
                Login
              </button>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-center gap-3 opacity-20"
        >
          <ShieldCheck size={14} />
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium">
            Unverified identities are purged periodically
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
