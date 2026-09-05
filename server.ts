import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

const rateLimitWindowMs = 60000;
const maxRequestsPerWindow = 60;
const ipRequestStore = new Map<string, number[]>();

const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
  const now = Date.now();
  const timestamps = ipRequestStore.get(ip) || [];

  const validTimestamps = timestamps.filter((t) => now - t < rateLimitWindowMs);

  if (validTimestamps.length >= maxRequestsPerWindow) {
    res.setHeader('X-RateLimit-Limit', maxRequestsPerWindow.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('Retry-After', '60');
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait 60 seconds.'
    });
    return;
  }

  validTimestamps.push(now);
  ipRequestStore.set(ip, validTimestamps);

  res.setHeader('X-RateLimit-Limit', maxRequestsPerWindow.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequestsPerWindow - validTimestamps.length).toString());

  next();
};

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; " +
    "connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com wss://*.firebaseio.com https://api.github.com https://github.com https: wss: ws:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: https://apis.google.com https://*.gstatic.com https://*.firebaseapp.com https://*.googleapis.com blob: data:; " +
    "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https: https://apis.google.com https://*.gstatic.com https://*.firebaseapp.com https://*.googleapis.com blob: data:; " +
    "img-src 'self' data: blob: https: https://avatars.githubusercontent.com https://raw.githubusercontent.com https://unavatar.io https://images.unsplash.com https://*.googleusercontent.com; " +
    "style-src 'self' 'unsafe-inline' https:; " +
    "font-src 'self' data: https:; " +
    "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://apis.google.com https:;"
  );
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'Code4Ever (C4E)',
    timestamp: new Date().toISOString(),
    e2ee_supported: true,
    webhooks_supported: true,
    rate_limiter: 'sliding_window_active'
  });
});

// -------------------------------------------------------------
// WEBHOOK RELAY ENGINE (DISCORD, JUBBIO, TELEGRAM)
// -------------------------------------------------------------

async function sendDiscordWebhook(webhookUrl: string, message: string, botName?: string, avatarUrl?: string) {
  const payload = {
    content: message,
    username: botName || 'Code4Ever Bot',
    avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Discord Webhook hatası (${response.status}): ${text || response.statusText}`);
  }
  return true;
}

async function sendJubbioWebhook(config: { webhook_url?: string; bot_token?: string; guild_id?: string; channel_id?: string }, message: string) {
  const cleanUrl = config.webhook_url ? config.webhook_url.trim() : '';
  const cleanToken = config.bot_token ? config.bot_token.trim() : '';
  const cleanChannelId = config.channel_id ? config.channel_id.trim() : '';

  // 1. Direct Webhook URL if provided
  if (cleanUrl.startsWith('http')) {
    const payload = {
      content: message,
      text: message,
      message: message,
      username: 'Code4Ever Bot',
      name: 'Code4Ever Bot',
      platform: 'Code4Ever'
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let response: globalThis.Response;
    try {
      response = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Code4Ever-Webhook/1.0',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Jubbio sunucusuna bağlanırken zaman aşımı (12s) oluştu.');
      }
      throw new Error(`Jubbio Webhook bağlantı hatası: ${fetchErr.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Jubbio Webhook hatası (${response.status}): ${text || response.statusText || 'Bilinmeyen yanıt'}`);
    }
    return true;
  }

  // 2. Jubbio Bot API endpoint if bot token & channel id provided
  if (cleanToken && cleanChannelId) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let response: globalThis.Response;
    try {
      response = await fetch(`https://jubbio.com/api/v1/channels/${encodeURIComponent(cleanChannelId)}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${cleanToken.replace(/^Bot\s+/i, '')}`,
          'User-Agent': 'Code4Ever-Webhook/1.0',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify({
          content: message,
          message: message
        }),
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Jubbio Bot API sunucusuna bağlanırken zaman aşımı (12s) oluştu.');
      }
      throw new Error(`Jubbio Bot API bağlantı hatası: ${fetchErr.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Jubbio Bot API hatası (${response.status}): ${text || response.statusText || 'Bilinmeyen yanıt'}`);
    }
    return true;
  }

  throw new Error('Jubbio için lütfen geçerli bir Webhook URL veya Bot Token + Kanal ID girin.');
}

