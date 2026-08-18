import React, { useState } from 'react';
import {
  Sparkles,
  Heart,
  HardDrive,
  ShieldCheck,
  Check,
  Zap,
  Code2,
  Gift,
  Users,
  Award,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Clock,
  Lock
} from 'lucide-react';
import { UserProfile, BadgeItem } from '../types';
import { UserBadges } from './UserBadges';
import { isUserSpark } from '../utils/fileUploadHelper';

interface SupportViewProps {
  user: UserProfile;
  language: 'tr' | 'en';
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
}

export const SupportView: React.FC<SupportViewProps> = ({
  user,
  language,
  onUpdateUser
}) => {
  const isSparkSupporter = isUserSpark(user);
  const [isProcessing, setIsProcessing] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [showClosedNotice, setShowClosedNotice] = useState(false);
  const [customAmount, setCustomAmount] = useState('100');

  // Payment is temporarily paused / under construction
  const isPaymentTemporarilyClosed = true;

  const handleBecomeSupporter = () => {
    if (isPaymentTemporarilyClosed) {
      setShowClosedNotice(true);
      setTimeout(() => setShowClosedNotice(false), 5000);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSupportSuccess(true);

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
          'Code4Ever açık kaynak projesine maddi destekte bulunan özel Spark destekçi rozetidir. 250MB tek seferde dosya yükleme ayrıcalığı tanır.'
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
    }, 1200);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative rounded-3xl p-6 md:p-10 border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-[#0c0c0e] to-[#09090b] shadow-2xl overflow-hidden text-center space-y-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Heart className="w-4 h-4 text-amber-400 fill-amber-500/20 animate-pulse" />
          <span>{language === 'tr' ? 'Açık Kaynak Projeye Destek' : 'Support Open Source'}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          {language === 'tr' ? 'Code4Ever Projesine Destek Ol' : 'Support Code4Ever Project'}
        </h1>

        <p className="text-xs md:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          {language === 'tr'
            ? 'Code4Ever tamamen açık kaynak ve topluluk odaklı bir projedir. Abonelik sistemi yerine tek seferlik destek ile projenin sunucu giderlerine katkıda bulunabilir ve Spark destekçi ayrıcalıklarını kazanabilirsiniz.'
            : 'Code4Ever is fully open source. Support our infrastructure with a one-time contribution and unlock the exclusive Spark supporter perks.'}
        </p>

        {/* Temporary Notice Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-md">
          <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>
            {language === 'tr'
              ? 'Ödeme Altyapısı Geçici Olarak Kapalıdır — Çok Yakında Aktif Edilecektir'
              : 'Payment Gateway is Temporarily Closed — Will Be Activated Soon'}
          </span>
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

      {/* Main Single Tier: Spark Destekçi */}
      <div className="max-w-2xl mx-auto">
        <div className="relative rounded-3xl p-6 md:p-8 border border-amber-500/50 bg-[#0e0d10] shadow-2xl shadow-amber-500/5 ring-1 ring-amber-500/20 space-y-6">
          {/* Top badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 text-[11px] font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
            <span>{language === 'tr' ? 'Tek Seferlik Destekçi Paketi' : 'One-Time Supporter Package'}</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2 border-b border-zinc-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white">Spark Destekçi</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold font-mono">
                  SPARK ROLÜ
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {language === 'tr'
                  ? 'Açık kaynak gelişimine tek seferlik katkı sağlayın, ömür boyu Spark rozeti kazanın.'
                  : 'Make a one-time contribution and earn a lifetime Spark badge.'}
              </p>
            </div>

            <div className="text-left md:text-right">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl md:text-4xl font-black text-amber-400">₺{customAmount}</span>
                <span className="text-xs font-mono text-zinc-500">
                  {language === 'tr' ? '/ tek seferlik' : '/ one-time'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {language === 'tr' ? 'Abonelik yenilemesi YOK' : 'NO recurring charges'}
              </span>
            </div>
          </div>

          {/* Amount Presets */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
              {language === 'tr' ? 'Destek Miktarı Seçin (₺):' : 'Select Contribution Amount (₺):'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['50', '100', '250', '500'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCustomAmount(amt)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all ${
                    customAmount === amt
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 scale-105'
                      : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  ₺{amt}
                </button>
              ))}
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

          {/* Notice box about paused payment */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                {language === 'tr'
                  ? 'Ödeme Altyapısı Geçici Olarak Kapalıdır'
                  : 'Payment Integration is Currently Paused'}
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {language === 'tr'
                  ? 'Ödeme ağ geçidi entegrasyonu tamamlandığında destek sistemi açılacaktır. Roller ve rozetler şu an yalnızca yönetici onayıyla verilebilmektedir.'
                  : 'The support system will go live once payment gateway integration is finished. Supporter roles are currently assigned via admin panel.'}
              </p>
            </div>
          </div>

          {/* CTA Action */}
          <div className="pt-1">
            <button
              onClick={handleBecomeSupporter}
              className="w-full py-3.5 px-6 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-xl transition-all duration-200 bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-amber-500/50 hover:text-amber-400 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>
                {language === 'tr'
                  ? 'Ödeme Geçici Olarak Kapalıdır (Yakında Açılacaktır)'
                  : 'Payment is Temporarily Closed (Opening Soon)'}
              </span>
            </button>
          </div>

          {showClosedNotice && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold text-center space-y-1 animate-in fade-in">
              <p>
                {language === 'tr'
                  ? '⏳ Ödeme altyapısı hazırlandığında doğrudan buradan destek olabileceksiniz. İlginiz için teşekkürler!'
                  : '⏳ You will be able to contribute once the payment integration is live. Thank you for your support!'}
              </p>
            </div>
          )}

          {supportSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center space-y-1 animate-in fade-in">
              <p>🎉 Desteğiniz için teşekkür ederiz! Spark rolünüz ve 250MB yükleme yetkiniz profilinize tanımlandı.</p>
            </div>
          )}
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
                  <Sparkles className="w-4 h-4 text-zinc-500" />
                  <span>{language === 'tr' ? 'Spark Rozeti ve Rolü' : 'Spark Badge & Role'}</span>
                </td>
                <td className="py-3 px-4 text-zinc-500">—</td>
                <td className="py-3 px-4 text-amber-400 font-bold">✨ Altın Parıltılı Spark Rozeti</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-zinc-500" />
                  <span>{language === 'tr' ? 'Ödeme Modeli' : 'Billing Model'}</span>
                </td>
                <td className="py-3 px-4 text-zinc-400">{language === 'tr' ? 'Ücretsiz' : 'Free'}</td>
                <td className="py-3 px-4 text-zinc-200">{language === 'tr' ? 'Tek Seferlik (Abonelik Değil)' : 'One-Time (No Subscription)'}</td>
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
    </div>
  );
};

