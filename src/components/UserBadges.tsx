import React, { useState } from 'react';
import { CheckCircle2, Home, Shield, Code, Star, Sparkles, X, Award, GitBranch } from 'lucide-react';
import { UserProfile, BadgeItem, BadgeDefinition } from '../types';
import { loadStoredBadgeDefinitions } from '../services/supabaseClient';

export interface NormalizedBadge {
  id: string;
  label: string;
  description: string;
  weight: number;
  color: string;
  icon: 'code' | 'shield' | 'check' | 'star' | 'home' | 'sparkles' | 'award' | 'git';
}

interface UserBadgesProps {
  user?: Partial<UserProfile>;
  verified?: boolean;
  badges?: BadgeItem[];
  badgeDefinitions?: BadgeDefinition[];
  showTextLabels?: boolean;
  singleHighestWeightOnly?: boolean;
  className?: string;
}

export const getBadgeDetails = (
  badgeInput: { id?: string; label?: string; icon?: string; color?: string; description?: string },
  customDefinitions?: BadgeDefinition[]
): NormalizedBadge => {
  const label = (badgeInput.label || '').toLowerCase().trim();
  const id = (badgeInput.id || '').toLowerCase().trim();
  const defs = customDefinitions && customDefinitions.length > 0 ? customDefinitions : loadStoredBadgeDefinitions();

  // Check if defined in custom definitions
  const matchedDef = defs.find(
    (d) =>
      (id && d.id.toLowerCase() === id) ||
      (label && d.label.toLowerCase() === label) ||
      (id === 'verified_system' && d.id === 'verified_dev') ||
      (id === 'gitplus' && d.id === 'git_plus') ||
      (id === 'c4e_spark' && d.id === 'spark') ||
      ((id === 'beta' || id === 'beta_home' || id === 'beta_user' || id === 'closed_beta' || label.includes('beta')) && (d.id === 'beta_home' || d.id === 'beta'))
  );

  if (matchedDef) {
    return {
      id: matchedDef.id,
      label: badgeInput.label && !matchedDef.isDefault ? badgeInput.label : matchedDef.label,
      description: matchedDef.description || badgeInput.description || `${matchedDef.label} rozetidir.`,
      weight: matchedDef.weight || 6,
      color: badgeInput.color && badgeInput.color !== '#3b82f6' ? badgeInput.color : matchedDef.color,
      icon: matchedDef.icon as any
    };
  }

  // 1. Code4Ever Developer (Weight: 10) - Strictly Red (#ef4444)
  if (id === 'c4e_dev' || label === 'code4ever developer' || label === 'c4e developer') {
    return {
      id: badgeInput.id || 'c4e_dev',
      label: badgeInput.label || 'Code4Ever Developer',
      description: badgeInput.description || 'Code4Ever platformunun geliştirilmesine ve kodlanmasına katkıda bulunan yazılımcı geliştirici rozeti.',
      weight: 10,
      color: (badgeInput.color && badgeInput.color !== '#3b82f6') ? badgeInput.color : '#ef4444',
      icon: 'code'
    };
  }

  // 2. Code4Ever Yetkilisi / Admin (Weight: 9)
  if (id === 'c4e_admin' || label === 'code4ever yetkilisi' || label === 'c4e yetkilisi' || label === 'code4ever yetkili') {
    return {
      id: badgeInput.id || 'c4e_admin',
      label: badgeInput.label || 'Code4Ever Yetkilisi',
      description: badgeInput.description || 'Code4Ever yönetim ve topluluk moderasyon ekibine verilen resmi yetkili unvan rozeti.',
      weight: 9,
      color: badgeInput.color || '#a855f7',
      icon: 'check'
    };
  }

  // 3. Git+ (Weight: 8)
  if (id === 'git_plus' || id === 'gitplus' || label === 'git+' || label === 'git plus') {
    return {
      id: badgeInput.id || 'git_plus',
      label: badgeInput.label || 'Git+',
      description: badgeInput.description || 'Code4Ever Projesine üyelik veya abonelik yolu ile destek veren kullanıcılara verilen destekçi rozetidir.',
      weight: 8,
      color: badgeInput.color || '#f97316',
      icon: 'git'
    };
  }

  // 4. Verified / Doğrulanmış Geliştirici (Weight: 8)
  if (id === 'verified_dev' || id === 'verified' || id === 'verified_system' || label === 'doğrulanmış geliştirici' || label === 'doğrulanmış üye') {
    return {
      id: badgeInput.id || 'verified_dev',
      label: badgeInput.label || 'Doğrulanmış Geliştirici',
      description: badgeInput.description || 'Kimliği ve geliştirici profili resmi olarak doğrulanmış üyelere verilen onay rozeti.',
      weight: 8,
      color: badgeInput.color || '#06b6d4',
      icon: 'check'
    };
  }

  // 5. Spark Destekçi (Weight: 7)
  if (id === 'spark' || id === 'c4e_spark' || label === 'spark' || label === 'spark destekçi' || label === 'destekçi' || label.includes('spark')) {
    return {
      id: badgeInput.id || 'spark',
      label: badgeInput.label || 'Spark Destekçi',
      description: badgeInput.description || 'Code4Ever açık kaynak projesine maddi destekte bulunan özel Spark destekçi rozetidir. 250MB tek seferde dosya yükleme ayrıcalığı tanır.',
      weight: 7,
      color: badgeInput.color || '#f59e0b',
      icon: 'sparkles'
    };
  }

  // 6. Kapalı Beta Katılımcısı / Yeşil Ev (Weight: 6)
  if (
    id === 'beta_home' ||
    id === 'beta' ||
    id === 'beta_user' ||
    id === 'closed_beta' ||
    label === 'kapalı beta katılımcısı' ||
    label === 'yeşil ev' ||
    label === 'beta katılımcısı' ||
    label === 'beta' ||
    label.includes('beta') ||
    badgeInput.icon === 'home'
  ) {
    return {
      id: badgeInput.id || 'beta_home',
      label: badgeInput.label || 'Kapalı Beta Katılımcısı',
      description: badgeInput.description || 'Code4Ever platformunun erken aşama kapalı beta test sürecine katılıp platforma destek veren üyelere verilen yeşil ev rozetidir.',
      weight: 6,
      color: badgeInput.color || '#10b981',
      icon: 'home'
    };
  }

  // 7. Normal Kullanıcı (Weight: 1)
  if (id === 'normal_user' || label === 'normal kullanıcı') {
    return {
      id: badgeInput.id || 'normal_user',
      label: badgeInput.label || 'Normal Kullanıcı',
      description: badgeInput.description || 'Code4Ever topluluğunun kayıtlı aktif üye rozeti.',
      weight: 1,
      color: badgeInput.color || '#71717a',
      icon: 'star'
    };
  }

  // 8. Custom Badge / Subscription Badge Fallback
  let iconType: 'code' | 'shield' | 'check' | 'star' | 'home' | 'sparkles' | 'award' | 'git' = 'award';
  if (badgeInput.icon === 'code') iconType = 'code';
  else if (badgeInput.icon === 'shield') iconType = 'shield';
  else if (badgeInput.icon === 'check') iconType = 'check';
  else if (badgeInput.icon === 'star') iconType = 'star';
  else if (badgeInput.icon === 'home') iconType = 'home';
  else if (badgeInput.icon === 'sparkles') iconType = 'sparkles';
  else if (badgeInput.icon === 'git') iconType = 'git';

  const defaultDesc = badgeInput.label
    ? `Code4Ever ${badgeInput.label} ayrıcalıklı üye ve abonelik rozetidir.`
    : 'Kullanıcıya özel olarak tanımlanmış özel topluluk rozeti.';

  return {
    id: badgeInput.id || `badge_${Math.random().toString(36).substring(2, 7)}`,
    label: badgeInput.label || 'Özel Rozet',
    description: badgeInput.description || defaultDesc,
    weight: 3,
    color: badgeInput.color || '#3b82f6',
    icon: iconType
  };
};

