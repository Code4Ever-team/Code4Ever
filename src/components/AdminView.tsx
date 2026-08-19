import React, { useState, useMemo, useCallback } from 'react';
import { UserProfile, ClosedBetaSettings, BadgeItem, SubscriptionPlan, BadgeDefinition, PlatformSettings } from '../types';
import { UserBadges } from './UserBadges';
import {
  Shield,
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  Home,
  CheckCircle2,
  XCircle,
  Sparkles,
  GitBranch,
  Crown,
  UserX,
  Calendar,
  AlertTriangle,
  Clock,
  CreditCard,
  Ban,
  Check,
  Edit2,
  Code,
  Globe,
  Award,
  Sliders,
  RotateCcw,
  Tag,
  Layers,
  Star,
  Zap,
  Info
} from 'lucide-react';
import { DEFAULT_BADGE_DEFINITIONS, DEFAULT_PLATFORM_SETTINGS } from '../services/supabaseClient';
import { verifyAdminAccess, sanitizeText } from '../utils/securityHelper';

interface AdminViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  closedBetaSettings: ClosedBetaSettings;
  subscriptionPlans: SubscriptionPlan[];
  badgeDefinitions?: BadgeDefinition[];
  platformSettings?: PlatformSettings;
  language: 'tr' | 'en';
  onToggleClosedBeta: (isActive: boolean) => void;
  onUpdateUser: (userId: string, updatedData: Partial<UserProfile>) => void;
  onDeleteUser: (userId: string) => void;
  onSaveSubscriptionPlans: (plans: SubscriptionPlan[]) => void;
  onSaveBadgeDefinitions?: (badges: BadgeDefinition[]) => void;
  onSavePlatformSettings?: (settings: PlatformSettings) => void;
}

