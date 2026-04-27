import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Profile, getRoleLabel } from '../types';
import { User, Shield, Upload, Camera, Loader2 } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { motion, AnimatePresence } from 'motion/react';

const CLOUDINARY_CLOUD_NAME = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const AccountPage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "The Orion | Account";
  }, []);

  useEffect(() => {
    let channel: any = null;

    const fetchData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (!user) {
          navigate('/');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Subscribe to profile changes
        channel = supabase
          .channel(`account_profile_${user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, (payload) => {
            setProfile(payload.new as Profile);
          })
          .subscribe();
      } catch (err: any) {
        console.error('Account Profile Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsUploading(true);
    setSystemStatus({ message: 'INITIATING BIOMETRIC UPLOAD...', type: 'info' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET || '');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) throw new Error('UPLOAD_FAILED');
      const data = await response.json();
      const avatarUrl = data.secure_url;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
      setSystemStatus({ message: 'IDENTITY VISUAL UPDATED SUCCESSFULLY', type: 'success' });
    } catch (err: any) {
      console.error('Avatar Upload Error:', err);
      setSystemStatus({ message: 'TRANSMISSION REJECTED: UPLOAD FAILED', type: 'error' });
    } finally {
      setIsUploading(false);
      setTimeout(() => setSystemStatus(null), 5000);
    }
  };

  if (loading) return null;

  return (
    <DashboardLayout profile={profile}>
      <header className="h-16 border-b border-white/10 bg-black/10 backdrop-blur-md flex items-center justify-between px-8 relative z-20 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
        <div className="text-[10px] font-display tracking-[0.4em] uppercase font-bold text-white/60">
          Account_Terminal
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="flex items-center justify-between border-b border-white/5 pb-12">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px w-12 bg-orion-blue/50" />
                <span className="text-[10px] uppercase tracking-[0.6em] text-orion-blue font-bold">Identity Profile</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-light tracking-[0.1em] text-white uppercase">
                Account Terminal
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-12">
              <div className="orion-panel p-12 space-y-12 border-white/10 bg-black/10 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-10 text-center sm:text-left">
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-orion-blue/10 border border-orion-blue/20 flex items-center justify-center text-orion-blue relative overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={48} className="sm:w-16 sm:h-16" strokeWidth={1} />
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 size={24} className="text-orion-blue animate-spin" />
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 p-3 rounded-full bg-orion-blue text-black cursor-pointer hover:scale-110 transition-all shadow-[0_0_15px_rgba(0,163,255,0.5)]">
                      <Camera size={16} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                    </label>
                  </div>
                  <div className="space-y-4 min-w-0 w-full">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-light tracking-widest text-white uppercase break-all sm:break-normal">
                      {profile?.username}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-[0.4em] font-bold truncate">
                      {profile?.id}
                    </p>
                    <button 
                      onClick={() => document.getElementById('avatar-input')?.click()}
                      disabled={isUploading}
                      className="text-[9px] uppercase tracking-[0.3em] text-orion-blue hover:text-white transition-colors font-bold flex items-center gap-2"
                    >
                      <Upload size={12} />
                      Update Profile Image
                      <input id="avatar-input" type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-white/5">
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-bold">Clearance Designation</label>
                    <div className="p-6 rounded-sm bg-white/5 border border-white/10 text-[12px] text-orion-blue font-bold tracking-[0.2em] uppercase">
                      {getRoleLabel(profile?.role)}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-bold">Account Identifier</label>
                    <div className="p-6 rounded-sm bg-white/5 border border-white/10 text-[12px] text-white/40 font-mono tracking-[0.1em] uppercase">
                      {profile?.id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="orion-panel p-12 space-y-8 border-white/10 bg-black/10 backdrop-blur-xl">
                <h3 className="text-[12px] font-display tracking-[0.4em] text-white/30 uppercase font-bold">System Permissions</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Encrypted Storage Access', granted: true },
                    { label: 'Multi-Node Synchronization', granted: true },
                    { label: 'Overseer Terminal Access', granted: profile?.role === 'Overseer' || profile?.role === 'Root' },
                    { label: 'Apex Classification Clearance', granted: profile?.role === 'Apex' || profile?.role === 'Overseer' || profile?.role === 'Root' }
                  ].map((perm, i) => (
                    <div key={i} className="flex items-center justify-between p-5 rounded-sm bg-white/5 border border-white/5">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold">{perm.label}</span>
                      <span className={`text-[9px] font-bold tracking-widest uppercase ${perm.granted ? 'text-green-400' : 'text-red-400/40'}`}>
                        {perm.granted ? 'GRANTED' : 'RESTRICTED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-12">
              <div className="orion-panel p-10 border-white/10 bg-black/10 backdrop-blur-xl space-y-8">
                <h3 className="text-[11px] uppercase tracking-[0.4em] text-white/20 font-bold">Session Metrics</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Uptime</span>
                    <span className="text-xl font-display text-white tracking-widest">99.9%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="w-[99.9%] h-full bg-orion-blue shadow-[0_0_10px_rgba(0,163,255,0.5)]" />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => navigate('/admin')}
                disabled={profile?.role !== 'Overseer' && profile?.role !== 'Root'}
                className="w-full btn-orion !py-6 flex items-center justify-center gap-4 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <Shield size={20} />
                <span className="text-[11px] font-bold tracking-[0.3em] uppercase">Access System Controls</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {systemStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-12 right-12 z-50"
          >
            <div className={`px-8 py-4 rounded-sm border backdrop-blur-xl shadow-2xl flex items-center gap-4 ${
              systemStatus.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' : 
              systemStatus.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
              'border-orion-blue/30 bg-orion-blue/10 text-orion-blue'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                systemStatus.type === 'error' ? 'bg-red-500' : 
                systemStatus.type === 'success' ? 'bg-green-500' :
                'bg-orion-blue'
              }`} />
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold">{systemStatus.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};
