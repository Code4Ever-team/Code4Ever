import React, { useState } from 'react';
import { X, Send, AlertTriangle, CheckCircle2, User, Sparkles, Briefcase, Users } from 'lucide-react';
import { UserProfile, JobListing, JobApplication } from '../types';
import { sanitizeText } from '../utils/securityHelper';

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: JobListing | null;
  currentUser: UserProfile;
  language: 'tr' | 'en';
  onSubmitApplication: (application: JobApplication) => void;
}

export const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  isOpen,
  onClose,
  listing,
  currentUser,
  language,
  onSubmitApplication
}) => {
  const [name, setName] = useState(currentUser.display_name || '');
  const [age, setAge] = useState<number | string>(24);
  const [experience, setExperience] = useState('');
  const [languages, setLanguages] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !listing) return null;

  const isOwner = Boolean(
    currentUser?.username &&
    listing?.author?.username &&
    listing.author.username.toLowerCase() === currentUser.username.toLowerCase()
  );

  const alreadyApplied = Boolean(
    currentUser?.username &&
    (
      (listing.applied_by || []).some((u) => (u || '').toLowerCase() === currentUser.username.toLowerCase()) ||
      (listing.applications || []).some((a) => (a.applicant_username || '').toLowerCase() === currentUser.username.toLowerCase())
    )
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (alreadyApplied) {
      setError(language === 'tr' ? 'Bu ilana zaten başvuru yaptınız.' : 'You have already applied to this listing.');
      return;
    }

    if (isOwner) {
      setError(language === 'tr' ? 'Kendi ilanınıza başvuru yapamazsınız.' : 'You cannot apply to your own listing.');
      return;
    }

    const cleanName = sanitizeText(name.trim());
    const numAge = typeof age === 'string' ? parseInt(age) : age;
    const cleanExp = sanitizeText(experience.trim());
    const cleanLang = sanitizeText(languages.trim());
    const cleanDesc = sanitizeText(description.trim());

    if (!cleanName || cleanName.length < 2) {
      setError(language === 'tr' ? 'Lütfen geçerli bir ad girin.' : 'Please enter a valid name.');
      return;
    }

    if (!numAge || isNaN(numAge) || numAge < 13 || numAge > 100) {
      setError(language === 'tr' ? 'Lütfen 13 ile 100 arasında geçerli bir yaş girin.' : 'Please enter a valid age (13-100).');
      return;
    }

    if (!cleanExp || cleanExp.length < 3) {
      setError(language === 'tr' ? 'Lütfen deneyim bilginizi belirtin (örn: 3 yıl React/Node.js).' : 'Please specify your experience.');
      return;
    }

    if (!cleanLang || cleanLang.length < 2) {
      setError(language === 'tr' ? 'Lütfen bildiğiniz dilleri/teknolojileri yazın.' : 'Please specify known languages/technologies.');
      return;
    }

    if (!cleanDesc || cleanDesc.length < 10) {
      setError(language === 'tr' ? 'Lütfen en az 10 karakterlik bir açıklama yazın.' : 'Please write at least 10 characters description.');
      return;
    }

    setIsSubmitting(true);

    const application: JobApplication = {
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      job_id: listing.id,
      job_title: listing.title,
      applicant_user_id: currentUser.id || `usr_${currentUser.username}`,
      applicant_username: currentUser.username,
      applicant_display_name: cleanName,
      applicant_avatar: currentUser.avatar_url,
      name: cleanName,
      age: numAge,
      experience: cleanExp,
      languages: cleanLang,
      description: cleanDesc,
      created_at: new Date().toISOString(),
      time_ago: 'Az önce',
      status: 'pending'
    };

    onSubmitApplication(application);
    setIsSuccess(true);
    setIsSubmitting(false);

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e0e11] border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700/60">
              {listing.type === 'job' ? <Briefcase className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {language === 'tr' ? 'İlana Başvur' : 'Apply to Listing'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono truncate max-w-xs">
                {listing.title}
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
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {language === 'tr' ? 'Başvurunuz İletildi!' : 'Application Submitted!'}
            </h3>
            <p className="text-xs text-zinc-400">
              {language === 'tr'
                ? 'İlan sahibine tek seferlik bildirim gönderildi.'
                : 'The listing creator has been notified once.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-3.5 overflow-y-auto">
            {alreadyApplied && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>
                  {language === 'tr'
                    ? 'Bu ilana daha önce başvuru yaptınız. Başvurunuz ilan sahibine iletilmiştir.'
                    : 'You have already applied to this listing. Your application has been sent.'}
                </span>
              </div>
            )}

            {isOwner && (
              <div className="p-3 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 text-zinc-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                <span>
                  {language === 'tr'
                    ? 'Bu ilan size aittir, kendinize başvuru yapamazsınız.'
                    : 'This is your own listing, you cannot apply to it.'}
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Adınız */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                {language === 'tr' ? 'Adınız:' : 'Your Name:'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === 'tr' ? 'Ad Soyad' : 'Full Name'}
                maxLength={60}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            {/* Yaşınız */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                {language === 'tr' ? 'Yaşınız:' : 'Your Age:'}
              </label>
              <input
                type="number"
                min={13}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="24"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            {/* Deneyim */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                {language === 'tr' ? 'Deneyim:' : 'Experience:'}
              </label>
              <input
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder={language === 'tr' ? 'Örn: 3 Yıl Frontend / React & Next.js' : 'e.g. 3 Years Frontend / React'}
                maxLength={150}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            {/* Bildiğiniz Diller */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                {language === 'tr' ? 'Bildiğiniz Diller:' : 'Known Languages / Tech:'}
              </label>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder={language === 'tr' ? 'Örn: TypeScript, Go, Python, PostgreSQL' : 'e.g. TypeScript, Go, Python'}
                maxLength={150}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            {/* Açıklama */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                {language === 'tr' ? 'Açıklama:' : 'Description / Cover Note:'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  language === 'tr'
                    ? 'Kendinizi tanıtın, projeye/ekibe nasıl katkı sağlayabileceğinizden bahsedin...'
                    : 'Introduce yourself, why you want to join, and what you bring...'
                }
                rows={3}
                maxLength={2000}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
                required
              />
              <div className="text-[10px] text-zinc-500 text-right mt-0.5 font-mono">
                {description.length}/2000
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || alreadyApplied || isOwner}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-950 bg-zinc-100 hover:bg-white transition-all shadow-md active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {alreadyApplied
                    ? (language === 'tr' ? 'Zaten Başvuruldu' : 'Already Applied')
                    : isOwner
                    ? (language === 'tr' ? 'Kendi İlanınız' : 'Your Listing')
                    : (language === 'tr' ? 'Başvuru Yap' : 'Submit Application')}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
