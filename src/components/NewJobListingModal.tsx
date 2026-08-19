import React, { useState } from 'react';
import { X, Briefcase, Users, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { UserProfile, JobListing } from '../types';
import { sanitizeText } from '../utils/securityHelper';

interface NewJobListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  language: 'tr' | 'en';
  onCreateListing: (listing: JobListing) => void;
}

export const NewJobListingModal: React.FC<NewJobListingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  language,
  onCreateListing
}) => {
  const [type, setType] = useState<'job' | 'team'>('job');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quota, setQuota] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = sanitizeText(title.trim());
    const cleanDesc = sanitizeText(description.trim());
    const cleanQuota = Number(quota);

    if (!cleanTitle || cleanTitle.length < 3) {
      setError(language === 'tr' ? 'İlan başlığı en az 3 karakter olmalıdır.' : 'Title must be at least 3 characters.');
      return;
    }

    if (cleanTitle.length > 120) {
      setError(language === 'tr' ? 'İlan başlığı maksimum 120 karakter olabilir.' : 'Title cannot exceed 120 characters.');
      return;
    }

    if (!cleanDesc || cleanDesc.length < 10) {
      setError(language === 'tr' ? 'Lütfen en az 10 karakterlik bir açıklama yazın.' : 'Description must be at least 10 characters.');
      return;
    }

    if (cleanDesc.length > 3000) {
      setError(language === 'tr' ? 'Açıklama maksimum 3000 karakter olabilir.' : 'Description cannot exceed 3000 characters.');
      return;
    }

    if (!cleanQuota || isNaN(cleanQuota) || cleanQuota < 1 || cleanQuota > 500) {
      setError(language === 'tr' ? 'Kontenjan 1 ile 500 arasında geçerli bir sayı olmalıdır.' : 'Quota must be between 1 and 500.');
      return;
    }

    setIsSubmitting(true);

    const newListing: JobListing = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      title: cleanTitle,
      description: cleanDesc,
      quota: cleanQuota,
      author: {
        id: currentUser.id || `usr_${currentUser.username}`,
        username: currentUser.username,
        display_name: currentUser.display_name || currentUser.username,
        avatar_url: currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: currentUser.role
      },
      status: 'active',
      created_at: new Date().toISOString(),
      time_ago: 'Az önce',
      applications_count: 0,
      applications: [],
      applied_by: []
    };

    onCreateListing(newListing);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e0e11] border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700/60">
              {type === 'job' ? <Briefcase className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {language === 'tr' ? 'Yeni İlan Oluştur' : 'Create New Listing'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {language === 'tr' ? 'İş veya ekip arkadaşı arayışınızı paylaşın' : 'Post your job or team listing'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              {language === 'tr' ? 'İlan Türü' : 'Listing Type'}
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setType('job')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'job'
                    ? 'bg-zinc-100 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'İş İlanı' : 'Job Listing'}</span>
              </button>
              <button
                type="button"
                onClick={() => setType('team')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'team'
                    ? 'bg-zinc-100 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Ekip İlanı' : 'Team Listing'}</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              {language === 'tr' ? 'Başlık' : 'Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'job'
                  ? (language === 'tr' ? 'Örn: Senior React & TypeScript Geliştirici' : 'e.g. Senior React & TypeScript Developer')
                  : (language === 'tr' ? 'Örn: Web3 Açık Kaynak Projesi İçin Ekip Arkadaşları' : 'e.g. Open Source Project Team Members')
              }
              maxLength={120}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              required
            />
            <div className="text-[10px] text-zinc-500 text-right mt-1 font-mono">
              {title.length}/120
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              {language === 'tr' ? 'Açıklama' : 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                language === 'tr'
                  ? 'Gereksinimler, proje detayları, aranan beceriler ve çalışma modeli...'
                  : 'Requirements, project details, expected skills and working model...'
              }
              rows={4}
              maxLength={3000}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
              required
            />
            <div className="text-[10px] text-zinc-500 text-right mt-1 font-mono">
              {description.length}/3000
            </div>
          </div>

          {/* Quota */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              {language === 'tr' ? 'Kontenjan' : 'Quota'}
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={quota}
              onChange={(e) => setQuota(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
              required
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              {language === 'tr' ? 'Bu pozisyon veya ekip için alınacak kişi sayısı' : 'Number of open positions for this listing'}
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-zinc-950 bg-zinc-100 hover:bg-white transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{language === 'tr' ? 'İlan Oluştur' : 'Create Listing'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