async function sendTelegramWebhook(botToken: string, chatId: string, message: string) {
  const cleanToken = botToken.trim().replace(/^bot/i, '');
  const cleanChatId = chatId.trim();

  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  
  // Try Markdown first
  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: cleanChatId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    })
  });

  // Fallback to plain text if Markdown format fails
  if (!response.ok) {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: message.replace(/[*_`[\]()]/g, ''),
        disable_web_page_preview: false
      })
    });
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Telegram API hatası (${response.status}): ${data.description || 'Geçersiz Bot Token veya Chat ID'}`);
  }
  return true;
}

// -------------------------------------------------------------
// POST DELETION & MULTI-DEVICE SYNC ENGINE
// -------------------------------------------------------------
const globalDeletedPostIds = new Set<string>();

app.get('/api/posts/deleted', (req: Request, res: Response) => {
  res.json({ success: true, deleted_ids: Array.from(globalDeletedPostIds) });
});

app.post('/api/posts/delete', rateLimiterMiddleware, async (req: Request, res: Response) => {
  const { postId, customSupabaseUrl, customSupabaseAnonKey } = req.body || {};

  if (!postId || typeof postId !== 'string') {
    res.status(400).json({ success: false, error: 'postId gereklidir.' });
    return;
  }

  globalDeletedPostIds.add(postId);

  const supabaseUrl = (customSupabaseUrl || process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseKey = (customSupabaseAnonKey || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  let supabaseDeleted = false;
  let supabaseError = null;

  if (supabaseUrl && supabaseKey) {
    try {
      const cleanUrl = supabaseUrl.replace(/\/+$/, '');
      
      // 1. Direct REST DELETE call to Supabase
      const deleteRes = await fetch(`${cleanUrl}/rest/v1/posts?id=eq.${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation'
        }
      });

      if (deleteRes.ok) {
        supabaseDeleted = true;
      } else {
        // 2. Fallback Soft-Delete PATCH in case DELETE policy was restrictive
        const patchRes = await fetch(`${cleanUrl}/rest/v1/posts?id=eq.${encodeURIComponent(postId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ is_deleted: true, content: '[DELETED]' })
        });
        if (patchRes.ok) {
          supabaseDeleted = true;
        } else {
          supabaseError = await patchRes.text().catch(() => 'Supabase RLS error');
        }
      }
    } catch (err: any) {
      supabaseError = err?.message || 'Network error';
    }
  }

  res.json({
    success: true,
    postId,
    supabaseDeleted,
    supabaseError,
    message: 'Gönderi başarıyla silindi ve tüm cihazlarda senkronize edildi.'
  });
});

// -------------------------------------------------------------
// COMMUNITY CODE SHARING HTTP API (REST & WEBHOOKS)
// -------------------------------------------------------------
interface CommunityStore {
  id: string;
  name: string;
  handle: string;
  api_key?: string;
  avatar_url?: string;
  description?: string;
}

const inMemoryCommunities: CommunityStore[] = [
  { id: 'comm_react', name: 'React Türkiye', handle: '@react_tr', api_key: 'c4e_comm_react_tr_live', description: 'React, Vite, Next.js ekosistemi' },
  { id: 'comm_backend', name: 'Backend & System Arch', handle: '@backend_devs', api_key: 'c4e_comm_backend_live', description: 'Node.js, Go, Rust, microservices' },
  { id: 'comm_ai', name: 'AI & Machine Learning', handle: '@ai_agents', api_key: 'c4e_comm_ai_live', description: 'LLMs, AI agents, PyTorch' },
  { id: 'comm_cyber', name: 'Cyber Security & E2EE', handle: '@cyber_sec', api_key: 'c4e_comm_cyber_live', description: 'Security, cryptography and E2EE' }
];

// 1. List Communities & API Documentation
app.get(['/api/v1/communities', '/api/communities'], (req: Request, res: Response) => {
  res.json({
    success: true,
    api_version: 'v1',
    description: 'Code4Ever Community Code Sharing & Publishing HTTP API',
    endpoints: {
      list_communities: 'GET /api/v1/communities',
      get_community_posts: 'GET /api/v1/communities/:handle/posts',
      publish_code_post: 'POST /api/v1/communities/:handle/posts (or /api/v1/community/post)',
    },
    payload_example: {
      content: 'Burada paylaşılan kod hakkında açıklama',
      code_snippet: 'console.log("Hello from HTTP Request API!");',
      code_language: 'javascript',
      category: 'frontend',
      author_name: 'API Developer',
      author_username: 'api_dev'
    },
    communities: inMemoryCommunities.map(c => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
      description: c.description,
      post_url: `/api/v1/communities/${encodeURIComponent(c.handle)}/posts`
    }))
  });
});

