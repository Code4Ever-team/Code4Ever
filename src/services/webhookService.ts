import { JobListing, JobApplication, WebhookIntegrationSettings, DEFAULT_WEBHOOK_TEMPLATE } from '../types';

const WEBHOOK_STORAGE_KEY = 'c4e_webhook_integrations';

export function getDefaultWebhookSettings(): WebhookIntegrationSettings {
  return {
    discord: {
      enabled: false,
      webhook_url: '',
      bot_name: 'Code4Ever Bot',
      avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'
    },
    jubbio: {
      enabled: false,
      webhook_url: '',
      bot_token: '',
      guild_id: '',
      channel_id: ''
    },
    telegram: {
      enabled: false,
      bot_token: '',
      chat_id: ''
    },
    message_template: DEFAULT_WEBHOOK_TEMPLATE
  };
}

export function loadWebhookSettings(): WebhookIntegrationSettings {
  try {
    const raw = localStorage.getItem(WEBHOOK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getDefaultWebhookSettings(),
        ...parsed,
        discord: { ...getDefaultWebhookSettings().discord, ...(parsed.discord || {}) },
        jubbio: { ...getDefaultWebhookSettings().jubbio, ...(parsed.jubbio || {}) },
        telegram: { ...getDefaultWebhookSettings().telegram, ...(parsed.telegram || {}) }
      };
    }
  } catch (e) {
    console.warn('Failed to load webhook settings from localStorage:', e);
  }
  return getDefaultWebhookSettings();
}

export function saveWebhookSettings(settings: WebhookIntegrationSettings): void {
  try {
    localStorage.setItem(WEBHOOK_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save webhook settings to localStorage:', e);
  }
}

/**
 * Replaces placeholders:
 * {joblist} -> listing title
 * {username} -> [@applicant_username](https://app.lanux.online/@applicant_username)
 * {des} -> applicant description or experience
 * {quota} -> listing quota
 */
export function formatWebhookMessage(
  template: string,
  listing: Partial<JobListing>,
  application: Partial<JobApplication>
): string {
  const username = application.applicant_username || 'kullanici';
  const usernameFormatted = `[@${username}](https://app.lanux.online/@${username})`;
  const jobTitle = listing.title || 'Ekip / İş İlanı';
  const quotaStr = (listing.quota || 1).toString();
  const description = application.description || application.experience || 'Açıklama belirtilmedi.';

  return (template || DEFAULT_WEBHOOK_TEMPLATE)
    .replace(/{joblist}/g, jobTitle)
    .replace(/{username}/g, usernameFormatted)
    .replace(/{des}/g, description)
    .replace(/{quota}/g, quotaStr);
}

export interface WebhookSendResult {
  success: boolean;
  platform: 'discord' | 'jubbio' | 'telegram';
  message: string;
  details?: any;
}

/**
 * Sends a test webhook message for a specific platform
 */
export async function testWebhook(
  platform: 'discord' | 'jubbio' | 'telegram',
  config: any,
  customTemplate?: string
): Promise<WebhookSendResult> {
  const sampleListing: Partial<JobListing> = {
    title: 'Frontend React & TypeScript Geliştirici',
    quota: 3
  };
  const sampleApplication: Partial<JobApplication> = {
    applicant_username: 'test123',
    name: 'Test Geliştirici',
    experience: '3 yıl React, Tailwind, Next.js tecrübesi',
    languages: 'TypeScript, JavaScript, Python',
    description: 'Code4Ever ekibinde modern arayüzler ve WebSockets ile çalışmak istiyorum.'
  };

  const messageText = formatWebhookMessage(
    customTemplate || DEFAULT_WEBHOOK_TEMPLATE,
    sampleListing,
    sampleApplication
  );

  try {
    const res = await fetch('/api/integrations/webhook/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform,
        config,
        message: messageText
      })
    });

    const rawText = await res.text();
    let data: any = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { error: rawText || `HTTP ${res.status}: ${res.statusText}` };
    }

    if (!res.ok || !data.success) {
      return {
        success: false,
        platform,
        message: data.error || data.message || 'Webhook gönderimi başarısız oldu.',
        details: data
      };
    }

    return {
      success: true,
      platform,
      message: 'Test bildirimi başarıyla gönderildi! Lütfen kanalınızı kontrol edin.'
    };
  } catch (err: any) {
    return {
      success: false,
      platform,
      message: `Bağlantı hatası: ${err?.message || 'Bilinmeyen hata'}`
    };
  }
}

/**
 * Dispatches webhooks when an application is submitted
 */
export async function dispatchJobApplicationWebhooks(
  listing: JobListing,
  application: JobApplication,
  overrideSettings?: WebhookIntegrationSettings
): Promise<WebhookSendResult[]> {
  const settings = overrideSettings || loadWebhookSettings();
  const results: WebhookSendResult[] = [];

  const messageText = formatWebhookMessage(
    settings.message_template || DEFAULT_WEBHOOK_TEMPLATE,
    listing,
    application
  );

  // Dispatch via backend relay
  try {
    const res = await fetch('/api/integrations/webhook/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings,
        message: messageText,
        listing_title: listing.title,
        applicant_username: application.applicant_username
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) {
        return data.results;
      }
    }
  } catch (e) {
    console.warn('Webhook dispatch error:', e);
  }

  return results;
}

export const sendJobApplicationWebhook = dispatchJobApplicationWebhooks;

