import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  ShieldCheck,
  Crown,
  Lock,
  Zap,
  Gift,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { SubscriptionPlan, UserProfile } from '../types';
import { UserBadges } from './UserBadges';

interface SubscriptionsViewProps {
  plans: SubscriptionPlan[];
  user: UserProfile;
  language: 'tr' | 'en';
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  plans,
  user,
  language
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanInfo, setSelectedPlanInfo] = useState<SubscriptionPlan | null>(null);

  const activePlans = plans.filter((p) => p.isActive);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative rounded-3xl p-6 md:p-10 border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-[#0c0c0e] to-[#09090b] shadow-2xl overflow-hidden text-center space-y-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Crown className="w-4 h-4" />
          <span>{language === 'tr' ? 'Code4Ever Ayrıcalıkları' : 'Code4Ever Perks'}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          {language === 'tr' ? 'Abonelik Paketleri & Özel Rozetler' : 'Subscription Plans & Badges'}
        </h1>

        <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
          {language === 'tr'
            ? 'Code4Ever topluluğuna destek olun, profilinizde özel unvan rozetleri kazanın ve yapay zeka ayrıcalıklarının tadını çıkarın.'
            : 'Support the Code4Ever community, earn exclusive profile badges, and enjoy advanced AI features.'}
        </p>

        {/* Notice: Purchases Closed */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-md">
          <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            {language === 'tr'
              ? 'Satın Alımlar Şu An Kapalıdır (Geçici Olarak Devre Dışı)'
              : 'Purchases are Currently Disabled'}
          </span>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="pt-2 flex justify-center">
          <div className="bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800 flex items-center gap-1 backdrop-blur-md">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {language === 'tr' ? 'Aylık Ödeme' : 'Monthly'}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>{language === 'tr' ? 'Yıllık Ödeme' : 'Yearly'}</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                %20 İndirim
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activePlans.map((plan) => {
          const isCurrentPlan = user.subscription?.planId === plan.id && user.subscription.isActive;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between space-y-6 bg-[#0c0c0e] ${
                plan.popular
                  ? 'border-blue-500/60 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{language === 'tr' ? 'En Popüler' : 'Most Popular'}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Plan Header */}
                <div>
                  <h3 className="text-xl font-extrabold text-white">{plan.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 min-h-[32px] leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-zinc-500 font-mono">
                    / {billingCycle === 'yearly' ? (language === 'tr' ? 'yıl' : 'year') : (language === 'tr' ? 'ay' : 'month')}
                  </span>
                </div>

                {/* Badge Award Preview */}
                {plan.badgeLabel && (
                  <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-1.5">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">
                      {language === 'tr' ? 'Kazanılacak Rozet:' : 'Awarded Badge:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <UserBadges
                        badges={[
                          {
                            id: plan.badgeId || 'badge_sub',
                            label: plan.badgeLabel,
                            color: plan.badgeColor || '#3b82f6',
                            icon: plan.badgeIcon || 'code'
                          }
                        ]}
                        showTextLabels={true}
                      />
                    </div>
                  </div>
                )}

                {/* Features list */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-[11px] font-bold text-zinc-300 font-mono uppercase tracking-wider">
                    {language === 'tr' ? 'Paket İçeriği:' : 'Included Features:'}
                  </span>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className="p-0.5 rounded-full bg-blue-500/10 text-blue-400 mt-0.5 flex-shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-zinc-800/60">
                {isCurrentPlan ? (
                  <div className="w-full py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs text-center flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === 'tr' ? 'Aktif Paketiniz' : 'Current Active Plan'}</span>
                  </div>
                ) : (
                  <button
                    disabled={true}
                    onClick={() => setSelectedPlanInfo(plan)}
                    className="w-full py-3 px-4 rounded-2xl bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2 opacity-80"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'tr' ? 'Satın Al (Şu An Kapalı)' : 'Purchase (Disabled)'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Card */}
      <div className="p-6 rounded-3xl bg-[#0c0c0e] border border-zinc-800/80 space-y-3">
        <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
          <HelpCircle className="w-4 h-4" />
          <span>{language === 'tr' ? 'Abonelik ve Rozetler Hakkında' : 'About Subscriptions & Badges'}</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
          {language === 'tr'
            ? 'Code4Ever abonelik sistemi test aşamasındadır ve gerçek ödeme altyapısı entegre edilene kadar tüm satın alımlar kapalı tutulmaktadır. Admin yöneticileri manuel olarak kullanıcılara özel abonelik ve rozet tanımlayabilir.'
            : 'The Code4Ever subscription system is currently in preview. Direct online purchases will be enabled upon payment gateway integration. Admins can grant subscriptions manually.'}
        </p>
      </div>

      {/* Details Modal */}
      {selectedPlanInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedPlanInfo(null)}
        >
          <div
            className="w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-3xl p-6 space-y-4 text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 w-12 h-12 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">{selectedPlanInfo.name}</h3>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {language === 'tr'
                ? 'Code4Ever platformunda online satın alımlar şu an kapalıdır. Özel abonelik tanımlamak için lütfen yöneticiler ile iletişime geçiniz.'
                : 'Online purchasing is currently disabled on Code4Ever. Please contact administrators for manual subscription assignment.'}
            </p>

            <button
              onClick={() => setSelectedPlanInfo(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
