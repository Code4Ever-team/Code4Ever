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
  FileText
} from 'lucide-react';
import { UserProfile, BadgeItem } from '../types';
import { UserBadges } from './UserBadges';
import { isUserSpark } from '../utils/fileUploadHelper';

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

  // Modal State
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);

  // Verification & Status State
  const [isCheckingDonation, setIsCheckingDonation] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    status: 'idle' | 'success' | 'not_found' | 'error';
    message?: string;
    donation?: any;
  }>({ status: 'idle' });

  // Verification step active (after user clicks "Siteye Git")
  const [hasVisitedSite, setHasVisitedSite] = useState(false);

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
    setHasVisitedSite(true);
    // Automatically trigger first check after 3 seconds
    setTimeout(() => {
      handleCheckDonation();
    }, 3000);
  };

  // Check ByNoGame donations for current user using Stream ID
  const handleCheckDonation = async () => {
    if (!cleanUsername) return;
    setIsCheckingDonation(true);
    setCheckResult({ status: 'idle' });

    try {
      const response = await fetch('/api/bynogame/check-donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId: BYNOGAME_STREAM_ID,
          username: cleanUsername
        })
      });

      const data = await response.json();

      if (data.success && data.hasDonation) {
        setCheckResult({
          status: 'success',
          message:
            language === 'tr'
              ? 'ByNoGame bağışınız doğrulandı! Spark Destekçisi rozetiniz ve 250MB yükleme yetkiniz hesabınıza tanımlandı.'
              : 'Your ByNoGame donation has been verified! Spark Supporter badge and 250MB upload perk activated.',
          donation: data.donation
        });

        // Award Spark Supporter Badge and Role
        grantSparkBadgeAndRole();
      } else {
        setCheckResult({
          status: 'not_found',
          message:
            data.message ||
            (language === 'tr'
              ? `ByNoGame Stream ID (${BYNOGAME_STREAM_ID}) üzerinde henüz @${cleanUsername} kullanıcı adına ait onaylı bağış bulunamadı.`
              : `No verified donation found yet on ByNoGame Stream ID (${BYNOGAME_STREAM_ID}) for @${cleanUsername}.`)
        });
      }
    } catch (err: any) {
      console.error('ByNoGame donation check error:', err);
      setCheckResult({
        status: 'error',
        message:
          language === 'tr'
            ? 'Bağış kontrolü yapılırken sunucu bağlantı hatası oluştu. Lütfen birazdan tekrar deneyin.'
            : 'Connection error while checking donation. Please try again in a few moments.'
      });
    } finally {
      setIsCheckingDonation(false);
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
        'Code4Ever ByNoGame bağışçısı özel Spark Destekçi rozetidir. 250MB tek seferde dosya yükleme ayrıcalığı ve parıldayan altın rozet tanır.'
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
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative rounded-3xl p-6 md:p-10 border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-[#0c0c0e] to-[#09090b] shadow-2xl overflow-hidden text-center space-y-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Heart className="w-4 h-4 text-amber-400 fill-amber-500/20 animate-pulse" />
          <span>{language === 'tr' ? 'ByNoGame ile Açık Kaynak Projeye Destek' : 'Support Open Source via ByNoGame'}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          {language === 'tr' ? 'Code4Ever Projesine Destek Ol' : 'Support Code4Ever Project'}
        </h1>

        <p className="text-xs md:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          {language === 'tr'
            ? 'Code4Ever tamamen açık kaynak ve topluluk odaklı bir projedir. ByNoGame üzerinden dilediğiniz miktarda tek seferlik bağış yaparak sunucu ve altyapı giderlerimize katkıda bulunabilir, Spark Destekçisi rozeti ve 250MB yükleme ayrıcalığını kazanabilirsiniz.'
            : 'Code4Ever is fully open source. Contribute any amount via ByNoGame to support our server infrastructure and earn the exclusive Spark Supporter badge and 250MB upload limit.'}
        </p>

        {/* ByNoGame Stream Integration Active Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-300 text-xs font-mono shadow-md">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>ByNoGame Stream Entegrasyonu Aktif</span>
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

      {/* Main Card: ByNoGame Bağış Kartı (Miktar alanı kaldırıldı) */}
      <div className="max-w-2xl mx-auto">
        <div className="relative rounded-3xl p-6 md:p-8 border border-amber-500/50 bg-[#0e0d10] shadow-2xl shadow-amber-500/5 ring-1 ring-amber-500/20 space-y-6">
          {/* Top badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 text-[11px] font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
            <span>{language === 'tr' ? 'ByNoGame Destekçi Paketi' : 'ByNoGame Supporter Package'}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-b border-zinc-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black text-white">Spark Destekçi</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold font-mono">
                  SPARK ROZETİ
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ByNoGame
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                {language === 'tr'
                  ? 'ByNoGame üzerinden dilediğiniz miktarda tek seferlik bağış yapın, kullanıcı adınızla doğrulanıp ömür boyu Spark rozeti kazanın.'
                  : 'Donate any amount via ByNoGame, verify with your username, and unlock the lifetime Spark badge.'}
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
              <span>{language === 'tr' ? 'ByNoGame ile Bağış Yap' : 'Donate with ByNoGame'}</span>
              <ExternalLink className="w-4 h-4 opacity-80" />
            </button>

            {/* Check Donation Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCheckDonation}
                disabled={isCheckingDonation}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-amber-500/40 hover:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isCheckingDonation ? 'animate-spin' : ''}`} />
                <span>
                  {isCheckingDonation
                    ? (language === 'tr' ? 'Bağışlar Kontrol Ediliyor...' : 'Checking Donations...')
                    : (language === 'tr' ? 'Bağışımı Kontrol Et & Rozeti Al' : 'Check My Donation & Claim Badge')}
                </span>
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

          {checkResult.status === 'not_found' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {language === 'tr' ? 'Henüz Onaylı Bağış Bulunamadı' : 'No Verified Donation Found Yet'}
                  </p>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    {checkResult.message}
                  </p>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    {language === 'tr'
                      ? 'Lütfen ByNoGame sayfasında kullanıcı adı alanına tam olarak '
                      : 'Please make sure you entered exactly '}
                    <strong className="text-white font-mono">@{cleanUsername}</strong>
                    {language === 'tr'
                      ? ' yazdığınızdan emin olun. Bağış yaptıktan sonra sistemin algılaması 1-2 dakika sürebilir.'
                      : ' in the username field. It may take 1-2 minutes to reflect.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {checkResult.status === 'error' && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1 animate-in fade-in">
              <p className="font-bold">{language === 'tr' ? 'Bağlantı Hatası' : 'Connection Error'}</p>
              <p className="text-zinc-400 text-[11px]">{checkResult.message}</p>
            </div>
          )}

          {/* Stream ID Information Footer Box */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3 text-zinc-400 text-[11px] font-mono">
            <div className="flex items-center gap-2 overflow-hidden">
              <Radio className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="truncate">Stream ID: {BYNOGAME_STREAM_ID}</span>
            </div>
            <span className="text-[10px] text-zinc-500 flex-shrink-0">nylithra</span>
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
                <td className="py-3 px-4 text-emerald-400 font-bold">ByNoGame (Tek Seferlik Dilediğiniz Tutar)</td>
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
      {/* BYNOGAME UYARI MODALI [!] - KULLANICI ADI YAZILMASI UYARISI */}
      {/* ========================================================= */}
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
                {language === 'tr' ? 'ByNoGame\'e Yazılacak Kullanıcı Adınız:' : 'Your Username to Enter on ByNoGame:'}
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
                ? 'Bağışınız tamamlandıktan sonra ByNoGame Stream ID (5595ad22-dd5a-47c2-93ba-d7bf9a3f85ed) üzerinden otomatik kontrol edilecek ve Spark Destekçisi rozetiniz tanımlanacaktır.'
                : 'After your donation completes, it will be verified via ByNoGame Stream ID to automatically award your Spark Supporter badge.'}
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