// Regex to validate hex color codes
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// Sanitize user inputs to prevent XSS
const sanitizeInput = (str: string): string => {
  if (!str) return '';
  return str.replace(/[<>"]/g, '').trim();
};

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  allUsers,
  closedBetaSettings,
  subscriptionPlans,
  badgeDefinitions = DEFAULT_BADGE_DEFINITIONS,
  platformSettings = DEFAULT_PLATFORM_SETTINGS,
  language,
  onToggleClosedBeta,
  onUpdateUser,
  onDeleteUser,
  onSaveSubscriptionPlans,
  onSaveBadgeDefinitions,
  onSavePlatformSettings
}) => {
  // Strict admin authorization check
  const isAdminAuthorized = useMemo(() => {
    return verifyAdminAccess(currentUser);
  }, [currentUser]);

  const [activeTab, setActiveTab] = useState<'beta' | 'badges' | 'definitions' | 'platform' | 'subscriptions'>('beta');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserForBadges, setSelectedUserForBadges] = useState<UserProfile | null>(null);

  // Custom badge form state
  const [newBadgeLabel, setNewBadgeLabel] = useState('');
  const [newBadgeColor, setNewBadgeColor] = useState('#10b981');
  const [newBadgeIcon, setNewBadgeIcon] = useState<'home' | 'code' | 'shield' | 'star' | 'check' | 'git'>('home');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Platform Settings State
  const [platformBrandTitle, setPlatformBrandTitle] = useState(platformSettings.brandTitle || 'Code4Ever Platform');
  const [platformBrandDomain, setPlatformBrandDomain] = useState(platformSettings.brandDomain || 'code4ever.ai.studio');
  const [platformBrandDescription, setPlatformBrandDescription] = useState(platformSettings.brandDescription || '');
  const [platformBrandSlogan, setPlatformBrandSlogan] = useState(platformSettings.brandSlogan || '');

  // Badge Definitions State
  const [editingBadgeDef, setEditingBadgeDef] = useState<BadgeDefinition | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [badgeDefId, setBadgeDefId] = useState('');
  const [badgeDefLabel, setBadgeDefLabel] = useState('');
  const [badgeDefDescription, setBadgeDefDescription] = useState('');
  const [badgeDefColor, setBadgeDefColor] = useState('#3b82f6');
  const [badgeDefIcon, setBadgeDefIcon] = useState<'code' | 'shield' | 'check' | 'star' | 'home' | 'sparkles' | 'award' | 'git'>('code');
  const [badgeDefWeight, setBadgeDefWeight] = useState(5);

  // Ban/Suspension state
  const [banReasonInput, setBanReasonInput] = useState('');
  const [suspendDaysInput, setSuspendDaysInput] = useState('7');

  // Subscription Assignment State
  const [assignUserId, setAssignUserId] = useState('');
  const [assignPlanId, setAssignPlanId] = useState('');
  const [assignDurationDays, setAssignDurationDays] = useState('30');

  // Subscription Plan Form State
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planPeriod, setPlanPeriod] = useState('Aylık');
  const [planDescription, setPlanDescription] = useState('');
  const [planBadgeLabel, setPlanBadgeLabel] = useState('');
  const [planBadgeColor, setPlanBadgeColor] = useState('#3b82f6');
  const [planBadgeIcon, setPlanBadgeIcon] = useState('code');
  const [planFeatures, setPlanFeatures] = useState('');

  const showNotification = useCallback((msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  }, []);

  // Memoized user lists
  const pendingBetaUsers = useMemo(() => {
    return allUsers.filter(
      (u) =>
        u.username.toLowerCase() !== 'nylithra' &&
        (u.betaStatus === 'pending' || (u.betaContact && u.betaStatus !== 'approved' && u.betaStatus !== 'rejected'))
    );
  }, [allUsers]);

  const approvedBetaUsers = useMemo(() => {
    return allUsers.filter(
      (u) => u.username.toLowerCase() !== 'nylithra' && u.betaStatus === 'approved'
    );
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    if (!cleanSearch) return allUsers;
    return allUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(cleanSearch) ||
        u.display_name.toLowerCase().includes(cleanSearch)
    );
  }, [allUsers, searchTerm]);

  // Unauthorized access block
  if (!isAdminAuthorized) {
    return (
      <div className="flex-1 min-w-0 w-full min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6 border-r border-zinc-800/60">
        <div className="bg-[#0c0c0e] border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Erişim Engellendi</h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Code4Ever Admin Paneline yalnızca yetkili sistem yöneticisi erişebilir.
          </p>
        </div>
      </div>
    );
  }

  const handleApproveBetaUser = (user: UserProfile) => {
    const existingBadges = user.badges || [];
    const hasHome = existingBadges.some((b) => b.id === 'beta_home' || b.icon === 'home');

    const updatedBadges = hasHome
      ? existingBadges
      : [
          ...existingBadges,
          {
            id: 'beta_home',
            label: 'Kapalı Beta Katılımcısı',
            color: '#10b981',
            icon: 'home'
          }
        ];

    onUpdateUser(user.id, {
      betaStatus: 'approved',
      badges: updatedBadges
    });

    showNotification(`@${user.username} için Kapalı Beta başvurusu onaylandı ve yeşil ev rozeti verildi!`);
  };

  const handleRejectBetaUser = (user: UserProfile) => {
    onUpdateUser(user.id, { betaStatus: 'rejected' });
    showNotification(`@${user.username} başvurusu reddedildi.`);
  };

  const handleToggleVerified = (user: UserProfile) => {
    const newVerified = !user.verified;
    onUpdateUser(user.id, { verified: newVerified });
    if (selectedUserForBadges?.id === user.id) {
      setSelectedUserForBadges({ ...selectedUserForBadges, verified: newVerified });
    }
    showNotification(`@${user.username} için Mavi Tık: ${newVerified ? 'AÇIK' : 'KAPALI'}`);
  };

  const handleToggleGreenHomeBadge = (user: UserProfile) => {
    const existingBadges = user.badges || [];
    const hasHome = existingBadges.some((b) => b.id === 'beta_home' || b.icon === 'home');

    const updatedBadges = hasHome
      ? existingBadges.filter((b) => b.id !== 'beta_home' && b.icon !== 'home')
      : [
          ...existingBadges,
          {
            id: 'beta_home',
            label: 'Kapalı Beta Katılımcısı',
            color: '#10b981',
            icon: 'home'
          }
        ];

    onUpdateUser(user.id, { badges: updatedBadges });
    if (selectedUserForBadges?.id === user.id) {
      setSelectedUserForBadges({ ...selectedUserForBadges, badges: updatedBadges });
    }
    showNotification(`@${user.username} için Yeşil Ev Rozeti: ${hasHome ? 'Kaldırıldı' : 'Eklendi'}`);
  };

  const handleToggleNamedBadge = (
    user: UserProfile,
    badgeLabel: string,
    defaultColor: string,
    defaultIcon: 'code' | 'shield' | 'check' | 'star' | 'home' | 'git' | 'sparkles' | 'spark',
    badgeId: string
  ) => {
    const existingBadges = user.badges || [];
    const hasBadge = existingBadges.some(
      (b) => b.id === badgeId || b.label?.toLowerCase() === badgeLabel.toLowerCase()
    );

    const updatedBadges = hasBadge
      ? existingBadges.filter((b) => b.id !== badgeId && b.label?.toLowerCase() !== badgeLabel.toLowerCase())
      : [
          ...existingBadges,
          {
            id: badgeId,
            label: badgeLabel,
            color: defaultColor,
            icon: defaultIcon
          }
        ];

    onUpdateUser(user.id, { badges: updatedBadges });
    if (selectedUserForBadges?.id === user.id) {
      setSelectedUserForBadges({ ...selectedUserForBadges, badges: updatedBadges });
    }
    showNotification(`@${user.username} için ${badgeLabel} Rozeti: ${hasBadge ? 'Kaldırıldı' : 'Eklendi'}`);
  };

  const handleAddCustomBadge = () => {
    if (!selectedUserForBadges) return;

    const sanitizedLabel = sanitizeInput(newBadgeLabel);
    if (!sanitizedLabel) return;

    if (sanitizedLabel.length > 35) {
      alert('Rozet etiket ismi maksimum 35 karakter olabilir.');
      return;
    }

    const currentBadges = selectedUserForBadges.badges || [];
    if (currentBadges.length >= 10) {
      alert('Bir kullanıcıya maksimum 10 adet özel rozet eklenebilir.');
      return;
    }

    const safeColor = HEX_COLOR_REGEX.test(newBadgeColor) ? newBadgeColor : '#3b82f6';

    const newBadge: BadgeItem = {
      id: `badge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: sanitizedLabel,
      color: safeColor,
      icon: newBadgeIcon
    };

    const updatedBadges = [...currentBadges, newBadge];

    onUpdateUser(selectedUserForBadges.id, { badges: updatedBadges });
    setSelectedUserForBadges({ ...selectedUserForBadges, badges: updatedBadges });
    setNewBadgeLabel('');
    showNotification(`@${selectedUserForBadges.username} için "${sanitizedLabel}" rozeti eklendi!`);
  };

  const handleRemoveBadge = (badgeId: string) => {
    if (!selectedUserForBadges) return;
    const updatedBadges = (selectedUserForBadges.badges || []).filter((b) => b.id !== badgeId);
    onUpdateUser(selectedUserForBadges.id, { badges: updatedBadges });
    setSelectedUserForBadges({ ...selectedUserForBadges, badges: updatedBadges });
    showNotification(`Rozet kaldırıldı.`);
  };

  // Account Suspension / Ban / Delete Actions
  const handleToggleBan = (user: UserProfile) => {
    const nextBanned = !user.isBanned;
    onUpdateUser(user.id, {
      isBanned: nextBanned,
      banReason: nextBanned ? (banReasonInput.trim() || 'Topluluk kuralları ihlali') : undefined,
      suspendedUntil: undefined
    });
    if (selectedUserForBadges?.id === user.id) {
      setSelectedUserForBadges({
        ...selectedUserForBadges,
        isBanned: nextBanned,
        banReason: nextBanned ? (banReasonInput.trim() || 'Topluluk kuralları ihlali') : undefined
      });
    }
    showNotification(`@${user.username} hesabı ${nextBanned ? 'YASAKLANDI (BAN)' : 'Yasağı kaldırıldı'}.`);
  };

  const handleSuspendUser = (user: UserProfile) => {
    const days = parseInt(suspendDaysInput) || 7;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    onUpdateUser(user.id, {
      suspendedUntil: expiryDate.toISOString(),
      isBanned: false
    });
    if (selectedUserForBadges?.id === user.id) {
      setSelectedUserForBadges({
        ...selectedUserForBadges,
        suspendedUntil: expiryDate.toISOString(),
        isBanned: false
      });
    }
    showNotification(`@${user.username} hesabı ${days} gün süreyle askıya alındı.`);
  };

  const handleUnsuspendUser = (user: UserProfile) => {
    onUpdateUser(user.id, { suspendedUntil: undefined });
    if (selectedUserForBadges?.id === user.id) {
      setSelectedUserForBadges({ ...selectedUserForBadges, suspendedUntil: undefined });
    }
    showNotification(`@${user.username} hesabının askısı kaldırıldı.`);
  };

  const handleDeleteAccountPermanently = (user: UserProfile) => {
    if (user.username?.toLowerCase() === 'nylithra') {
      alert('Sistem yöneticisi hesabı silinemez!');
      return;
    }
    if (confirm(`@${user.username} kullanıcısını KALICI OLARAK silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
      onDeleteUser(user.id);
      if (selectedUserForBadges?.id === user.id) setSelectedUserForBadges(null);
      showNotification(`@${user.username} hesabı veritabanından kalıcı olarak silindi.`);
    }
  };

  // Assign Subscription Action
  const handleAssignSubscription = () => {
    if (!assignUserId || !assignPlanId) {
      alert('Lütfen bir kullanıcı ve abonelik paketi seçiniz.');
      return;
    }

    const targetUser = allUsers.find((u) => u.id === assignUserId);
    const targetPlan = subscriptionPlans.find((p) => p.id === assignPlanId);
    if (!targetUser || !targetPlan) return;

    let expiresAt: string | undefined;
    if (assignDurationDays !== 'lifetime') {
      const days = parseInt(assignDurationDays) || 30;
      const exp = new Date();
      exp.setDate(exp.getDate() + days);
      expiresAt = exp.toISOString();
    }

    // Automatically attach plan's badge to user's badges if present
    let updatedBadges = targetUser.badges || [];
    if (targetPlan.badgeLabel) {
      const bId = targetPlan.badgeId || `sub_${targetPlan.id}`;
      const badgeColor = (bId === 'c4e_dev' || targetPlan.badgeLabel.toLowerCase().includes('developer'))
        ? '#ef4444'
        : (targetPlan.badgeColor || '#3b82f6');
      const badgeDesc = `${targetPlan.name} aboneliği kapsamında kullanıcıya verilen özel ${targetPlan.badgeLabel} rozetidir.`;

      const existingIndex = updatedBadges.findIndex((b) => b.id === bId || b.label?.toLowerCase() === targetPlan.badgeLabel?.toLowerCase());
      if (existingIndex >= 0) {
        updatedBadges[existingIndex] = {
          id: bId,
          label: targetPlan.badgeLabel,
          color: badgeColor,
          icon: targetPlan.badgeIcon || 'code',
          description: badgeDesc
        };
      } else {
        updatedBadges = [
          ...updatedBadges,
          {
            id: bId,
            label: targetPlan.badgeLabel,
            color: badgeColor,
            icon: targetPlan.badgeIcon || 'code',
            description: badgeDesc
          }
        ];
      }
    }

    const subscriptionData = {
      planId: targetPlan.id,
      planName: targetPlan.name,
      assignedAt: new Date().toISOString(),
      expiresAt,
      isActive: true
    };

    onUpdateUser(targetUser.id, {
      subscription: subscriptionData,
      badges: updatedBadges
    });

    showNotification(`@${targetUser.username} kullanıcısına ${targetPlan.name} aboneliği ve rozeti tanımlandı!`);
  };

  const handleCancelSubscription = (user: UserProfile) => {
    onUpdateUser(user.id, { subscription: undefined });
    showNotification(`@${user.username} aboneliği iptal edildi.`);
  };

  // Spark / Supporter Role and Badge Removal
  const handleRemoveSupporterRole = (user: UserProfile) => {
    const existingBadges = user.badges || [];
    const updatedBadges = existingBadges.filter(
      (b) => b.id !== 'spark' && b.id !== 'c4e_spark' && !b.label?.toLowerCase().includes('spark')
    );

    const isCurrentRoleSpark = user.role?.toLowerCase() === 'spark';
    const newRole = isCurrentRoleSpark ? 'Developer' : user.role;

    onUpdateUser(user.id, {
      role: newRole,
      badges: updatedBadges,
      subscription: user.subscription?.planId === 'spark' ? undefined : user.subscription
    });

    if (selectedUserForBadges?.id === user.id) {
      setSelectedUserForBadges({
        ...selectedUserForBadges,
        role: newRole,
        badges: updatedBadges,
        subscription: user.subscription?.planId === 'spark' ? undefined : user.subscription
      });
    }

    showNotification(`@${user.username} kullanıcısının Spark Destekçi rolü ve rozeti silindi.`);
  };

  // Subscription Plan Form Save
  const handleOpenPlanModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanName(plan.name);
      setPlanPrice(plan.price);
      setPlanPeriod(plan.period);
      setPlanDescription(plan.description);
      setPlanBadgeLabel(plan.badgeLabel || '');
      setPlanBadgeColor(plan.badgeColor || '#3b82f6');
      setPlanBadgeIcon(plan.badgeIcon || 'code');
      setPlanFeatures(plan.features.join('\n'));
    } else {
      setEditingPlan(null);
      setPlanName('');
      setPlanPrice('₺49');
      setPlanPeriod('Aylık');
      setPlanDescription('');
      setPlanBadgeLabel('');
      setPlanBadgeColor('#3b82f6');
      setPlanBadgeIcon('code');
      setPlanFeatures('Özel Rozet\nSınırsız EveryChat');
    }
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = () => {
    const cleanName = sanitizeInput(planName);
    if (!cleanName) {
      alert('Lütfen paket adı giriniz.');
      return;
    }

    const featuresArr = planFeatures
      .split('\n')
      .map((f) => sanitizeInput(f))
      .filter((f) => f.length > 0);

    const newPlan: SubscriptionPlan = {
      id: editingPlan ? editingPlan.id : `plan_${Date.now()}`,
      name: cleanName,
      price: sanitizeInput(planPrice) || '₺0',
      period: sanitizeInput(planPeriod) || 'Aylık',
      description: sanitizeInput(planDescription),
      features: featuresArr,
      badgeId: editingPlan?.badgeId || `badge_${Date.now()}`,
      badgeLabel: sanitizeInput(planBadgeLabel),
      badgeColor: HEX_COLOR_REGEX.test(planBadgeColor) ? planBadgeColor : '#3b82f6',
      badgeIcon: planBadgeIcon,
      isActive: true
    };

    let updatedPlans: SubscriptionPlan[];
    if (editingPlan) {
      updatedPlans = subscriptionPlans.map((p) => (p.id === editingPlan.id ? newPlan : p));
    } else {
      updatedPlans = [...subscriptionPlans, newPlan];
    }

    onSaveSubscriptionPlans(updatedPlans);
    setIsPlanModalOpen(false);
    showNotification(`Abonelik paketi kaydedildi.`);
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm('Bu abonelik paketini silmek istediğinize emin misiniz?')) {
      const updated = subscriptionPlans.filter((p) => p.id !== planId);
      onSaveSubscriptionPlans(updated);
      showNotification('Abonelik paketi silindi.');
    }
  };

  // Badge Definitions Handlers
  const handleOpenBadgeDefModal = (bDef?: BadgeDefinition) => {
    if (bDef) {
      setEditingBadgeDef(bDef);
      setBadgeDefId(bDef.id);
      setBadgeDefLabel(bDef.label);
      setBadgeDefDescription(bDef.description || '');
      setBadgeDefColor(bDef.color || '#3b82f6');
      setBadgeDefIcon(bDef.icon || 'code');
      setBadgeDefWeight(bDef.weight || 5);
    } else {
      setEditingBadgeDef(null);
      setBadgeDefId('');
      setBadgeDefLabel('');
      setBadgeDefDescription('');
      setBadgeDefColor('#3b82f6');
      setBadgeDefIcon('code');
      setBadgeDefWeight(5);
    }
    setIsBadgeModalOpen(true);
  };

  const handleSaveBadgeDef = () => {
    const cleanLabel = sanitizeInput(badgeDefLabel);
    if (!cleanLabel) {
      alert('Lütfen bir rozet adı giriniz.');
      return;
    }

    const cleanId = (sanitizeInput(badgeDefId) || cleanLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_')).toLowerCase();
    const cleanDesc = sanitizeInput(badgeDefDescription) || `${cleanLabel} rozeti.`;

    const newDef: BadgeDefinition = {
      id: cleanId,
      label: cleanLabel,
      description: cleanDesc,
      color: HEX_COLOR_REGEX.test(badgeDefColor) ? badgeDefColor : '#3b82f6',
      icon: badgeDefIcon,
      weight: Number(badgeDefWeight) || 5,
      isDefault: editingBadgeDef ? editingBadgeDef.isDefault : false
    };

    let updated: BadgeDefinition[];
    if (editingBadgeDef) {
      updated = badgeDefinitions.map((b) => (b.id === editingBadgeDef.id ? newDef : b));
    } else {
      const existingIdx = badgeDefinitions.findIndex((b) => b.id === cleanId);
      if (existingIdx >= 0) {
        updated = badgeDefinitions.map((b) => (b.id === cleanId ? newDef : b));
      } else {
        updated = [...badgeDefinitions, newDef];
      }
    }

    if (onSaveBadgeDefinitions) {
      onSaveBadgeDefinitions(updated);
    }
    setIsBadgeModalOpen(false);
    showNotification('Rozet tanımı başarıyla kaydedildi.');
  };

  const handleDeleteBadgeDef = (id: string) => {
    if (confirm(`Bu rozet tanımını silmek istediğinize emin misiniz?`)) {
      const updated = badgeDefinitions.filter((b) => b.id !== id);
      if (onSaveBadgeDefinitions) {
        onSaveBadgeDefinitions(updated);
      }
      showNotification('Rozet tanımı silindi.');
    }
  };

  const handleResetBadgeDefsToDefault = () => {
    if (confirm('Tüm rozet tanımlarını ve açıklamalarını varsayılan fabrika ayarlarına sıfırlamak istediğinize emin misiniz?')) {
      if (onSaveBadgeDefinitions) {
        onSaveBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS);
      }
      showNotification('Rozetler varsayılan ayarlara sıfırlandı.');
    }
  };

  // Platform Settings Handlers
  const handleSavePlatformSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings: PlatformSettings = {
      brandTitle: sanitizeInput(platformBrandTitle) || 'Code4Ever Platform',
      brandDomain: sanitizeInput(platformBrandDomain) || 'code4ever.ai.studio',
      brandDescription: sanitizeInput(platformBrandDescription),
      brandSlogan: sanitizeInput(platformBrandSlogan),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.username
    };

    if (onSavePlatformSettings) {
      onSavePlatformSettings(newSettings);
    }
    showNotification('Platform ve marka ayarları kaydedildi.');
  };

  const handleResetPlatformSettingsToDefault = () => {
    if (confirm('Platform ve marka yazılarını varsayılana sıfırlamak istediğinize emin misiniz?')) {
      setPlatformBrandTitle(DEFAULT_PLATFORM_SETTINGS.brandTitle);
      setPlatformBrandDomain(DEFAULT_PLATFORM_SETTINGS.brandDomain);
      setPlatformBrandDescription(DEFAULT_PLATFORM_SETTINGS.brandDescription || '');
      setPlatformBrandSlogan(DEFAULT_PLATFORM_SETTINGS.brandSlogan || '');

      if (onSavePlatformSettings) {
        onSavePlatformSettings(DEFAULT_PLATFORM_SETTINGS);
      }
      showNotification('Platform ayarları varsayılana sıfırlandı.');
    }
  };

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/80 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Code4Ever Admin Paneli</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-blue-600 text-white rounded-full">
                ADMIN: {currentUser.username}
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono">
              Sistem yönetimi, Rozetler, Platform markası ve Abonelik ayarları
            </p>
          </div>
        </div>
      </div>

      {/* Action Toast */}
      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-500/10 border-y border-emerald-500/30 px-4 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="p-4 border-b border-zinc-800/60 flex items-center gap-2 bg-[#0c0c0e] flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('beta')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'beta'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Kapalı Beta</span>
          {pendingBetaUsers.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-mono bg-amber-500 text-black rounded-full font-bold">
              {pendingBetaUsers.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'badges'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <UserX className="w-4 h-4 text-blue-400" />
          <span>Kullanıcı & Rozet Atama</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('definitions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'definitions'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Award className="w-4 h-4 text-purple-400" />
          <span>Rozet Tanımları & Açıklamaları</span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono bg-purple-500/20 text-purple-300 rounded-full font-bold">
            {badgeDefinitions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('platform')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'platform'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          <span>Platform & Marka Ayarları</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Abonelik Yönetimi</span>
        </button>
      </div>

      {/* TAB 1: KAPALI BETA YÖNETİMİ */}
      {activeTab === 'beta' && (
        <div className="p-6 space-y-6">
          {/* Closed Beta Status Control Card */}
          <div className="p-5 rounded-3xl bg-[#0c0c0e] border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Kapalı Beta Modu Anahtarı</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Mevcut Durum:{' '}
                  <span
                    className={`font-bold font-mono ${
                      closedBetaSettings.isActive ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    {closedBetaSettings.isActive ? 'BETA AÇIK' : 'BETA KAPALI'}
                  </span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Kapalı beta <strong className="text-white">AÇIK</strong> olduğunda, onaylanmamış kullanıcılar ve misafir girişi engellenerek başvuru ekranına yönlendirilir.
                </p>
              </div>

              <button
                onClick={() => onToggleClosedBeta(!closedBetaSettings.isActive)}
                className={`px-5 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
                  closedBetaSettings.isActive
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
              >
                {closedBetaSettings.isActive ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Kapalı Beta: AÇIK</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-zinc-400" />
                    <span>Kapalı Beta: KAPALI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pending Applications List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 font-mono px-1">
              <span>Bekleyen Kapalı Beta Başvuruları ({pendingBetaUsers.length})</span>
            </div>

            {pendingBetaUsers.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#0c0c0e] border border-zinc-800/60 text-center text-zinc-500 text-xs font-mono">
                Bekleyen yeni beta başvurusu yok.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingBetaUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-[#0c0c0e] border border-zinc-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={u.display_name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-800 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{u.display_name}</h4>
                          <span className="text-xs text-zinc-500 font-mono">@{u.username}</span>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                          İletişim: <strong className="text-white">{sanitizeInput(u.betaContact || 'Belirtilmedi')}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproveBetaUser(u)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Onayla</span>
                      </button>
                      <button
                        onClick={() => handleRejectBetaUser(u)}
                        className="px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5 border border-red-500/30"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reddet</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved Beta Users List */}
          <div className="space-y-3 pt-4 border-t border-zinc-800/60">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 font-mono px-1">
              <span>Onaylı Beta Katılımcıları ({approvedBetaUsers.length})</span>
            </div>

            {approvedBetaUsers.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#0c0c0e] border border-zinc-800/60 text-center text-zinc-500 text-xs font-mono">
                Henüz onaylı beta katılımcısı bulunmuyor.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {approvedBetaUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-2xl bg-[#0c0c0e] border border-zinc-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={u.display_name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{u.display_name}</h4>
                        <span className="text-[10px] text-zinc-500 font-mono block">@{u.username}</span>
                      </div>
                    </div>
                    <UserBadges user={u} showTextLabels={false} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: KULLANICI & ROZET & BAN YÖNETİMİ */}
      {activeTab === 'badges' && (
        <div className="p-6 space-y-6">
          {/* User Selection & Search */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white">Kullanıcı Arama & Rozet İşlemleri</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Kullanıcı adı veya isim ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Users grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {filteredUsers.map((u) => {
                const isSelected = selectedUserForBadges?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserForBadges(u)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/50 text-white ring-1 ring-blue-500/30'
                        : 'bg-[#0c0c0e] border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={u.display_name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{u.display_name}</span>
                          {u.isBanned && (
                            <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[9px] font-mono font-bold">
                              BANLI
                            </span>
                          )}
                          {u.suspendedUntil && new Date(u.suspendedUntil) > new Date() && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-mono font-bold">
                              ASKIDA
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono block">@{u.username}</span>
                      </div>
                    </div>
                    <UserBadges user={u} showTextLabels={false} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected User Management Panel */}
          {selectedUserForBadges && (
            <div className="p-6 rounded-3xl bg-[#0c0c0e] border border-zinc-800 space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedUserForBadges.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={selectedUserForBadges.display_name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/40"
                  />
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>{selectedUserForBadges.display_name}</span>
                      <UserBadges user={selectedUserForBadges} showTextLabels={false} />
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono">@{selectedUserForBadges.username}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleVerified(selectedUserForBadges)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border ${
                    selectedUserForBadges.verified
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{selectedUserForBadges.verified ? 'Mavi Tık: AKTİF' : 'Mavi Tık Ver'}</span>
                </button>
              </div>

              {/* Quick Toggle Badges Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  Hızlı Rozet Anahtarları
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {/* Code4Ever Developer Toggle */}
                  <button
                    onClick={() =>
                      handleToggleNamedBadge(
                        selectedUserForBadges,
                        'Code4Ever Developer',
                        '#ef4444',
                        'code',
                        'c4e_dev'
                      )
                    }
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedUserForBadges.badges?.some(
                        (b) => b.id === 'c4e_dev' || b.label?.toLowerCase() === 'code4ever developer'
                      )
                        ? 'bg-red-600/10 border-red-500/40 text-red-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-bold">C4E Dev</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold">
                      {selectedUserForBadges.badges?.some(
                        (b) => b.id === 'c4e_dev' || b.label?.toLowerCase() === 'code4ever developer'
                      )
                        ? 'AÇIK'
                        : 'KAPALI'}
                    </span>
                  </button>

                  {/* Code4Ever Yetkilisi Toggle */}
                  <button
                    onClick={() =>
                      handleToggleNamedBadge(
                        selectedUserForBadges,
                        'Code4Ever Yetkilisi',
                        '#a855f7',
                        'shield',
                        'c4e_admin'
                      )
                    }
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedUserForBadges.badges?.some(
                        (b) => b.id === 'c4e_admin' || b.label?.toLowerCase() === 'code4ever yetkilisi'
                      )
                        ? 'bg-purple-600/10 border-purple-500/40 text-purple-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold">C4E Yetkili</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold">
                      {selectedUserForBadges.badges?.some(
                        (b) => b.id === 'c4e_admin' || b.label?.toLowerCase() === 'code4ever yetkilisi'
                      )
                        ? 'AÇIK'
                        : 'KAPALI'}
                    </span>
                  </button>

                  {/* Git+ Toggle */}
                  <button
                    onClick={() =>
                      handleToggleNamedBadge(
                        selectedUserForBadges,
                        'Git+',
                        '#f97316',
                        'git',
                        'git_plus'
                      )
                    }
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedUserForBadges.badges?.some(
                        (b) => b.id === 'git_plus' || b.label?.toLowerCase() === 'git+'
                      )
                        ? 'bg-orange-600/10 border-orange-500/40 text-orange-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold">Git+</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold">
                      {selectedUserForBadges.badges?.some(
                        (b) => b.id === 'git_plus' || b.label?.toLowerCase() === 'git+'
                      )
                        ? 'AÇIK'
                        : 'KAPALI'}
                    </span>
                  </button>

                  {/* Spark Destekçi Badge Toggle */}
                  <button
                    onClick={() =>
                      handleToggleNamedBadge(
                        selectedUserForBadges,
                        'Spark Destekçi',
                        '#f59e0b',
                        'sparkles',
                        'spark'
                      )
                    }
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedUserForBadges.badges?.some(
                        (b) => b.id === 'spark' || b.label?.toLowerCase().includes('spark')
                      )
                        ? 'bg-amber-600/15 border-amber-500/50 text-amber-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                      <span className="text-xs font-bold">Spark Destekçi</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold">
                      {selectedUserForBadges.badges?.some(
                        (b) => b.id === 'spark' || b.label?.toLowerCase().includes('spark')
                      )
                        ? 'AÇIK'
                        : 'KAPALI'}
                    </span>
                  </button>

                  {/* Green Home Icon Badge Toggle */}
                  <button
                    onClick={() => handleToggleGreenHomeBadge(selectedUserForBadges)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedUserForBadges.badges?.some((b) => b.id === 'beta_home' || b.icon === 'home')
                        ? 'bg-emerald-600/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                      <span className="text-xs font-bold">Yeşil Ev (Beta)</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold">
                      {selectedUserForBadges.badges?.some((b) => b.id === 'beta_home' || b.icon === 'home')
                        ? 'AÇIK'
                        : 'KAPALI'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Add Custom Badge Section */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  Özel Rozet Ekle
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Rozet Adı (örn. Kıdemli Üye)"
                    value={newBadgeLabel}
                    onChange={(e) => setNewBadgeLabel(e.target.value)}
                    className="bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />

                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newBadgeColor}
                      onChange={(e) => setNewBadgeColor(e.target.value)}
                      className="w-9 h-9 rounded-xl bg-transparent border border-zinc-800 cursor-pointer p-0.5"
                    />
                    <select
                      value={newBadgeIcon}
                      onChange={(e) => setNewBadgeIcon(e.target.value as any)}
                      className="flex-1 bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="home">Ev İkonu</option>
                      <option value="code">Kod İkonu</option>
                      <option value="shield">Kalkan İkonu</option>
                      <option value="star">Yıldız İkonu</option>
                      <option value="check">Onay İkonu</option>
                      <option value="git">Git İkonu</option>
                    </select>
                  </div>

                  <button
                    onClick={handleAddCustomBadge}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Rozet Ekle</span>
                  </button>
                </div>
              </div>

              {/* Active Badges List */}
              <div className="space-y-2 pt-3 border-t border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  Kullanıcının Mevcut Rozetleri ({selectedUserForBadges.badges?.length || 0})
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {(selectedUserForBadges.badges || []).map((b) => (
                    <div
                      key={b.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold"
                      style={{ color: b.color || '#3b82f6' }}
                    >
                      <span>{b.label}</span>
                      <button
                        onClick={() => handleRemoveBadge(b.id)}
                        className="text-zinc-500 hover:text-red-400 p-0.5 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supporter / Spark Role Removal Box */}
              {(selectedUserForBadges.role?.toLowerCase() === 'spark' ||
                selectedUserForBadges.subscription?.planId === 'spark' ||
                selectedUserForBadges.badges?.some(
                  (b) => b.id === 'spark' || b.id === 'c4e_spark' || b.label?.toLowerCase().includes('spark')
                )) && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <Sparkles className="w-5 h-5 fill-amber-400/20" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-amber-300">Spark Destekçi Rolü Aktif</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">250MB Yükleme</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Bu kullanıcı Spark destekçi ayrıcalıklarına ve rozetine sahiptir.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveSupporterRole(selectedUserForBadges)}
                    className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white font-bold text-xs border border-red-500/40 transition-all flex items-center gap-1.5 shadow-sm self-stretch md:self-auto justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Destekçi Rolünü Sil</span>
                  </button>
                </div>
              )}

              {/* Account Management: Ban, Suspend, Delete */}
              <div className="space-y-4 pt-4 border-t border-zinc-800/80">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Hesap Kısıtlama & Silme İşlemleri</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ban Section */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Ban className="w-4 h-4 text-red-400" />
                        <span>Kalıcı Ban (Yasaklama)</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {selectedUserForBadges.isBanned ? 'YASAKLI' : 'AKTİF'}
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Ban sebebi (örn. Spam paylaşım)"
                      value={banReasonInput}
                      onChange={(e) => setBanReasonInput(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />

                    <button
                      onClick={() => handleToggleBan(selectedUserForBadges)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors shadow-md ${
                        selectedUserForBadges.isBanned
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      {selectedUserForBadges.isBanned ? 'Yasağı (Banı) Kaldır' : 'Kullanıcıyı Kalıcı Banla'}
                    </button>
                  </div>

                  {/* Temporary Suspension Section */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Geçici Süreli Askıya Alma</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {selectedUserForBadges.suspendedUntil && new Date(selectedUserForBadges.suspendedUntil) > new Date()
                          ? 'ASKIDA'
                          : 'AKTİF'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={suspendDaysInput}
                        onChange={(e) => setSuspendDaysInput(e.target.value)}
                        className="w-20 bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">Gün Süreyle Askıya Al</span>
                    </div>

                    {selectedUserForBadges.suspendedUntil && new Date(selectedUserForBadges.suspendedUntil) > new Date() ? (
                      <button
                        onClick={() => handleUnsuspendUser(selectedUserForBadges)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                      >
                        Askıyı Kaldır
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSuspendUser(selectedUserForBadges)}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md"
                      >
                        Hesabı Askıya Al
                      </button>
                    )}
                  </div>
                </div>

                {/* Permanent Delete Button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleDeleteAccountPermanently(selectedUserForBadges)}
                    className="w-full py-3 rounded-2xl bg-red-950/60 border border-red-500/40 hover:bg-red-900 text-red-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Hesabı Veritabanından Kalıcı Olarak Sil</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ABONELİK YÖNETİMİ & TANIMLAMA */}
      {activeTab === 'subscriptions' && (
        <div className="p-6 space-y-8">
          {/* Manual Subscription Assignment to User */}
          <div className="p-6 rounded-3xl bg-[#0c0c0e] border border-zinc-800 space-y-5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Crown className="w-5 h-5" />
              <span>Kullanıcıya Manuel Abonelik & Rozet Tanımla</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Select User */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 font-mono block mb-1">
                  Kullanıcı Seç
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="">-- Kullanıcı Seçiniz --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Plan */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 font-mono block mb-1">
                  Abonelik Paketi
                </label>
                <select
                  value={assignPlanId}
                  onChange={(e) => setAssignPlanId(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="">-- Paket Seçiniz --</option>
                  {subscriptionPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price}/{p.period})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Duration */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 font-mono block mb-1">
                  Abonelik Süresi
                </label>
                <select
                  value={assignDurationDays}
                  onChange={(e) => setAssignDurationDays(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="30">30 Gün (1 Ay)</option>
                  <option value="90">90 Gün (3 Ay)</option>
                  <option value="365">365 Gün (1 Yıl)</option>
                  <option value="lifetime">Süresiz (Kalıcı)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAssignSubscription}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>Aboneliği ve Paketin Rozetini Tanımla</span>
            </button>
          </div>

          {/* Active Supporters and Subscribed Users Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Aktif Spark Destekçileri & Aboneler (
                  {
                    allUsers.filter(
                      (u) =>
                        u.role?.toLowerCase() === 'spark' ||
                        u.subscription?.planId === 'spark' ||
                        u.badges?.some(
                          (b) => b.id === 'spark' || b.id === 'c4e_spark' || b.label?.toLowerCase().includes('spark')
                        ) ||
                        Boolean(u.subscription?.isActive)
                    ).length
                  }
                  )
                </h3>
              </div>
            </div>

            {(() => {
              const activeSupporters = allUsers.filter(
                (u) =>
                  u.role?.toLowerCase() === 'spark' ||
                  u.subscription?.planId === 'spark' ||
                  u.badges?.some(
                    (b) => b.id === 'spark' || b.id === 'c4e_spark' || b.label?.toLowerCase().includes('spark')
                  ) ||
                  Boolean(u.subscription?.isActive)
              );

              if (activeSupporters.length === 0) {
                return (
                  <div className="p-6 rounded-3xl bg-[#0c0c0e] border border-zinc-800 text-center text-xs text-zinc-500 font-mono">
                    Henüz kayıtlı Spark destekçisi veya aktif abone bulunmuyor.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeSupporters.map((supporter) => {
                    const isSpark =
                      supporter.role?.toLowerCase() === 'spark' ||
                      supporter.badges?.some(
                        (b) => b.id === 'spark' || b.id === 'c4e_spark' || b.label?.toLowerCase().includes('spark')
                      );

                    return (
                      <div
                        key={supporter.id}
                        className="p-4 rounded-2xl bg-[#0c0c0e] border border-zinc-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={
                              supporter.avatar_url ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                            }
                            alt={supporter.display_name}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-amber-500/30 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {supporter.display_name}
                              </span>
                              {isSpark && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-mono font-bold">
                                  SPARK
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono block">
                              @{supporter.username}
                            </span>
                            <div className="pt-1">
                              <UserBadges user={supporter} showTextLabels={false} />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {isSpark && (
                            <button
                              onClick={() => handleRemoveSupporterRole(supporter)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white font-bold text-[11px] border border-red-500/30 transition-all flex items-center gap-1"
                              title="Spark rolü ve rozetini sil"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Destekçi Rolünü Sil</span>
                            </button>
                          )}
                          {supporter.subscription?.isActive && supporter.subscription?.planId !== 'spark' && (
                            <button
                              onClick={() => handleCancelSubscription(supporter)}
                              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[11px] border border-zinc-700 transition-all flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3 text-zinc-400" />
                              <span>Aboneliği İptal Et</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Manage Subscription Plans */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Mevcut Abonelik Paketleri ({subscriptionPlans.length})</h3>
              <button
                onClick={() => handleOpenPlanModal()}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Paket Ekle</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="p-5 rounded-3xl bg-[#0c0c0e] border border-zinc-800 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-extrabold text-white">{plan.name}</h4>
                      <span className="text-xs font-bold text-blue-400 font-mono">{plan.price}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{plan.description}</p>
                    {plan.badgeLabel && (
                      <div className="pt-2">
                        <span className="text-[10px] font-mono text-zinc-500 block">Tanımlanacak Rozet:</span>
                        <UserBadges
                          badges={[
                            {
                              id: plan.badgeId || 'b',
                              label: plan.badgeLabel,
                              color: plan.badgeColor || '#3b82f6',
                              icon: plan.badgeIcon || 'code'
                            }
                          ]}
                          showTextLabels={true}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => handleOpenPlanModal(plan)}
                      className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-zinc-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Düzenle</span>
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: ROZET TANIMLARI & AÇIKLAMALARI */}
      {activeTab === 'definitions' && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span>Rozet Tanımları ve Açıklama Yönetimi</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                Varsayılan ve özel rozetlerin adını, açıklama metinlerini, renklerini, ikonlarını ve ağırlıklarını buradan kontrol edebilirsiniz.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetBadgeDefsToDefault}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-zinc-800 transition-colors"
                title="Tüm rozet tanımlarını sıfırla"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Varsayılanlara Sıfırla</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenBadgeDefModal()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Rozet Tanımla</span>
              </button>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {badgeDefinitions.map((bDef) => (
              <div
                key={bDef.id}
                className="p-5 rounded-3xl bg-[#0c0c0e] border border-zinc-800/80 hover:border-purple-500/40 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{bDef.label}</h3>
                        {bDef.isDefault && (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 rounded-full">
                            VARSAYILAN
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-purple-950/60 text-purple-300 border border-purple-800/40 rounded-full">
                          Öncelik: {bDef.weight || 5}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                        ID: {bDef.id} • İkon: {bDef.icon}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenBadgeDefModal(bDef)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 transition-colors"
                        title="Rozeti Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBadgeDef(bDef.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-colors"
                        title="Rozeti Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Badge Preview Pill */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-zinc-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-mono">Önizleme:</span>
                    <UserBadges
                      badges={[
                        {
                          id: bDef.id,
                          label: bDef.label,
                          color: bDef.color,
                          icon: bDef.icon,
                          description: bDef.description
                        }
                      ]}
                      showTextLabels={true}
                    />
                  </div>

                  {/* Description Box */}
                  <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold">
                      <Info className="w-3.5 h-3.5 text-purple-400" />
                      <span>Rozet Açıklaması & Tooltip:</span>
                    </div>
                    <p className="text-zinc-300 text-xs leading-relaxed font-sans">
                      {bDef.description || 'Açıklama girilmemiş.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full inline-block border border-zinc-700" style={{ backgroundColor: bDef.color }} />
                    {bDef.color}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenBadgeDefModal(bDef)}
                    className="text-purple-400 hover:text-purple-300 font-bold hover:underline"
                  >
                    Açıklamayı & Rengi Değiştir →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: PLATFORM & MARKA AYARLARI */}
      {activeTab === 'platform' && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                <span>Platform Marka ve Sağ Panel Alt Yazı Ayarları</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                Sağ alt köşedeki "Code4Ever Platform" ve "code4ever.ai.studio" alanlarını, sloganı ve açıklamayı buradan yönetin.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetPlatformSettingsToDefault}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-zinc-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Varsayılana Sıfırla</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Settings */}
            <form
              onSubmit={handleSavePlatformSettingsSubmit}
              className="lg:col-span-7 p-6 rounded-3xl bg-[#0c0c0e] border border-zinc-800/80 space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Platform Başlığı (Sağ En Alt Başlık)</span>
                </label>
                <input
                  type="text"
                  value={platformBrandTitle}
                  onChange={(e) => setPlatformBrandTitle(e.target.value)}
                  placeholder="örn. Code4Ever Platform"
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 text-xs font-mono"
                  required
                />
                <span className="text-[10px] text-zinc-500 font-mono block">
                  Sağ alt köşede kartın ilk satırında görünen marka başlığı.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Platform Domain / Web Adresi</span>
                </label>
                <input
                  type="text"
                  value={platformBrandDomain}
                  onChange={(e) => setPlatformBrandDomain(e.target.value)}
                  placeholder="örn. code4ever.ai.studio"
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 text-xs font-mono"
                  required
                />
                <span className="text-[10px] text-zinc-500 font-mono block">
                  Sağ alt köşede başlığın altında mavi/cyan fontla görünen alan adı linki.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Platform Açıklaması / Alt Metin</span>
                </label>
                <textarea
                  rows={3}
                  value={platformBrandDescription}
                  onChange={(e) => setPlatformBrandDescription(e.target.value)}
                  placeholder="Açık Kaynak Geliştirici Topluluğu & Kod Paylaşım Ağı"
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 text-xs font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Platform Sloganı</span>
                </label>
                <input
                  type="text"
                  value={platformBrandSlogan}
                  onChange={(e) => setPlatformBrandSlogan(e.target.value)}
                  placeholder="örn. Kodla, Paylaş, Büyü"
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 text-xs font-sans"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Platform Ayarlarını Kaydet ve Canlıya Al</span>
                </button>
              </div>
            </form>

            {/* Live Visual Preview of Right Panel Footer */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-3xl bg-[#0c0c0e] border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Sağ Panel Canlı Önizlemesi</span>
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800/40">
                    CANLI
                  </span>
                </div>

                <p className="text-xs text-zinc-400">
                  Sağ taraftaki panelin en altındaki kart kullanıcılara tam olarak şu şekilde görünecektir:
                </p>

                {/* RightPanel Simulated Footer Box */}
                <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800 space-y-2 shadow-inner">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Code className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        {platformBrandTitle || 'Code4Ever Platform'}
                      </h4>
                      <p className="text-[10px] text-blue-400 font-mono">
                        {platformBrandDomain || 'code4ever.ai.studio'}
                      </p>
                    </div>
                  </div>

                  {platformBrandDescription && (
                    <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
                      {platformBrandDescription}
                    </p>
                  )}

                  {platformBrandSlogan && (
                    <div className="pt-1 flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                      <Sparkles className="w-3 h-3" />
                      <span>{platformBrandSlogan}</span>
                    </div>
                  )}

                  <div className="pt-2 text-[9px] text-zinc-600 font-mono flex items-center justify-between">
                    <span>© {new Date().getFullYear()} Code4Ever</span>
                    <span>v1.0-beta</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BADGE DEFINITION MODAL */}
      {isBadgeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsBadgeModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0c0c0e] border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Award className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingBadgeDef ? `Rozeti Düzenle: ${editingBadgeDef.label}` : 'Yeni Rozet Tanımla'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBadgeModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Rozet Başlığı (Görünen Ad)</label>
                  <input
                    type="text"
                    placeholder="örn. Kurucu, Destekçi, Pro Dev"
                    value={badgeDefLabel}
                    onChange={(e) => setBadgeDefLabel(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Rozet ID (Tekil Kod)</label>
                  <input
                    type="text"
                    placeholder="örn. founder, c4e_dev"
                    value={badgeDefId}
                    onChange={(e) => setBadgeDefId(e.target.value)}
                    disabled={!!editingBadgeDef?.isDefault}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Rozet Açıklaması (Kullanıcı fareyle üzerine geldiğinde veya profilde gösterilen metin)
                </label>
                <textarea
                  rows={3}
                  placeholder="Rozetin kimlere verildiğini, hangi ayrıcalıkları sağladığını detaylıca yazınız..."
                  value={badgeDefDescription}
                  onChange={(e) => setBadgeDefDescription(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Rozet Rengi</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={badgeDefColor}
                      onChange={(e) => setBadgeDefColor(e.target.value)}
                      className="w-10 h-9 rounded-xl bg-transparent border border-zinc-800 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={badgeDefColor}
                      onChange={(e) => setBadgeDefColor(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-2 py-2 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">İkon</label>
                  <select
                    value={badgeDefIcon}
                    onChange={(e) => setBadgeDefIcon(e.target.value as any)}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none text-xs"
                  >
                    <option value="shield">Kalkan (shield)</option>
                    <option value="code">Kod &lt;/&gt; (code)</option>
                    <option value="star">Yıldız (star)</option>
                    <option value="check">Mavi Tık (check)</option>
                    <option value="home">Yeşil Ev (home)</option>
                    <option value="sparkles">Parıltı (sparkles)</option>
                    <option value="award">Madalya (award)</option>
                    <option value="git">Git Branch (git)</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Öncelik / Ağırlık</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={badgeDefWeight}
                    onChange={(e) => setBadgeDefWeight(Number(e.target.value))}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none text-xs font-mono"
                  />
                </div>
              </div>

              {/* Live Preview Inside Modal */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400 font-mono text-xs">Canlı Görünüm:</span>
                <UserBadges
                  badges={[
                    {
                      id: badgeDefId || 'preview',
                      label: badgeDefLabel || 'Rozet Başlığı',
                      color: badgeDefColor,
                      icon: badgeDefIcon,
                      description: badgeDefDescription
                    }
                  ]}
                  showTextLabels={true}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsBadgeModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveBadgeDef}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Plan Modal */}
      {isPlanModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsPlanModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0c0c0e] border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">
              {editingPlan ? 'Abonelik Paketini Düzenle' : 'Yeni Abonelik Paketi Ekle'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Paket Adı</label>
                <input
                  type="text"
                  placeholder="örn. Code4Ever Pro"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Fiyat</label>
                  <input
                    type="text"
                    placeholder="örn. ₺49"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Periyot</label>
                  <input
                    type="text"
                    placeholder="örn. Aylık"
                    value={planPeriod}
                    onChange={(e) => setPlanPeriod(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Açıklama</label>
                <input
                  type="text"
                  placeholder="Kısa paket açıklaması"
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              {/* Badge Assignment for Plan */}
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <label className="text-amber-400 font-bold block">Paket Verilince Verilecek Rozet</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Rozet Adı (örn. Git+)"
                    value={planBadgeLabel}
                    onChange={(e) => setPlanBadgeLabel(e.target.value)}
                    className="bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none col-span-2"
                  />
                  <input
                    type="color"
                    value={planBadgeColor}
                    onChange={(e) => setPlanBadgeColor(e.target.value)}
                    className="w-full h-8 rounded-xl bg-transparent border border-zinc-800 cursor-pointer p-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Özellikler Listesi (Her satıra bir özellik)</label>
                <textarea
                  rows={4}
                  value={planFeatures}
                  onChange={(e) => setPlanFeatures(e.target.value)}
                  placeholder="Gelişmiş Rozet&#10;Sınırsız EveryChat&#10;7/24 Destek"
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
              >
                İptal
              </button>
              <button
                onClick={handleSavePlan}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
