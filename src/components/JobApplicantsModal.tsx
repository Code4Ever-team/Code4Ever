import React from 'react';
import { X, Users, User, Calendar, Code, FileText, CheckCircle2, MessageSquare } from 'lucide-react';
import { JobListing, JobApplication, UserProfile } from '../types';

interface JobApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: JobListing | null;
  language: 'tr' | 'en';
  onSelectUser?: (username: string) => void;
  onStartDirectChat?: (targetUser: UserProfile) => void;
}

export const JobApplicantsModal: React.FC<JobApplicantsModalProps> = ({
  isOpen,
  onClose,
  listing,
  language,
  onSelectUser,
  onStartDirectChat
}) => {
  if (!isOpen || !listing) return null;

  const applications = listing.applications || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e0e11] border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700/60">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {language === 'tr' ? 'Gelen Başvurular' : 'Incoming Applications'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono truncate max-w-md">
                {listing.title} ({applications.length} {language === 'tr' ? 'başvuru' : 'applications'})
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
        <div className="p-6 space-y-4 overflow-y-auto">
          {applications.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <Users className="w-6 h-6 text-zinc-400" />
              </div>
              <h4 className="text-sm font-bold text-white">
                {language === 'tr' ? 'Henüz Başvuru Bulunmuyor' : 'No Applications Yet'}
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {language === 'tr'
                  ? 'Geliştiriciler ilanınıza başvurduğunda tüm detaylar ve iletişim bilgileri burada listelenecektir.'
                  : 'When developers apply to your listing, their details will appear here.'}
              </p>
            </div>
          ) : (
            applications.map((app, index) => (
              <div
                key={app.id || index}
                className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={app.applicant_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={app.applicant_username}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-800"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectUser) {
                              onSelectUser(app.applicant_username);
                              onClose();
                            }
                          }}
                          className="font-bold text-white text-xs hover:underline cursor-pointer"
                        >
                          {app.name || app.applicant_display_name || app.applicant_username}
                        </button>
                        <span className="text-[11px] text-zinc-500 font-mono">@{app.applicant_username}</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px]">
                          {app.age} {language === 'tr' ? 'yaşında' : 'y/o'}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">{app.time_ago || 'Az önce'}</span>
                    </div>
                  </div>

                  {onStartDirectChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onStartDirectChat({
                          id: app.applicant_user_id || `usr_${app.applicant_username}`,
                          username: app.applicant_username,
                          display_name: app.name || app.applicant_display_name || app.applicant_username,
                          avatar_url: app.applicant_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                          role: 'Geliştirici',
                          email: ''
                        });
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all border border-zinc-700 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />
                      <span>{language === 'tr' ? 'Mesaj Gönder' : 'Direct Message'}</span>
                    </button>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                      {language === 'tr' ? 'Deneyim:' : 'Experience:'}
                    </span>
                    <p className="text-zinc-200">{app.experience}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                      {language === 'tr' ? 'Bildiği Diller / Teknolojiler:' : 'Languages & Tech:'}
                    </span>
                    <p className="text-zinc-200 font-mono text-[11px]">{app.languages}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/40 text-xs">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                    {language === 'tr' ? 'Açıklama:' : 'Applicant Note:'}
                  </span>
                  <p className="text-zinc-300 leading-relaxed font-sans">{app.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
