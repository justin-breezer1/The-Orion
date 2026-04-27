import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingOverlay, SystemMessage } from './System';
import { Role } from '../types';
import { motion } from 'motion/react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface PresenceContextType {
  onlineUsers: string[];
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: [] });

export const usePresence = () => useContext(PresenceContext);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncing, setSyncing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const lastHeartbeatRef = useRef<number>(0);
  const presenceChannelRef = useRef<any>(null);

  const updateLastSeen = async (userId: string) => {
    const now = Date.now();
    // Only update if it's been more than 25 seconds since last update (to be safe within 30s window)
    if (now - lastHeartbeatRef.current < 25000) return;

    try {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);
      
      lastHeartbeatRef.current = now;
    } catch (err) {
      console.error('Heartbeat Error:', err);
    }
  };

  useEffect(() => {
    let heartbeatInterval: any;

    const syncProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          setSyncing(false);
          return;
        }

        const user = session.user;

        // Start heartbeat (Hybrid approach: still update last_seen for historical data)
        updateLastSeen(user.id);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => updateLastSeen(user.id), 30000);

        // Realtime Presence Setup
        // 1. Remove existing channel if it exists
        if (presenceChannelRef.current) {
          supabase.removeChannel(presenceChannelRef.current);
          presenceChannelRef.current = null;
        }

        // 2. CREATE channel
        const channel = supabase.channel('online-users', {
          config: {
            presence: {
              key: user.id,
            },
          },
        });

        // 3. ADD listeners FIRST (IMPORTANT)
        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const onlineIds = Object.keys(state);
          setOnlineUsers(onlineIds);
        });

        // 4. THEN subscribe
        channel.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        });

        presenceChannelRef.current = channel;

        // 1. Check if profile exists
        const { data: profile, error: profileFetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileFetchError) {
          console.error('Profile Fetch Error:', profileFetchError);
          setError('FAILED TO SYNCHRONIZE IDENTITY');
          setSyncing(false);
          return;
        }

        // 2. If profile doesn't exist, create it from metadata
        if (!profile) {
          const metadata = user.user_metadata;
          const username = metadata.username;
          const role = metadata.role as Role;
          const inviteToken = metadata.invite_token;

          if (username && role) {
            console.log('Syncing profile for user:', user.id);
            
            const { error: upsertError } = await supabase
              .from('profiles')
              .upsert([
                {
                  id: user.id,
                  username,
                  role,
                  last_seen: new Date().toISOString()
                },
              ]);

            if (upsertError) {
              console.error('Profile Sync Upsert Error:', upsertError);
              if (upsertError.code === '42501') {
                setError('SECURITY PROTOCOL: AUTHORIZATION FAILURE DURING IDENTITY SYNCHRONIZATION');
              } else {
                setError('IDENTITY INITIALIZATION FAILED');
              }
              setSyncing(false);
              return;
            }

            // 3. Mark invite as used if token exists
            if (inviteToken) {
              await supabase
                .from('invites')
                .update({ used: true })
                .eq('token', inviteToken);
            }
          }
        }
      } catch (err: any) {
        console.error('Sync Error:', err);
        if (err.message === 'Failed to fetch') {
          setError('NETWORK FAILURE: CONSTELLATION UNREACHABLE');
        } else {
          setError('SYNCHRONIZATION SEQUENCE INTERRUPTED');
        }
      } finally {
        setSyncing(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (presenceChannelRef.current) {
          supabase.removeChannel(presenceChannelRef.current);
          presenceChannelRef.current = null;
          setOnlineUsers([]);
        }
      } else {
        syncProfile();
      }
    };

    const handleBeforeUnload = () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    syncProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        syncProfile();
      } else if (event === 'SIGNED_OUT') {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (presenceChannelRef.current) {
          supabase.removeChannel(presenceChannelRef.current);
          presenceChannelRef.current = null;
        }
        setOnlineUsers([]);
      }
    });

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, []);

  if (syncing) {
    return <LoadingOverlay message="Synchronizing Identity" />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full orion-panel p-8 text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
              <ShieldAlert className="text-red-600" size={32} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extralight tracking-[0.2em] text-black">SYNC ERROR</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-orion-blue/60">Synchronization Sequence Interrupted</p>
          </div>
          
          <SystemMessage type="error">{error}</SystemMessage>
          
          <button 
            onClick={() => window.location.reload()} 
            className="btn-orion w-full flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Retry Sequence
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
};
