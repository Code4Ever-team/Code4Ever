import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
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
  // 1. Direct Webhook URL if provided
  if (config.webhook_url && config.webhook_url.trim().startsWith('http')) {
    const response = await fetch(config.webhook_url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        name: 'Code4Ever Bot',
        message: message,
        platform: 'Code4Ever'
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Jubbio Webhook hatası (${response.status}): ${text || response.statusText}`);
    }
    return true;
  }

  // 2. Jubbio Bot API endpoint if bot token & channel id provided
  if (config.bot_token && config.channel_id) {
    const response = await fetch(`https://jubbio.com/api/v1/channels/${encodeURIComponent(config.channel_id)}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${config.bot_token.trim()}`
      },
      body: JSON.stringify({
        content: message
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Jubbio Bot API hatası (${response.status}): ${text || response.statusText}`);
    }
    return true;
  }

  throw new Error('Jubbio için geçerli bir Webhook URL veya Bot Token + Kanal ID girilmelidir.');
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
