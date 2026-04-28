'use client';
import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<{role:string,content:string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, {role:'user',content:userMsg}]);
    setLoading(true);
    const res = await fetch('/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({message: userMsg})
    });
    const data = await res.json();
    setMessages(prev => [...prev, {role:'assistant',content:data.reply}]);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">🛡️ 在美华人避坑顾问</h1>
        <p className="text-gray-400 text-sm mt-1">移民 · 报税 · 租房 · 识骗 — 直接问，直接答</p>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center mt-20">
            <p className="text-4xl mb-4">💬</p>
            <p>有什么想问的？直接说。</p>
            <div className="mt-6 grid grid-cols-1 gap-2 text-sm">
              {['移民律师收费$8000靠谱吗？','自雇怎么报税不被坑？','纽约租房押金被扣怎么办？'].map(q => (
                <button key={q} onClick={() => setInput(q)} className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-left">{q}</button>
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
      <div className="p-4 border-t border-gray-800 max-w-3xl mx-auto w-full">
        <div className="flex gap-2">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder="输入你的问题..." className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none"/>
          <button onClick={send} className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl text-sm font-medium">发送</button>
        </div>
      </div>
    </main>
  );
}