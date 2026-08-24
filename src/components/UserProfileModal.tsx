import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  MapPin,
  Github,
  Calendar,
  UserPlus,
  UserCheck,
  ExternalLink,
  Code2,
  Sparkles,
  Users,
  Check,
  AlertCircle,
  Mail
} from 'lucide-react';
import { UserProfile, Community } from '../types';
import { UserBadges } from './UserBadges';
import { sanitizeUrl } from '../utils/securityHelper';
import { getSupabaseClient, loadStoredAllUsers } from '../services/supabaseClient';

interface UserProfileModalProps {
  isOpen: boolean;
  username: string | null;
  onClose: () => void;
  currentUser: UserProfile;
  communities: Community[];
  language: 'tr' | 'en';
  onToggleJoinCommunity?: (id: string) => void;
  onNavigateToFullProfile?: (user: UserProfile) => void;
  onStartDirectChat?: (user: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  username,
  onClose,
  currentUser,
  communities,
  language,
  onToggleJoinCommunity,
  onNavigateToFullProfile,
  onStartDirectChat
}) => {
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [communityData, setCommunityData] = useState<Community | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTogglingJoin, setIsTogglingJoin] = useState(false);

  const handleToggleJoin = (commId: string) => {
    if (isTogglingJoin || !onToggleJoinCommunity) return;
    setIsTogglingJoin(true);
    setTimeout(() => setIsTogglingJoin(false), 500);
    onToggleJoinCommunity(commId);
  };

  useEffect(() => {
    if (!isOpen || !username) {
      setProfileData(null);
      setCommunityData(null);
      setNotFound(false);
      return;
    }

    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();

    const fetchUserOrCommunity = async () => {
      setLoading(true);
      setNotFound(false);
      setProfileData(null);
      setCommunityData(null);

      try {
        // 1. Check if currentUser matches
        if (currentUser.username?.toLowerCase() === cleanUsername) {
          setProfileData(currentUser);
          setLoading(false);
          return;
        }

        // 2. Query Supabase 'profiles' table or cached users
        const client = getSupabaseClient();
        if (client) {
          const { data } = await client
            .from('profiles')
            .select('*')
            .ilike('username', cleanUsername)
            .limit(1)
            .maybeSingle();

          if (data) {
            setProfileData(data as UserProfile);
            setLoading(false);
            return;
          }
        }

        const cachedUsers = loadStoredAllUsers();
        const foundCached = cachedUsers.find(
          (u) => (u.username || '').toLowerCase() === cleanUsername
        );
        if (foundCached) {
          setProfileData(foundCached);
          setLoading(false);
          return;
        }

        // 3. Check if GitHub user exists
        const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`);
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          if (ghData && ghData.login) {
            const constructedProfile: UserProfile = {
              id: `gh_${ghData.id || cleanUsername}`,
              username: cleanUsername,
              display_name: ghData.name || cleanUsername,
              avatar_url: ghData.avatar_url || `https://unavatar.io/github/${cleanUsername}`,
              banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
              bio: ghData.bio || (language === 'tr' ? 'Code4Ever Geliştirici Üyesi' : 'Code4Ever Developer Member'),
              role: ghData.company || (language === 'tr' ? 'Geliştirici' : 'Developer'),
              verified: false,
              custom_fields: {
                github: `github.com/${cleanUsername}`,
                location: ghData.location || (language === 'tr' ? 'Türkiye' : 'Global')
              },
              created_at: ghData.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            setProfileData(constructedProfile);
            setLoading(false);
            return;
          }
        }

        // 4. If not a user, check if a Community exists with this handle or name
        const matchedComm = communities.find((c) => {
          if (!c) return false;
          const commHandle = (c.handle || '').replace(/^@/, '').toLowerCase().trim();
          const commName = (c.name || '').toLowerCase().trim();
          return commHandle === cleanUsername || commName === cleanUsername;
        });

        if (matchedComm) {
          setCommunityData(matchedComm);
          setLoading(false);
          return;
        }

        // 5. Query Supabase 'communities' table
        if (client) {
          const { data: cData } = await client
            .from('communities')
            .select('*')
            .or(`handle.ilike.%${cleanUsername}%,name.ilike.%${cleanUsername}%`)
            .limit(1)
            .maybeSingle();
          if (cData) {
            setCommunityData(cData as Community);
            setLoading(false);
            return;
          }
        }

        // 6. If neither User nor Community found -> setNotFound(true)
        setNotFound(true);
      } catch (err) {
        console.warn('Profile/Community search error:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrCommunity();
  }, [isOpen, username, currentUser, communities]);

  if (!isOpen || !username) return null;

  const currentComm = communityData ? communities.find((c) => c.id === communityData.id) || communityData : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121215] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-black/60 hover:bg-black text-zinc-300 hover:text-white backdrop-blur-md border border-white/10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-400">
              {language === 'tr' ? 'Bilgiler kontrol ediliyor...' : 'Checking details...'}
            </p>
          </div>
        ) : notFound ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {language === 'tr' ? 'Kullanıcı veya Topluluk Bulunamadı' : 'User or Community Not Found'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-mono leading-relaxed">
                {language === 'tr'
                  ? `Code4Ever platformunda '@${username.replace(/^@/, '')}' adında kayıtlı bir üye veya topluluk bulunmamaktadır.`
                  : `No registered member or community named '@${username.replace(/^@/, '')}' was found on Code4Ever.`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-bold text-xs transition-colors"
            >
              {language === 'tr' ? 'Kapat' : 'Close'}
            </button>
          </div>
        ) : currentComm ? (
          /* COMMUNITY CARD VIEW */
          <div>
            <div className="h-28 w-full relative bg-zinc-900 overflow-hidden">
              <img
                src={currentComm.avatar_url}
                alt={currentComm.name}
                className="w-full h-full object-cover opacity-80 blur-sm scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-transparent to-black/40" />
            </div>

            <div className="px-5 pb-5 relative">
              <div className="flex justify-between items-end -mt-12 mb-3">
                <div className="relative">
                  <img
                    src={currentComm.avatar_url}
                    alt={currentComm.name}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#121215] shadow-xl bg-zinc-900"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-1 rounded-lg border-2 border-[#121215]">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>

                {onToggleJoinCommunity && (
                  <button
                    type="button"
                    disabled={isTogglingJoin}
                    onClick={() => handleToggleJoin(currentComm.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 cursor-pointer ${
                      currentComm.is_joined
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {currentComm.is_joined ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'tr' ? 'Katılındı' : 'Joined'}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{language === 'tr' ? 'Topluluğa Katıl' : 'Join Community'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>{currentComm.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 font-normal">
                      Topluluk
                    </span>
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">{currentComm.handle}</span>
                </div>

                {currentComm.description && (
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
                    {currentComm.description}
                  </p>
                )}

                <div className="pt-2 flex items-center gap-4 text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Users className="w-4 h-4" />
                    <span>{currentComm.members_count.toLocaleString()} {language === 'tr' ? 'Üye' : 'Members'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : profileData ? (
          /* USER PROFILE VIEW */
          <div>
            {/* Banner */}
            <div className="h-28 w-full relative bg-zinc-900 overflow-hidden">
              <img
                src={
                  profileData.banner_url ||
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'
                }
                alt="Profile Banner"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-transparent to-black/30" />
            </div>

            {/* Main Info */}
            <div className="px-5 pb-5 relative">
              {/* Avatar & Follow Button */}
              <div className="flex justify-between items-end -mt-12 mb-3">
                <div className="relative">
                  <img
                    src={
                      profileData.avatar_url ||
                      `https://unavatar.io/github/${profileData.username}`
                    }
                    alt={profileData.display_name}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#121215] shadow-xl bg-zinc-900"
                  />
                  {profileData.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-lg border-2 border-[#121215]" title="Doğrulanmış Hesap">
                      <Shield className="w-3.5 h-3.5 fill-current" />
                    </div>
                  )}
                </div>

                {currentUser.username?.toLowerCase() !== profileData.username?.toLowerCase() && (
                  <div className="flex items-center gap-2">
                    {onStartDirectChat && (
                      <button
                        onClick={() => {
                          onStartDirectChat(profileData);
                          onClose();
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                        title={language === 'tr' ? 'Mesaj Gönder' : 'Send Message'}
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>{language === 'tr' ? 'Mesaj' : 'Message'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setIsFollowing(!isFollowing)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                        isFollowing
                          ? 'bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 border border-zinc-700 text-zinc-300'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{language === 'tr' ? 'Takip Ediliyor' : 'Following'}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{language === 'tr' ? 'Takip Et' : 'Follow'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Names & Bio */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-white">{profileData.display_name}</h3>
                    <UserBadges user={profileData} showTextLabels={false} />
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">@{profileData.username}</span>
                </div>

                {profileData.bio && (
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
                    {profileData.bio}
                  </p>
                )}

                {/* Metadata */}
                <div className="pt-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-zinc-400 font-mono">
                  {profileData.custom_fields?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{profileData.custom_fields.location}</span>
                    </span>
                  )}
                  {profileData.custom_fields?.github && (
                    <a
                      href={sanitizeUrl(profileData.custom_fields.github)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                    >
                      <Github className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{profileData.custom_fields.github}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Üyelik: {new Date(profileData.created_at || Date.now()).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>

              {/* Joined Communities list if any */}
              {communities && communities.filter(c => c.is_joined).length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-800/80">
                  <h4 className="text-xs font-bold text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>{language === 'tr' ? 'Üye Olduğu Topluluklar' : 'Joined Communities'}</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {communities.filter(c => c.is_joined).map((comm) => (
                      <span
                        key={comm.id}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center gap-1.5"
                      >
                        <img src={comm.avatar_url} alt={comm.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                        <span>{comm.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action */}
              {onNavigateToFullProfile && (
                <div className="mt-4 pt-3 border-t border-zinc-800/80">
                  <button
                    onClick={() => {
                      onNavigateToFullProfile(profileData);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Code2 className="w-4 h-4 text-blue-400" />
                    <span>{language === 'tr' ? 'Tüm Profili İncele' : 'View Full Profile'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

