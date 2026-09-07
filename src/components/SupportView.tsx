import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Heart,
  HardDrive,
  Check,
  Zap,
  ExternalLink,
  AlertTriangle,
  Clock,
  Copy,
  RefreshCw,
  ShieldCheck,
  Radio,
  CheckCircle2,
  X,
  CreditCard,
  FileText,
  Send,
  HelpCircle
} from 'lucide-react';
import { UserProfile, BadgeItem } from '../types';
import { UserBadges } from './UserBadges';
import { isUserSpark } from '../utils/fileUploadHelper';
import {
  loadStoredDonations,
  submitDonationClaim,
  grantSparkPerksToUser,
  ByNoGameDonationClaim
} from '../services/supabaseClient';

interface SupportViewProps {
  user: UserProfile;
  language: 'tr' | 'en';
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
}

const BYNOGAME_STREAM_ID = '5595ad22-dd5a-47c2-93ba-d7bf9a3f85ed';
const BYNOGAME_DONATE_URL = 'https://donate.bynogame.com/nylithra';

export const SupportView: React.FC<SupportViewProps> = ({
  user,
  language,
  onUpdateUser
}) => {
  const isSparkSupporter = isUserSpark(user);

  // Modal States
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);

  // Claim Form State
  const [claimAmount, setClaimAmount] = useState('50');
  const [claimReference, setClaimReference] = useState('');
  const [claimMessage, setClaimMessage] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimSubmitSuccess, setClaimSubmitSuccess] = useState<string | null>(null);

  // Verification & Status State
  const [isCheckingDonation, setIsCheckingDonation] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    status: 'idle' | 'success' | 'pending' | 'not_found' | 'error';
    message?: string;
    donation?: any;
  }>({ status: 'idle' });

  const cleanUsername = (user.username || '').replace(/^@/, '').trim();

  // Copy username to clipboard
  const handleCopyUsername = () => {
    if (!cleanUsername) return;
    navigator.clipboard.writeText(cleanUsername);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 3000);
  };

  // When clicking [SİTEYE GİT]
  const handleGoToDonateSite = () => {
    window.open(BYNOGAME_DONATE_URL, '_blank', 'noopener,noreferrer');
    setIsNoticeModalOpen(false);
    // Suggest checking after 4 seconds
    setTimeout(() => {
      handleCheckDonation();
    }, 4000);
  };

  // Check ByNoGame donations for current user
  const handleCheckDonation = async () => {
    if (!cleanUsername) return;
    setIsCheckingDonation(true);
    setCheckResult({ status: 'idle' });

    const lowerClean = cleanUsername.toLowerCase();

    // 1) First check local / Supabase recorded donations
    try {
      const storedClaims = loadStoredDonations();
      const userClaim = storedClaims.find(
        (c) => c.username && c.username.toLowerCase() === lowerClean
      );

      if (userClaim) {
        if (userClaim.status === 'verified') {
          setCheckResult({
            status: 'success',
            message:
              language === 'tr'
                ? 'Bağışınız doğrulandı! Spark Destekçisi rozetiniz ve 250MB yükleme yetkiniz hesabınıza tanımlandı.'
                : 'Your donation has been verified! Spark Supporter badge and 250MB upload perk activated.',
            donation: userClaim
          });
          grantSparkBadgeAndRole();
          setIsCheckingDonation(false);
          return;
        } else if (userClaim.status === 'pending') {
          setCheckResult({
            status: 'pending',
            message:
              language === 'tr'
                ? 'Bağış bildiriminiz alındı ve şu an onay bekliyor. Yönetici onayladığında Spark rozetiniz otomatik olarak profilinizde parıldayacaktır.'
                : 'Your donation report has been received and is pending review. Your Spark badge will be activated as soon as it is approved.'
          });
          setIsCheckingDonation(false);
          return;
        }
      }
    } catch {}

    // 2) Try checking server-side endpoint with complete resilience
    let serverMatched = false;
    try {
      const response = await fetch('/api/bynogame/check-donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId: BYNOGAME_STREAM_ID,
          username: cleanUsername
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.success && data.hasDonation) {
          serverMatched = true;
          setCheckResult({
            status: 'success',
            message:
              language === 'tr'
                ? 'Bağışınız doğrulandı! Spark Destekçisi rozetiniz ve 250MB yükleme yetkiniz hesabınıza tanımlandı.'
                : 'Your donation has been verified! Spark Supporter badge and 250MB upload perk activated.',
            donation: data.donation
          });
          grantSparkBadgeAndRole();
        }
      }
    } catch (err) {
      // Server fetch failed gracefully (e.g. static CDN deploy)
    }

    if (!serverMatched) {
      setCheckResult({
        status: 'not_found',
        message:
          language === 'tr'
            ? `@${cleanUsername} kullanıcı adına ait otomatik doğrulanmış bağış henüz bulunamadı. Bağışınızı yaptıysanız aşağıdaki "Bağış Bildir / Dekont Gir" butonu ile referans bilginizi ileterek hızlıca onaylatabilirsiniz.`
            : `No verified donation found yet for @${cleanUsername}. If you have already donated, please use the "Report Donation" button to submit your reference code for fast verification.`
      });
    }

    setIsCheckingDonation(false);
  };

  // Submit manual donation claim
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanUsername) return;
    setIsSubmittingClaim(true);
    setClaimSubmitSuccess(null);

    try {
      const res = await submitDonationClaim({
        username: cleanUsername,
        amount: claimAmount || '50',
        currency: 'TL',
        message: claimMessage,
        reference_code: claimReference
      });

      if (res.success) {
        setClaimSubmitSuccess(
          language === 'tr'
            ? 'Bağış bildiriminiz başarıyla iletildi! Yönetici onayladığında Spark rozetiniz profilinize tanımlanacaktır.'
            : 'Your donation report has been submitted! Your Spark badge will be activated upon admin confirmation.'
        );
        setCheckResult({
          status: 'pending',
          message:
            language === 'tr'
              ? 'Bağış bildiriminiz alındı (Beklemede). Yönetici incelemesinin ardından Spark Destekçi rozetiniz hesabınıza tanımlanacaktır.'
              : 'Donation claim submitted (Pending). Your Spark badge will be applied once verified.'
        });
        setTimeout(() => {
          setIsClaimModalOpen(false);
          setClaimSubmitSuccess(null);
        }, 2500);
      }
    } catch (err: any) {
      console.error('Claim submit error:', err);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Grant the Spark Supporter badge and role
  const grantSparkBadgeAndRole = () => {
    const existingBadges = user.badges || [];
    const hasSpark = existingBadges.some(
      (b) => b.id === 'spark' || b.id === 'c4e_spark' || b.label?.toLowerCase().includes('spark')
    );

    const sparkBadge: BadgeItem = {
      id: 'spark',
      label: 'Spark Destekçi',
      color: '#f59e0b',
      icon: 'sparkles',
      description:
        'Code4Ever Bağışçısı özel Spark Destekçi rozetidir.'
    };

    const updatedBadges = hasSpark ? existingBadges : [...existingBadges, sparkBadge];

    if (onUpdateUser) {
      onUpdateUser({
        role: user.role && user.role !== 'Geliştirici' && user.role !== 'Developer' ? user.role : 'Spark',
        badges: updatedBadges,
        subscription: {
          planId: 'spark',
          planName: 'Spark Destekçisi',
          assignedAt: new Date().toISOString(),
          isActive: true
        }
      });
    }

    grantSparkPerksToUser(cleanUsername);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative rounded-3xl p-6 md:p-10 border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-[#0c0c0e] to-[#09090b] shadow-2xl overflow-hidden text-center space-y-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Heart className="w-4 h-4 text-amber-400 fill-amber-500/20 animate-pulse" />
          <span>{language === 'tr' ? 'Açık Kaynak Projeye Destek' : 'Support Open Source Project'}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          {language === 'tr' ? 'Code4Ever Projesine Destek Ol' : 'Support Code4Ever Project'}
        </h1>

        <p className="text-xs md:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          {language === 'tr'
            ? 'Code4Ever tamamen açık kaynak ve topluluk odaklı bir projedir. Dilediğiniz miktarda tek seferlik bağış yaparak sunucu ve altyapı giderlerimize katkıda bulunabilir, Spark Destekçisi rozeti ve 250MB yükleme ayrıcalığını kazanabilirsiniz.'
            : 'Code4Ever is fully open source. Contribute any amount to support our server infrastructure and earn the exclusive Spark Supporter badge and 250MB upload limit.'}
        </p>

        {/* Live Support Verification Active Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-300 text-xs font-mono shadow-md">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>{language === 'tr' ? 'Bağış Doğrulama Sistemi Aktif' : 'Donation Verification Active'}</span>
          <span className="text-zinc-500 hidden sm:inline">•</span>
          <span className="text-[11px] text-zinc-400 hidden sm:inline font-mono">ID: {BYNOGAME_STREAM_ID.substring(0, 13)}...</span>
        </div>

        {isSparkSupporter && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-lg shadow-amber-950/40 animate-in zoom-in-95 mt-2">
            <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>
              {language === 'tr'
                ? 'Harika! Zaten bir Spark Destekçisisiniz — 250MB Yükleme Sınırınız Aktif 💖'
                : 'Awesome! You are a Spark Supporter — 250MB Upload Limit is Active 💖'}
            </span>
          </div>
        )}
      </div>

      {/* Main Card: Spark Bağış Kartı */}
      <div className="max-w-2xl mx-auto">
        <div className="relative rounded-3xl p-6 md:p-8 border border-amber-500/50 bg-[#0e0d10] shadow-2xl shadow-amber-500/5 ring-1 ring-amber-500/20 space-y-6">
          {/* Top badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 text-[11px] font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
            <span>{language === 'tr' ? 'Spark Destekçi Paketi' : 'Spark Supporter Package'}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-b border-zinc-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black text-white">Spark Destekçi</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold font-mono">
                  SPARK ROZETİ
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {language === 'tr' ? 'Doğrulanmış Destek' : 'Verified Support'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                {language === 'tr'
                  ? 'Dilediğiniz miktarda tek seferlik bağış yapın, kullanıcı adınızla doğrulanıp ömür boyu Spark rozeti kazanın.'
                  : 'Donate any amount, verify with your username, and unlock the lifetime Spark badge.'}
              </p>
            </div>

            <div className="text-left sm:text-right flex-shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'tr' ? 'Serbest Miktar' : 'Flexible Amount'}</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-1">
                {language === 'tr' ? 'Abonelik YOK — Tek Seferlik' : 'No subscription — One time'}
              </div>
            </div>
          </div>

          {/* Awarded Badge Preview */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
              {language === 'tr' ? 'Kazanılacak Profil Rozeti:' : 'Earned Profile Badge:'}
            </span>
            <div className="flex items-center gap-2">
              <UserBadges
                badges={[
                  {
                    id: 'spark',
                    label: 'Spark Destekçi',
                    color: '#f59e0b',
                    icon: 'sparkles',
                    description:
                      'Code4Ever açık kaynak projesine maddi destekte bulunan özel Spark destekçi rozetidir. 250MB tek seferde dosya yükleme ayrıcalığı tanır.'
                  }
                ]}
                showTextLabels={true}
              />
            </div>
          </div>

          {/* Perks list */}
          <div className="space-y-3 pt-1">
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
              {language === 'tr' ? 'Spark Destekçi Ayrıcalıkları:' : 'Spark Supporter Perks:'}
            </span>
            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-start gap-2.5">
                <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 mt-0.5 flex-shrink-0">
                  <HardDrive className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong className="text-white">250 MB Tek Seferde Dosya Yükleme Sınırı</strong> — Normal kullanıcılar için 15MB olan sınır Spark ile 250MB'a yükselir.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 mt-0.5 flex-shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong className="text-white">1.000 Harf / Karakter Gönderi Sınırı</strong> — Normal kullanıcılar için 200 harf olan gönderi sınırı Spark Destekçileri için 1.000 harfe yükselir.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 mt-0.5 flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong className="text-white">Spark Rozeti & Rolü</strong> — Tüm gönderilerinizde ve profilinizde parıldayan altın Spark simgesi.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 mt-0.5 flex-shrink-0">
                  <Heart className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong className="text-white">Açık Kaynak Geliştirici Katkısı</strong> — Code4Ever'ın özgür, reklamsız ve bağımsız kalmasını sağlama desteği.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 mt-0.5 flex-shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong className="text-white">EveryChat AI Öncelikli Erişim</strong> — Gelişmiş kodlama yapay zekası yanıtlarında öncelik.
                </span>
              </li>
            </ul>
          </div>

          {/* Primary Action Button: Opens the Warning Modal */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={() => setIsNoticeModalOpen(true)}
              className="w-full py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all duration-200 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 cursor-pointer shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Heart className="w-4 h-4 fill-zinc-950" />
              <span>{language === 'tr' ? 'Bağış Yap & Destek Ol' : 'Donate & Support'}</span>
              <ExternalLink className="w-4 h-4 opacity-80" />
            </button>

            {/* Action Buttons: Check Donation and Report Donation */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={handleCheckDonation}
                disabled={isCheckingDonation}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-amber-500/40 hover:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isCheckingDonation ? 'animate-spin' : ''}`} />
                <span>
                  {isCheckingDonation
                    ? (language === 'tr' ? 'Bağışlar Kontrol Ediliyor...' : 'Checking Donations...')
                    : (language === 'tr' ? 'Bağışımı Kontrol Et' : 'Check My Donation')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsClaimModalOpen(true)}
                className="w-full sm:w-auto py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 hover:text-amber-300 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Bağış Bildir / Dekont Gir' : 'Report Donation / Reference'}</span>
              </button>
            </div>
          </div>

          {/* Check Result Feedback Box */}
          {checkResult.status === 'success' && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'tr' ? 'Tebrikler! Bağış Doğrulandı' : 'Congratulations! Donation Verified'}</span>
              </div>
              <p>{checkResult.message}</p>
            </div>
          )}

          {checkResult.status === 'pending' && (
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {language === 'tr' ? 'Bağış Bildiriminiz İncelemede' : 'Donation Report Under Review'}
                  </p>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {checkResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {checkResult.status === 'not_found' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-bold">
                    {language === 'tr' ? 'Otomatik Doğrulama Bekleniyor' : 'Awaiting Verification'}
                  </p>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    {checkResult.message}
                  </p>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    {language === 'tr'
                      ? 'Bağış sayfasında kullanıcı adı alanına tam olarak '
                      : 'Please make sure you entered '}
                    <strong className="text-white font-mono">@{cleanUsername}</strong>
                    {language === 'tr'
                      ? ' yazdığınızdan emin olun. Bağışınızı yaptıysanız hemen aşağıdaki butondan bildirebilirsiniz:'
                      : ' in the donation form. If already donated, you can report it directly:'}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsClaimModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-400 transition-colors shadow-md cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{language === 'tr' ? 'Bağışımı Şimdi Bildir' : 'Report My Donation Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {checkResult.status === 'error' && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2 animate-in fade-in">
              <p className="font-bold">{language === 'tr' ? 'Bilgilendirme' : 'Notice'}</p>
              <p className="text-zinc-400 text-[11px]">{checkResult.message}</p>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(true)}
                className="mt-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold hover:border-amber-500/40 hover:text-white transition-colors"
              >
                {language === 'tr' ? 'Manuel Bildirim Yap' : 'Report Manually'}
              </button>
            </div>
          )}

          {/* Stream ID Information Footer Box */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3 text-zinc-400 text-[11px] font-mono">
            <div className="flex items-center gap-2 overflow-hidden">
              <Radio className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="truncate">{language === 'tr' ? 'Doğrulama Kanalı: Aktif' : 'Verification Channel: Active'}</span>
            </div>
            <span className="text-[10px] text-zinc-500 flex-shrink-0">Code4Ever Support</span>
          </div>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="rounded-3xl border border-zinc-800 bg-[#0c0c0e] p-6 space-y-4">
        <h3 className="text-base font-extrabold text-white">
          {language === 'tr' ? 'Normal Kullanıcı vs. Spark Destekçi Karşılaştırması' : 'Free User vs. Spark Supporter'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-mono">
                <th className="py-3 px-4 font-bold">{language === 'tr' ? 'Özellik' : 'Feature'}</th>
                <th className="py-3 px-4 font-bold">{language === 'tr' ? 'Normal Kullanıcı' : 'Normal User'}</th>
                <th className="py-3 px-4 font-bold text-amber-400">{language === 'tr' ? 'Spark Destekçi' : 'Spark Supporter'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              <tr>
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-zinc-500" />
                  <span>{language === 'tr' ? 'Maksimum Dosya Yükleme Sınırı' : 'Max Upload File Size'}</span>
                </td>
                <td className="py-3 px-4 font-mono font-bold text-zinc-400">15 MB</td>
                <td className="py-3 px-4 font-mono font-bold text-amber-400">250 MB (16x Daha Fazla!)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <span>{language === 'tr' ? 'Gönderi Harf / Karakter Sınırı' : 'Post Character Limit'}</span>
                </td>
                <td className="py-3 px-4 font-mono font-bold text-zinc-400">200 Harf</td>
                <td className="py-3 px-4 font-mono font-bold text-amber-400">1.000 Harf (5x Daha Fazla!)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-zinc-500" />
                  <span>{language === 'tr' ? 'Spark Rozeti ve Rolü' : 'Spark Badge & Role'}</span>
                </td>
                <td className="py-3 px-4 text-zinc-500">—</td>
                <td className="py-3 px-4 text-amber-400 font-bold">✨ Altın Parıltılı Spark Rozeti</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-zinc-500" />
                  <span>{language === 'tr' ? 'Bağış Yöntemi' : 'Donation Method'}</span>
                </td>
                <td className="py-3 px-4 text-zinc-400">{language === 'tr' ? 'Ücretsiz' : 'Free'}</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">{language === 'tr' ? 'Tek Seferlik Dilediğiniz Tutar' : 'Flexible One-Time Amount'}</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-zinc-500" />
                  <span>{language === 'tr' ? 'EveryChat AI Kullanımı' : 'EveryChat AI Access'}</span>
                </td>
                <td className="py-3 px-4 text-zinc-400">{language === 'tr' ? 'Standart Hız' : 'Standard'}</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">{language === 'tr' ? 'Öncelikli Yanıtlar' : 'Priority Responses'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BAĞIŞ BİLDİRİMİ / MANUEL DOĞRULAMA MODALI */}
      {/* ========================================================= */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0f0e12] border-2 border-amber-500/60 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/15 text-left space-y-5 animate-in zoom-in-95">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsClaimModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {language === 'tr' ? 'Bağış Bildirimi Yap' : 'Report Your Donation'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {language === 'tr'
                    ? 'Bağışınızı hızlıca onaylatın ve Spark rozetinizi alın'
                    : 'Submit your donation details for instant review'}
                </p>
              </div>
            </div>

            {claimSubmitSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'tr' ? 'Bildirim Alındı!' : 'Report Received!'}</span>
                </div>
                <p>{claimSubmitSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    {language === 'tr' ? 'Kullanıcı Adı (Code4Ever)' : 'Username (Code4Ever)'}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`@${cleanUsername}`}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono font-bold cursor-not-allowed"
                  />
                </div>

                {/* Amount presets */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    {language === 'tr' ? 'Bağış Tutarı (TL)' : 'Donation Amount (TL)'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['25', '50', '100', '250'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setClaimAmount(preset)}
                        className={`py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                          claimAmount === preset
                            ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {preset} ₺
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder={language === 'tr' ? 'Farklı bir tutar girin (örn: 75)' : 'Custom amount (e.g. 75)'}
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Reference Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span>{language === 'tr' ? 'Referans / Dekont / İşlem Kodu (Varsa)' : 'Reference / Transaction Code (Optional)'}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">{language === 'tr' ? 'Opsiyonel' : 'Optional'}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'tr' ? 'Örn: REF-981245 veya İşlem No' : 'e.g. REF-981245'}
                    value={claimReference}
                    onChange={(e) => setClaimReference(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* Message / Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span>{language === 'tr' ? 'Bağış Mesajınız / Notunuz' : 'Message / Note'}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">{language === 'tr' ? 'Opsiyonel' : 'Optional'}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'tr' ? 'Bağışta yazdığınız mesaj' : 'Message you included with donation'}
                    value={claimMessage}
                    onChange={(e) => setClaimMessage(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingClaim ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isSubmittingClaim
                        ? (language === 'tr' ? 'İletiliyor...' : 'Submitting...')
                        : (language === 'tr' ? 'Bağışımı Bildir' : 'Submit Donation Report')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(false)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                  >
                    {language === 'tr' ? 'Kapat' : 'Close'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0f0e12] border-2 border-amber-500/80 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/20 text-center space-y-5 animate-in zoom-in-95">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsNoticeModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing [!] Icon Badge */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-xl shadow-amber-500/20 mx-auto">
              <span className="text-3xl font-black font-mono tracking-tight">[!]</span>
            </div>

            {/* Warning Heading & Exact requested message */}
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white tracking-tight">
                {language === 'tr' ? 'Önemli Uyarı!' : 'Important Notice!'}
              </h3>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs md:text-sm font-bold leading-relaxed">
                Açılacak Olan Sitede Kullanıcı Adı Kısmına Code4Ever Kullanıcı Adınızı Yazınız.
              </div>
            </div>

            {/* Copyable Username Box for Convenience */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-left space-y-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                {language === 'tr' ? 'Bağış Sayfasına Yazılacak Kullanıcı Adınız:' : 'Your Username to Enter on Donation Page:'}
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-mono font-bold text-white tracking-wide truncate">
                  @{cleanUsername}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUsername}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedUsername ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{language === 'tr' ? 'Kopyalandı' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{language === 'tr' ? 'Kopyala' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notice Footer Note */}
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {language === 'tr'
                ? 'Bağışınız tamamlandıktan sonra sistemimiz üzerinden otomatik kontrol edilecek ve Spark Destekçisi rozetiniz tanımlanacaktır.'
                : 'After your donation completes, it will be verified to automatically award your Spark Supporter badge.'}
            </p>

            {/* Action Buttons: [SITEYE GIT] & [Vazgeç] */}
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleGoToDonateSite}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-xl shadow-amber-500/25 transition-all cursor-pointer"
              >
                <span>{language === 'tr' ? 'SİTEYE GİT' : 'GO TO SITE'}</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsNoticeModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {language === 'tr' ? 'Vazgeç' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
