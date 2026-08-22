import React, { useState, useEffect } from 'react';
import { WebhookIntegrationSettings, DEFAULT_WEBHOOK_TEMPLATE } from '../types';
import { loadWebhookSettings, saveWebhookSettings, testWebhook, WebhookSendResult } from '../services/webhookService';
import { Send, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Bot, MessageSquare, Shield, HelpCircle, Code2, Copy, Check } from 'lucide-react';

interface IntegrationsSettingsProps {
  language: 'tr' | 'en';
}

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({ language }) => {
  const [settings, setSettings] = useState<WebhookIntegrationSettings>(loadWebhookSettings());
  const [activePlatform, setActivePlatform] = useState<'discord' | 'jubbio' | 'telegram'>('discord');
  const [testResult, setTestResult] = useState<WebhookSendResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadWebhookSettings());
  }, []);

  const handleSave = (newSettings?: WebhookIntegrationSettings) => {
    const toSave = newSettings || settings;
    saveWebhookSettings(toSave);
    setSettings({ ...toSave });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleRunTest = async (platform: 'discord' | 'jubbio' | 'telegram') => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const config = platform === 'discord'
        ? settings.discord
        : platform === 'jubbio'
        ? settings.jubbio
        : settings.telegram;

      const res = await testWebhook(platform, config, settings.message_template);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        platform,
        message: err?.message || 'Bilinmeyen test hatası oluştu.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const insertVariable = (varName: string) => {
    setSettings((prev) => ({
      ...prev,
      message_template: (prev.message_template || '') + ` ${varName} `
    }));
    setCopiedVariable(varName);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  const resetToDefaultTemplate = () => {
    setSettings((prev) => ({
      ...prev,
      message_template: DEFAULT_WEBHOOK_TEMPLATE
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header Description */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              {language === 'tr' ? 'Ekip & İş İlanı Webhook Entegrasyonları' : 'Team & Job Webhook Integrations'}
            </h3>
          </div>
          {saveSuccess && (
            <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{language === 'tr' ? 'Kaydedildi' : 'Saved'}</span>
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {language === 'tr'
            ? 'Ekip ilanlarınıza yeni bir başvuru geldiğinde Discord, Jubbio veya Telegram kanalınıza otomatik anlık bildirim mesajı gönderilmesini sağlayın.'
            : 'Automatically dispatch rich instant notifications to Discord, Jubbio, or Telegram when someone applies to your team or job listing.'}
        </p>
      </div>

      {/* Platform Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950 border border-zinc-800/80 rounded-2xl">
        <button
          type="button"
          onClick={() => setActivePlatform('discord')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activePlatform === 'discord'
              ? 'bg-[#5865F2] text-white shadow-lg'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ display: settings.discord.enabled ? 'inline-block' : 'none' }} />
          <span>Discord</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePlatform('jubbio')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activePlatform === 'jubbio'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ display: settings.jubbio.enabled ? 'inline-block' : 'none' }} />
          <span>Jubbio</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePlatform('telegram')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activePlatform === 'telegram'
              ? 'bg-[#229ED9] text-white shadow-lg'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ display: settings.telegram.enabled ? 'inline-block' : 'none' }} />
          <span>Telegram</span>
        </button>
      </div>

      {/* Active Platform Panel */}
      <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
        {/* Discord Config */}
        {activePlatform === 'discord' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div>
                <span className="text-sm font-bold text-white block">Discord Webhook Bildirimleri</span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {language === 'tr' ? 'Discord kanal entegrasyonu' : 'Discord channel integration'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = {
                    ...settings,
                    discord: { ...settings.discord, enabled: !settings.discord.enabled }
                  };
                  setSettings(updated);
                  handleSave(updated);
                }}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.discord.enabled ? 'bg-[#5865F2]' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.discord.enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Discord Webhook URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={settings.discord.webhook_url}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      discord: { ...settings.discord, webhook_url: e.target.value }
                    })
                  }
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#5865F2]"
                />
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  {language === 'tr' ? 'Kanal Ayarları > Entegrasyonlar > Webhook Oluştur' : 'Channel Settings > Integrations > Create Webhook'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Bot Adı (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={settings.discord.bot_name || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        discord: { ...settings.discord, bot_name: e.target.value }
                      })
                    }
                    placeholder="Code4Ever Bot"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Bot Avatar URL (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={settings.discord.avatar_url || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        discord: { ...settings.discord, avatar_url: e.target.value }
                      })
                    }
                    placeholder="https://..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isTesting || !settings.discord.webhook_url}
                onClick={() => handleRunTest('discord')}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{language === 'tr' ? 'Test Bildirimi Gönder' : 'Send Test Notification'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                className="px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Kaydet' : 'Save'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Jubbio Config */}
        {activePlatform === 'jubbio' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Jubbio Bot & Webhook Entegrasyonu</span>
                  <a
                    href="https://jubbio.com/dev/docs/bot-api/webhooks"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <span>Dokümantasyon</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {language === 'tr' ? 'Jubbio sunucu ve kanal webhook API' : 'Jubbio server and channel webhook API'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = {
                    ...settings,
                    jubbio: { ...settings.jubbio, enabled: !settings.jubbio.enabled }
                  };
                  setSettings(updated);
                  handleSave(updated);
                }}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.jubbio.enabled ? 'bg-purple-600' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.jubbio.enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Jubbio Webhook URL veya API Endpoint
                </label>
                <input
                  type="text"
                  value={settings.jubbio.webhook_url || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jubbio: { ...settings.jubbio, webhook_url: e.target.value }
                    })
                  }
                  placeholder="https://jubbio.com/api/v1/webhooks/..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Bot Token (Opsiyonel)
                  </label>
                  <input
                    type="password"
                    value={settings.jubbio.bot_token || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        jubbio: { ...settings.jubbio, bot_token: e.target.value }
                      })
                    }
                    placeholder="jbb_tok_..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Guild / Sunucu ID
                  </label>
                  <input
                    type="text"
                    value={settings.jubbio.guild_id || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        jubbio: { ...settings.jubbio, guild_id: e.target.value }
                      })
                    }
                    placeholder="123456"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Kanal ID
                  </label>
                  <input
                    type="text"
                    value={settings.jubbio.channel_id || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        jubbio: { ...settings.jubbio, channel_id: e.target.value }
                      })
                    }
                    placeholder="987654"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isTesting || (!settings.jubbio.webhook_url && !settings.jubbio.bot_token)}
                onClick={() => handleRunTest('jubbio')}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{language === 'tr' ? 'Jubbio Test Bildirimi Gönder' : 'Send Jubbio Test'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Kaydet' : 'Save'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Telegram Config */}
        {activePlatform === 'telegram' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div>
                <span className="text-sm font-bold text-white block">Telegram Bot Entegrasyonu</span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {language === 'tr' ? 'Telegram kanal & grup bot bildirimi' : 'Telegram channel & group bot notifications'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = {
                    ...settings,
                    telegram: { ...settings.telegram, enabled: !settings.telegram.enabled }
                  };
                  setSettings(updated);
                  handleSave(updated);
                }}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.telegram.enabled ? 'bg-[#229ED9]' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.telegram.enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Telegram Bot Token <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={settings.telegram.bot_token}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      telegram: { ...settings.telegram, bot_token: e.target.value }
                    })
                  }
                  placeholder="123456789:ABCdefGHIjklMNOpqrs"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#229ED9]"
                />
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  @BotFather üzerinden alınan token
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Chat ID / Kanal ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={settings.telegram.chat_id}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      telegram: { ...settings.telegram, chat_id: e.target.value }
                    })
                  }
                  placeholder="@kanalim veya -100123456789"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#229ED9]"
                />
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  Mesajın iletileceği kanal veya grup kimliği
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isTesting || !settings.telegram.bot_token || !settings.telegram.chat_id}
                onClick={() => handleRunTest('telegram')}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{language === 'tr' ? 'Telegram Test Bildirimi Gönder' : 'Send Telegram Test'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                className="px-4 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1f8cbf] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Kaydet' : 'Save'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Test Result Toast/Banner */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 animate-fade-in ${
              testResult.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="font-bold">{testResult.success ? 'Başarılı!' : 'Test Başarısız Oldu'}</div>
              <p className="text-[11px] leading-relaxed">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Webhook Message Template Editor */}
      <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
          <div>
            <span className="text-sm font-bold text-white block">
              {language === 'tr' ? 'Özelleştirilebilir Mesaj Şablonu' : 'Custom Message Template'}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              {language === 'tr'
                ? 'Başvuru geldiğinde kanala iletilecek mesaj içeriği'
                : 'Message content dispatched upon receiving a job application'}
            </span>
          </div>

          <button
            type="button"
            onClick={resetToDefaultTemplate}
            className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {language === 'tr' ? 'Varsayılana Dön' : 'Reset to Default'}
          </button>
        </div>

        {/* Variables Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 block">
            {language === 'tr' ? 'Kullanılabilir Parametreler (Tıklayarak ekleyin):' : 'Available Placeholders (Click to insert):'}
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { tag: '{joblist}', label: 'İlan Başlığı' },
              { tag: '{username}', label: '[@username](https://app.lanux.online/@username)' },
              { tag: '{des}', label: 'Açıklama / Deneyim' },
              { tag: '{quota}', label: 'Kontenjan' }
            ].map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => insertVariable(v.tag)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-mono text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>{v.tag}</span>
                <span className="text-[10px] text-zinc-500">({v.label})</span>
                {copiedVariable === v.tag && <Check className="w-3 h-3 text-emerald-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-1.5">
          <textarea
            value={settings.message_template}
            onChange={(e) => setSettings({ ...settings, message_template: e.target.value })}
            rows={5}
            placeholder="Mesaj şablonu girin..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-blue-500 leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => handleSave()}
            className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {language === 'tr' ? 'Şablonu & Ayarları Kaydet' : 'Save Template & Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
