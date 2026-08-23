import React, { useState, useEffect } from 'react';
import { UserProfile, SystemErrorReport } from '../types';
import { reportSystemErrorInSupabase } from '../services/supabaseClient';
import { AlertCircle, Bug, CheckCircle2, Send, X, Terminal, Sparkles, HelpCircle } from 'lucide-react';

interface ReportErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialErrorType?: SystemErrorReport['error_type'];
  initialLocation?: string;
  initialDescription?: string;
  initialLogs?: string;
  language: 'tr' | 'en';
}

export const ReportErrorModal: React.FC<ReportErrorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialErrorType = 'general_issue',
  initialLocation = '',
  initialDescription = '',
  initialLogs = '',
  language
}) => {
  const [errorType, setErrorType] = useState<SystemErrorReport['error_type']>(initialErrorType);
  const [location, setLocation] = useState(initialLocation);
  const [description, setDescription] = useState(initialDescription);
  const [logs, setLogs] = useState(initialLogs);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorType(initialErrorType || 'general_issue');
      setLocation(initialLocation || '');
      setDescription(initialDescription || '');
      setLogs(initialLogs || '');
      setIsSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen, initialErrorType, initialLocation, initialDescription, initialLogs]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !location.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-collect technical environment diagnostics if logs are empty
      let finalLogs = logs.trim();
      if (!finalLogs) {
        finalLogs = JSON.stringify(
          {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            url: window.location.href,
            screen: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString()
          },
          null,
          2
        );
      }

      await reportSystemErrorInSupabase({
        error_type: errorType,
        location: location.trim() || 'Genel Platform',
        description: description.trim() || 'Kullanıcı tarafından hata bildirimi.',
        logs: finalLogs,
        reporter_username: currentUser.username || 'anonim',
        reporter_display_name: currentUser.display_name || 'Kullanıcı',
        reporter_avatar: currentUser.avatar_url
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Hata bildirilirken sorun oluştu:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#0c0c0e] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl space-y-0 text-white">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {language === 'tr' ? 'Sistem & Webhook Hatası Bildir' : 'Report System or Webhook Issue'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {language === 'tr'
                  ? 'Admin paneline anlık log ve hata kaydı gönderin'
                  : 'Send real-time error log to admin dashboard'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">
              {language === 'tr' ? 'Hata Bildirimi İletildi!' : 'Error Report Sent!'}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
              {language === 'tr'
                ? 'Hata türü, gerçekleştiği yer, açıklama ve teknik log kaydı admin paneline başarıyla kaydedildi. İlgili hata düzeltildiğinde listeden silinecektir.'
                : 'Error details, location, description and technical logs were safely logged to the admin dashboard.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Error Type Selector */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                {language === 'tr' ? 'Hata Türü' : 'Issue Category'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'webhook_failure', label: 'Webhook Hatası', icon: '📡' },
                  { id: 'ui_runtime_error', label: 'Arayüz / Ekran', icon: '🖥️' },
                  { id: 'api_error', label: 'API & İstek', icon: '⚡' },
                  { id: 'database_error', label: 'Veritabanı / Supabase', icon: '🗄️' },
                  { id: 'auth_error', label: 'Giriş / Oturum', icon: '🔒' },
                  { id: 'general_issue', label: 'Genel Sorun', icon: '⚠️' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setErrorType(item.id as any)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      errorType === item.id
                        ? 'bg-red-950/40 border-red-500/60 text-red-300 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Location */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                {language === 'tr' ? 'Hatanın Gerçekleştiği Yer' : 'Location of Issue'}{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={
                  language === 'tr'
                    ? 'Örn: Discord Webhook Gönderimi, Keşfet Akışı, Profil Düzenleme...'
                    : 'e.g. Discord Webhook Send, Explore Feed, Profile Editor...'
                }
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                {language === 'tr' ? 'Hata Açıklaması / Ne Oldu?' : 'Description of What Happened'}{' '}
                <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  language === 'tr'
                    ? 'Hatayı tetikleyen işlem, ekrandaki tepki veya beklenmeyen durum...'
                    : 'Steps to reproduce the error or what went wrong...'
                }
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Logs / Technical Details */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{language === 'tr' ? 'Log Kaydı / JSON / Hata Çıktısı' : 'Error Logs / Technical Details'}</span>
                </label>
                <span className="text-[10px] font-mono text-zinc-500">
                  {language === 'tr' ? 'Opsiyonel (Otomatik doldurulabilir)' : 'Optional'}
                </span>
              </div>
              <textarea
                rows={3}
                value={logs}
                onChange={(e) => setLogs(e.target.value)}
                placeholder={
                  language === 'tr'
                    ? '{"error": "Webhook returned 404", "status": 404, ...}'
                    : 'Paste error stack or response logs here...'
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-[11px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                {language === 'tr' ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !location.trim() || !description.trim()}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>{language === 'tr' ? 'Gönderiliyor...' : 'Sending...'}</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'tr' ? 'Hatayı Admin\'e Bildir' : 'Report Error to Admin'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
