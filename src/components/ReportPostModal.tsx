import React, { useState } from 'react';
import { Post, UserProfile, PostReport } from '../types';
import { reportPostInSupabase } from '../services/supabaseClient';
import { AlertTriangle, Flag, CheckCircle2, Send, X, ShieldAlert } from 'lucide-react';

interface ReportPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  currentUser: UserProfile;
  language: 'tr' | 'en';
  onSuccess?: () => void;
}

export const ReportPostModal: React.FC<ReportPostModalProps> = ({
  isOpen,
  onClose,
  post,
  currentUser,
  language,
  onSuccess
}) => {
  const [reason, setReason] = useState<PostReport['reason']>('violation');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !post) return null;

  const getSnippetCode = () => {
    if (!post.code_snippet) return '';
    if (typeof post.code_snippet === 'string') return post.code_snippet;
    return (post.code_snippet as any).code || '';
  };

  const reportReasons: { id: PostReport['reason']; label_tr: string; label_en: string; icon: string }[] = [
    { id: 'violation', label_tr: 'Topluluk & Kod Kuralları İhlali', label_en: 'Rules Violation', icon: '🚨' },
    { id: 'spam', label_tr: 'Spam & Tekrar Eden Paylaşım', label_en: 'Spam & Repetitive', icon: '🔁' },
    { id: 'ad', label_tr: 'İzinsiz Reklam / Satış / Tanıtım', label_en: 'Unauthorized Ads / Promotion', icon: '📢' },
    { id: 'misleading', label_tr: 'Yanıltıcı / Zararlı / Kötü Amaçlı Kod', label_en: 'Harmful / Malicious Code', icon: '⚠️' },
    { id: 'hate', label_tr: 'Nefret Söylemi / Hakaret / Taciz', label_en: 'Hate Speech / Harassment', icon: '🤬' },
    { id: 'privacy', label_tr: 'Gizlilik İhlali / Kişisel Veri', label_en: 'Privacy / Sensitive Data', icon: '🔒' },
    { id: 'other', label_tr: 'Diğer Sorunlar', label_en: 'Other Issues', icon: '❓' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedItem = reportReasons.find((r) => r.id === reason);
      const reasonLabel = language === 'tr' ? (selectedItem?.label_tr || 'İhlal') : (selectedItem?.label_en || 'Violation');

      const snippetText = getSnippetCode();
      await reportPostInSupabase({
        post_id: post.id,
        post_author_username: post.author.username,
        post_content: post.content || (snippetText ? `[Kod Paylaşımı: ${snippetText.substring(0, 80)}]` : '[Gönderi İçeriği]'),
        reporter_username: currentUser.username || 'anonim',
        reporter_display_name: currentUser.display_name || 'Kullanıcı',
        reason,
        reason_label: reasonLabel,
        details: details.trim()
      });

      setIsSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Gönderi bildirimi kaydedilirken hata:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl space-y-0 text-white">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {language === 'tr' ? 'Gönderiyi Bildir / Şikayet Et' : 'Report Post to Moderation'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                @{post.author.username} paylaşılan gönderi
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

        {/* Post Preview Snippet */}
        <div className="p-4 bg-zinc-950/40 border-b border-zinc-800/60 text-xs text-zinc-300">
          <div className="text-[10px] text-zinc-500 font-mono mb-1">Bildirilen İçerik Önizlemesi:</div>
          <p className="line-clamp-2 italic text-zinc-400">
            "{post.content || (getSnippetCode() ? getSnippetCode().substring(0, 100) : 'Görsel / Medya paylaşımı')}"
          </p>
        </div>

        {/* Success View */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">
              {language === 'tr' ? 'Bildiriminiz Alındı!' : 'Report Received!'}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {language === 'tr'
                ? 'Bu gönderi yönetici inceleme paneline iletildi. Topluluk güvenliğine katkınız için teşekkürler.'
                : 'Thank you. The post was flagged and sent to our admin moderation review.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Reason Selection */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2">
                {language === 'tr' ? 'Bildirme Sebebiniz' : 'Select Reason'}
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {reportReasons.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReason(item.id)}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border transition-all text-left cursor-pointer ${
                      reason === item.id
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="flex-1">{language === 'tr' ? item.label_tr : item.label_en}</span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        reason === item.id ? 'border-amber-400 bg-amber-400' : 'border-zinc-700'
                      }`}
                    >
                      {reason === item.id && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                {language === 'tr' ? 'Ek Açıklama (Opsiyonel)' : 'Additional Notes (Optional)'}
              </label>
              <textarea
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={
                  language === 'tr'
                    ? 'Yöneticilere iletmek istediğiniz ek bir detay varsa yazabilirsiniz...'
                    : 'Provide any additional context for moderators...'
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
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
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-40"
              >
                {isSubmitting ? (
                  <span>{language === 'tr' ? 'İletiliyor...' : 'Submitting...'}</span>
                ) : (
                  <>
                    <Flag className="w-3.5 h-3.5" />
                    <span>{language === 'tr' ? 'Bildirimi Gönder' : 'Submit Report'}</span>
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
