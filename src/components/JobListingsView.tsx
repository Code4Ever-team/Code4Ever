import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Eye,
  Send,
  Calendar,
  AlertCircle,
  Shield,
  Sparkles
} from 'lucide-react';
import { UserProfile, JobListing, JobApplication } from '../types';
import { NewJobListingModal } from './NewJobListingModal';
import { JobApplicationModal } from './JobApplicationModal';
import { JobApplicantsModal } from './JobApplicantsModal';

interface JobListingsViewProps {
  currentUser: UserProfile;
  language: 'tr' | 'en';
  jobListings: JobListing[];
  onCreateListing: (listing: JobListing) => void;
  onDeleteListing: (id: string) => void;
  onSubmitApplication: (application: JobApplication) => void;
  onSelectUser?: (username: string) => void;
}

export const JobListingsView: React.FC<JobListingsViewProps> = ({
  currentUser,
  language,
  jobListings,
  onCreateListing,
  onDeleteListing,
  onSubmitApplication,
  onSelectUser
}) => {
  const [filterType, setFilterType] = useState<'all' | 'job' | 'team' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedListingForApply, setSelectedListingForApply] = useState<JobListing | null>(null);
  const [selectedListingForApplicants, setSelectedListingForApplicants] = useState<JobListing | null>(null);

  const filteredListings = useMemo(() => {
    return jobListings.filter((job) => {
      if (!job || !job.id) return false;
      const authorUsername = job.author?.username || '';
      const authorDisplayName = job.author?.display_name || '';

      // Type filter
      if (filterType === 'job' && job.type !== 'job') return false;
      if (filterType === 'team' && job.type !== 'team') return false;
      if (filterType === 'mine' && authorUsername.toLowerCase() !== currentUser.username.toLowerCase()) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (job.title || '').toLowerCase().includes(q);
        const matchesDesc = (job.description || '').toLowerCase().includes(q);
        const matchesAuthor = authorUsername.toLowerCase().includes(q) || authorDisplayName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAuthor) return false;
      }

      return true;
    });
  }, [jobListings, filterType, searchQuery, currentUser.username]);

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b] text-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{language === 'tr' ? 'İş & Ekip İlanları' : 'Job & Team Listings'}</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
                {jobListings.length}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono hidden sm:block">
              {language === 'tr' ? 'Projelerinize ekip arkadaşı bulun veya yeni fırsatlara başvurun' : 'Find teammates or apply to software opportunities'}
            </p>
          </div>
        </div>

        {/* Top Button to Create Listing */}
        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center gap-1.5 cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'tr' ? 'İlan Oluştur' : 'Create Listing'}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-zinc-800/40 space-y-3 bg-zinc-950/40">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'tr' ? 'İlan başlığı, teknoloji veya açıklamalarda ara...' : 'Search listings, tech, or descriptions...'}
            className="w-full bg-[#0e0e11] border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            {language === 'tr' ? 'Tümü' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('job')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              filterType === 'job'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'İş İlanları' : 'Jobs'}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('team')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              filterType === 'team'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Ekip İlanları' : 'Teams'}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('mine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterType === 'mine'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            {language === 'tr' ? 'Benim İlanlarım' : 'My Listings'}
          </button>
        </div>
      </div>

      {/* Listing Cards List */}
      <div className="p-4 space-y-3.5">
        {filteredListings.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-[#0c0c0e] border border-zinc-800/40 rounded-3xl">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Briefcase className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {language === 'tr' ? 'Henüz İlan Bulunmuyor' : 'No Listings Found'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {language === 'tr'
                ? 'İlk ilanı siz oluşturarak ekibinize yeni geliştiriciler kazandırabilirsiniz.'
                : 'Create the first listing to recruit developers for your team.'}
            </p>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'tr' ? 'İlan Oluştur' : 'Create Listing'}</span>
            </button>
          </div>
        ) : (
          filteredListings.map((job) => {
            const authorUsername = job.author?.username || 'anonim';
            const authorDisplayName = job.author?.display_name || authorUsername;
            const authorAvatar = job.author?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
            const authorRole = job.author?.role;

            const isOwner = authorUsername.toLowerCase() === currentUser.username.toLowerCase();
            const hasApplied = (job.applied_by || []).includes(currentUser.id || '') ||
              (job.applied_by || []).includes(currentUser.username) ||
              (job.applications || []).some((a) => a.applicant_username === currentUser.username);

            return (
              <div
                key={job.id}
                className="p-5 rounded-3xl bg-[#0c0c0e] border border-zinc-800/80 hover:border-zinc-700/80 transition-all space-y-4 shadow-sm"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={authorAvatar}
                      alt={authorDisplayName}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-800 cursor-pointer"
                      onClick={() => onSelectUser && onSelectUser(authorUsername)}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onSelectUser && onSelectUser(authorUsername)}
                          className="font-bold text-white text-xs hover:underline cursor-pointer"
                        >
                          {authorDisplayName}
                        </button>
                        <span className="text-[11px] text-zinc-500 font-mono">@{authorUsername}</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-[11px] text-zinc-500 font-mono">{job.time_ago || 'Yeni'}</span>
                      </div>
                      {authorRole && (
                        <span className="text-[10px] text-zinc-400 font-mono">{authorRole}</span>
                      )}
                    </div>
                  </div>

                  {/* Type Badge & Action */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                        job.type === 'job'
                          ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                      }`}
                    >
                      {job.type === 'job' ? <Briefcase className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      <span>{job.type === 'job' ? (language === 'tr' ? 'İş İlanı' : 'Job') : (language === 'tr' ? 'Ekip İlanı' : 'Team')}</span>
                    </span>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => onDeleteListing(job.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                        title={language === 'tr' ? 'İlanı Sil' : 'Delete Listing'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                    {job.title}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-line">
                    {job.description}
                  </p>
                </div>

                {/* Card Footer Info & Buttons */}
                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                    <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2.5 py-1 rounded-xl border border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-500">{language === 'tr' ? 'Kontenjan:' : 'Quota:'}</span>
                      <span className="text-white font-bold">{job.quota}</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2.5 py-1 rounded-xl border border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-500">{language === 'tr' ? 'Başvuru:' : 'Applications:'}</span>
                      <span className="text-white font-bold">{job.applications_count || job.applications?.length || 0}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <button
                        type="button"
                        onClick={() => setSelectedListingForApplicants(job)}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-300" />
                        <span>
                          {language === 'tr' ? 'Başvuruları Gör' : 'View Applicants'} ({job.applications?.length || 0})
                        </span>
                      </button>
                    ) : hasApplied ? (
                      <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === 'tr' ? 'Başvuruldu' : 'Applied'}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedListingForApply(job)}
                        className="px-4 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{language === 'tr' ? 'Başvur' : 'Apply'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <NewJobListingModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        currentUser={currentUser}
        language={language}
        onCreateListing={onCreateListing}
      />

      <JobApplicationModal
        isOpen={Boolean(selectedListingForApply)}
        onClose={() => setSelectedListingForApply(null)}
        listing={selectedListingForApply}
        currentUser={currentUser}
        language={language}
        onSubmitApplication={onSubmitApplication}
      />

      <JobApplicantsModal
        isOpen={Boolean(selectedListingForApplicants)}
        onClose={() => setSelectedListingForApplicants(null)}
        listing={selectedListingForApplicants}
        language={language}
        onSelectUser={onSelectUser}
      />
    </div>
  );
};
