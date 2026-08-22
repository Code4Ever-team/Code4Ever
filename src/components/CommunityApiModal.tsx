import React, { useState } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  Send,
  Terminal,
  Key,
  Globe,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Community, UserProfile } from '../types';
import { CodeSnippetBlock } from './CodeSnippetBlock';

interface CommunityApiModalProps {
  isOpen: boolean;
  community: Community | null;
  currentUser?: UserProfile;
  language: 'tr' | 'en';
  onClose: () => void;
  onPostPublished?: () => void;
}

export const CommunityApiModal: React.FC<CommunityApiModalProps> = ({
  isOpen,
  community,
  currentUser,
  language,
  onClose,
  onPostPublished
}) => {
  if (!isOpen || !community) return null;

  const [activeTab, setActiveTab] = useState<'docs' | 'playground' | 'keys'>('docs');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Playground state
  const [testContent, setTestContent] = useState('Topluluk HTTP API testi: Bu kod parçacığı otomatik gönderilmiştir.');
  const [testCode, setTestCode] = useState(`// Express & Vite API handler
export async function handleRequest(req, res) {
  const data = await fetchCommunityData();
  res.json({ success: true, count: data.length });
}`);
  const [testLanguage, setTestLanguage] = useState('typescript');
  const [testAuthorName, setTestAuthorName] = useState(currentUser?.display_name || 'API Developer');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; post?: any } | null>(null);

  const baseUrl = window.location.origin;
  const commHandle = community.handle.replace(/^@/, '');
  const endpointUrl = `${baseUrl}/api/v1/communities/@${commHandle}/posts`;
  const apiKey = community.api_key || `c4e_comm_${commHandle}_live`;

  const curlExample = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{
    "content": "Performanslı debounce hook örneği",
    "code_snippet": "function useDebounce(value, delay) {\\n  const [debounced, setDebounced] = useState(value);\\n  useEffect(() => {\\n    const handler = setTimeout(() => setDebounced(value), delay);\\n    return () => clearTimeout(handler);\\n  }, [value, delay]);\\n  return debounced;\\n}",
    "code_language": "typescript",
    "author_name": "${currentUser?.display_name || 'API Bot'}"
  }'`;

  const jsFetchExample = `// JavaScript / TypeScript (Node.js or Browser)
const response = await fetch('${endpointUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '${apiKey}'
  },
  body: JSON.stringify({
    content: 'Yeni Python veri analizi algoritması',
    code_snippet: 'import pandas as pd\\ndf = pd.read_csv("dataset.csv")\\nprint(df.describe())',
    code_language: 'python',
    author_name: '${currentUser?.display_name || 'Python Dev'}'
  })
});

const result = await response.json();
console.log('Paylaşım durumu:', result);`;

  const pythonExample = `# Python 3 (requests)
import requests

url = "${endpointUrl}"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey}"
}
payload = {
    "content": "FastAPI Mikroservis Örneği",
    "code_snippet": """from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "ok", "community": "${community.name}"}""",
    "code_language": "python",
    "author_name": "${currentUser?.display_name || 'Python Bot'}"
}

res = requests.post(url, json=payload, headers=headers)
print(res.status_code, res.json())`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSnippet(type);
      setTimeout(() => setCopiedSnippet(null), 2000);
    }
  };

  const handleSendTestRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setTestResult(null);

    try {
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          content: testContent,
          code_snippet: testCode,
          code_language: testLanguage,
          author_name: testAuthorName,
          author_username: currentUser?.username || 'api_tester',
          community_handle: community.handle
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Kod gönderisi HTTP isteği ile başarıyla topluluğa iletildi!',
          post: data.post
        });
        if (onPostPublished) {
          onPostPublished();
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || 'İstek başarısız oldu.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Ağ bağlantı hatası oluştu.'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#0e0e11] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {language === 'tr' ? 'Topluluk HTTP Paylaşım API' : 'Community HTTP Publishing API'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-mono font-bold">
                  REST v1
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {community.name} ({community.handle})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-zinc-800/60 bg-[#0e0e11]">
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'docs'
                ? 'text-white border-blue-500 bg-zinc-900/50'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 inline mr-1.5" />
            {language === 'tr' ? 'API Dokümantasyonu & Kodlar' : 'API Docs & Snippets'}
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'playground'
                ? 'text-white border-blue-500 bg-zinc-900/50'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <Send className="w-3.5 h-3.5 inline mr-1.5" />
            {language === 'tr' ? 'Canlı HTTP İstek Testi' : 'Live Request Tester'}
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'keys'
                ? 'text-white border-blue-500 bg-zinc-900/50'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            <Key className="w-3.5 h-3.5 inline mr-1.5" />
            {language === 'tr' ? 'API Anahtarı & Yetki' : 'API Key & Auth'}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: DOCS */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
              {/* Endpoint Banner */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    {language === 'tr' ? 'HTTP POST Endpoint URL' : 'HTTP POST Endpoint URL'}
                  </span>
                  <button
                    onClick={() => handleCopy(endpointUrl, 'url')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSnippet === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'url' ? 'Kopyalandı' : 'Kopyala'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-black font-mono text-xs text-emerald-400 flex items-center gap-2 select-all overflow-x-auto">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    POST
                  </span>
                  <span>{endpointUrl}</span>
                </div>
              </div>

              {/* cURL Example */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>cURL (Terminal)</span>
                  </span>
                  <button
                    onClick={() => handleCopy(curlExample, 'curl')}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSnippet === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'curl' ? 'Kopyalandı' : 'Kopyala'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                  {curlExample}
                </pre>
              </div>

              {/* JavaScript / TypeScript Fetch */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>JavaScript / TypeScript (Fetch)</span>
                  </span>
                  <button
                    onClick={() => handleCopy(jsFetchExample, 'js')}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSnippet === 'js' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'js' ? 'Kopyalandı' : 'Kopyala'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                  {jsFetchExample}
                </pre>
              </div>

              {/* Python Example */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Python 3 (Requests)</span>
                  </span>
                  <button
                    onClick={() => handleCopy(pythonExample, 'py')}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSnippet === 'py' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'py' ? 'Kopyalandı' : 'Kopyala'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                  {pythonExample}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: PLAYGROUND (LIVE HTTP TESTER) */}
          {activeTab === 'playground' && (
            <form onSubmit={handleSendTestRequest} className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-800/40 text-xs text-blue-300 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  {language === 'tr'
                    ? 'Bu alandan göndereceğiniz HTTP isteği anında topluluk akışında ve Supabase veritabanında yayınlanır.'
                    : 'The HTTP request sent here will immediately be published to the community feed and Supabase database.'}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">
                  {language === 'tr' ? 'Gönderi / Kod Başlığı veya Açıklaması' : 'Post / Snippet Description'}
                </label>
                <input
                  type="text"
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    {language === 'tr' ? 'Kodlama Dili' : 'Code Language'}
                  </label>
                  <select
                    value={testLanguage}
                    onChange={(e) => setTestLanguage(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="rust">Rust</option>
                    <option value="go">Go</option>
                    <option value="sql">SQL / PostgreSQL</option>
                    <option value="html">HTML / CSS</option>
                    <option value="csharp">C#</option>
                    <option value="cpp">C++</option>
                    <option value="bash">Bash / Shell</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    {language === 'tr' ? 'Görünen Geliştirici İsmi' : 'Author Name'}
                  </label>
                  <input
                    type="text"
                    value={testAuthorName}
                    onChange={(e) => setTestAuthorName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">
                  {language === 'tr' ? 'Paylaşılacak Kod Parçacığı' : 'Code Snippet'}
                </label>
                <textarea
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                  rows={6}
                  required
                  placeholder="// Kodunuzu buraya yapıştırın..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                    testResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/30 border-red-500/40 text-red-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">{testResult.message}</span>
                    {testResult.post && (
                      <span className="block text-[11px] font-mono text-zinc-400 mt-1">
                        Post ID: {testResult.post.id}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {isSending
                    ? (language === 'tr' ? 'HTTP İsteği Gönderiliyor...' : 'Sending HTTP Request...')
                    : (language === 'tr' ? 'HTTP Request ile Kodu Toplulukta Paylaş' : 'Publish Code via HTTP Request')}
                </span>
              </button>
            </form>
          )}

          {/* TAB 3: KEYS */}
          {activeTab === 'keys' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>{language === 'tr' ? 'Topluluk API Anahtarı' : 'Community API Key'}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                    Aktif
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={apiKey}
                    className="flex-1 bg-black border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(apiKey, 'key')}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Kopyalandı' : 'Kopyala'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {language === 'tr'
                    ? 'Bu anahtarı HTTP isteklerinizde "X-API-Key" başlığı veya JSON gövdesinde "api_key" olarak ileterek toplulukta güvenli şekilde kod paylaşabilirsiniz.'
                    : 'Pass this key as the "X-API-Key" header or "api_key" in JSON body to securely publish code to this community.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
