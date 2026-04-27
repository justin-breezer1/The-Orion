import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingOverlay, SystemMessage } from '../components/System';
import { Profile, OrionVaultItem, canAccess, getRoleLabel, mapClassificationToUI } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldAlert, Download, FileText, Image as ImageIcon } from 'lucide-react';

const DecryptedText: React.FC<{ text: string }> = ({ text }) => {
  const [displayText, setDisplayText] = useState('');
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(prev => 
        text.split('')
          .map((char, index) => {
            if (index < iteration) return text[index];
            // Add a chance for a "glitch" character even after it's supposedly decrypted
            if (Math.random() > 0.995) return characters[Math.floor(Math.random() * characters.length)];
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join('')
      );

      if (iteration >= text.length) {
        clearInterval(interval);
      }

      iteration += 1 / 3; // Slightly faster, more fluid decryption
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return <span className="font-mono tracking-tight leading-relaxed">{displayText}</span>;
};

export const VaultItemPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vaultItem, setVaultItem] = useState<OrionVaultItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(true);
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "The Orion | Item Decryption";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(profileData);

        const { data: recordData, error: recordError } = await supabase
          .from('records')
          .select('*')
          .eq('id', id)
          .single();

        if (recordError || !recordData) {
          setError('Item not found or access revoked');
          setLoading(false);
          setDecrypting(false);
          return;
        }

        setVaultItem(recordData);
        
        // Hierarchy Check
        const accessAllowed = profileData ? canAccess(profileData.role, recordData.classification) : false;
        if (!accessAllowed) {
          setError('Access level insufficient for this constellation');
        }

        setLoading(false);
        // Artificial delay for decryption feel
        setTimeout(() => setDecrypting(false), 1200);
      } catch (err: any) {
        console.error('Fetch Error:', err);
        setError('System failure during decryption');
        setLoading(false);
        setDecrypting(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  if (loading) return <LoadingOverlay message="LOCATING ITEM..." />;
  if (decrypting) return <LoadingOverlay message="DECRYPTING DATA STREAM..." />;

  const accessAllowed = profile && vaultItem ? canAccess(profile.role, vaultItem.classification) : false;

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

  const fileUrls = getFileUrls(vaultItem?.file_urls);

  return (
    <div className="min-h-screen p-6 md:p-16 max-w-6xl mx-auto space-y-24 relative z-10 overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-16 border-b border-white/10 pb-20 relative">
        {/* Background elements - Handled globally in App.tsx */}
        
        <div className="space-y-12 relative z-10">
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-[12px] uppercase tracking-[0.6em] text-white/30 hover:text-white transition-all flex items-center gap-5 group font-bold"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-3 transition-transform" />
            Return to Terminal
          </button>
          <motion.h1 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-6xl md:text-8xl font-display font-light tracking-widest orion-text leading-tight glow-text"
          >
            {vaultItem?.title || 'UNTITLED'}
          </motion.h1>
        </div>
        
        <div className="flex flex-col items-start md:items-end gap-10 relative z-10">
          <div className={`text-[12px] px-10 py-4.5 rounded-2xl border backdrop-blur-3xl font-bold tracking-[0.5em] uppercase shadow-2xl ${
            accessAllowed 
              ? 'border-white/20 bg-black/20 text-white' 
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}>
            {mapClassificationToUI(vaultItem?.classification)}
          </div>
          <div className="flex flex-col items-start md:items-end gap-3">
            <p className="text-[11px] text-white/20 tracking-[0.6em] uppercase font-mono font-bold">REF: {vaultItem?.id?.slice(0, 12) || 'N/A'}</p>
            <p className="text-[10px] text-white/10 tracking-[0.4em] uppercase font-mono">TIMESTAMP: {vaultItem?.created_at ? new Date(vaultItem.created_at).toLocaleString() : 'N/A'}</p>
          </div>
        </div>
      </header>

      {error ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-48 text-center space-y-12 glass-panel border-red-500/20 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-red-500/5 blur-[100px] rounded-full" />
          <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-2xl relative z-10">
            <ShieldAlert size={48} className="text-red-500/40" />
          </div>
          <div className="space-y-6 relative z-10">
            <h2 className="text-4xl font-display font-light tracking-[0.5em] text-red-400/60 uppercase">ACCESS_DENIED</h2>
            <p className="text-red-400/30 text-[11px] uppercase tracking-[0.4em] font-bold max-w-md mx-auto leading-relaxed">{error}</p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="px-10 py-4 rounded-2xl border border-red-500/30 text-red-400 text-[11px] uppercase tracking-[0.4em] font-bold hover:bg-red-500/10 transition-all shadow-2xl relative z-10"
          >
            Return to Safety
          </button>
        </motion.div>
      ) : (
        <div className="space-y-32">
          {vaultItem?.cover_url && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel overflow-hidden border-white/5 p-8 shadow-2xl relative"
            >
              <div className="absolute inset-0 bg-white/2 opacity-20 pointer-events-none" />
              <div className="rounded-3xl overflow-hidden shadow-2xl relative group border border-white/10">
                <img 
                  src={vaultItem.cover_url} 
                  alt="Cover" 
                  referrerPolicy="no-referrer"
                  className="w-full h-auto max-h-[800px] object-cover opacity-60 group-hover:opacity-100 transition-all duration-1000 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
              </div>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="orion-panel p-20 md:p-40 relative overflow-hidden border-white/20 shadow-2xl group"
          >
            <div className="absolute top-0 right-0 p-16 text-[12px] text-white tracking-[1em] uppercase font-bold opacity-10 group-hover:opacity-20 transition-opacity">DECRYPTED_CONTENT_STREAM</div>
            <div className="absolute top-0 left-0 w-2 h-full bg-white/10" />
            <div className="whitespace-pre-wrap leading-[2.6] text-2xl md:text-5xl font-light text-white font-sans tracking-[0.03em] relative z-10">
              {vaultItem && <DecryptedText text={vaultItem.content} />}
            </div>
            <div className="mt-20 pt-12 border-t border-white/10 flex justify-between items-center opacity-40 text-[11px] tracking-[0.5em] font-mono uppercase font-bold">
              <span>Integrity: Verified</span>
              <span>Checksum: {vaultItem?.id.slice(-8)}</span>
            </div>
          </motion.div>

          <div className="space-y-16">
            <div className="flex items-center gap-8">
              <h3 className="text-[12px] font-display tracking-[0.6em] text-white/30 uppercase font-bold">Decrypted Attachments</h3>
              <div className="h-px flex-grow bg-white/5" />
            </div>

            {!accessAllowed ? (
              <div className="glass-panel p-24 text-center border-red-500/10 bg-red-500/5 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/2 blur-[80px] rounded-full" />
                <ShieldAlert size={48} className="text-red-500/20 mx-auto mb-10 relative z-10" />
                <h4 className="text-red-400/40 font-display font-light tracking-[0.5em] mb-6 uppercase relative z-10">ACCESS_RESTRICTED</h4>
                <p className="text-[11px] text-red-400/20 uppercase tracking-[0.4em] font-bold relative z-10">Elevated clearance required to view attachments</p>
              </div>
            ) : fileUrls.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {fileUrls.map((url, i) => {
                  const fileName = url.split('/').pop() || 'attachment';
                  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i);
                  
                  return (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ 
                        y: -4,
                        transition: { type: "spring", stiffness: 400, damping: 15 }
                      }}
                      className="orion-panel p-16 group border-white/20 hover:border-white/40 transition-all shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {isImage ? (
                        <div className="mb-16 overflow-hidden rounded-3xl border border-white/10 bg-black/20 aspect-square relative shadow-2xl group-hover:border-white/30 transition-all duration-500">
                          <img 
                            src={url} 
                            alt="Preview" 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-1000" 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/70 backdrop-blur-md">
                            <div className="p-6 rounded-full bg-white/10 border border-white/20 shadow-2xl">
                              <ImageIcon className="text-white" size={40} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square flex flex-col items-center justify-center border border-white/10 rounded-3xl mb-16 text-[12px] text-white/40 uppercase tracking-[0.6em] bg-black/10 shadow-2xl group-hover:bg-black/20 transition-all">
                          <FileText size={80} className="mb-10 opacity-10 group-hover:opacity-20 transition-opacity" />
                          <span className="font-bold">Binary Data Stream</span>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-12 relative z-10">
                        <div className="space-y-3 flex-grow min-w-0">
                          <span className="text-[14px] text-white truncate block tracking-[0.3em] font-bold uppercase">{fileName}</span>
                          <span className="text-[10px] text-white/40 tracking-[0.4em] font-mono uppercase font-bold">ID: {url.slice(-12)}</span>
                        </div>
                        <a 
                          href={url} 
                          download={fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-orion !px-12 !py-5 !text-[12px] w-full sm:w-auto shadow-2xl glow-border"
                        >
                          <Download size={20} />
                          Retrieve
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-32 text-center glass-panel border-white/5 shadow-inner">
                <p className="text-[11px] text-white/10 uppercase tracking-[0.6em] font-bold">No attachments found for this item.</p>
              </div>
            )}
          </div>

          <footer className="pt-32 border-t border-white/5 text-center">
            <p className="text-[10px] text-white/5 uppercase tracking-[1.5em] font-light">
              End of Item — Unauthorized distribution is prohibited — System Protocol 4.2.0
            </p>
          </footer>
        </div>
      )}
    </div>
  );
};
