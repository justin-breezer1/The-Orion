import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LoadingOverlay, SystemMessage, ConfirmModal, OrionLogo } from '../components/System';
import { Role, OrionVaultItem, getRoleLabel, mapClassificationToUI, mapUIToClassification, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Key, Trash2, FileUp, Paperclip, X, Check, Copy, Settings, Image as ImageIcon, Activity, Shield, Users, Server } from 'lucide-react';

const CLOUDINARY_CLOUD_NAME = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const AdminPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [vaultItems, setVaultItems] = useState<OrionVaultItem[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const navigate = useNavigate();

  // Vault Item Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [classification, setClassification] = useState<Role>('Overseer');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [savingItem, setSavingItem] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Invite Form
  const [assignedRole, setAssignedRole] = useState<Role>('Overseer');
  const [phrase, setPhrase] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);

  // Edit State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [updatingItem, setUpdatingItem] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [systemStatus, setSystemStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [metrics, setMetrics] = useState({
    latency: 0,
    activeSessions: 0,
    systemLoad: 0.04
  });

  // Delete State
  const [deleteModal, setDeleteModal] = useState<{ 
    isOpen: boolean; 
    type: 'item' | 'attachment'; 
    item: OrionVaultItem | null; 
    attachmentUrl?: string 
  }>({ 
    isOpen: false, 
    type: 'item', 
    item: null 
  });

  const [userId, setUserId] = useState<string | null>(null);

  const uploadToCloudinary = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_CLOUD_NAME === 'MY_CLOUD_NAME') {
        reject(new Error('CONFIGURATION ERROR: CLOUDINARY NOT SET UP IN SECRETS'));
        return;
      }

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } else {
          const errorData = JSON.parse(xhr.responseText || '{}');
          reject(new Error(errorData.error?.message || 'UPLOAD FAILED: CONNECTION INTERRUPTED'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('NETWORK ERROR: COULD NOT REACH UPLOAD SERVER'));
      };

      xhr.send(formData);
    });
  };

  useEffect(() => {
    document.title = "The Orion | Overseer Terminal";
  }, []);

  useEffect(() => {
    const checkRoot = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setUserId(user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData?.role !== 'Overseer' && profileData?.role !== 'Root') {
        navigate('/dashboard');
        return;
      }

      if (profileData) {
        setProfile(profileData);
        const mapped = mapClassificationToUI(profileData.role);
        setClassification(mapped as Role);
        setAssignedRole(mapped as Role);
      }

      fetchData();
    };

    checkRoot();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const startTime = performance.now();
      const [recordsRes, invitesRes, profilesRes] = await Promise.all([
        supabase.from('records').select('*').order('created_at', { ascending: false }),
        supabase.from('invites').select('*').order('used', { ascending: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
      ]);
      const endTime = performance.now();

      if (recordsRes.error) throw recordsRes.error;
      if (invitesRes.error) throw invitesRes.error;

      setVaultItems(recordsRes.data || []);
      setInvites(invitesRes.data || []);
      
      setMetrics(prev => ({
        ...prev,
        latency: Math.round(endTime - startTime),
        activeSessions: profilesRes.count || 0,
        systemLoad: Number((Math.random() * 0.08 + 0.01).toFixed(2))
      }));
    } catch (err: any) {
      console.error('Admin Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    
    const interval = setInterval(() => {
      const updateMetrics = async () => {
        const start = performance.now();
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        const end = performance.now();
        
        setMetrics({
          latency: Math.round(end - start),
          activeSessions: count || 0,
          systemLoad: Number((Math.random() * 0.08 + 0.01).toFixed(2))
        });
      };
      updateMetrics();
    }, 10000);

    return () => clearInterval(interval);
  }, [loading]);

  const removePendingAttachment = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileUrls = (urls: any): string[] => {
    if (!urls) return [];
    if (Array.isArray(urls)) return urls;
    if (typeof urls === 'string') {
      try {
        const parsed = JSON.parse(urls);
        return Array.isArray(parsed) ? parsed : [urls];
      } catch {
        return [urls];
      }
    }
    return [];
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingItem(true);
    setUploadProgress(0);
    setSystemStatus(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('unauthorized');

      const itemId = crypto.randomUUID();
      let coverUrl = '';
      const fileUrls: string[] = [];

      // Upload Cover
      if (coverFile) {
        setSystemStatus({ message: 'UPLOADING COVER PAGE...', type: 'info' });
        coverUrl = await uploadToCloudinary(coverFile);
      }

      // Upload Multiple Attachments
      if (attachmentFiles.length > 0) {
        for (let i = 0; i < attachmentFiles.length; i++) {
          setSystemStatus({ message: `UPLOADING ATTACHMENT ${i + 1}/${attachmentFiles.length}...`, type: 'info' });
          const url = await uploadToCloudinary(attachmentFiles[i]);
          fileUrls.push(url);
        }
      }

      const backendValue = mapUIToClassification(classification);

      const { error: dbError } = await supabase.from('records').insert([{ 
        id: itemId,
        title, 
        content, 
        classification: backendValue,
        cover_url: coverUrl || null,
        file_urls: fileUrls,
        owner_id: userId,
        type: 'file',
        parent_id: null
      }]);

      if (dbError) throw dbError;

      setSystemStatus({ message: 'ITEM COMMITTED TO CONSTELLATION NETWORK', type: 'success' });
      setTitle('');
      setContent('');
      setCoverFile(null);
      setAttachmentFiles([]);
      fetchData();
    } catch (err: any) {
      console.error('Commit Error:', err);
      setSystemStatus({ message: err.message || 'UPLOAD FAILED: CONNECTION INTERRUPTED', type: 'error' });
    } finally {
      setSavingItem(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteItem = (item: OrionVaultItem) => {
    setDeleteModal({ isOpen: true, type: 'item', item });
  };

  const confirmDelete = async () => {
    const { type, item, attachmentUrl } = deleteModal;
    if (!item) return;

    try {
      if (type === 'item') {
        await supabase.from('records').delete().eq('id', item.id);
      } else if (type === 'attachment' && attachmentUrl) {
        setUpdatingItem(true);
        const currentUrls = getFileUrls(item.file_urls);
        const updatedUrls = currentUrls.filter(u => u !== attachmentUrl);
        const { error } = await supabase
          .from('records')
          .update({ file_urls: updatedUrls })
          .eq('id', item.id);
        if (error) throw error;
      }
      fetchData();
    } catch (err) {
      console.error('Deletion/Removal Error:', err);
    } finally {
      setDeleteModal({ isOpen: false, type: 'item', item: null });
      setUpdatingItem(false);
    }
  };

  const handleRemoveAttachment = (item: OrionVaultItem, urlToRemove: string) => {
    setDeleteModal({ isOpen: true, type: 'attachment', item, attachmentUrl: urlToRemove });
  };

  const handleAddAttachments = async (item: OrionVaultItem) => {
    if (newAttachments.length === 0) return;
    setUpdatingItem(true);
    setUploadProgress(0);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < newAttachments.length; i++) {
        setSystemStatus({ message: `UPLOADING ATTACHMENT ${i + 1}/${newAttachments.length}...`, type: 'info' });
        const url = await uploadToCloudinary(newAttachments[i]);
        uploadedUrls.push(url);
      }

      const currentUrls = getFileUrls(item.file_urls);
      const updatedUrls = [...currentUrls, ...uploadedUrls];
      const { error } = await supabase
        .from('records')
        .update({ file_urls: updatedUrls })
        .eq('id', item.id);

      if (error) throw error;
      setSystemStatus({ message: 'ATTACHMENTS ADDED TO CONSTELLATION NETWORK', type: 'success' });
      setNewAttachments([]);
      setEditingItemId(null);
      fetchData();
    } catch (err: any) {
      console.error('Upload Error:', err);
      setSystemStatus({ message: err.message || 'UPLOAD FAILED: CONNECTION INTERRUPTED', type: 'error' });
    } finally {
      setUpdatingItem(false);
      setUploadProgress(0);
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const backendValue = mapUIToClassification(assignedRole);
    const { error } = await supabase.from('invites').insert([{ token, phrase, assigned_role: backendValue, used: false }]);
    
    if (!error) {
      const link = `${window.location.origin}/invite?token=${token}`;
      setGeneratedLink(link);
      fetchData();
    }
    setGeneratingInvite(false);
  };

  if (loading) return <LoadingOverlay message="Accessing System Controls" />;

  return (
    <div className="min-h-screen p-4 md:p-12 max-w-7xl mx-auto space-y-12 md:space-y-24 relative z-10 custom-scrollbar">
      {/* Background elements - Handled globally in App.tsx */}

      <AnimatePresence>
        {systemStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-12 right-12 z-50"
          >
            <SystemMessage type={systemStatus.type === 'error' ? 'error' : 'info'}>{systemStatus.message}</SystemMessage>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 md:gap-12 border-b border-white/10 pb-10 md:pb-20 relative">
        <div className="w-full md:w-auto space-y-10">
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-[11px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-white/30 hover:text-white transition-all flex items-center gap-5 group font-bold"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-3 transition-transform" />
            Return to Dashboard
          </button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-6 md:gap-10"
          >
            <div className="space-y-3 w-full">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:gap-x-6">
                <div className="flex items-center gap-[0.3em] text-2xl sm:text-4xl md:text-6xl font-display font-light tracking-[0.1em] md:tracking-[0.2em] glow-text">
                  <span className="orion-text">THE</span>
                  <OrionLogo className="w-[1em] h-[1em]" />
                  <span className="orion-text">RION</span>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  <span className="text-2xl sm:text-4xl md:text-6xl font-display font-light tracking-[0.1em] md:tracking-[0.2em] opacity-10">/</span>
                  <span className="text-2xl sm:text-4xl md:text-6xl font-display font-light tracking-[0.1em] md:tracking-[0.2em] orion-text glow-text">
                    SYSTEM CONTROLS
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] md:tracking-[0.4em] font-bold">Administrative Interface <span className="opacity-20 mx-4">//</span> Level 4 Access</p>
            </div>
          </motion.div>
        </div>

        <div className="flex gap-8 md:gap-16 relative z-10">
          <div className="text-right space-y-2 md:space-y-3">
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold">Network Status</p>
            <div className="flex items-center gap-4 justify-end">
              <span className="text-[11px] md:text-[12px] text-green-400 font-mono tracking-[0.1em] text-right font-bold">ENCRYPTED</span>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.6)]" />
            </div>
          </div>
          <div className="text-right space-y-2 md:space-y-3">
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold">Active Nodes</p>
            <p className="text-[11px] md:text-[12px] text-white/60 font-mono tracking-[0.1em] text-right font-bold">{vaultItems.length + invites.length} ACTIVE</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* System Status Dashboard */}
        <section className="lg:col-span-2 space-y-12">
          <div className="flex items-center gap-8">
            <h2 className="text-[12px] font-display tracking-[0.3em] md:tracking-[0.4em] text-white/30 uppercase font-bold">System Integrity Dashboard</h2>
            <div className="h-px flex-grow bg-white/5" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              { label: 'Network Latency', value: `${metrics.latency}ms`, status: metrics.latency < 100 ? 'Optimal' : 'Delayed', icon: Activity, color: metrics.latency < 100 ? 'text-green-400' : 'text-yellow-400' },
              { label: 'Encryption Strength', value: '256-bit', status: 'Maximum', icon: Shield, color: 'text-blue-400' },
              { label: 'Active Sessions', value: metrics.activeSessions.toString(), status: 'Stable', icon: Users, color: 'text-purple-400' },
              { label: 'System Load', value: `${metrics.systemLoad}%`, status: 'Minimal', icon: Server, color: 'text-orange-400' }
            ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="orion-panel p-6 md:p-10 space-y-6 md:space-y-8 border-white/20 hover:border-white/40 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div className={`p-4 rounded-2xl bg-black/10 border border-black/5 ${stat.color} group-hover:scale-110 transition-transform shadow-inner`}>
                      <stat.icon size={24} />
                    </div>
                    <span className={`text-[10px] px-4 py-1.5 rounded-full bg-black/10 border border-black/5 font-bold tracking-widest shadow-inner ${stat.color}`}>{stat.status}</span>
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold">{stat.label}</p>
                    <p className="text-2xl md:text-4xl font-light tracking-widest text-white font-display">{stat.value}</p>
                  </div>
                </motion.div>
            ))}
          </div>
        </section>

        {/* Vault Item Creation */}
        <section className="space-y-12">
          <div className="flex items-center gap-8">
            <h2 className="text-[12px] font-display tracking-[0.3em] md:tracking-[0.4em] text-white/30 uppercase font-bold">Initialize New Vault Item</h2>
            <div className="h-px flex-grow bg-white/5" />
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && handleCreateItem(e as any)}
            className="orion-panel p-6 md:p-16 space-y-8 md:space-y-12 border-white/30 glow-border"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-3 md:space-y-5">
                <label className="text-[11px] uppercase tracking-[0.3em] md:tracking-[0.4em] text-white/40 ml-1 font-bold">Item Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="orion-input w-full !py-4 md:!py-6 !px-6 md:!px-8"
                  placeholder="ENTER CLASSIFIED TITLE"
                  required
                />
              </div>
              <div className="space-y-3 md:space-y-5">
                <label className="text-[11px] uppercase tracking-[0.3em] md:tracking-[0.4em] text-white/40 ml-1 font-bold">Classification Level</label>
                <div className="relative">
                  <select 
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as Role)}
                    className="orion-input w-full appearance-none !py-4 md:!py-6 !px-6 md:!px-8 pr-16"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Apex">Apex</option>
                    <option value="Overseer">Overseer</option>
                  </select>
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                    <ArrowLeft size={16} className="-rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 md:space-y-5">
              <label className="text-[11px] uppercase tracking-[0.3em] md:tracking-[0.4em] text-white/40 ml-1 font-bold">Data Content</label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="orion-input w-full min-h-[200px] md:min-h-[260px] resize-none leading-relaxed !p-6 md:!p-10"
                placeholder="ENTER ENCRYPTED DATA..."
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              <div className="space-y-6">
                <label className="text-[11px] uppercase tracking-[0.6em] text-white/40 ml-1 font-bold">Cover Page</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      setCoverFile(e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label 
                    htmlFor="cover-upload"
                    className="flex items-center justify-center gap-5 p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all text-[11px] uppercase tracking-[0.5em] text-white/40 hover:text-white font-bold group-hover:border-white/20 shadow-inner"
                  >
                    <ImageIcon size={20} />
                    {coverFile ? 'Change Visual Data' : 'Select Visual Data'}
                  </label>
                </div>
                {coverFile && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-between items-center p-5 rounded-2xl bg-black/10 border border-black/5"
                  >
                    <div className="flex items-center gap-5 truncate">
                      <ImageIcon size={16} className="text-white/20" />
                      <span className="text-[10px] text-white/60 truncate uppercase tracking-wider font-bold">{coverFile.name}</span>
                    </div>
                    <button onClick={() => setCoverFile(null)} className="text-red-500/40 hover:text-red-500 transition-colors p-2"><X size={18} /></button>
                  </motion.div>
                )}
              </div>

              <div className="space-y-6">
                <label className="text-[11px] uppercase tracking-[0.6em] text-white/40 ml-1 font-bold">Attachments</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setAttachmentFiles(prev => [...prev, ...files]);
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="attachment-upload"
                  />
                  <label 
                    htmlFor="attachment-upload"
                    className="flex items-center justify-center gap-5 p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all text-[11px] uppercase tracking-[0.5em] text-white/40 hover:text-white font-bold group-hover:border-white/20 shadow-inner"
                  >
                    <Plus size={20} />
                    Add Binary Data
                  </label>
                </div>
              </div>
            </div>

            {attachmentFiles.length > 0 && (
              <div className="space-y-4 max-h-56 overflow-y-auto pr-4 custom-scrollbar">
                {attachmentFiles.map((f, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <Paperclip size={14} className="text-white/20" />
                      <span className="text-[9px] text-white/40 truncate uppercase tracking-wider font-medium">{f.name}</span>
                    </div>
                    <button onClick={() => removePendingAttachment(i)} className="text-red-400/40 hover:text-red-400 transition-colors p-2"><X size={16} /></button>
                  </motion.div>
                ))}
              </div>
            )}

            {(savingItem || updatingItem) && uploadProgress > 0 && (
              <div className="space-y-5 pt-6 border-t border-white/5">
                <div className="flex justify-between text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold">
                  <span>Transmission in progress</span>
                  <span className="text-white/60">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    className="bg-white/40 h-full shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button 
              type="button" 
              onClick={handleCreateItem as any}
              disabled={savingItem} 
              className="btn-orion w-full mt-10 flex items-center justify-center gap-4 shadow-2xl !py-6"
            >
              <FileUp size={22} />
              <span className="text-[12px]">{savingItem ? 'TRANSMITTING DATA...' : 'COMMIT TO CONSTELLATION NETWORK'}</span>
            </button>
          </motion.div>
        </section>

        {/* Invite Generation */}
        <section className="space-y-12">
          <div className="flex items-center gap-8">
            <h2 className="text-[12px] font-display tracking-[0.3em] md:tracking-[0.6em] text-white/30 uppercase font-bold">Generate Entry Token</h2>
            <div className="h-px flex-grow bg-white/5" />
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateInvite()}
            className="glass-panel p-6 md:p-12 space-y-8 md:space-y-10 border-white/10 glow-border"
          >
            <div className="space-y-3 md:space-y-4">
              <label className="text-[10px] uppercase tracking-[0.3em] md:tracking-[0.5em] text-white/30 ml-1 font-bold">Assigned Role</label>
              <div className="relative">
                <select 
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value as Role)}
                  className="orion-input w-full appearance-none !py-4 md:!py-5 !px-6 pr-12"
                >
                  <option value="Verified">Verified</option>
                  <option value="Apex">Apex</option>
                  <option value="Overseer">Overseer</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                  <ArrowLeft size={14} className="-rotate-90" />
                </div>
              </div>
            </div>
            <div className="space-y-3 md:space-y-4">
              <label className="text-[10px] uppercase tracking-[0.3em] md:tracking-[0.5em] text-white/30 ml-1 font-bold">Access Phrase</label>
              <input 
                type="text" 
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                className="orion-input w-full !py-4 md:!py-5 !px-6"
                placeholder="REQUIRED FOR ENTRY"
              />
            </div>
            <button 
              type="button" 
              onClick={handleGenerateInvite}
              disabled={generatingInvite} 
              className="btn-orion w-full mt-10 flex items-center justify-center gap-4 shadow-2xl !py-6"
            >
              <Key size={22} />
              <span className="text-[12px]">{generatingInvite ? 'GENERATING...' : 'GENERATE TOKEN'}</span>
            </button>

            <AnimatePresence>
              {generatedLink && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="mt-12 p-10 rounded-3xl bg-white/5 border border-white/10 space-y-8 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Check size={48} className="text-green-400" />
                  </div>
                  <div className="flex justify-between items-center relative z-10">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold">Entry Link Generated</p>
                    <div className="px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-bold tracking-widest">SUCCESS</div>
                  </div>
                  <div className="p-6 rounded-2xl bg-black/10 border border-white/5 shadow-inner relative z-10">
                    <p className="text-[12px] break-all font-mono text-white/70 leading-relaxed tracking-wide">{generatedLink}</p>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      setSystemStatus({ message: 'LINK COPIED TO CLIPBOARD', type: 'info' });
                    }}
                    className="w-full py-4 rounded-2xl border border-white/10 text-[10px] uppercase tracking-[0.4em] hover:bg-white/5 transition-all flex items-center justify-center gap-4 text-white/40 hover:text-white font-bold shadow-lg relative z-10"
                  >
                    <Copy size={16} />
                    Copy to Clipboard
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>
      </div>
      
      {/* Vault Item Management */}
      <section className="space-y-12">
        <div className="flex items-center gap-8">
          <h2 className="text-[12px] font-display tracking-[0.3em] md:tracking-[0.6em] text-white/30 uppercase font-bold">Constellation Vault Items Management</h2>
          <div className="h-px flex-grow bg-white/5" />
        </div>
        <div className="glass-panel p-1 border-white/5 shadow-2xl overflow-hidden glow-border">
          {vaultItems.length === 0 ? (
            <div className="py-40 text-center space-y-8">
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Paperclip size={32} className="text-white/10" />
              </div>
              <p className="text-[11px] md:text-[12px] text-white/10 italic uppercase tracking-[0.4em] md:tracking-[0.8em] font-bold">No items found in constellation network.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {vaultItems.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  key={`${item.id}-${idx}`} 
                  className="p-6 md:p-12 hover:bg-white/[0.02] transition-all group relative overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 relative z-10">
                    <div className="flex items-center gap-10 flex-grow">
                      <div className="w-20 h-20 rounded-3xl overflow-hidden border border-white/10 bg-black/5 flex-shrink-0 shadow-2xl relative group-hover:border-white/20 transition-all">
                        {item.cover_url ? (
                          <img src={item.cover_url} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-white/5 font-bold tracking-tighter">NULL_DATA</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="space-y-4">
                        <h3 className="font-light text-3xl tracking-[0.2em] text-white/70 group-hover:text-white transition-colors uppercase font-display">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-4 md:gap-8 text-[10px] text-white/20 uppercase tracking-[0.3em] md:tracking-[0.5em] font-bold">
                          <span className="text-white/40 font-mono bg-white/5 px-3 py-1 rounded-lg border border-white/5">ID: {item.id.slice(0, 12)}</span>
                          <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-white/10" />
                          <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 shadow-lg">{mapClassificationToUI(item.classification)}</span>
                          <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-white/10" />
                          <span className="text-white/30">{new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 w-full lg:w-auto justify-end">
                      <button 
                        onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                        className={`px-8 py-3.5 rounded-2xl border text-[11px] uppercase tracking-[0.4em] font-bold transition-all flex items-center gap-4 shadow-xl ${
                          editingItemId === item.id 
                            ? 'border-white/40 bg-white/10 text-white glow-border' 
                            : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <Paperclip size={16} />
                        {editingItemId === item.id ? 'CLOSE_PANEL' : 'MANAGE_DATA'}
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item)}
                        className="p-4 rounded-2xl border border-red-500/10 text-red-500/20 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all shadow-2xl group/delete"
                      >
                        <Trash2 size={20} className="group-hover/delete:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Attachments Management Dropdown */}
                  <AnimatePresence>
                    {editingItemId === item.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-12 pt-12 border-t border-white/5 space-y-12 overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {getFileUrls(item.file_urls).length > 0 ? (
                            getFileUrls(item.file_urls).map((url, idx) => (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key={idx} 
                                className="flex justify-between items-center p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group/item shadow-2xl relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                                <div className="flex items-center gap-5 truncate relative z-10">
                                  <Paperclip size={14} className="text-white/20" />
                                  <span className="text-[10px] truncate text-white/40 group-hover/item:text-white/70 uppercase tracking-[0.1em] md:tracking-[0.2em] font-bold">{url.split('/').pop()}</span>
                                </div>
                                <button 
                                  onClick={() => handleRemoveAttachment(item, url)}
                                  disabled={updatingItem}
                                  className="text-red-400/20 hover:text-red-400 p-3 transition-colors relative z-10"
                                >
                                  <X size={18} />
                                </button>
                              </motion.div>
                            ))
                          ) : (
                            <div className="col-span-full py-16 text-center text-[11px] text-white/10 uppercase tracking-[0.4em] md:tracking-[0.8em] font-bold italic">No binary attachments found.</div>
                          )}
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-10 pt-10 border-t border-white/5">
                          <div className="relative w-full md:w-auto">
                            <input 
                              type="file" 
                              multiple
                              onChange={(e) => {
                                setNewAttachments(Array.from(e.target.files || []));
                                e.target.value = '';
                              }}
                              className="hidden"
                              id={`add-files-${item.id}`}
                            />
                            <label 
                              htmlFor={`add-files-${item.id}`}
                              className="flex items-center justify-center gap-5 px-10 py-4.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all text-[11px] uppercase tracking-[0.5em] text-white/40 hover:text-white font-bold shadow-xl"
                            >
                              <Plus size={18} />
                              Select New Binaries
                            </label>
                          </div>
                          
                          <AnimatePresence>
                            {newAttachments.length > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-wrap items-center gap-8 flex-grow"
                              >
                                <div className="flex -space-x-3">
                                  {newAttachments.slice(0, 4).map((_, i) => (
                                    <div key={i} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-md">
                                      <Paperclip size={12} className="text-white/40" />
                                    </div>
                                  ))}
                                  {newAttachments.length > 4 && (
                                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 font-bold">+{newAttachments.length - 4}</div>
                                  )}
                                </div>
                                <span className="text-[11px] text-white/20 uppercase tracking-[0.2em] md:tracking-[0.4em] font-bold">{newAttachments.length} Items Pending Transmission</span>
                                <div className="flex items-center gap-6">
                                  <button 
                                    onClick={() => handleAddAttachments(item)}
                                    disabled={updatingItem}
                                    className="px-10 py-4.5 rounded-2xl bg-white/10 text-white text-[11px] font-bold uppercase tracking-[0.5em] hover:bg-white/20 transition-all border border-white/20 shadow-2xl glow-border"
                                  >
                                    {updatingItem ? 'TRANSMITTING...' : 'CONFIRM_UPLOAD'}
                                  </button>
                                  <button onClick={() => setNewAttachments([])} className="text-red-400/40 hover:text-red-400 text-[11px] uppercase tracking-[0.4em] font-bold transition-colors">Abort</button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-12">
        <div className="flex items-center gap-8">
          <h2 className="text-[12px] font-display tracking-[0.3em] md:tracking-[0.6em] text-white/30 uppercase font-bold">Active Entry Tokens</h2>
          <div className="h-px flex-grow bg-white/5" />
        </div>
        <div className="glass-panel overflow-hidden border-white/5 shadow-2xl glow-border">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.03]">
                  <th className="p-6 md:p-10 text-[11px] uppercase tracking-[0.3em] md:tracking-[0.6em] text-white/30 font-bold">Token ID</th>
                  <th className="p-6 md:p-10 text-[11px] uppercase tracking-[0.3em] md:tracking-[0.6em] text-white/30 font-bold">Assigned Role</th>
                  <th className="p-6 md:p-10 text-[11px] uppercase tracking-[0.3em] md:tracking-[0.6em] text-white/30 font-bold">Access Phrase</th>
                  <th className="p-6 md:p-10 text-[11px] uppercase tracking-[0.3em] md:tracking-[0.6em] text-white/30 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invites.map((invite, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 * idx }}
                    key={invite.token} 
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="p-6 md:p-10 text-[12px] font-mono text-white/40 tracking-[0.1em] font-medium group-hover:text-white/60 transition-colors">{invite.token.slice(0, 12)}...</td>
                    <td className="p-6 md:p-10">
                      <span className="text-[11px] uppercase tracking-[0.2em] md:tracking-[0.4em] text-white/60 font-bold bg-white/5 px-4 py-1.5 rounded-full border border-white/5 shadow-lg">{getRoleLabel(invite.assigned_role)}</span>
                    </td>
                    <td className="p-6 md:p-10 text-[12px] text-white/40 tracking-[0.2em] md:tracking-[0.5em] font-bold uppercase group-hover:text-white/60 transition-colors">{invite.phrase}</td>
                    <td className="p-6 md:p-10">
                      <span className={`text-[10px] px-5 py-2 rounded-full border uppercase tracking-[0.2em] md:tracking-[0.5em] font-bold shadow-2xl transition-all ${
                        invite.used 
                          ? 'border-red-500/20 bg-red-500/10 text-red-400 opacity-40' 
                          : 'border-green-500/20 bg-green-500/10 text-green-400 glow-border'
                      }`}>
                        {invite.used ? 'EXPIRED' : 'ACTIVE'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {invites.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-24 text-center text-[11px] text-white/10 italic uppercase tracking-[0.6em] font-bold">No active tokens found in celestial network.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'item' ? 'Confirm Deletion' : 'Confirm Removal'}
        message={deleteModal.type === 'item' 
          ? `Are you sure you want to permanently delete "${deleteModal.item?.title}"? This action cannot be undone.` 
          : 'Are you sure you want to remove this attachment from the item?'}
        confirmText={deleteModal.type === 'item' ? 'Delete Permanently' : 'Remove Attachment'}
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: 'item', item: null })}
      />
    </div>
  );
};
