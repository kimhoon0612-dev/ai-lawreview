'use client';
import { useState, useRef, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE } from '../../lib/api';

type Msg = { role: 'user'|'assistant'; content: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const txt = input.trim(); setInput('');
    setMsgs(p => [...p, { role: 'user', content: txt }]); setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: txt, history: msgs }) });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setMsgs(p => [...p, { role: 'assistant', content: d.reply }]);
    } catch { setMsgs(p => [...p, { role: 'assistant', content: '죄송합니다. 오류가 발생했습니다.' }]); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-80 md:w-96 h-[500px] max-h-[80vh] flex flex-col mb-4 overflow-hidden animate-slide-up">
          <div className="gradient-bg text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2"><ChatBubbleLeftRightIcon className="w-6 h-6" /><h3 className="font-semibold">AI 법률 상담</h3></div>
            <button onClick={() => setOpen(false)} className="text-blue-100 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
            {msgs.length === 0 ? (
              <div className="text-center text-slate-500 my-10 text-sm">
                <p>AI 변호사에게 법률 질문을 해보세요.</p>
                <p className="mt-2 text-xs text-slate-400">⚠️ AI 참고 정보이며 공인된 법률 자문이 아닙니다.</p>
              </div>
            ) : msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                  {m.role === 'user' ? m.content : <div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm flex gap-1"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}} /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}} /></div></div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="border-t border-slate-200 p-3 bg-white">
            <div className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="메시지를 입력하세요..." className="flex-1 bg-transparent border-none outline-none text-sm" disabled={loading} />
              <button type="submit" disabled={!input.trim() || loading} className="text-blue-600 disabled:text-slate-400 p-1"><PaperAirplaneIcon className="w-5 h-5" /></button>
            </div>
          </form>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className={`${open ? 'bg-slate-800 hover:bg-slate-900' : 'bg-blue-600 hover:bg-blue-700 shadow-lg animate-pulse-glow'} text-white p-4 rounded-full transition-all hover:scale-105`}>
        {open ? <XMarkIcon className="w-6 h-6" /> : <ChatBubbleLeftRightIcon className="w-7 h-7" />}
      </button>
    </div>
  );
}
