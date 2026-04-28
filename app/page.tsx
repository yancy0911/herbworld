'use client';
import { useEffect, useMemo, useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<{role:string,content:string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number>(3);

  const LIMIT_PER_DAY = 3;
  const STORAGE_KEY = 'free_usage_limit_v1';

  const today = useMemo(() => {
    // Use local date (not UTC) for "daily" resets
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  }, []);

  const readUsage = () => {
    if (typeof window === 'undefined') return { date: today, count: 0 };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { date: today, count: 0 };
      const parsed = JSON.parse(raw) as { date?: string; count?: number };
      const date = typeof parsed?.date === 'string' ? parsed.date : today;
      const count = typeof parsed?.count === 'number' && Number.isFinite(parsed.count) ? parsed.count : 0;
      if (date !== today) return { date: today, count: 0 };
      return { date, count: Math.max(0, Math.floor(count)) };
    } catch {
      return { date: today, count: 0 };
    }
  };

  const writeUsage = (count: number) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count }));
    } catch {
      // ignore storage failures
    }
  };

  const refreshRemaining = () => {
    const usage = readUsage();
    const left = Math.max(0, LIMIT_PER_DAY - usage.count);
    setRemaining(left);
    if (usage.date !== today) writeUsage(0);
  };

  useEffect(() => {
    refreshRemaining();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    if (!input.trim()) return;
    const usage = readUsage();
    if (usage.count >= LIMIT_PER_DAY) {
      refreshRemaining();
      window.alert('Free limit reached. Please upgrade to continue.');
      return;
    }

    const nextCount = usage.count + 1;
    writeUsage(nextCount);
    setRemaining(Math.max(0, LIMIT_PER_DAY - nextCount));

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, {role:'user',content:userMsg}]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({message: userMsg})
      });
      const data = await res.json();
      setMessages(prev => [...prev, {role:'assistant',content:data.reply}]);
    } finally {
      setLoading(false);
      refreshRemaining();
    }
  };

  const limitReached = remaining <= 0;

  return (
    <>
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">🛡️ 在美华人避坑顾问</h1>
        <p className="text-gray-400 text-sm mt-1">移民 · 报税 · 租房 · 识骗 — 直接问，直接答</p>
        <p className="text-gray-500 text-xs mt-2">Free uses left today: {remaining}/{LIMIT_PER_DAY}</p>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center mt-20">
            <p className="text-4xl mb-4">💬</p>
            <p>有什么想问的？直接说。</p>
            <div className="mt-6 grid grid-cols-1 gap-2 text-sm">
              {['移民律师收费$8000靠谱吗？','自雇怎么报税不被坑？','纽约租房押金被扣怎么办？'].map(q => (
                <button
                  key={q}
                  onClick={() => !limitReached && setInput(q)}
                  disabled={limitReached}
                  className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed p-3 rounded-lg text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m,i) => (
          <div key={i} className={`flex ${m.role==='user'?'justify-end':''}`}>
            <div className={`max-w-2xl p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role==='user'?'bg-blue-600':'bg-gray-800'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="bg-gray-800 p-4 rounded-2xl text-sm text-gray-400 w-fit">思考中...</div>}
      </div>
      <div className="sticky bottom-0 z-10 w-full border-t border-gray-800 bg-gray-950/90 backdrop-blur">
        <div className="p-4 max-w-3xl mx-auto w-full">
          <div className="mt-3 flex gap-2">
            <input
              value={input}
              disabled={loading || limitReached}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder={limitReached ? 'Free limit reached. Please upgrade to continue.' : '输入你的问题...'}
              className="flex-1 bg-gray-800 disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed rounded-xl px-4 py-3 text-sm outline-none"
            />
            <button
              onClick={send}
              disabled={loading || limitReached}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed px-6 py-3 rounded-xl text-sm font-medium"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </main>
    <button
      type="button"
      onClick={() => window.open("https://buy.stripe.com/8x200i1CcaS58wGdaE0Ba03", "_blank")}
      style={{
        position: "fixed",
        bottom: "120px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999
      }}
      className="w-[300px] rounded-xl px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/40"
    >
      Upgrade to Pro - $9.9/month
    </button>
    </>
  );
}