// 2. Fetch Posts for a Community
app.get(['/api/v1/communities/:handle/posts', '/api/communities/:handle/posts'], async (req: Request, res: Response) => {
  const rawHandle = req.params.handle || '';
  const cleanHandle = rawHandle.startsWith('@') ? rawHandle.toLowerCase() : `@${rawHandle.toLowerCase()}`;

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (supabaseUrl && supabaseKey) {
    try {
      const cleanUrl = supabaseUrl.replace(/\/+$/, '');
      const fetchRes = await fetch(
        `${cleanUrl}/rest/v1/posts?community_handle=eq.${encodeURIComponent(cleanHandle)}&is_deleted=eq.false&order=created_at.desc&limit=50`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        }
      );
      if (fetchRes.ok) {
        const posts = await fetchRes.json();
        res.json({ success: true, community_handle: cleanHandle, count: posts.length, posts });
        return;
      }
    } catch (e: any) {
      console.warn('Supabase fetch community posts error:', e?.message);
    }
  }

  res.json({ success: true, community_handle: cleanHandle, count: 0, posts: [] });
});

// 3. Publish Code / Post to Community via HTTP Request
app.post(
  [
    '/api/v1/communities/:handle/posts',
    '/api/communities/:handle/posts',
    '/api/v1/community/post',
    '/api/v1/community/publish',
    '/api/community/post'
  ],
  rateLimiterMiddleware,
  async (req: Request, res: Response) => {
    // Community API is in Closed Beta
    res.status(503).json({
      success: false,
      status: 'beta_locked',
      error: 'Topluluk HTTP API şu anda Kapalı Beta aşamasındadır ve harici paylaşımlara geçici olarak kapalıdır. / Community HTTP API is currently in Closed Beta and temporarily disabled.',
      documentation: '/api/v1/communities'
    });
  }
);

// Webhook Test Endpoint
app.post('/api/integrations/webhook/test', rateLimiterMiddleware, async (req: Request, res: Response) => {
  const { platform, config, message } = req.body || {};

  if (!platform || !message) {
    res.status(400).json({ success: false, error: 'Platform ve mesaj parametresi zorunludur.' });
    return;
  }

  try {
    if (platform === 'discord') {
      if (!config?.webhook_url || !config.webhook_url.startsWith('http')) {
        res.status(400).json({ success: false, error: 'Lütfen geçerli bir Discord Webhook URL adresi girin.' });
        return;
      }
      await sendDiscordWebhook(config.webhook_url, message, config.bot_name, config.avatar_url);
      res.json({ success: true, platform, message: 'Discord test mesajı başarıyla gönderildi!' });
      return;
    }

    if (platform === 'jubbio') {
      await sendJubbioWebhook(config || {}, message);
      res.json({ success: true, platform, message: 'Jubbio test mesajı başarıyla iletildi!' });
      return;
    }

    if (platform === 'telegram') {
      if (!config?.bot_token || !config?.chat_id) {
        res.status(400).json({ success: false, error: 'Lütfen Telegram Bot Token ve Chat ID bilgilerini eksiksiz girin.' });
        return;
      }
      await sendTelegramWebhook(config.bot_token, config.chat_id, message);
      res.json({ success: true, platform, message: 'Telegram test bildirimi başarıyla gönderildi!' });
      return;
    }

    res.status(400).json({ success: false, error: 'Desteklenmeyen platform tipi: ' + platform });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Webhook gönderilirken beklenmeyen bir hata oluştu.' });
  }
});

