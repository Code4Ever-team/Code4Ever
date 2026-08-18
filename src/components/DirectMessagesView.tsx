import React, { useState } from 'react';
import { Mail, Send, User } from 'lucide-react';
import { Channel, UserProfile } from '../types';

interface DirectMessagesViewProps {
  user: UserProfile;
  language: 'tr' | 'en';
}

export const DirectMessagesView: React.FC<DirectMessagesViewProps> = ({ user, language }) => {
  const [channels] = useState<Channel[]>([
    {
      id: 'ch_1',
      name: 'nylithra',
      is_dm: true,
      participant: {
        username: 'nylithra',
        display_name: 'Nylithra',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'online'
      },
      last_message: 'Code4Ever projesi harika gözüküyor!',
      last_message_time: '10d',
      unread_count: 1
    },
    {
      id: 'ch_2',
      name: 'c4e_community',
      is_dm: true,
      participant: {
        username: 'c4e_community',
        display_name: 'C4E Community',
        avatar_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=150&auto=format&fit=crop&q=80',
        status: 'online'
      },
      last_message: 'Code4Ever açık kaynak platformuna hoş geldiniz!',
      last_message_time: '1h',
      unread_count: 0
    }
  ]);

  const [activeChannelId, setActiveChannelId] = useState<string>('ch_1');
  const [messages, setMessages] = useState<Record<string, { id: string; sender: string; text: string; time: string }[]>>({
    ch_1: [
      { id: 'm1', sender: 'nylithra', text: 'Merhaba! Code4Ever projesi harika gözüküyor!', time: '10:15' }
    ],
    ch_2: [
      { id: 'm2', sender: 'c4e_community', text: 'Code4Ever açık kaynak platformuna hoş geldiniz!', time: '09:30' }
    ]
  });

  const [inputText, setInputText] = useState('');

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const activeMessages = messages[activeChannelId] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      id: `msg_${Date.now()}`,
      sender: user.username,
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages({
      ...messages,
      [activeChannelId]: [...activeMessages, newMessage]
    });
    setInputText('');
  };

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen pb-16 bg-[#09090b] flex flex-col">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-400" />
          <span>{language === 'tr' ? 'Mesajlar' : 'Messages'}</span>
        </h2>
      </div>

      <div className="grid grid-cols-3 flex-1">
        <div className="border-r border-zinc-800/60 divide-y divide-zinc-800/40 bg-[#0c0c0e]">
          {channels.map((ch) => (
            <div
              key={ch.id}
              onClick={() => setActiveChannelId(ch.id)}
              className={`p-3 cursor-pointer transition-colors flex items-center gap-2.5 ${
                activeChannelId === ch.id ? 'bg-zinc-800/80' : 'hover:bg-zinc-900/50'
              }`}
            >
              <div className="relative">
                <img
                  src={ch.participant.avatar_url}
                  alt={ch.participant.display_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span
                  className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-[#0c0c0e] ${
                    ch.participant.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'
                  }`}
                />
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate">{ch.participant.display_name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{ch.last_message_time}</span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">{ch.last_message}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-2 flex flex-col justify-between h-[calc(100vh-60px)]">
          <div className="p-3 border-b border-zinc-800/40 bg-[#0c0c0e] flex items-center gap-2.5">
            <img
              src={activeChannel.participant.avatar_url}
              alt={activeChannel.participant.display_name}
              className="w-7 h-7 rounded-full object-cover"
            />
            <div>
              <h3 className="text-xs font-bold text-white">{activeChannel.participant.display_name}</h3>
              <span className="text-[10px] text-zinc-500 font-mono">@{activeChannel.participant.username}</span>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {activeMessages.map((m) => {
              const isSelf = m.sender === user.username;
              return (
                <div key={m.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs p-3 rounded-2xl text-xs space-y-1 ${
                      isSelf ? 'bg-blue-600 text-white rounded-br-none' : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none'
                    }`}
                  >
                    <p className="leading-relaxed">{m.text}</p>
                    <span className={`text-[9px] font-mono block text-right ${isSelf ? 'text-blue-200' : 'text-zinc-500'}`}>
                      {m.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800/60 bg-[#0c0c0e] flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={language === 'tr' ? 'Mesaj yazın...' : 'Type a message...'}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
