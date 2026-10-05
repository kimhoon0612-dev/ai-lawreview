'use client';
import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { API_BASE as API } from '../../lib/api';

type Props = {
  onClose: () => void;
  onLogin: (token: string, user: {id:number;email:string;name:string}) => void;
};

export default function AuthModal({ onClose, onLogin }: Props) {
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const url = mode === 'login' ? `${API}/api/auth/login` : `${API}/api/auth/register`;
      const body: any = { email, password };
      if (mode === 'register') body.name = name;
      const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '요청 실패');
      if (data.status === 'error') throw new Error(data.message);
      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="gradient-bg p-6 text-white text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><XMarkIcon className="w-6 h-6"/></button>
            <h2 className="text-xl font-bold">{mode === 'login' ? '로그인' : '회원가입'}</h2>
            <p className="text-sm text-blue-100 mt-1">AI LawReview 법률 분석 서비스</p>
          </div>
          <form onSubmit={submit} className="p-6 space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">{error}</div>}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                <input className="auth-input" value={name} onChange={e=>setName(e.target.value)} placeholder="이름을 입력하세요" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
              <input className="auth-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
              <input className="auth-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="6자 이상" required minLength={6} />
            </div>
            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
            <p className="text-center text-sm text-slate-500">
              {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
              <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="text-blue-600 font-medium hover:underline">
                {mode === 'login' ? '회원가입' : '로그인'}
              </button>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
