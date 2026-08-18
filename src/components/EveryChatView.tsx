import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  Lock,
  Code2,
  Terminal,
  Copy,
  Check,
  Zap,
  User
} from 'lucide-react';
import { UserProfile } from '../types';

interface EveryChatViewProps {
  user: UserProfile;
  language: 'tr' | 'en';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const EveryChatView: React.FC<EveryChatViewProps> = ({ user, language }) => {
  const isNylithra =
    user?.username?.toLowerCase() === 'nylithra' ||
    user?.display_name?.toLowerCase() === 'nylithra';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      content:
        'Merhaba! Ben EveryChat, Nasıl Yardımcı Olabilirim?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/everychat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Groq API yanıt veremedi.');
      }

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Sistem Bildirimi**: ${err?.message || 'Bir hata oluştu.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!isNylithra) {
    return (
      <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight mb-2">
          {language === 'tr' ? 'Erişim Kısıtlandı' : 'Access Restricted'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed mb-6 font-mono">
          {language === 'tr'
            ? 'EveryChat Şuanda BETA Aşamasındadır.'
            : 'EveryChat Is Now Beta'}
        </p>
        <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-500">
          Oturum Sahibi: <span className="text-zinc-300">@{user.username || 'misafir'}</span>
        </div>
      </div>
    );
  }

  const samplePrompts = [
    'React + Firestore mimarisinde performansı nasıl artırabilirim?',
    'Groq Llama 3.3 70B ile hızlı bir API entegrasyon örneği yaz.',
    'Code4Ever platformu için temiz bir TypeScript utility fonksiyonu yaz.',
    'Yazılımda SOLID prensiplerini kısa ve öz örneklerle açıkla.'
  ];

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 h-screen flex flex-col bg-[#09090b]">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">EveryChat</h2>
              <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-blue-600 text-white rounded">
                BETA
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Groq Active
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Llama 3.3 70B Versatile • @nylithra özel alan
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: 'welcome_reset',
                role: 'assistant',
                content: 'Sohbet temizlendi. Nasıl yardımcı olabilirim @nylithra?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ])
          }
          className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
          title="Sohbeti Temizle"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 border border-zinc-700 text-blue-400'
                }`}
              >
                {isUser ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-8 h-8 rounded-xl object-cover"
                  />
                ) : (
                  <Sparkles className="w-4 h-4 text-blue-400" />
                )}
              </div>

              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-bold text-zinc-300">
                    {isUser ? user.display_name : 'EveryChat AI (Groq)'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/10'
                      : 'bg-[#121215] border border-zinc-800 text-zinc-200 rounded-tl-none shadow-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words font-sans">
                    {msg.content}
                  </div>

                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-end">
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none bg-[#121215] border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
              <span>Groq Llama 3.3 70B düşünüyor...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prompts Chips (shown when few messages) */}
      {messages.length <= 2 && (
        <div className="px-5 py-2 flex flex-wrap gap-2">
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] bg-[#121215] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl transition-all text-left truncate max-w-full"
            >
              💡 {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800/60 bg-[#09090b]/90 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 bg-[#121215] border border-zinc-800 focus-within:border-blue-500/80 rounded-2xl p-1.5 transition-all shadow-xl"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="EveryChat AI'a sorun... (ör. TypeScript kod örneği yaz)"
            className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gönder</span>
          </button>
        </form>
      </div>
    </div>
  );
};