export const UserBadges: React.FC<UserBadgesProps> = ({
  user,
  verified: verifiedProp,
  badges: badgesProp,
  badgeDefinitions,
  showTextLabels = false,
  singleHighestWeightOnly = false,
  className = 'inline-flex items-center gap-1.5 flex-wrap'
}) => {
  const [selectedBadgeForDetail, setSelectedBadgeForDetail] = useState<NormalizedBadge | null>(null);

  const isVerified = user ? user.verified : verifiedProp;
  const userBadges = user
    ? (Array.isArray(user.badges) && user.badges.length > 0
        ? user.badges
        : Array.isArray(user.custom_fields?.badges) && user.custom_fields.badges.length > 0
        ? user.custom_fields.badges
        : [])
    : (badgesProp || []);
  const userSub = user?.subscription;

  const normalizedList: NormalizedBadge[] = [];

  // Add verified checkmark badge if user.verified is true
  if (isVerified) {
    const hasVerifiedInBadges = userBadges.some(b => 
      (b.label || '').toLowerCase().includes('doğrulanmış') ||
      (b.id || '').toLowerCase().includes('verified')
    );
    if (!hasVerifiedInBadges) {
      normalizedList.push(getBadgeDetails({
        id: 'verified_dev',
        label: 'Doğrulanmış Geliştirici',
        color: '#06b6d4',
        icon: 'check'
      }, badgeDefinitions));
    }
  }

  // Add Beta badge if user.betaStatus is 'approved'
  if (user?.betaStatus === 'approved') {
    const hasBetaInBadges = userBadges.some(b =>
      b.id === 'beta_home' ||
      b.id === 'beta' ||
      b.icon === 'home' ||
      (b.label || '').toLowerCase().includes('beta')
    );
    if (!hasBetaInBadges) {
      normalizedList.push(getBadgeDetails({
        id: 'beta_home',
        label: 'Kapalı Beta Katılımcısı',
        color: '#10b981',
        icon: 'home'
      }, badgeDefinitions));
    }
  }

  // Push user's explicit badges
  userBadges.forEach(b => {
    normalizedList.push(getBadgeDetails(b, badgeDefinitions));
  });

  // If user has Spark role, ensure Spark badge exists
  if (user && (user.role?.toLowerCase() === 'spark' || user.role?.toLowerCase().includes('spark'))) {
    const hasSpark = normalizedList.some(b => b.id === 'spark' || b.label.toLowerCase().includes('spark'));
    if (!hasSpark) {
      normalizedList.push(getBadgeDetails({
        id: 'spark',
        label: 'Spark Destekçi',
        color: '#f59e0b',
        icon: 'sparkles',
        description: 'Code4Ever açık kaynak projesine maddi destekte bulunan özel Spark destekçi rozetidir. 250MB tek seferde dosya yükleme ayrıcalığı tanır.'
      }, badgeDefinitions));
    }
  }

  // If user has an active subscription or support status, ensure badge exists in display list
  if (userSub && userSub.isActive && userSub.planName) {
    const subPlanNameClean = userSub.planName.trim();
    const hasSubBadgeInList = normalizedList.some(b => 
      b.label.toLowerCase() === subPlanNameClean.toLowerCase() ||
      (subPlanNameClean.toLowerCase().includes('spark') && b.id === 'spark') ||
      (subPlanNameClean.toLowerCase().includes('destek') && b.id === 'spark') ||
      (subPlanNameClean.toLowerCase().includes('pro') && b.id === 'c4e_dev') ||
      (subPlanNameClean.toLowerCase().includes('git') && b.id === 'git_plus') ||
      (subPlanNameClean.toLowerCase().includes('enterprise') && b.id === 'c4e_admin')
    );

    if (!hasSubBadgeInList) {
      let subColor = '#f59e0b';
      let subBadgeLabel = subPlanNameClean;
      let subIcon: 'code' | 'shield' | 'check' | 'git' | 'star' | 'sparkles' = 'sparkles';
      let subDesc = `Code4Ever ${userSub.planName} desteği kapsamında kullanıcıya tanımlanan özel destekçi rozeti.`;

      if (subPlanNameClean.toLowerCase().includes('spark') || subPlanNameClean.toLowerCase().includes('destek')) {
        subBadgeLabel = 'Spark Destekçi';
        subColor = '#f59e0b'; // Amber
        subIcon = 'sparkles';
        subDesc = 'Code4Ever açık kaynak projesine maddi destekte bulunan özel Spark destekçi rozetidir. 250MB tek seferde dosya yükleme ayrıcalığı tanır.';
      } else if (subPlanNameClean.toLowerCase().includes('pro')) {
        subBadgeLabel = 'Code4Ever Developer';
        subColor = '#ef4444'; // Red
        subIcon = 'code';
      } else if (subPlanNameClean.toLowerCase().includes('git')) {
        subBadgeLabel = 'Git+';
        subColor = '#f97316'; // Orange
        subIcon = 'git';
      } else if (subPlanNameClean.toLowerCase().includes('enterprise')) {
        subBadgeLabel = 'Code4Ever Yetkilisi';
        subColor = '#a855f7'; // Purple
        subIcon = 'check';
      }

      normalizedList.push(getBadgeDetails({
        id: `sub_${userSub.planId || 'active'}`,
        label: subBadgeLabel,
        description: subDesc,
        color: subColor,
        icon: subIcon
      }, badgeDefinitions));
    }
  }

  // Deduplicate badges by normalized ID
  const seenIds = new Set<string>();
  const uniqueList: NormalizedBadge[] = [];
  for (const item of normalizedList) {
    const key = item.id.toLowerCase();
    if (!seenIds.has(key)) {
      seenIds.add(key);
      uniqueList.push(item);
    }
  }

  // Sort descending by weight (highest weight first: 10, 9, 8, 7, 6, 1)
  uniqueList.sort((a, b) => b.weight - a.weight);

  // In compact/singleHighestWeightOnly mode, show up to 3 badges so Beta, Verified, etc. can all be visible
  const displayBadges = singleHighestWeightOnly
    ? uniqueList.slice(0, 3)
    : uniqueList;

  if (displayBadges.length === 0) return null;

  const renderIcon = (badge: NormalizedBadge, sizeClass = "w-3.5 h-3.5") => {
    if (badge.icon === 'home') {
      return <Home className={`${sizeClass} flex-shrink-0 fill-emerald-500/20`} style={{ color: badge.color }} />;
    }
    if (badge.icon === 'code') {
      return <Code className={`${sizeClass} flex-shrink-0`} style={{ color: badge.color }} />;
    }
    if (badge.icon === 'shield') {
      // Shield icon completely removed per user request: replace with clean verified checkmark
      return <CheckCircle2 className={`${sizeClass} flex-shrink-0 fill-current/20`} style={{ color: badge.color }} />;
    }
    if (badge.icon === 'check') {
      return <CheckCircle2 className={`${sizeClass} flex-shrink-0 fill-current/20`} style={{ color: badge.color }} />;
    }
    if (badge.icon === 'star') {
      return <Star className={`${sizeClass} flex-shrink-0`} style={{ color: badge.color }} />;
    }
    if (badge.icon === 'sparkles') {
      return <Sparkles className={`${sizeClass} flex-shrink-0`} style={{ color: badge.color }} />;
    }
    if (badge.icon === 'git') {
      return <GitBranch className={`${sizeClass} flex-shrink-0`} style={{ color: badge.color }} />;
    }
    return <Award className={`${sizeClass} flex-shrink-0`} style={{ color: badge.color }} />;
  };

  return (
    <>
      <div className={className}>
        {displayBadges.map((badge, idx) => (
          <button
            type="button"
            key={`${badge.id}_${idx}`}
            title={badge.label}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setSelectedBadgeForDetail(badge);
            }}
            style={{
              backgroundColor: `${badge.color}18`,
              borderColor: `${badge.color}45`,
              color: badge.color
            }}
            className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
          >
            {renderIcon(badge)}
            {showTextLabels && <span>{badge.label}</span>}
          </button>
        ))}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadgeForDetail && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedBadgeForDetail(null);
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl overflow-hidden border border-zinc-800 bg-[#09090b] shadow-2xl text-center p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Glow in badge color */}
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-35 blur-2xl pointer-events-none"
              style={{ backgroundColor: selectedBadgeForDetail.color }}
            />

            {/* Close Button */}
            <button
              onClick={() => setSelectedBadgeForDetail(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Centered Badge Logo Container */}
            <div className="pt-2 flex justify-center relative">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center ring-4 ring-white/10 shadow-2xl transition-transform hover:scale-105"
                style={{
                  backgroundColor: `${selectedBadgeForDetail.color}25`,
                  borderColor: selectedBadgeForDetail.color,
                  borderWidth: '2px',
                  color: selectedBadgeForDetail.color
                }}
              >
                {renderIcon(selectedBadgeForDetail, "w-10 h-10")}
              </div>
            </div>

            {/* Title */}
            <div className="relative">
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                {selectedBadgeForDetail.label}
              </h3>
            </div>

            {/* Badge Description */}
            <div
              className="p-4 rounded-2xl border text-xs text-zinc-300 leading-relaxed font-sans text-center shadow-inner"
              style={{
                backgroundColor: `${selectedBadgeForDetail.color}0d`,
                borderColor: `${selectedBadgeForDetail.color}35`
              }}
            >
              <p className="font-medium">{selectedBadgeForDetail.description}</p>
            </div>

            {/* Close Action */}
            <button
              onClick={() => setSelectedBadgeForDetail(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700/60 shadow-md"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </>
  );
};

