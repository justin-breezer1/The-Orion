import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Skeleton, OrionLogo } from '../components/System';
import { Profile, getRoleLabel, mapClassificationToUI, canAccess } from '../types';
import { motion } from 'motion/react';
import { Database, Shield, Activity, Database as DatabaseIcon, User } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';

export const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ files: 0, folders: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "The Orion | Dashboard";
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
          .channel(`dashboard_profile_${user.id}`)
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
        console.error('Dashboard Profile Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;
      try {
        const { data, error } = await supabase
          .from('records')
          .select('type, classification');
        
        if (error) throw error;
        
        const accessibleData = data?.filter(r => canAccess(profile.role, r.classification)) || [];
        const filesCount = accessibleData.filter(r => r.type === 'file').length || 0;
        const foldersCount = accessibleData.filter(r => r.type === 'folder').length || 0;
        setStats({ files: filesCount, folders: foldersCount });
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-16 max-w-7xl mx-auto space-y-16 relative z-10">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12 md:gap-16">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout profile={profile}>
      <header className="h-16 border-b border-white/10 bg-black/10 backdrop-blur-md flex items-center justify-between px-8 relative z-20 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
        <div className="text-[10px] font-display tracking-[0.4em] uppercase font-bold text-white/60">
          Dashboard_Terminal
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="space-y-20">
            {/* Terminal Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-px w-12 bg-orion-blue/50" />
                  <span className="text-[10px] uppercase tracking-[0.6em] text-orion-blue font-bold">Terminal_Session_Active</span>
                </div>
                <div className="flex items-center gap-6 md:gap-10">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-orion-blue/10 border border-orion-blue/20 flex items-center justify-center text-orion-blue shrink-0 overflow-hidden shadow-[0_0_30px_rgba(0,163,255,0.2)]">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20" strokeWidth={1} />
                    )}
                  </div>
                  <h1 className="text-3xl sm:text-5xl md:text-7xl font-display font-light tracking-[0.1em] text-white uppercase break-all sm:break-normal">
                    {profile?.username}
                  </h1>
                </div>
              </div>
              <div className="text-right space-y-2">
                <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-bold">
                  Designation_Rank
                </p>
                <p className="text-2xl font-display font-light tracking-[0.2em] text-orion-blue uppercase">
                  {mapClassificationToUI(profile?.role)}
                </p>
              </div>
            </div>

            {/* System Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <StatusCard label="Core Status" value="Operational" color="text-green-400" />
              <StatusCard label="Vault Count" value={stats.folders.toString()} />
              <StatusCard label="Item Count" value={stats.files.toString()} />
              <StatusCard label="Uptime" value="99.99%" />
            </div>

            {/* Terminal Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <ShortcutCard 
                icon={<DatabaseIcon size={24} />} 
                label="Vault_Access" 
                onClick={() => navigate('/vaults')} 
              />
              <ShortcutCard 
                icon={<Activity size={24} />} 
                label="Communications" 
                onClick={() => navigate('/communications')} 
              />
              <ShortcutCard 
                icon={<Shield size={24} />} 
                label="System_Console" 
                onClick={() => navigate('/system')} 
                disabled={profile?.role !== 'Overseer' && profile?.role !== 'Root'}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const StatusCard: React.FC<{ label: string, value: string, color?: string }> = ({ label, value, color = "text-white" }) => (
  <div className="orion-panel p-8 space-y-4 !rounded-sm border-white/10 bg-black/10 backdrop-blur-md overflow-hidden">
    <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-bold truncate">{label}</p>
    <p className={`text-xl lg:text-2xl font-display font-light tracking-wider uppercase truncate ${color}`}>{value}</p>
  </div>
);

const ShortcutCard: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean }> = ({ icon, label, onClick, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className="orion-panel p-10 flex flex-col items-center gap-6 hover:border-orion-blue/40 transition-all group !rounded-sm bg-black/10 backdrop-blur-md disabled:opacity-30 disabled:cursor-not-allowed"
  >
    <div className="text-white/20 group-hover:text-orion-blue transition-all duration-500 group-hover:scale-110">
      {icon}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 group-hover:text-white transition-colors">{label}</span>
  </button>
);
