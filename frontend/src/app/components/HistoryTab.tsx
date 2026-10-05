'use client';
import { useState, useEffect } from 'react';
import { ClockIcon, TrashIcon, ArrowPathIcon, EyeIcon } from '@heroicons/react/24/outline';
import { API_BASE as API } from '../../lib/api';

type HistoryItem = { id: number; filename: string; status: string; risk_summary: string; created_at: string };

export default function HistoryTab({ token }: { token: string | null }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/history`, { headers });
      if (r.ok) { const d = await r.json(); setItems(d.history || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const del = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await fetch(`${API}/api/history/${id}`, { method: 'DELETE', headers });
    load();
  };

  const view = async (id: number) => {
    try {
      const r = await fetch(`${API}/api/history/${id}`, { headers });
      if (r.ok) setDetail(await r.json());
    } catch { alert('상세 조회 실패'); }
  };

  if (!token) return (
    <div className="text-center py-20 text-slate-500 animate-fade-in-up">
      <ClockIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
      <p className="text-lg font-medium">로그인 후 이용 가능합니다</p>
      <p className="text-sm mt-1">분석 이력은 로그인한 사용자에게만 제공됩니다.</p>
    </div>
  );

  if (detail) return (
    <div className="animate-fade-in-up">
      <button onClick={() => setDetail(null)} className="mb-4 text-blue-600 hover:underline text-sm">← 목록으로</button>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">{detail.filename}</h3>
        <p className="text-xs text-slate-400 mb-4">{detail.created_at}</p>
        {detail.analysis?.general_advice && <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm">{detail.analysis.general_advice}</div>}
        <div className="space-y-3">
          {detail.analysis?.clauses?.map((c: any, i: number) => {
            const bg = c.risk_level === 'high' ? 'risk-high' : c.risk_level === 'warning' ? 'risk-warning' : 'risk-info';
            const label = c.risk_level === 'high' ? '고위험' : c.risk_level === 'warning' ? '주의' : '정보';
            return (
              <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bg}`}>{label}</span>
                  <span className="font-medium text-sm">{c.clause_name}</span>
                </div>
                <p className="text-sm text-slate-600">{c.ai_review}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-800 mb-2">분석 이력</h2>
        <p className="text-slate-600">이전 계약서 분석 결과를 확인합니다.</p>
      </div>
      {loading ? (
        <div className="text-center py-16"><ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ClockIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>아직 분석 이력이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between card-hover shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{item.filename}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{item.risk_summary}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => view(item.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="상세"><EyeIcon className="w-5 h-5" /></button>
                <button onClick={() => del(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="삭제"><TrashIcon className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
