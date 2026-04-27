import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingOverlay, SystemMessage, OrionLogo } from '../components/System';
import { Invite, Role, getRoleLabel } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, User, Mail, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

export const InvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [phraseInput, setPhraseInput] = useState('');
  const [phraseVerified, setPhraseVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [credential, setCredential] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    document.title = "The Orion | Entry Point";
  }, []);

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setError('NO ENTRY POINT DETECTED');
        setLoading(false);
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('invites')
          .select('*')
          .eq('token', token)
          .single();

        if (fetchError || !data) {
          setError('ENTRY POINT INVALID');
          setTimeout(() => navigate('/'), 2000);
        } else if (data.used) {
          setError('ENTRY POINT EXPIRED');
          setTimeout(() => navigate('/'), 2000);
        } else {
          setInvite(data);
        }
      } catch (err: any) {
        console.error('Token Check Error:', err);
        setError('NETWORK FAILURE: CONSTELLATION UNREACHABLE');
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  const verifyPhrase = () => {
    if (phraseInput === invite?.phrase) {
      setPhraseVerified(true);
      setError(null);
    } else {
      setError('UNRECOGNIZED PATTERN DETECTED');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setError(null);

    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: credential,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            username,
            role: invite?.assigned_role,
            invite_token: token
          }
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('REGISTRATION FAILED');

      // 2. If session is available, create profile and mark invite as used immediately
      if (authData.session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([
            {
              id: authData.user.id,
              username,
              role: invite?.assigned_role as Role,
            },
          ]);

        if (profileError) throw profileError;

        const { error: inviteUpdateError } = await supabase
          .from('invites')
          .update({ used: true })
          .eq('token', token);

        if (inviteUpdateError) throw inviteUpdateError;

        navigate('/dashboard');
      } else {
        // Verification required - profile will be synced on first login
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      console.error('Registration Error Details:', err);
      if (err.message === 'Failed to fetch') {
        setError('NETWORK FAILURE: CONSTELLATION UNREACHABLE');
      } else if (err.message?.includes('already registered') || err.code === '23505') {
        setError('IDENTITY CONFLICT: PATTERN ALREADY EXISTS IN CONSTELLATION');
      } else if (err.code === '42501') {
        setError('SECURITY PROTOCOL: AUTHORIZATION FAILURE DURING IDENTITY INITIALIZATION');
      } else if (err.message?.includes('email rate limit exceeded')) {
        setError('SECURITY PROTOCOL: TRANSMISSION FREQUENCY EXCEEDED. WAIT BEFORE RE-ATTEMPTING.');
      } else if (err.message?.includes('security purposes')) {
        const seconds = err.message.match(/\d+/)?.[0] || '60';
        setError(`SECURITY PROTOCOL: WAIT ${seconds}s BEFORE RE-ATTEMPTING ACCESS`);
      } else {
        setError('REGISTRATION SEQUENCE INTERRUPTED');
      }
      setRegistering(false);
    }
  };

  if (loading) return <LoadingOverlay message="Detecting Entry Point" />;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative z-10 overflow-hidden">
      {registering && <LoadingOverlay message="Initializing Constellation Access" />}
      
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
            <Shield className="text-white/40" size={40} />
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
              <h2 className="text-[12px] font-display font-light tracking-[0.4em] text-white/40 uppercase">ENTRY POINT</h2>
              <p className="text-[10px] text-white/20 uppercase tracking-[0.5em]">Constellation: {token?.slice(0, 12)}...</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <SystemMessage type="error">{error}</SystemMessage>
              {error && (
                <button 
                  onClick={() => navigate('/')}
                  className="w-full py-3 rounded-xl border border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white hover:bg-white/5 transition-all font-medium"
                >
                  Return to Login
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!phraseVerified ? (
            <motion.div 
              key="phrase-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onKeyDown={(e) => e.key === 'Enter' && verifyPhrase()}
              className="orion-panel p-10 space-y-8 border-white/20 shadow-2xl"
            >
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-[0.4em] text-white/40 ml-1 font-bold">Confirm Access Phrase</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input 
                    type="text" 
                    value={phraseInput}
                    onChange={(e) => setPhraseInput(e.target.value)}
                    className="orion-input w-full pl-12 bg-black/5"
                    placeholder="ENTER PHRASE"
                    autoFocus
                  />
                </div>
              </div>
              <button type="button" onClick={verifyPhrase} className="btn-orion w-full flex items-center justify-center gap-3 shadow-xl">
                Verify Access
                <ArrowRight size={18} />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="register-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onKeyDown={(e) => e.key === 'Enter' && handleRegister(e as any)}
              className="orion-panel p-10 space-y-8 border-white/20 shadow-2xl"
            >
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-white/40 ml-1 font-bold">Identifier (Username)</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="orion-input w-full pl-12 bg-black/5"
                      placeholder="USER_ID"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-white/40 ml-1 font-bold">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="orion-input w-full pl-12 bg-black/5"
                      placeholder="EMAIL@CONSTELLATION.ORG"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-white/40 ml-1 font-bold">Credential (Password)</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                      type="password" 
                      value={credential}
                      onChange={(e) => setCredential(e.target.value)}
                      className="orion-input w-full pl-12 bg-black/5"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-2xl bg-black/5 border border-black/10 flex items-center justify-between shadow-inner">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">Assigned Role</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white font-black">{getRoleLabel(invite?.assigned_role)}</span>
              </div>

              <button 
                type="button" 
                onClick={handleRegister as any}
                className="btn-orion w-full flex items-center justify-center gap-3 shadow-xl" 
                disabled={registering}
              >
                {registering ? 'INITIALIZING...' : 'Initialize Access'}
                {!registering && <CheckCircle2 size={18} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center"
        >
          <p className="text-[10px] text-white/10 uppercase tracking-[0.5em]">System Protocol 4.2.0 // Entry</p>
        </motion.div>
      </motion.div>
    </div>
  );
};
