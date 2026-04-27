import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Skeleton, Modal } from '../components/System';
import { Profile, OrionVaultItem, Role, canAccess, getRoleLabel, mapClassificationToUI, mapUIToClassification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Search, ChevronRight, ArrowLeft, Upload, FolderPlus, Trash2, FileText, Shield } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';

const CLOUDINARY_CLOUD_NAME = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const VaultsPage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vaultItems, setVaultItems] = useState<OrionVaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null, title: string }[]>([{ id: null, title: 'VAULTS' }]);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadClassification, setUploadClassification] = useState<Role>('Verified');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderClassification, setNewFolderClassification] = useState<Role>('Verified');
  const [isUploading, setIsUploading] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "The Orion | Vaults";
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
          .channel(`vaults_profile_${user.id}`)
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
        console.error('Vaults Profile Fetch Error:', err);
      }
    };

    fetchData();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);

  useEffect(() => {
    const fetchVaultItems = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('records')
          .select('*')
          .order('type', { ascending: false }) // Folders first
          .order('created_at', { ascending: false });

        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`);
        } else {
          if (currentFolderId && currentFolderId !== 'null') {
            query = query.eq('parent_id', currentFolderId);
          } else {
            query = query.is('parent_id', null);
          }
        }

        const { data: vaultItemsData, error: vaultItemsError } = await query;

        if (vaultItemsError) throw vaultItemsError;
        setVaultItems(vaultItemsData || []);
      } catch (err: any) {
        console.error('Vaults Items Fetch Error:', err);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };

    if (profile) {
      fetchVaultItems();
    }
  }, [currentFolderId, searchQuery, profile]);

  useEffect(() => {
    if (isCreateFolderModalOpen && profile) {
      const mappedRole = mapClassificationToUI(profile.role);
      setNewFolderClassification(mappedRole as Role);
    }
  }, [isCreateFolderModalOpen, profile]);

  useEffect(() => {
    if (isUploadModalOpen && profile) {
      const mappedRole = mapClassificationToUI(profile.role);
      setUploadClassification(mappedRole as Role);
    }
  }, [isUploadModalOpen, profile]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !profile) return;

    // Validation
    const mappedRole = mapClassificationToUI(profile.role);
    const allowedOptions: string[] = [];
    if (mappedRole === 'Overseer') allowedOptions.push('Verified', 'Apex', 'Overseer');
    else if (mappedRole === 'Apex') allowedOptions.push('Verified', 'Apex');
    else allowedOptions.push('Verified');

    if (!allowedOptions.includes(newFolderClassification)) {
      alert("INVALID CLASSIFICATION FOR YOUR CLEARANCE LEVEL");
      return;
    }

    const backendValue = mapUIToClassification(newFolderClassification);

    try {
      const { data: newFolderData, error } = await supabase
        .from('records')
        .insert([{
          title: newFolderName.trim(),
          content: 'DIRECTORY_CONTAINER',
          classification: backendValue,
          type: 'folder',
          parent_id: currentFolderId === 'null' ? null : (currentFolderId || null),
          owner_id: profile.id 
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Validate returned folder
      if (newFolderData && newFolderData.id && newFolderData.type === 'folder') {
        const validatedFolder: OrionVaultItem = {
          ...newFolderData,
          title: newFolderData.title || 'UNTITLED',
          classification: newFolderData.classification || 'Verified',
          created_at: newFolderData.created_at || new Date().toISOString()
        };
        
        setVaultItems(prev => [validatedFolder, ...prev]);
      } else {
        // Fallback to refresh if data is missing
        const { data: refreshData } = await supabase
          .from('records')
          .select('*')
          .eq('parent_id', currentFolderId === 'null' ? null : (currentFolderId || null))
          .order('type', { ascending: false })
          .order('created_at', { ascending: false });
        
        setVaultItems(refreshData || []);
      }
      
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
    } catch (err: any) {
      console.error('Create Folder Error:', err);
      // Use a more subtle error display if possible, but alert is what was there
      alert(`FAILED TO CREATE FOLDER: ${err.message}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setSelectedFile(file);
    setIsUploadModalOpen(true);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !profile) return;

    setIsUploading(true);
    setIsUploadModalOpen(false);
    try {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_CLOUD_NAME === 'MY_CLOUD_NAME') {
        throw new Error('CLOUDINARY_NOT_CONFIGURED');
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
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

      const backendValue = mapUIToClassification(uploadClassification);

      const { error } = await supabase
        .from('records')
        .insert([{
          title: selectedFile.name,
          content: `FILE_UPLOAD: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`,
          classification: backendValue,
          type: 'file',
          file_urls: [data.secure_url],
          cover_url: data.resource_type === 'image' ? data.secure_url : undefined,
          parent_id: currentFolderId === 'null' ? null : (currentFolderId || null),
          owner_id: profile.id
        }]);

      if (error) throw error;

      // Refresh
      const { data: vaultItemsData } = await supabase
        .from('records')
        .select('*')
        .eq('parent_id', currentFolderId === 'null' ? null : (currentFolderId || null))
        .order('type', { ascending: false })
        .order('created_at', { ascending: false });
      
      setVaultItems(vaultItemsData || []);
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Upload Error:', err);
      let errorMessage = `UPLOAD FAILED: ${err.message}`;
      
      if (err.message === 'CLOUDINARY_NOT_CONFIGURED') {
        errorMessage = 'CONFIGURATION ERROR: CLOUDINARY NOT SET UP IN SECRETS';
      } else if (err.message === 'Failed to fetch') {
        errorMessage = 'NETWORK ERROR: COULD NOT REACH UPLOAD SERVER. CHECK CONFIGURATION.';
      }

      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFolderClick = (folder: OrionVaultItem) => {
    if (!profile || !canAccess(profile.role, folder.classification)) {
      setAccessDeniedMessage(`ACCESS DENIED: CLEARANCE LEVEL ${mapClassificationToUI(folder.classification).toUpperCase()} REQUIRED`);
      setTimeout(() => setAccessDeniedMessage(null), 3000);
      return;
    }
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, title: folder.title.toUpperCase() }]);
  };

  const handleFileClick = (item: OrionVaultItem) => {
    if (!profile || !canAccess(profile.role, item.classification)) {
      setAccessDeniedMessage(`ACCESS DENIED: CLEARANCE LEVEL ${mapClassificationToUI(item.classification).toUpperCase()} REQUIRED`);
      setTimeout(() => setAccessDeniedMessage(null), 3000);
      return;
    }
    navigate(`/vault-item/${item.id}`);
  };

  const handleBreadcrumbClick = (id: string | null, index: number) => {
    setCurrentFolderId(id);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const handleBack = () => {
    if (breadcrumbs.length > 1) {
      const parent = breadcrumbs[breadcrumbs.length - 2];
      handleBreadcrumbClick(parent.id, breadcrumbs.length - 2);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setVaultItems(vaultItems.filter(r => r.id !== id));
    } catch (err: any) {
      console.error('Delete Error:', err);
      alert('Failed to delete item');
    }
  };

  const filteredItems = vaultItems.filter(r => 
    (r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     r.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout profile={profile}>
      <header className="h-16 border-b border-white/10 bg-black/10 backdrop-blur-md flex items-center justify-between px-4 md:px-8 relative z-20 shadow-[0_4px_24px_rgba(0,0,0,0.2)] shrink-0">
        <div className="flex items-center gap-4 md:gap-8 min-w-0">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            {currentFolderId && (
              <button 
                onClick={handleBack}
                className="p-2 hover:bg-white/5 rounded-sm text-white/40 hover:text-white transition-all flex items-center justify-center border border-white/10 shrink-0"
                title="Go Back"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0 max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-xl">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={`${crumb.id || 'root'}-${index}`}>
                  {index > 0 && <ChevronRight size={12} className="text-white/10 flex-shrink-0" />}
                  <button
                    onClick={() => handleBreadcrumbClick(crumb.id, index)}
                    className={`text-[10px] font-display tracking-[0.3em] uppercase font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-w-0 ${
                      index === breadcrumbs.length - 1 
                        ? 'text-white' 
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    {index === 0 && <Database size={10} className="opacity-50 shrink-0" />}
                    <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-none">{crumb.title}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          <div className="relative group hidden xl:block shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/50 transition-all" size={12} />
            <input 
              type="text"
              placeholder="SEARCH VAULTS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-sm pl-10 pr-4 py-2 text-[9px] tracking-[0.3em] uppercase focus:outline-none focus:border-white/30 transition-all w-64"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button 
              onClick={() => setIsCreateFolderModalOpen(true)}
              className="p-2.5 hover:bg-white/5 rounded-sm text-white/40 hover:text-white transition-all border border-white/10 shrink-0"
              title="New Vault"
            >
              <FolderPlus size={16} />
            </button>
            <label className="p-2.5 hover:bg-white/5 rounded-sm text-white/40 hover:text-white transition-all border border-white/10 cursor-pointer shrink-0" title="Submit Item">
              <Upload size={16} />
              <input type="file" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
            </label>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-32 custom-scrollbar relative">
        {isUploading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5 z-30">
            <motion.div 
              className="h-full bg-orion-blue shadow-[0_0_10px_rgba(0,242,255,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        )}

        <div className="max-w-7xl mx-auto space-y-16">
          <AnimatePresence>
            {accessDeniedMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-red-500/10 border border-red-500/30 p-4 rounded-sm flex items-center gap-4 text-red-400 text-[10px] font-bold uppercase tracking-[0.3em] justify-center"
              >
                <Shield size={14} />
                {accessDeniedMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between border-b border-white/5 pb-8">
            <div className="space-y-2">
              <h2 className="text-[12px] font-display tracking-[0.6em] text-white uppercase font-bold">
                {currentFolderId ? breadcrumbs[breadcrumbs.length - 1].title : 'SYSTEM VAULTS'}
              </h2>
              <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-medium">
                {filteredItems.length} Classified Items Detected
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-sm" />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredItems?.length > 0 && filteredItems.map((item, index) => {
                  const safeTitle = item?.title || 'UNTITLED';
                  const safeClassification = item?.classification || 'Verified';
                  const safeCreatedAt = item?.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A';
                  const safeType = item?.type || 'file';
                  const hasAccess = profile ? canAccess(profile.role, safeClassification) : true;

                  return (
                    <motion.div 
                      layout
                      key={`${item?.id || index}-${index}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: hasAccess ? 1 : 0.4, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      whileHover={{ y: hasAccess ? -4 : 0 }}
                      onClick={() => safeType === 'folder' ? handleFolderClick(item) : handleFileClick(item)}
                      className={`orion-panel aspect-square p-6 cursor-pointer hover:border-orion-blue/30 transition-all group flex flex-col relative overflow-hidden !rounded-sm ${!hasAccess && 'grayscale opacity-40'}`}
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {hasAccess ? (
                          <ChevronRight size={14} className="text-orion-blue" />
                        ) : (
                          <Shield size={14} className="text-red-500" />
                        )}
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center mb-6 relative">
                        {!hasAccess && (
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <Shield size={40} className="text-red-500/20" />
                          </div>
                        )}
                        {safeType === 'folder' ? (
                          <div className="relative">
                            <Database size={56} className={`${hasAccess ? 'text-white/10 group-hover:text-orion-blue/40' : 'text-red-500/10'} transition-all duration-500`} strokeWidth={1} />
                          </div>
                        ) : item?.cover_url ? (
                          <div className="w-full h-full rounded-sm overflow-hidden border border-white/5 relative">
                            <img 
                              src={item.cover_url} 
                              alt="" 
                              className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-500" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          </div>
                        ) : (
                          <FileText size={48} className="text-white/10 group-hover:text-white/20 transition-all" strokeWidth={1} />
                        )}
                      </div>

                      <div className="space-y-3 relative z-10">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase truncate pr-4 text-white/80 group-hover:text-white transition-colors">{safeTitle}</h3>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); item?.id && handleDeleteItem(item.id); }}
                              className="text-white/5 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[7px] text-white/20 uppercase tracking-[0.2em] font-bold">
                          <div className="flex items-center gap-3">
                            <span className="text-orion-blue/40">{safeType === 'folder' ? 'VAULT' : 'ITEM'}</span>
                            <span className="px-1.5 py-0.5 rounded-none bg-white/5 border border-white/10">{mapClassificationToUI(safeClassification)}</span>
                          </div>
                          <span>{safeCreatedAt}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 space-y-10 text-center">
              <div className="w-24 h-24 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-white/5 shadow-inner">
                <Database size={40} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-display font-light tracking-[0.4em] text-white/20 uppercase">
                  No Data Detected
                </h3>
                <p className="text-[10px] text-white/10 uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
                  The requested sector contains no classified items or vaults.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isCreateFolderModalOpen} 
        onClose={() => setIsCreateFolderModalOpen(false)} 
        title="Initialize New Vault"
      >
        <form onSubmit={handleCreateFolder} className="space-y-10">
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold ml-1">Vault Identifier</label>
              <input 
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="ENTER VAULT NAME..."
                className="orion-input w-full !py-5 !text-[11px] tracking-[0.3em] uppercase !rounded-sm"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold ml-1">Classification Level</label>
              <select 
                value={newFolderClassification}
                onChange={(e) => setNewFolderClassification(e.target.value as Role)}
                className="orion-input w-full !py-5 !text-[11px] tracking-[0.3em] uppercase appearance-none !rounded-sm"
              >
                <option value="Verified">Verified</option>
                <option value="Apex">Apex</option>
                <option value="Overseer">Overseer</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="flex-1 py-4 px-6 rounded-sm border border-white/10 text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/5 transition-colors"
              >
              Abort
            </button>
            <button 
              type="submit"
              disabled={!newFolderName.trim()}
              className="flex-1 py-4 px-6 rounded-sm btn-orion text-[10px] font-bold uppercase tracking-[0.3em] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Initialize
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        title="Secure Intel Transmission"
      >
        <div className="space-y-10">
          <div className="space-y-8">
            <div className="p-6 bg-white/5 border border-white/10 rounded-sm space-y-4">
              <div className="flex items-center gap-4">
                <FileText size={24} className="text-orion-blue" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate max-w-[200px]">{selectedFile?.name}</span>
                  <span className="text-[8px] text-white/30 uppercase tracking-widest">{(selectedFile?.size || 0) / 1024 > 1024 ? `${((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB` : `${((selectedFile?.size || 0) / 1024).toFixed(2)} KB`}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold ml-1">Classification Level</label>
              <select 
                value={uploadClassification}
                onChange={(e) => setUploadClassification(e.target.value as Role)}
                className="orion-input w-full !py-5 !text-[11px] tracking-[0.3em] uppercase appearance-none !rounded-sm"
              >
                <option value="Verified">Verified</option>
                <option value="Apex">Apex</option>
                <option value="Overseer">Overseer</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              type="button"
              onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }}
              className="flex-1 py-4 px-6 rounded-sm border border-white/10 text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/5 transition-colors"
            >
              Abort
            </button>
            <button 
              onClick={handleFileUpload}
              className="flex-1 py-4 px-6 rounded-sm btn-orion text-[10px] font-bold uppercase tracking-[0.3em] shadow-xl"
            >
              Transmit
            </button>
          </div>
        </div>
      </Modal>

      {/* Fixed Upload Button for Mobile/All Screens */}
      <motion.label 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-5 right-5 md:bottom-10 md:right-10 z-[1000] w-14 h-14 md:w-16 md:h-16 bg-orion-blue shadow-[0_0_20px_rgba(0,242,255,0.4)] rounded-full flex items-center justify-center cursor-pointer group transition-all"
        title="Submit Item"
      >
        <Upload size={24} className="text-black group-hover:scale-110 transition-transform" />
        <input type="file" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
      </motion.label>
    </DashboardLayout>
  );
};
