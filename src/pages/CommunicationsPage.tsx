import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Skeleton, OrionLogo } from '../components/System';
import { Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Search, User, Shield, Activity, Upload, Image as ImageIcon, FileText, Terminal, ChevronRight, AtSign } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { usePresence } from '../components/SyncProvider';
import { MentionText, extractMentions } from '../lib/mentions';

const CLOUDINARY_CLOUD_NAME = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

interface Message {
  id: string;
  chat_id?: string;
  sender_id: string;
  content: string;
  file_url?: string;
  type: 'text' | 'file' | 'image' | 'transmission';
  created_at: string;
  sender?: Profile;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
}

interface Chat {
  id: string;
  user1: string;
  user2: string;
  created_at: string;
  other_user?: Profile;
}

export const CommunicationsPage: React.FC = () => {
  const { onlineUsers } = usePresence();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'global' | 'p2p'>('global');
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [typingUsers, setTypingUsers] = useState<{[key: string]: string}>({});
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const usernameCache = useRef<{[key: string]: string}>({});
  console.log('Current Typing Users State:', typingUsers);
  const typingTimeoutRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getStatus = (userId?: string) => {
    if (!userId) return 'offline';
    return onlineUsers.includes(userId) ? 'online' : 'offline';
  };

  const StatusDot = ({ userId, lastSeen, showLabel = false }: { userId?: string, lastSeen?: string, showLabel?: boolean }) => {
    const status = getStatus(userId);
    const colors = {
      online: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
      offline: 'bg-white/20'
    };

    const formatLastSeen = (dateStr?: string) => {
      if (!dateStr) return 'OFFLINE';
      const date = new Date(dateStr);
      const diff = Date.now() - date.getTime();
      
      if (diff < 60000) return 'JUST NOW';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}M AGO`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}H AGO`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
    };

    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colors[status as keyof typeof colors]} transition-all duration-500`} />
        {showLabel && (
          <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-white/40">
            {status === 'online' ? 'ACTIVE' : `LAST SEEN: ${formatLastSeen(lastSeen)}`}
          </span>
        )}
      </div>
    );
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!profile) return;
    
    const chatId = activeTab === 'p2p' ? activeChat?.id : null;
    
    try {
      let query = supabase
        .from('typing_status')
        .select('id')
        .eq('user_id', profile.id);
      
      if (chatId) {
        query = query.eq('chat_id', chatId);
      } else {
        query = query.is('chat_id', null);
      }
      
      const { data: existing } = await query.limit(1).maybeSingle();

      if (existing) {
        await supabase
          .from('typing_status')
          .update({ is_typing: isTyping, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('typing_status')
          .insert([{
            user_id: profile.id,
            chat_id: chatId,
            is_typing: isTyping
          }]);
      }
    } catch (err) {
      console.error('Typing Status Error:', err);
    }
  };

  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      updateTypingStatus(true);
    }

    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    document.title = "The Orion | Communications";
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
          .channel(`comms_profile_${user.id}`)
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
        console.error('Communications Profile Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);

  // Fetch P2P Chats
  useEffect(() => {
    if (!profile) return;

    const fetchChats = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          user1_profile:profiles!chats_user1_fkey(*),
          user2_profile:profiles!chats_user2_fkey(*)
        `)
        .or(`user1.eq.${profile.id},user2.eq.${profile.id}`);

      if (error) {
        console.error('Error fetching chats:', error);
        return;
      }

      const formattedChats = data.map((chat: any) => ({
        ...chat,
        other_user: chat.user1 === profile.id ? chat.user2_profile : chat.user1_profile
      }));

      setChats(formattedChats);
    };

    fetchChats();

    // Subscribe to profile updates for users in chats
    const profileChannel = supabase
      .channel('public_profiles_status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      }, (payload) => {
        setChats(prev => prev.map(chat => {
          if (chat.other_user?.id === payload.new.id) {
            return { ...chat, other_user: payload.new as Profile };
          }
          return chat;
        }));
        
        if (activeChat?.other_user?.id === payload.new.id) {
          setActiveChat(prev => prev ? { ...prev, other_user: payload.new as Profile } : null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [profile, activeChat]);

  useEffect(() => {
    return () => {
      if (profile) {
        updateTypingStatus(false);
      }
    };
  }, [profile, activeTab, activeChat]);

  // Fetch Messages (Global or P2P)
  useEffect(() => {
    if (!profile) return;

    let channel: any = null;
    let typingChannel: any = null;

    const setupSubscription = async () => {
      // 1. Initial Load (Last 50)
      if (activeTab === 'global') {
        const { data, error } = await supabase
          .from('global_messages')
          .select('*, sender:profiles(*)')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) console.error('Error fetching global messages:', error);
        else setMessages((data || []).reverse());

        // 2. Subscribe to Global
        channel = supabase
          .channel('global_messages_channel')
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'global_messages' 
          }, async (payload) => {
            // Check if we already have this message (optimistic or otherwise)
            let senderData = profile?.id === payload.new.sender_id ? profile : null;
            if (!senderData) {
              const { data } = await supabase.from('profiles').select('*').eq('id', payload.new.sender_id).single();
              senderData = data;
            }
            
            const incomingMsg = { ...payload.new, sender: senderData, status: 'sent' } as Message;
            
            setMessages(prev => {
              // Check if this message ID already exists
              if (prev.some(m => m.id === incomingMsg.id)) return prev;

              // Check for optimistic match (same content, sender, and status 'sending')
              const optimisticIndex = prev.findIndex(m => 
                m.status === 'sending' && 
                m.content === incomingMsg.content && 
                m.sender_id === incomingMsg.sender_id
              );

              if (optimisticIndex !== -1) {
                const newMessages = [...prev];
                newMessages[optimisticIndex] = incomingMsg;
                return newMessages;
              }

              return [...prev, incomingMsg];
            });
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to global_messages');
            }
          });

        // 3. Subscribe to Global Typing
        typingChannel = supabase
          .channel('global_typing')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'typing_status'
          }, (payload: any) => {
            console.log('Global Typing Event Received:', payload);
            
            const data = payload.new || payload.old;
            if (!data) return;
            
            // Filter for global chat (chat_id is null) and ignore own events
            if (data.chat_id !== null || data.user_id === profile?.id) {
              return;
            }

            if (payload.eventType === 'DELETE' || !data.is_typing) {
              setTypingUsers(prev => {
                const next = { ...prev };
                delete next[data.user_id];
                return next;
              });
            } else {
              // Fetch username if not in cache
              const updateState = (username: string) => {
                setTypingUsers(prev => ({ ...prev, [data.user_id]: username }));
              };

              if (usernameCache.current[data.user_id]) {
                updateState(usernameCache.current[data.user_id]);
              } else {
                supabase
                  .from('profiles')
                  .select('username')
                  .eq('id', data.user_id)
                  .single()
                  .then(({ data: profileData }) => {
                    if (profileData?.username) {
                      usernameCache.current[data.user_id] = profileData.username;
                      updateState(profileData.username);
                    } else {
                      updateState('Unknown User');
                    }
                  });
              }
            }
          })
          .subscribe((status) => {
            console.log('Global Typing Subscription Status:', status);
          });
      } else if (activeChat) {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .eq('chat_id', activeChat.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) console.error('Error fetching messages:', error);
        else setMessages((data || []).reverse());

        // 2. Subscribe to P2P
        channel = supabase
          .channel(`chat_channel_${activeChat.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'messages', 
            filter: `chat_id=eq.${activeChat.id}` 
          }, async (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new;
              
              // If we are the receiver, mark as delivered
              if (newMsg.sender_id !== profile?.id && newMsg.status !== 'delivered') {
                await supabase
                  .from('messages')
                  .update({ status: 'delivered' })
                  .eq('id', newMsg.id);
              }

              let senderData = profile?.id === newMsg.sender_id ? profile : null;
              if (!senderData) {
                const { data } = await supabase.from('profiles').select('*').eq('id', newMsg.sender_id).single();
                senderData = data;
              }
              
              const incomingMsg = { ...newMsg, sender: senderData } as Message;

              setMessages(prev => {
                if (prev.some(m => m.id === incomingMsg.id)) return prev;

                const optimisticIndex = prev.findIndex(m => 
                  m.status === 'sending' && 
                  m.content === incomingMsg.content && 
                  m.sender_id === incomingMsg.sender_id
                );

                if (optimisticIndex !== -1) {
                  const newMessages = [...prev];
                  newMessages[optimisticIndex] = incomingMsg;
                  return newMessages;
                }

                return [...prev, incomingMsg];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedMsg = payload.new;
              setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(`Successfully subscribed to chat:${activeChat.id}`);
            }
          });

        // 3. Subscribe to P2P Typing
        typingChannel = supabase
          .channel(`typing_channel_${activeChat.id}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'typing_status',
            filter: `chat_id=eq.${activeChat.id}`
          }, (payload: any) => {
            console.log('P2P Typing Event Received:', payload);
            console.log('Current User ID:', profile?.id);
            
            const data = payload.new || payload.old;
            if (!data) return;

            if (data.user_id === profile?.id) {
              console.log('Ignoring own typing event');
              return;
            }

            if (payload.eventType === 'DELETE' || !data.is_typing) {
              console.log('User stopped typing (P2P):', data.user_id);
              setTypingUsers(prev => {
                const next = { ...prev };
                delete next[data.user_id];
                return next;
              });
            } else {
              console.log('User is typing (P2P):', data.user_id);
              
              // Fetch username if not in cache
              const updateState = (username: string) => {
                setTypingUsers(prev => ({ ...prev, [data.user_id]: username }));
              };

              if (usernameCache.current[data.user_id]) {
                updateState(usernameCache.current[data.user_id]);
              } else {
                supabase
                  .from('profiles')
                  .select('username')
                  .eq('id', data.user_id)
                  .single()
                  .then(({ data: profileData }) => {
                    if (profileData?.username) {
                      usernameCache.current[data.user_id] = profileData.username;
                      updateState(profileData.username);
                    } else {
                      updateState('Unknown User');
                    }
                  });
              }
            }
          })
          .subscribe((status) => {
            console.log(`P2P Typing Subscription Status (${activeChat.id}):`, status);
          });
      }
    };

    setupSubscription();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (typingChannel) supabase.removeChannel(typingChannel);
      setTypingUsers({});
    };
  }, [activeTab, activeChat, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendNotification = async (userId: string, type: 'message' | 'mention' | 'system', content: string, link?: string) => {
    if (!profile || userId === profile.id) return;
    await supabase.from('notifications').insert([{
      user_id: userId,
      type,
      content,
      link,
      sender_id: profile.id
    }]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    const messageContent = newMessage;
    setNewMessage('');
    
    // Reset typing status immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    updateTypingStatus(false);
    setShowMentionSuggestions(false);

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: profile.id,
      content: messageContent,
      type: 'text',
      created_at: new Date().toISOString(),
      sender: profile,
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      // Update last_seen on message send
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', profile.id);

      // Handle Mentions
      const mentions = extractMentions(messageContent);
      if (mentions.length > 0) {
        // Unique mentions
        const uniqueMentions = [...new Set(mentions)];
        for (const username of uniqueMentions) {
          const { data: mentionedUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();
          
          if (mentionedUser) {
            await sendNotification(
              mentionedUser.id, 
              'mention', 
              `${profile.username} mentioned you in ${activeTab === 'global' ? 'Global Feed' : 'Secure Line'}`,
              '/communications'
            );
          }
        }
      }

      if (activeTab === 'global') {
        const { error } = await supabase
          .from('global_messages')
          .insert([{
            sender_id: profile.id,
            content: messageContent,
            type: 'text'
          }]);
        if (error) throw error;
      } else if (activeChat) {
        const { error } = await supabase
          .from('messages')
          .insert([{
            chat_id: activeChat.id,
            sender_id: profile.id,
            content: messageContent,
            type: 'text',
            status: 'sent'
          }]);
        if (error) throw error;

        // Notify recipient of P2P message
        await sendNotification(
          activeChat.other_user?.id as string,
          'message',
          `${profile.username}: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
          '/communications'
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 10 * 1024 * 1024) {
      setSystemStatus({ message: 'TRANSMISSION REJECTED: PAYLOAD EXCEEDS 10MB LIMIT', type: 'error' });
      e.target.value = '';
      setTimeout(() => setSystemStatus(null), 5000);
      return;
    }

    setIsUploading(true);
    setSystemStatus({ message: 'INITIATING SECURE UPLOAD...', type: 'info' });
    try {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_CLOUD_NAME === 'MY_CLOUD_NAME') {
        throw new Error('CLOUDINARY_NOT_CONFIGURED');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Upload failed');
      }
      const data = await response.json();

      const type = data.resource_type === 'image' ? 'image' : 'file';

      // Update last_seen on file upload
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', profile.id);

      if (activeTab === 'global') {
        await supabase.from('global_messages').insert([{
          sender_id: profile.id,
          content: file.name,
          file_url: data.secure_url,
          type
        }]);
      } else if (activeChat) {
        await supabase.from('messages').insert([{
          chat_id: activeChat.id,
          sender_id: profile.id,
          content: file.name,
          file_url: data.secure_url,
          type,
          status: 'sent'
        }]);

        // Notify recipient of P2P file
        await sendNotification(
          activeChat.other_user?.id as string,
          'message',
          `${profile.username} sent a ${type}: ${file.name}`,
          '/communications'
        );
      }
    } catch (err: any) {
      console.error('Upload Error:', err);
      let errorMessage = 'TRANSMISSION FAILED: UPLOAD INTERRUPTED';
      
      if (err.message === 'CLOUDINARY_NOT_CONFIGURED') {
        errorMessage = 'CONFIGURATION ERROR: CLOUDINARY NOT SET UP IN SECRETS';
      } else if (err.message === 'Failed to fetch') {
        errorMessage = 'NETWORK ERROR: COULD NOT REACH UPLOAD SERVER';
      } else if (err.message) {
        errorMessage = `UPLOAD FAILED: ${err.message.toUpperCase()}`;
      }

      setSystemStatus({ message: errorMessage, type: 'error' });
    } finally {
      setIsUploading(false);
      setTimeout(() => setSystemStatus(null), 3000);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', profile?.id)
      .limit(5);

    if (error) console.error('Search Error:', error);
    else setSearchResults(data || []);
  };

  const openSecureLine = async (otherUser: Profile) => {
    if (!profile) return;

    // Check if chat exists
    const { data: existingChat, error: fetchError } = await supabase
      .from('chats')
      .select('*')
      .or(`and(user1.eq.${profile.id},user2.eq.${otherUser.id}),and(user1.eq.${otherUser.id},user2.eq.${profile.id})`)
      .single();

    if (existingChat) {
      setActiveChat({ ...existingChat, other_user: otherUser });
      setActiveTab('p2p');
      setSearchResults([]);
      setSearchQuery('');
      return;
    }

    // Create new chat
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert([{
        user1: profile.id < otherUser.id ? profile.id : otherUser.id,
        user2: profile.id < otherUser.id ? otherUser.id : profile.id
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating chat:', createError);
      return;
    }

    await sendNotification(
      otherUser.id,
      'system',
      `${profile.username} established a new secure line with you.`,
      '/communications'
    );

    const chatWithUser = { ...newChat, other_user: otherUser };
    setChats(prev => [...prev, chatWithUser]);
    setActiveChat(chatWithUser);
    setActiveTab('p2p');
    setSearchResults([]);
    setSearchQuery('');
  };

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
      <div className="flex h-full w-full overflow-hidden bg-transparent">
        {/* Left Panel: Channels & Search - Hidden on Mobile */}
        <aside className="hidden md:flex w-80 border-r border-white/10 bg-black/5 flex-col overflow-hidden">
          <div className="p-6 border-b border-white/10 space-y-6">
            <div className="flex items-center gap-3">
              <Activity size={14} className="text-orion-blue" />
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/60">
                Network_Status: <span className="text-green-500">🟢 {onlineUsers.length} ONLINE</span>
              </span>
            </div>
            
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orion-blue transition-all" size={12} />
              <input 
                type="text"
                placeholder="LOCATE USER..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && searchUsers()}
                className="w-full bg-white/5 border border-white/10 rounded-sm pl-10 pr-4 py-3 text-[9px] tracking-[0.3em] uppercase focus:outline-none focus:border-orion-blue/30 transition-all"
              />
              
              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-sm z-50 overflow-hidden shadow-2xl"
                  >
                    {searchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => openSecureLine(user)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-orion-blue/10 border border-orion-blue/20 flex items-center justify-center text-[10px] font-bold text-orion-blue relative">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : user.username[0].toUpperCase()}
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <StatusDot userId={user.id} lastSeen={user.last_seen} />
                          </div>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 group-hover:text-white">{user.username}</span>
                          <span className="text-[8px] text-white/20 uppercase tracking-tighter">{user.role}</span>
                        </div>
                        <ChevronRight size={12} className="ml-auto text-white/10 group-hover:text-orion-blue transition-all" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 space-y-8">
              <div className="space-y-4">
                <h3 className="px-4 text-[9px] uppercase tracking-[0.4em] text-white/20 font-bold">Mainframe_Feed</h3>
                <button 
                  onClick={() => { setActiveTab('global'); setActiveChat(null); }}
                  className={`w-full p-4 flex items-center gap-4 rounded-sm border transition-all ${activeTab === 'global' ? 'bg-orion-blue/5 border-orion-blue/20 text-white' : 'border-transparent text-white/40 hover:bg-white/5'}`}
                >
                  <Activity size={16} className={activeTab === 'global' ? 'text-orion-blue' : ''} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Network_Feed</span>
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="px-4 text-[9px] uppercase tracking-[0.4em] text-white/20 font-bold">Secure_Lines</h3>
                {chats.length > 0 ? chats.map(chat => (
                  <button 
                    key={chat.id}
                    onClick={() => { setActiveTab('p2p'); setActiveChat(chat); }}
                    className={`w-full p-4 flex items-center gap-4 rounded-sm border transition-all ${activeChat?.id === chat.id ? 'bg-orion-blue/5 border-orion-blue/20 text-white' : 'border-transparent text-white/40 hover:bg-white/5'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold relative">
                      {chat.other_user?.avatar_url ? (
                        <img src={chat.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : chat.other_user?.username[0].toUpperCase()}
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <StatusDot userId={chat.other_user?.id} lastSeen={chat.other_user?.last_seen} />
                      </div>
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider truncate w-full">{chat.other_user?.username}</span>
                      <span className="text-[8px] text-white/20 uppercase tracking-tighter">
                        {getStatus(chat.other_user?.id) === 'online' ? 'active' : 'inactive'}
                      </span>
                    </div>
                  </button>
                )) : (
                  <div className="px-4 py-8 text-center space-y-2">
                    <Shield size={24} className="mx-auto text-white/5" />
                    <p className="text-[8px] text-white/10 uppercase tracking-[0.2em]">No Active Secure Lines</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Panel: Chat View */}
        <div className="flex-1 flex flex-col bg-black/10 relative overflow-hidden h-full">
          {/* Mobile Top Bar */}
          <div className="md:hidden flex flex-col border-b border-white/10 bg-black/20 backdrop-blur-xl z-30">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <OrionLogo size={16} />
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/80">COMMS_MODULE</span>
                <span className="text-[7px] text-green-500/60 font-bold ml-1">🟢 {onlineUsers.length}</span>
              </div>
              <button 
                onClick={() => setShowMobileSearch(true)}
                className="p-2 bg-white/5 border border-white/10 rounded-sm text-white/40 hover:text-orion-blue transition-colors"
              >
                <Search size={14} />
              </button>
            </div>
            
            <div className="flex border-t border-white/5">
              <button 
                onClick={() => { setActiveTab('global'); setActiveChat(null); }}
                className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'global' ? 'text-orion-blue border-b-2 border-orion-blue bg-orion-blue/5' : 'text-white/30'}`}
              >
                Network Feed
              </button>
              <button 
                onClick={() => setActiveTab('p2p')}
                className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'p2p' ? 'text-orion-blue border-b-2 border-orion-blue bg-orion-blue/5' : 'text-white/30'}`}
              >
                Direct Channels
              </button>
            </div>
          </div>

          {/* Mobile Search Modal */}
          <AnimatePresence>
            {showMobileSearch && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl md:hidden flex flex-col"
              >
                <div className="p-6 border-b border-white/10 flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                    <input 
                      autoFocus
                      type="text"
                      placeholder="LOCATE USER..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyUp={(e) => e.key === 'Enter' && searchUsers()}
                      className="w-full bg-white/5 border border-white/10 rounded-sm pl-12 pr-4 py-4 text-[11px] tracking-[0.3em] uppercase focus:outline-none focus:border-orion-blue/30 transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => { setShowMobileSearch(false); setSearchResults([]); setSearchQuery(''); }}
                    className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {searchResults.length > 0 ? searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => { openSecureLine(user); setShowMobileSearch(false); }}
                      className="w-full p-5 flex items-center gap-5 bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-orion-blue/10 border border-orion-blue/20 flex items-center justify-center text-[12px] font-bold text-orion-blue relative">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : user.username[0].toUpperCase()}
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <StatusDot userId={user.id} lastSeen={user.last_seen} />
                        </div>
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-white">{user.username}</span>
                        <span className="text-[9px] text-white/30 uppercase tracking-tighter">{user.role}</span>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-orion-blue" />
                    </button>
                  )) : searchQuery && (
                    <div className="text-center py-20 space-y-4">
                      <Search size={32} className="mx-auto text-white/5" />
                      <p className="text-[10px] text-white/20 uppercase tracking-[0.3em]">No Users Found in Sector</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Switcher for Mobile */}
          {activeTab === 'p2p' && !activeChat ? (
            /* Mobile Direct Channels List */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 md:hidden">
              <h3 className="px-2 text-[9px] uppercase tracking-[0.4em] text-white/20 font-bold mb-4">Active Secure Lines</h3>
              {chats.length > 0 ? chats.map(chat => (
                <button 
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className="w-full p-5 flex items-center gap-5 bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 transition-all"
                >
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[12px] font-bold relative">
                      {chat.other_user?.avatar_url ? (
                        <img src={chat.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : chat.other_user?.username[0].toUpperCase()}
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <StatusDot userId={chat.other_user?.id} lastSeen={chat.other_user?.last_seen} />
                      </div>
                    </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[12px] font-bold uppercase tracking-wider truncate w-full text-white">{chat.other_user?.username}</span>
                    <span className="text-[9px] text-white/30 uppercase tracking-tighter">
                      {getStatus(chat.other_user?.id) === 'online' ? 'active' : 'inactive'}
                    </span>
                  </div>
                  <ChevronRight size={14} className="ml-auto text-white/20" />
                </button>
              )) : (
                <div className="py-20 text-center space-y-4">
                  <Shield size={32} className="mx-auto text-white/5" />
                  <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">No Active Secure Lines</p>
                </div>
              )}
            </div>
          ) : (
            /* Chat View (Global or Active P2P) */
            <>
              {/* Chat Header */}
              <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-black/20 backdrop-blur-md relative z-20 shrink-0">
                <div className="flex items-center gap-3 md:gap-4">
                  {activeTab === 'p2p' && activeChat && (
                    <button 
                      onClick={() => setActiveChat(null)}
                      className="md:hidden p-2 -ml-2 text-white/40 hover:text-white"
                    >
                      <ChevronRight size={18} className="rotate-180" />
                    </button>
                  )}
                  <div className="p-2 bg-white/5 border border-white/10 rounded-sm hidden sm:block">
                    {activeTab === 'global' ? <Activity size={16} className="text-orion-blue" /> : <Shield size={16} className="text-orion-blue" />}
                  </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] md:text-[11px] font-display tracking-[0.2em] md:tracking-[0.3em] uppercase font-bold text-white truncate max-w-[150px] sm:max-w-none">
                        {activeTab === 'global' ? 'NETWORK_FEED' : `SECURE_LINE: ${activeChat?.other_user?.username}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] md:text-[8px] text-white/20 uppercase tracking-[0.2em] font-bold">
                          {activeTab === 'global' ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-green-500">🟢</span> {onlineUsers.length} USERS ONLINE
                            </span>
                          ) : 'Point_to_Point_Encryption_Active'}
                        </span>
                        {activeTab === 'p2p' && activeChat && (
                          <StatusDot userId={activeChat.other_user?.id} lastSeen={activeChat.other_user?.last_seen} showLabel />
                        )}
                      </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-orion-blue animate-pulse shadow-[0_0_10px_rgba(0,242,255,0.5)]" />
                  <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-orion-blue font-bold hidden xs:block">Link_Established</span>
                </div>
              </header>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 custom-scrollbar scroll-smooth">
                {messages.map((msg, i) => {
                  const isSystem = msg.type === 'transmission';
                  const isOwn = msg.sender_id === profile?.id;
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="bg-orion-blue/5 border border-orion-blue/20 px-4 md:px-6 py-2 md:py-3 rounded-sm max-w-[90%]">
                          <p className="text-[8px] md:text-[9px] text-orion-blue font-bold uppercase tracking-[0.4em] mb-1">[SYSTEM_TRANSMISSION]</p>
                          <p className="text-[9px] md:text-[10px] text-white/60 tracking-wider leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex flex-col space-y-2 ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 md:gap-3">
                        {!isOwn && (
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[7px] md:text-[8px] font-bold">
                            {msg.sender?.avatar_url ? (
                              <img src={msg.sender.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : msg.sender?.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-[8px] md:text-[9px] text-white/20 font-bold tracking-widest uppercase flex items-center gap-1">
                          [{time}] {msg.sender?.username}:
                          {isOwn && activeTab === 'p2p' && (
                            <span className="text-orion-blue/60 ml-1">
                              {msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : ''}
                            </span>
                          )}
                        </span>
                      </div>
                      
                      <div className={`max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-sm border transition-opacity ${isOwn ? 'bg-orion-blue/5 border-orion-blue/10' : 'bg-white/5 border-white/10'} ${msg.status === 'sending' ? 'opacity-40 animate-pulse' : ''}`}>
                        {msg.type === 'text' && (
                          <MentionText 
                            text={msg.content} 
                            onMentionClick={(username) => {
                              // Find user and open chat
                              supabase.from('profiles').select('*').eq('username', username).single().then(({ data }) => {
                                if (data) openSecureLine(data);
                              });
                            }}
                            className="text-[10px] md:text-[11px] text-white/80 tracking-wide leading-relaxed whitespace-pre-wrap"
                          />
                        )}
                        {msg.type === 'image' && msg.file_url && (
                          <div className="space-y-3">
                            <p className="text-[8px] md:text-[9px] text-orion-blue/60 font-bold uppercase tracking-[0.2em]">Visual_Record_Detected</p>
                            <div className="rounded-sm overflow-hidden border border-white/10">
                              <img src={msg.file_url} alt="" className="w-full max-h-64 md:max-h-96 object-cover opacity-80 hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                            </div>
                            <p className="text-[8px] md:text-[9px] text-white/40 italic">{msg.content}</p>
                          </div>
                        )}
                        {msg.type === 'file' && msg.file_url && (
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2 md:p-3 bg-white/5 border border-white/10 rounded-sm">
                              <FileText size={16} className="text-orion-blue" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] md:text-[10px] font-bold text-white/80 uppercase tracking-wider truncate max-w-[150px]">{msg.content}</span>
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="text-[7px] md:text-[8px] text-orion-blue hover:underline uppercase tracking-widest mt-1">Download_Intel_Drop</a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Input Area */}
              <div className="p-4 md:p-8 border-t border-white/10 bg-black/20 shrink-0 relative">
                {/* Typing Indicator */}
                <AnimatePresence>
                  {Object.keys(typingUsers).length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute -top-6 left-8 flex items-center gap-2"
                    >
                      <div className="flex gap-1">
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity }} className="w-1 h-1 rounded-full bg-orion-blue" />
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1 h-1 rounded-full bg-orion-blue" />
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1 h-1 rounded-full bg-orion-blue" />
                      </div>
                      <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-white/30 italic">
                        {Object.keys(typingUsers).length > 1 
                          ? `${Object.values(typingUsers).join(', ')} are typing in ${activeTab === 'global' ? 'Network Feed' : 'Secure Line'}...` 
                          : `${Object.values(typingUsers)[0]} is typing in ${activeTab === 'global' ? 'Network Feed' : 'Secure Line'}...`}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 md:gap-4">
                  {/* Mention Suggestions Dropdown */}
                  <AnimatePresence>
                    {showMentionSuggestions && mentionSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute bottom-full left-0 right-0 mb-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-sm z-50 overflow-hidden shadow-2xl max-h-48 overflow-y-auto custom-scrollbar"
                      >
                        <div className="p-2 border-b border-white/10 bg-white/5 flex items-center gap-2">
                          <AtSign size={10} className="text-orion-blue" />
                          <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-white/40">Mention_Protocol_Active</span>
                        </div>
                        {mentionSuggestions.map(user => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              const before = newMessage.substring(0, mentionCursorPos);
                              const after = newMessage.substring(newMessage.indexOf(' ', mentionCursorPos) === -1 ? newMessage.length : newMessage.indexOf(' ', mentionCursorPos));
                              setNewMessage(`${before}${user.username}${after} `);
                              setShowMentionSuggestions(false);
                            }}
                            className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left group"
                          >
                            <div className="w-6 h-6 rounded-full bg-orion-blue/10 border border-orion-blue/20 flex items-center justify-center text-[8px] font-bold text-orion-blue">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : user.username[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-white/80 group-hover:text-white">{user.username}</span>
                              <span className="text-[7px] text-white/20 uppercase tracking-tighter">{user.role}</span>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-2">
                    <label className="p-2.5 md:p-3 bg-white/5 border border-white/10 rounded-sm text-white/20 hover:text-orion-blue hover:border-orion-blue/30 transition-all cursor-pointer group">
                      <Upload size={14} className="group-hover:scale-110 transition-transform md:w-4 md:h-4" />
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                  </div>
                  
                  <div className="flex-1 relative">
                    <Terminal size={12} className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/20 hidden xs:block" />
                    <input 
                      type="text"
                      placeholder="EXECUTE..."
                      value={newMessage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewMessage(val);
                        handleTyping();

                        // Detect @ for mentions
                        const cursorPos = e.target.selectionStart || 0;
                        const textBeforeCursor = val.substring(0, cursorPos);
                        const lastAtPos = textBeforeCursor.lastIndexOf('@');

                        if (lastAtPos !== -1 && (lastAtPos === 0 || textBeforeCursor[lastAtPos - 1] === ' ')) {
                          const query = textBeforeCursor.substring(lastAtPos + 1);
                          if (!query.includes(' ')) {
                            setMentionSearchQuery(query);
                            setMentionCursorPos(lastAtPos + 1);
                            setShowMentionSuggestions(true);
                            
                            // Fetch suggestions
                            supabase.from('profiles')
                              .select('*')
                              .ilike('username', `${query}%`)
                              .neq('id', profile?.id)
                              .limit(5)
                              .then(({ data }) => {
                                setMentionSuggestions(data || []);
                              });
                          } else {
                            setShowMentionSuggestions(false);
                          }
                        } else {
                          setShowMentionSuggestions(false);
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-sm pl-4 xs:pl-10 md:pl-12 pr-4 py-3 md:py-4 text-[10px] md:text-[11px] tracking-[0.1em] md:tracking-[0.2em] uppercase focus:outline-none focus:border-orion-blue/30 transition-all placeholder:text-white/10"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={!newMessage.trim() || isUploading}
                    className="p-3 md:p-4 bg-orion-blue/10 border border-orion-blue/20 rounded-sm text-orion-blue hover:bg-orion-blue/20 hover:border-orion-blue/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform md:w-[18px] md:h-[18px]" />
                  </button>

                  {isUploading && (
                    <div className="absolute -top-4 left-0 right-0 h-0.5 bg-white/5 overflow-hidden">
                      <motion.div 
                        className="h-full bg-orion-blue shadow-[0_0_10px_rgba(0,242,255,0.5)]"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  )}
                </form>
              </div>
            </>
          )}
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