// Webhook Bulk Send for Job Applications
app.post('/api/integrations/webhook/send', rateLimiterMiddleware, async (req: Request, res: Response) => {
  const { settings, message } = req.body || {};
  if (!settings || !message) {
    res.status(400).json({ success: false, error: 'Eksik parametreler.' });
    return;
  }

  const results: any[] = [];

  // 1. Discord
  if (settings.discord?.enabled && settings.discord?.webhook_url) {
    try {
      await sendDiscordWebhook(settings.discord.webhook_url, message, settings.discord.bot_name, settings.discord.avatar_url);
      results.push({ platform: 'discord', success: true });
    } catch (e: any) {
      results.push({ platform: 'discord', success: false, error: e?.message });
    }
  }

  // 2. Jubbio
  if (settings.jubbio?.enabled && (settings.jubbio?.webhook_url || (settings.jubbio?.bot_token && settings.jubbio?.channel_id))) {
    try {
      await sendJubbioWebhook(settings.jubbio, message);
      results.push({ platform: 'jubbio', success: true });
    } catch (e: any) {
      results.push({ platform: 'jubbio', success: false, error: e?.message });
    }
  }

  // 3. Telegram
  if (settings.telegram?.enabled && settings.telegram?.bot_token && settings.telegram?.chat_id) {
    try {
      await sendTelegramWebhook(settings.telegram.bot_token, settings.telegram.chat_id, message);
      results.push({ platform: 'telegram', success: true });
    } catch (e: any) {
      results.push({ platform: 'telegram', success: false, error: e?.message });
    }
  }

  res.json({ success: true, results });
});

// GitHub OAuth URL Endpoint
app.get('/api/auth/github/url', (req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID || 'Ov23li4E4ExampleId';
  const appUrl = process.env.APP_URL || 'https://ais-dev-ysbofutgtb2x4oupnkmwcm-375020542742.europe-west2.run.app';
  const redirectUri = `${appUrl}/api/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email repo',
    state: 'c4e_oauth_state_' + Date.now()
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl, redirect_uri: redirectUri });
});

// GitHub OAuth Callback Route
app.get(['/api/auth/github/callback', '/api/auth/github/callback/'], async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  let githubUser: any = {
    login: 'github_developer',
    name: 'GitHub Developer',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Full-stack developer synced via GitHub OAuth.'
  };

  if (code && clientId && clientSecret) {
    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code
        })
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'Code4Ever-Platform'
          }
        });
        githubUser = await userRes.json();
      }
    } catch (err) {
      console.error('GitHub token exchange error:', err);
    }
  }

  res.send(`
    <!Process HTML>
    <html>
      <head>
        <title>Code4Ever GitHub OAuth</title>
        <style>
          body { background: #09090b; color: #f4f4f5; font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #121215; padding: 24px; border-radius: 16px; border: 1px solid #27272a; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Code4Ever GitHub Eşleşmesi Başarılı!</h2>
          <p>Yönlendiriliyorsunuz...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                user: ${JSON.stringify(githubUser)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </div>
      </body>
    </html>
  `);
});

// Proxy GitHub user public repositories
app.get('/api/github/repos', async (req: Request, res: Response) => {
  const username = (req.query.username as string) || 'octocat';
  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=15`, {
      headers: {
        'User-Agent': 'Code4Ever-Platform'
      }
    });
    if (!response.ok) {
      res.status(response.status).json({ error: 'GitHub kullanıcısı veya depoları bulunamadı.' });
      return;
    }
    const repos = await response.json();
    res.json({ success: true, username, repos });
  } catch (error) {
    res.status(500).json({ error: 'GitHub sunucusuna bağlanırken hata oluştu.' });
  }
});

app.post('/api/everychat', rateLimiterMiddleware, async (req: Request, res: Response) => {
  const { messages } = req.body || {};
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    res.status(400).json({
      error: 'Groq API Key henüz ayarlanmamış. Lütfen sunucunuza GROQ_API_KEY ekleyin.'
    });
    return;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Geçerli bir sohbet mesaj listesi gerekli.' });
    return;
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Sen Code4Ever platformunda sadece nylithra kişisine özel geliştirilmiş "EveryChat (Beta)" Llama 3.3 70B yapay zeka asistanısın. Yazılım, mimari, kodlama ve teknoloji alanlarında son derece uzman, nazik ve hızlı yanıtlar verirsin.'
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      res.status(groqRes.status).json({
        error: `Groq API Hatası (${groqRes.status}): ${errText}`
      });
      return;
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || 'Yanıt alınamadı.';
    res.json({ success: true, reply, model: data.model });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'EveryChat sunucu hatası.' });
  }
});

