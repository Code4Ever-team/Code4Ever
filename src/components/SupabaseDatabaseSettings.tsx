import React, { useState, useEffect } from 'react';
import { checkSupabaseTablesStatus, SupabaseTableStatus, getSupabaseConfig, saveCustomSupabaseCredentials } from '../services/supabaseClient';
import { SUPABASE_SETUP_SQL } from '../utils/supabaseSql';
import { Database, RefreshCw, CheckCircle2, XCircle, Copy, Check, ExternalLink, Code2, AlertTriangle, ShieldCheck, Key, Lock } from 'lucide-react';

interface SupabaseDatabaseSettingsProps {
  language: 'tr' | 'en';
}

export const SupabaseDatabaseSettings: React.FC<SupabaseDatabaseSettingsProps> = ({ language }) => {
  const [status, setStatus] = useState<SupabaseTableStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await checkSupabaseTablesStatus();
      setStatus(res);
    } catch (e) {
      console.warn('Status fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const config = getSupabaseConfig();
    setCustomUrl(config.url || '');
    setCustomKey(config.anonKey || '');
    fetchStatus();
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomSupabaseCredentials(customUrl.trim(), customKey.trim());
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
    fetchStatus();
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              {language === 'tr' ? 'Supabase PostgreSQL Veritabanı & Tablolar' : 'Supabase PostgreSQL Database & Tables'}
            </h3>
          </div>

          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{language === 'tr' ? 'Yenile' : 'Refresh'}</span>
          </button>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {language === 'tr'
            ? 'Supabase projelerinizde tablolar otomatik oluşmadığında aşağıdaki SQL kurulum komutunu kopyalayarak Supabase SQL Editor paneline tek tıkla yapıştırıp çalıştırabilirsiniz.'
            : 'If Supabase tables are not automatically created in your project, copy the full SQL setup code below and run it in your Supabase SQL Editor.'}
        </p>
      </div>

      {/* Table Status Grid */}
      <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
          <span className="text-sm font-bold text-white">
            {language === 'tr' ? 'Canlı Tablo Durumu' : 'Live Table Status'}
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            {status?.connected
              ? (language === 'tr' ? '🟢 Supabase Bağlı' : '🟢 Supabase Connected')
              : (language === 'tr' ? '🟡 Yerel / Offline Mod' : '🟡 Local / Offline Mode')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: 'posts', name: 'posts', desc: 'Gönderiler & Kategoriler' },
            { key: 'profiles', name: 'profiles', desc: 'Kullanıcı Profilleri' },
            { key: 'communities', name: 'communities', desc: 'Topluluklar' },
            { key: 'job_listings', name: 'job_listings', desc: 'Ekip & İş İlanları' },
            { key: 'job_applications', name: 'job_applications', desc: 'İlan Başvuruları' },
            { key: 'messages', name: 'messages', desc: 'E2EE Mesajlar' },
            { key: 'system_error_reports', name: 'system_error_reports', desc: 'Sistem & Webhook Hata Logları' },
            { key: 'post_reports', name: 'post_reports', desc: 'Gönderi İhlal & Şikayet Raporları' }
          ].map((item) => {
            const tableExists = status?.tables ? (status.tables as any)[item.key] === true : false;
            return (
              <div
                key={item.key}
                className={`p-3 rounded-xl border transition-all ${
                  tableExists
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-zinc-950 border-zinc-800/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-xs text-white">{item.name}</span>
                  {tableExists ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>
                <span className="text-[11px] text-zinc-400 block">{item.desc}</span>
                <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                  {tableExists ? 'Tablo Mevcut & RLS Aktif' : 'Tablo Bulunamadı / Bekleniyor'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SQL Setup Script Box */}
      <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
          <div>
            <span className="text-sm font-bold text-white block">
              {language === 'tr' ? 'Otomatik Tablo & Güvenlik SQL Scripti' : 'Auto Table & Security SQL Script'}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              PostgreSQL RLS, Indexes & Tables
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopySql}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {copiedSql ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-zinc-950" />}
            <span>{copiedSql ? (language === 'tr' ? 'SQL Kopyalandı!' : 'SQL Copied!') : (language === 'tr' ? 'Tüm SQL Kodunu Kopyala' : 'Copy All SQL')}</span>
          </button>
        </div>

        <div className="relative">
          <pre className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] font-mono text-zinc-300 max-h-48 overflow-y-auto leading-relaxed">
            {SUPABASE_SETUP_SQL}
          </pre>
        </div>

        <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/40 text-xs text-blue-300 leading-relaxed flex items-start gap-2.5">
          <Code2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Nasıl Kullanılır?</span>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Supabase Dashboard'unuza girin &gt; Sol menüden <strong>SQL Editor</strong> seçin &gt; <strong>New Query</strong> butonuna basıp bu kodu yapıştırın ve <strong>Run</strong> diyerek çalıştırın. Tüm tablolar ve silme yetkileri anında aktif olacaktır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
