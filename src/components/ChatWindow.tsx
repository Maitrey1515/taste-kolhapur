import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ChevronDown, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ChatMessage, Restaurant } from '@/types';
import { detectIntent, generateBotResponse, createMessage } from '@/lib/chatbot';
import { supabase } from '@/lib/supabase';
import RestaurantCard from './RestaurantCard';
import clsx from 'clsx';

// Simple markdown-to-JSX renderer for bot messages
function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold">{line.slice(2, -2)}</p>;
        }
        // Inline bold
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="text-[13px] leading-relaxed">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatWindow() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('bot', "🙏 Namaskar! I'm your Misal guide. Ask me anything about Kolhapur's Misal restaurants!"),
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load restaurants once
  useEffect(() => {
    supabase
      .from('restaurants')
      .select('*')
      .order('taste_score', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setRestaurants(data as Restaurant[]);
      });
  }, []);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(m => [...m, createMessage('user', text)]);
    setLoading(true);

    // Simulate a small delay for UX
    await new Promise(r => setTimeout(r, 400));

    const intent = detectIntent(text);
    const response = generateBotResponse(intent, text, restaurants);
    setMessages(m => [...m, createMessage('bot', response.content, response.restaurants)]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = ['Best misal', 'Open now', 'Budget options', 'Near me'];

  return (
    <>
      {/* Floating button */}
      <button
        id="chat-open-btn"
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-misal shadow-glow-orange',
          'flex items-center justify-center text-white transition-all duration-300',
          'hover:scale-110 active:scale-95',
          open && 'rotate-0'
        )}
        aria-label="Open chat"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {/* Notification dot */}
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white animate-pulse-subtle" />
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[360px] h-[520px] card shadow-2xl flex flex-col animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-misal p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-display font-semibold text-sm">Misal Guide</p>
              <p className="text-white/70 text-xs">Ask me anything about Misal!</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto text-white/70 hover:text-white transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
            {messages.map(msg => (
              <div key={msg.id} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className="max-w-[85%] space-y-2">
                  <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
                    {msg.role === 'bot'
                      ? <RenderMarkdown text={msg.content} />
                      : <p className="text-[13px]">{msg.content}</p>
                    }
                  </div>
                  {/* Inline restaurant cards */}
                  {msg.restaurants && msg.restaurants.length > 0 && (
                    <div className="space-y-2">
                      {msg.restaurants.slice(0, 3).map(r => (
                        <MiniRestaurantCard key={r.id} restaurant={r} onClose={() => setOpen(false)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="chat-bubble-bot flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {quickPrompts.map(p => (
                <button
                  key={p}
                  onClick={() => { setInput(p); inputRef.current?.focus(); }}
                  className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded-full border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-[var(--border)] flex gap-2">
            <input
              ref={inputRef}
              id="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input flex-1 text-sm"
              placeholder="Ask about Misal…"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="btn btn-primary p-2.5 rounded-xl flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Mini restaurant card for chat ───────────────────────────────────────
function MiniRestaurantCard({ restaurant, onClose }: { restaurant: Restaurant; onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => { navigate(`/restaurant/${restaurant.slug}`); onClose(); }}
      className="w-full text-left p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]
                 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all duration-200
                 flex items-center gap-2.5 group"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--surface-tertiary)]">
        <img
          src={restaurant.cover_image || 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=100&q=70'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-orange-600 transition-colors">
          {restaurant.name}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] truncate">{restaurant.area}</p>
      </div>
      <div className="text-xs font-bold text-amber-500 flex-shrink-0">
        ⭐ {(restaurant.taste_score ?? restaurant.google_rating ?? 0).toFixed(1)}
      </div>
    </button>
  );
}
