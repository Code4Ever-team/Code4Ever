import React, { useState, useEffect } from 'react';
import { Rss, Copy, Check, ExternalLink, Globe, Radio, Sparkles, Filter, Code2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { Post } from '../types';

interface RssFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'tr' | 'en';
  posts: Post[];
  initialTag?: string | null;
}

interface ParsedRssItem {
  title: string;
  link: string;
  pubDate?: string;
  creator?: string;
  snippet?: string;
}

export const RssFeedModal: React.FC<RssFeedModalProps> = ({
  isOpen,
  onClose,
  language,
  posts,
  initialTag
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'preview' | 'reader'>('url');
  const [tagFilter, setTagFilter] = useState(initialTag ? initialTag.replace(/^#/, '') : '');
  const [userFilter, setUserFilter] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // External RSS Reader State
  const [selectedFeedUrl, setSelectedFeedUrl] = useState('https://dev.to/feed');
  const [externalFeedItems, setExternalFeedItems] = useState<ParsedRssItem[]>([]);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTag) {
      setTagFilter(initialTag.replace(/^#/, ''));
    }
  }, [initialTag]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Construct dynamic RSS URL
  const queryParams = new URLSearchParams();
  if (tagFilter.trim()) queryParams.set('tag', tagFilter.trim());
  if (userFilter.trim()) queryParams.set('user', userFilter.trim());
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const fullRssXmlUrl = `${currentOrigin}/api/rss.xml${queryString}`;
  const fullJsonFeedUrl = `${currentOrigin}/api/feed.json`;

  const handleCopyRssUrl = () => {
    navigator.clipboard.writeText(fullRssXmlUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyJsonUrl = () => {
    navigator.clipboard.writeText(fullJsonFeedUrl);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const fetchExternalFeed = async (urlToFetch: string) => {
    setLoadingExternal(true);
    setExternalError(null);
    try {
      const res = await fetch(`/api/rss/proxy?url=${encodeURIComponent(urlToFetch)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const items = Array.from(xmlDoc.querySelectorAll('item, entry'));

      const parsed: ParsedRssItem[] = items.slice(0, 15).map((item) => {
        const title = item.querySelector('title')?.textContent || 'Başlıksız Gönderi';
        const link = item.querySelector('link')?.textContent || item.querySelector('link')?.getAttribute('href') || '#';
        const pubDate = item.querySelector('pubDate, published, updated')?.textContent || undefined;
        const creator = item.querySelector('dc\\:creator, creator, author > name')?.textContent || undefined;
        const description = item.querySelector('description, summary, content')?.textContent || '';
        
        // Clean HTML tags for preview snippet
        const cleanSnippet = description.replace(/<[^>]*>?/gm, '').slice(0, 160);

        return {
          title,
          link,
          pubDate,
          creator,
          snippet: cleanSnippet
        };
      });

      setExternalFeedItems(parsed);
    } catch (err: any) {
      setExternalError(
        language === 'tr'
          ? 'RSS akışı alınamadı. Lütfen URL adresini kontrol edin.'
          : 'Failed to fetch RSS feed. Please verify the URL.'
      );
    } finally {
      setLoadingExternal(false);
    }
  };

  const PRESET_FEEDS = [
    { name: 'DEV Community', url: 'https://dev.to/feed', tag: 'Web / Tech' },
    { name: 'GitHub Blog', url: 'https://github.blog/feed/', tag: 'Dev Tools' },
    { name: 'Hacker News (YCombinator)', url: 'https://news.ycombinator.com/rss', tag: 'News' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0e0e11] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shadow-inner">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{language === 'tr' ? 'Code4Ever RSS Akışı' : 'Code4Ever RSS Feed'}</span>
                <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-mono font-bold">
                  RSS 2.0 / Atom
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                {language === 'tr'
                  ? 'Gönderileri ve kod paylaşımlarını RSS okuyucunuza veya bildirim servislerine bağlayın'
                  : 'Subscribe to developer posts and snippets via RSS reader'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center border-b border-zinc-800 bg-[#09090b] px-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'url'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'RSS Akış Bağlantısı' : 'Feed URL'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Akış Önizleme' : 'Feed Preview'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('reader');
              if (externalFeedItems.length === 0) {
                fetchExternalFeed(selectedFeedUrl);
              }
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'reader'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Geliştirici Haberleri' : 'Tech Feeds'}</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'url' && (
            <div className="space-y-5">
              {/* Filter controls */}
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                  <Filter className="w-3.5 h-3.5 text-orange-400" />
                  <span>{language === 'tr' ? 'Akış Filtreleri (İsteğe Bağlı)' : 'Feed Filters (Optional)'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                      {language === 'tr' ? 'Hashtag / Konu' : 'Hashtag / Topic'}
                    </label>
                    <input
                      type="text"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      placeholder="Örn: react, typescript, python"
                      className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                      {language === 'tr' ? 'Kullanıcı Adı' : 'Username'}
                    </label>
                    <input
                      type="text"
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      placeholder="Örn: nylithra"
                      className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* RSS 2.0 XML Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span>RSS 2.0 / XML Endpoint URL</span>
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">Standart RSS XML</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={fullRssXmlUrl}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-orange-300 font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyRssUrl}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      copiedUrl
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-orange-500 hover:bg-orange-600 active:scale-95 text-white shadow-lg shadow-orange-500/20'
                    }`}
                  >
                    {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl ? (language === 'tr' ? 'Kopyalandı' : 'Copied') : (language === 'tr' ? 'Kopyala' : 'Copy')}</span>
                  </button>
                </div>
              </div>

              {/* Quick links & JSON feed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <a
                  href={fullRssXmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ExternalLink className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                    <span>{language === 'tr' ? 'XML Akışını Yeni Sekmede Aç' : 'Open XML in New Tab'}</span>
                  </div>
                </a>

                <button
                  type="button"
                  onClick={handleCopyJsonUrl}
                  className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-between group transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Code2 className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                    <span>{copiedJson ? (language === 'tr' ? 'JSON URL Kopyalandı' : 'JSON URL Copied') : (language === 'tr' ? 'JSON Feed (v1.1) Kopyala' : 'Copy JSON Feed')}</span>
                  </div>
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                </button>
              </div>

              {/* App Compatibility notice */}
              <div className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/15 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {language === 'tr'
                    ? 'Bu RSS bağlantısını Feedly, NetNewsWire, Thunderbird, Discord Webhook ve Slack gibi tüm RSS okuyuculara ekleyebilirsiniz.'
                    : 'You can subscribe to this RSS feed in Feedly, NetNewsWire, Thunderbird, Discord Webhooks, and Slack.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{language === 'tr' ? 'Canlı Akış Gönderileri' : 'Live Feed Posts'}</span>
                <span className="font-mono">{posts.length} {language === 'tr' ? 'gönderi' : 'posts'}</span>
              </div>

              {posts.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/60 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
                  {language === 'tr' ? 'Akışta henüz yayınlanmış gönderi bulunamadı.' : 'No posts in feed yet.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 10).map((post) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{post.author?.display_name || post.author?.username}</span>
                          <span className="text-zinc-500 font-mono">@{post.author?.username}</span>
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Şimdi'}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed line-clamp-3">
                        {post.content}
                      </p>

                      {post.code_snippet && (
                        <div className="px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-[11px] text-emerald-400 truncate">
                          <code>{post.code_snippet.split('\n')[0]}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reader' && (
            <div className="space-y-5">
              {/* Presets */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {PRESET_FEEDS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      setSelectedFeedUrl(preset.url);
                      fetchExternalFeed(preset.url);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                      selectedFeedUrl === preset.url
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>{preset.name}</span>
                    <span className="text-[10px] opacity-60">({preset.tag})</span>
                  </button>
                ))}
              </div>

              {/* Feed URL Search / Fetch bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={selectedFeedUrl}
                  onChange={(e) => setSelectedFeedUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => fetchExternalFeed(selectedFeedUrl)}
                  disabled={loadingExternal}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingExternal ? 'animate-spin' : ''}`} />
                  <span>{language === 'tr' ? 'Yenile' : 'Refresh'}</span>
                </button>
              </div>

              {externalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{externalError}</span>
                </div>
              )}

              {/* List of items */}
              {loadingExternal ? (
                <div className="p-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                  <span>{language === 'tr' ? 'RSS akışı yükleniyor...' : 'Fetching RSS items...'}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {externalFeedItems.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-1.5 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                          {item.title}
                        </h4>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-400 flex-shrink-0" />
                      </div>
                      {item.snippet && (
                        <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                          {item.snippet}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono pt-1">
                        {item.creator && <span>By {item.creator}</span>}
                        {item.pubDate && <span>· {new Date(item.pubDate).toLocaleDateString()}</span>}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            Endpoint: /api/rss.xml
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-colors cursor-pointer border border-zinc-800"
          >
            {language === 'tr' ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