app.post('/api/rate-limit-test', rateLimiterMiddleware, (req: Request, res: Response) => {
  res.json({
    status: 'allowed',
    ip: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/license/validate', rateLimiterMiddleware, (req: Request, res: Response) => {
  const { licenseKey } = req.body || {};
  if (!licenseKey || typeof licenseKey !== 'string') {
    res.status(400).json({ valid: false, error: 'License key string is required' });
    return;
  }

  const isValidFormat = /^C4E-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(licenseKey.trim());
  if (!isValidFormat) {
    res.status(400).json({ valid: false, error: 'Invalid license format' });
    return;
  }

  res.json({
    valid: true,
    tier: licenseKey.includes('PRO') ? 'Pro' : 'Developer',
    rate_limit: licenseKey.includes('PRO') ? 5000 : 1000,
    expires_at: '2027-12-31T23:59:59Z'
  });
});

// -------------------------------------------------------------
// BYNOGAME STREAM DONATION INTEGRATION & VERIFICATION
// -------------------------------------------------------------
const BYNOGAME_STREAM_ID = '5595ad22-dd5a-47c2-93ba-d7bf9a3f85ed';
const BYNOGAME_DONATE_URL = 'https://donate.bynogame.com/nylithra';
const BYNOGAME_DONATIONS_FILE = path.join(process.cwd(), 'data', 'bynogame_donations.json');

interface ByNoGameDonationRecord {
  id: string;
  streamId: string;
  username: string; // The username entered by donor on ByNoGame
  usernameNormalized: string;
  amount?: number | string;
  currency?: string;
  message?: string;
  timestamp: string;
  verified: boolean;
  claimedAt?: string;
}

function loadByNoGameDonations(): ByNoGameDonationRecord[] {
  try {
    if (fs.existsSync(BYNOGAME_DONATIONS_FILE)) {
      const content = fs.readFileSync(BYNOGAME_DONATIONS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('ByNoGame donations load error:', e);
  }
  return [];
}

function saveByNoGameDonations(donations: ByNoGameDonationRecord[]) {
  try {
    const dir = path.dirname(BYNOGAME_DONATIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BYNOGAME_DONATIONS_FILE, JSON.stringify(donations, null, 2), 'utf-8');
  } catch (e) {
    console.error('ByNoGame donations save error:', e);
  }
}

// 1. ByNoGame Public Configuration
app.get('/api/bynogame/config', (req: Request, res: Response) => {
  res.json({
    streamId: BYNOGAME_STREAM_ID,
    donateUrl: BYNOGAME_DONATE_URL,
    streamer: 'nylithra',
    rewardRole: 'Spark',
    rewardBadge: 'Spark Destekçi',
    storageMaxMB: 250
  });
});

// 2. Check ByNoGame Donations for a specific user and stream ID
app.post('/api/bynogame/check-donation', async (req: Request, res: Response) => {
  try {
    const { username, streamId } = req.body || {};
    if (!username || typeof username !== 'string') {
      res.status(400).json({ success: false, error: 'Kullanıcı adı gereklidir.' });
      return;
    }

    const targetStreamId = (streamId || BYNOGAME_STREAM_ID).trim();
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();

    // 1) Check local persisted donations database
    const donations = loadByNoGameDonations();
    const matched = donations.find(
      (d) =>
        d.streamId.toLowerCase() === targetStreamId.toLowerCase() &&
        (d.usernameNormalized === cleanUsername || d.username.trim().toLowerCase() === cleanUsername)
    );

    if (matched) {
      // Mark as claimed if not already
      if (!matched.claimedAt) {
        matched.claimedAt = new Date().toISOString();
        matched.verified = true;
        saveByNoGameDonations(donations);
      }

      res.json({
        success: true,
        hasDonation: true,
        donation: matched,
        streamId: targetStreamId,
        message: 'ByNoGame bağışınız doğrulandı! Spark Destekçisi rozetiniz ve 250MB yükleme yetkiniz tanımlandı.'
      });
      return;
    }

    // 2) Try querying ByNoGame stream overlay / API endpoints directly
    // ByNoGame stream endpoints format attempt
    const streamEndpoints = [
      `https://stream.bynogame.com/api/v1/stream/${targetStreamId}`,
      `https://stream.bynogame.com/stream/${targetStreamId}/donations`,
      `https://stream.bynogame.com/overlay/${targetStreamId}`
    ];

    let remoteFound: any = null;

    for (const url of streamEndpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/json, text/plain, */*'
          }
        });
        clearTimeout(timeout);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data: any = await response.json();
            const list = Array.isArray(data) ? data : data.donations || data.items || [];
            const foundInList = list.find((item: any) => {
              const name = (item.user || item.username || item.donor || item.name || '').toString().toLowerCase();
              return name.includes(cleanUsername) || cleanUsername.includes(name);
            });
            if (foundInList) {
              remoteFound = foundInList;
              break;
            }
          }
        }
      } catch (fetchErr) {
        // Continue to next endpoint or fallback
      }
    }

    if (remoteFound) {
      const newRecord: ByNoGameDonationRecord = {
        id: 'bng_' + Date.now(),
        streamId: targetStreamId,
        username: cleanUsername,
        usernameNormalized: cleanUsername,
        amount: remoteFound.amount || 'ByNoGame Bağışı',
        currency: remoteFound.currency || 'TL',
        message: remoteFound.message || '',
        timestamp: new Date().toISOString(),
        verified: true,
        claimedAt: new Date().toISOString()
      };
      donations.push(newRecord);
      saveByNoGameDonations(donations);

      res.json({
        success: true,
        hasDonation: true,
        donation: newRecord,
        streamId: targetStreamId,
        message: 'ByNoGame akışından bağışınız otomatik olarak tespit edildi ve doğrulandı!'
      });
      return;
    }

    // Not found yet
    res.json({
      success: true,
      hasDonation: false,
      streamId: targetStreamId,
      username: cleanUsername,
      message:
        'ByNoGame Stream ID (5595ad22-dd5a-47c2-93ba-d7bf9a3f85ed) üzerinde henüz @' +
        cleanUsername +
        ' kullanıcı adıyla kayıtlı bir bağış tespit edilemedi. Bağışınızı yeni yaptıysanız lütfen birkaç saniye bekleyip tekrar deneyiniz.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Bağış kontrol edilirken hata oluştu.' });
  }
});

// 3. ByNoGame Webhook / External Notification Handler
app.post('/api/bynogame/webhook', (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const streamId = (payload.streamId || payload.stream_id || BYNOGAME_STREAM_ID).toString();
    const donor = (payload.username || payload.donor || payload.user_name || payload.name || '').toString().trim();

    if (!donor) {
      res.status(400).json({ error: 'Donor username is required' });
      return;
    }

    const donations = loadByNoGameDonations();
    const newDonation: ByNoGameDonationRecord = {
      id: 'bng_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      streamId,
      username: donor,
      usernameNormalized: donor.replace(/^@/, '').toLowerCase(),
      amount: payload.amount || payload.total || '0',
      currency: payload.currency || 'TL',
      message: payload.message || payload.note || '',
      timestamp: new Date().toISOString(),
      verified: true
    };

    donations.push(newDonation);
    saveByNoGameDonations(donations);

    res.json({ success: true, recorded: newDonation });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Webhook işlenemedi' });
  }
});

// 4. Manual / Admin Verification or Simulation of ByNoGame Donation
app.post('/api/bynogame/register-donation', (req: Request, res: Response) => {
  try {
    const { username, amount, message, secretKey } = req.body || {};
    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const donations = loadByNoGameDonations();
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();

    const record: ByNoGameDonationRecord = {
      id: 'bng_reg_' + Date.now(),
      streamId: BYNOGAME_STREAM_ID,
      username: cleanUsername,
      usernameNormalized: cleanUsername,
      amount: amount || 'Destek',
      currency: 'TL',
      message: message || 'ByNoGame Bağışı',
      timestamp: new Date().toISOString(),
      verified: true
    };

    donations.push(record);
    saveByNoGameDonations(donations);

    res.json({ success: true, donation: record });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Kayıt başarısız' });
  }
});

// 5. Get recent donations list for streamer
app.get('/api/bynogame/donations', (req: Request, res: Response) => {
  const donations = loadByNoGameDonations();
  res.json({
    streamId: BYNOGAME_STREAM_ID,
    total: donations.length,
    donations: donations.slice(-50).reverse()
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Code4Ever server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
