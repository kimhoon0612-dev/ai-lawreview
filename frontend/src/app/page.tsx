'use client';
import { useState, useRef, useEffect } from 'react';
import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  ScaleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  TrashIcon,
  FolderPlusIcon,
  ServerStackIcon,
  CloudArrowDownIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import AuthModal from './components/AuthModal';
import DisclaimerBanner from './components/DisclaimerBanner';
import ChatWidget from './components/ChatWidget';
import HistoryTab from './components/HistoryTab';
import { API_BASE as API } from '../lib/api';

type CustomDoc = { doc_id: string; doc_name: string; category: string; chunks_count: number; created_at: string };
type User = { id: number; email: string; name: string };
type TabType = 'review' | 'summarize' | 'search' | 'ordinance' | 'history' | 'docs' | 'lawdb';

const ALLOWED_EXTS = ['.pdf', '.docx', '.hwp', '.hwpx', '.png', '.jpg', '.jpeg', '.webp'];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('review');

  // Review State (Multi-file & Multi-image supported)
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Summarize State (Multi-file & Multi-image supported)
  const [sumFiles, setSumFiles] = useState<File[]>([]);
  const [sumText, setSumText] = useState('');
  const [sumInputMode, setSumInputMode] = useState<'file' | 'text'>('file');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const sumFileInputRef = useRef<HTMLInputElement>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'law' | 'ordinance' | 'custom'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchSearched, setSearchSearched] = useState(false);

  // Laws Catalog & Full-Text Reader State
  const [lawsCatalog, setLawsCatalog] = useState<{ national: any[]; ordinance: any[]; total_laws: number; total_articles: number } | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState<'all' | 'national' | 'ordinance'>('all');
  const [catalogFilter, setCatalogFilter] = useState('');
  const [selectedLawFull, setSelectedLawFull] = useState<{ source_name: string; org: string; total: number; articles: any[] } | null>(null);
  const [isLoadingFullText, setIsLoadingFullText] = useState(false);
  const [inLawFilter, setInLawFilter] = useState('');
  const [viewMode, setViewMode] = useState<'catalog' | 'search'>('catalog');

  // Ordinance Tab State (충청남도 천안시 & 천안시의회 자치법규)
  const [ordinQuery, setOrdinQuery] = useState('');
  const [ordinTarget, setOrdinTarget] = useState<'cheonan_city' | 'cheonan_council' | 'custom'>('cheonan_city');
  const [customGovName, setCustomGovName] = useState('천안시');
  const [ordinResults, setOrdinResults] = useState<any[]>([]);
  const [isOrdinSearching, setIsOrdinSearching] = useState(false);
  const [isOrdinSyncing, setIsOrdinSyncing] = useState(false);
  const [ordinSyncMsg, setOrdinSyncMsg] = useState<{ status: string; message: string } | null>(null);
  const [selectedOrdin, setSelectedOrdin] = useState<{ name: string; org: string; mst: string } | null>(null);
  const [ordinArticles, setOrdinArticles] = useState<any[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);

  // Custom Docs State (Multi-file supported)
  const [customDocs, setCustomDocs] = useState<CustomDoc[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('company_rule');
  const [isDocUploading, setIsDocUploading] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  // Law DB State
  const [lawStatus, setLawStatus] = useState<{ law_count: number; custom_count: number; ordinance_count?: number; has_api_key: boolean } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ status: string; message: string; count: number } | null>(null);

  // Auth State
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('lr_token');
    const u = localStorage.getItem('lr_user');
    if (t) setToken(t);
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch {}
    }
    setDisclaimerAgreed(localStorage.getItem('lr_disclaimer') === 'true');
  }, []);

  const handleLogin = (t: string, u: User) => {
    setToken(t);
    setUser(u);
    setShowAuth(false);
    localStorage.setItem('lr_token', t);
    localStorage.setItem('lr_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lr_token');
    localStorage.removeItem('lr_user');
  };

  const agreeDisclaimer = () => {
    setDisclaimerAgreed(true);
    localStorage.setItem('lr_disclaimer', 'true');
  };

  const filterValidFiles = (incoming: FileList | File[]): File[] => {
    const list = Array.from(incoming);
    const valid: File[] = [];
    const invalid: string[] = [];

    list.forEach(f => {
      const isAllowed = ALLOWED_EXTS.some(ext => f.name.toLowerCase().endsWith(ext));
      if (isAllowed) {
        valid.push(f);
      } else {
        invalid.push(f.name);
      }
    });

    if (invalid.length > 0) {
      alert(`지원하지 않는 파일 형식 (${invalid.length}건 제외됨):\n${invalid.slice(0, 3).join(', ')}\n\n지원 형식: PDF, DOCX, HWP, HWPX, 이미지(JPG, PNG, WEBP)`);
    }

    return valid;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Review Upload
  const uploadReviewFiles = async () => {
    if (reviewFiles.length === 0) return;
    setIsUploading(true);
    setResult(null);

    const fd = new FormData();
    reviewFiles.forEach(f => fd.append('files', f));

    try {
      const r = await fetch(`${API}/api/upload`, {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.detail || '업로드 오류');
      }
      setResult(await r.json());
    } catch (e: any) {
      alert(e.message || '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // Export Word Report
  const exportReport = async () => {
    if (!result) return;
    try {
      const r = await fetch(`${API}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: result.filename, analysis: result.analysis }),
      });
      if (!r.ok) throw new Error();
      const b = await r.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u;
      a.download = `report_${result.filename}.docx`;
      a.click();
      URL.revokeObjectURL(u);
    } catch {
      alert('리포트 다운로드 중 오류가 발생했습니다.');
    }
  };

  // Summarize Action (Multi-file & Multi-image supported)
  const handleSummarize = async () => {
    if (sumInputMode === 'file' && sumFiles.length === 0) return;
    if (sumInputMode === 'text' && !sumText.trim()) return;

    setIsSummarizing(true);
    setSummaryResult(null);
    setShowRawText(false);

    const fd = new FormData();
    if (sumInputMode === 'file') {
      sumFiles.forEach(f => fd.append('files', f));
    } else {
      fd.append('text', sumText.trim());
    }

    try {
      const r = await fetch(`${API}/api/summarize`, {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.detail || '요약 생성 실패');
      }
      const data = await r.json();
      setSummaryResult(data);
    } catch (e: any) {
      alert(e.message || '문서 요약 중 오류가 발생했습니다.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const copySummaryText = () => {
    if (!summaryResult?.summary) return;
    const s = summaryResult.summary;
    const textToCopy = `[${s.title || '문서 요약'}] (${s.doc_type || '문서'})\n\n■ 핵심 요약\n${s.executive_summary}\n\n■ 당사자: ${(s.parties || []).join(', ')}\n\n■ 주요 조항:\n${(s.key_terms || []).map((t: any) => `- ${t.term}: ${t.description}`).join('\n')}\n\n■ 권리 및 의무:\n${(s.rights_and_obligations || []).map((r: any) => `- ${r.party}: ${r.duties_and_rights}`).join('\n')}\n\n■ 주요 일정/대금:\n${(s.dates_and_money || []).map((d: string) => `- ${d}`).join('\n')}\n\n■ 주의사항:\n${(s.key_cautions || []).map((c: string) => `- ${c}`).join('\n')}`;

    navigator.clipboard.writeText(textToCopy);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2500);
  };

  // Search Action
  const handleSearch = async (overrideQuery?: string, overrideScope?: 'all' | 'law' | 'ordinance' | 'custom') => {
    const q = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const s = overrideScope !== undefined ? overrideScope : searchScope;
    if (!q.trim()) return;

    setIsSearching(true);
    setSearchSearched(true);
    setViewMode('search');
    try {
      const r = await fetch(`${API}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), scope: s, limit: 12 }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setSearchResults(d.results || []);
      setSearchTotal(d.total || 0);
    } catch {
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchLawsCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const r = await fetch(`${API}/api/laws/catalog`);
      if (r.ok) {
        setLawsCatalog(await r.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const openLawFullText = async (lawName: string) => {
    setIsLoadingFullText(true);
    setSelectedLawFull({ source_name: lawName, org: '', total: 0, articles: [] });
    setInLawFilter('');
    try {
      const r = await fetch(`${API}/api/laws/full-text?source_name=${encodeURIComponent(lawName)}`);
      if (r.ok) {
        const d = await r.json();
        setSelectedLawFull(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingFullText(false);
    }
  };

  // Docs
  const fetchDocs = async () => {
    setIsDocsLoading(true);
    try {
      const r = await fetch(`${API}/api/custom-docs`);
      if (r.ok) {
        const d = await r.json();
        setCustomDocs(d.documents || []);
      }
    } catch {} finally {
      setIsDocsLoading(false);
    }
  };

  const uploadDoc = async () => {
    if (docFiles.length === 0 || !docName.trim()) return;
    setIsDocUploading(true);
    try {
      const fd = new FormData();
      docFiles.forEach(f => fd.append('files', f));
      fd.append('doc_name', docName.trim());
      fd.append('category', docCategory);
      const r = await fetch(`${API}/api/custom-docs/upload`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error();
      setDocFiles([]);
      setDocName('');
      if (docFileRef.current) docFileRef.current.value = '';
      fetchDocs();
    } catch {
      alert('업로드 실패');
    } finally {
      setIsDocUploading(false);
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const r = await fetch(`${API}/api/custom-docs/${id}`, { method: 'DELETE' });
      if (r.ok) fetchDocs();
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'docs') fetchDocs();
  }, [activeTab]);

  // Law
  const fetchLaw = async () => {
    try {
      const r = await fetch(`${API}/api/law-sync/status`);
      if (r.ok) setLawStatus(await r.json());
    } catch {}
  };

  useEffect(() => {
    fetchLaw();
  }, []);

  const syncLaw = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const r = await fetch(`${API}/api/law-sync`, { method: 'POST' });
      if (r.ok) {
        setSyncResult(await r.json());
        fetchLaw();
      } else {
        const e = await r.json();
        setSyncResult({ status: 'error', message: e.detail || '실패', count: 0 });
      }
    } catch {
      setSyncResult({ status: 'error', message: '서버 연결 실패', count: 0 });
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchOrdinances = async (keyword?: string) => {
    setIsOrdinSearching(true);
    try {
      const q = keyword !== undefined ? keyword : (ordinQuery || (ordinTarget === 'cheonan_council' ? '천안시의회' : '천안시'));
      const r = await fetch(`${API}/api/ordinances/live-search?query=${encodeURIComponent(q)}&display=50`);
      if (r.ok) {
        const data = await r.json();
        setOrdinResults(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOrdinSearching(false);
    }
  };

  const syncOrdinances = async () => {
    setIsOrdinSyncing(true);
    setOrdinSyncMsg(null);
    try {
      const r = await fetch(`${API}/api/ordinances/sync`, { method: 'POST' });
      if (r.ok) {
        const data = await r.json();
        setOrdinSyncMsg({ status: 'success', message: data.message });
        fetchLaw();
      } else {
        const err = await r.json();
        setOrdinSyncMsg({ status: 'error', message: err.detail || '동기화 실패' });
      }
    } catch {
      setOrdinSyncMsg({ status: 'error', message: '서버 연결 실패' });
    } finally {
      setIsOrdinSyncing(false);
    }
  };

  const viewArticles = async (mst: string, name: string, org: string) => {
    setSelectedOrdin({ mst, name, org });
    setIsLoadingArticles(true);
    setOrdinArticles([]);
    try {
      const r = await fetch(`${API}/api/ordinances/articles?mst=${encodeURIComponent(mst)}`);
      if (r.ok) {
        const data = await r.json();
        setOrdinArticles(data.articles || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingArticles(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'lawdb' || activeTab === 'ordinance') fetchLaw();
    if (activeTab === 'search') fetchLawsCatalog();
    if (activeTab === 'ordinance' && ordinResults.length === 0) fetchOrdinances('천안시');
  }, [activeTab]);

  const catLabels: Record<string, string> = {
    company_rule: '회사 규정',
    public_rule: '공공기관 규정',
    internal_guideline: '내부 지침',
    other: '기타 자료',
    law: '대한민국 법령',
    ordinance: '지자체 조례·규칙',
  };

  const tabs = [
    { id: 'review' as const, label: '계약서 검토', icon: <ScaleIcon className="w-4 h-4" /> },
    { id: 'summarize' as const, label: '문서 요약', icon: <SparklesIcon className="w-4 h-4 text-amber-300" /> },
    { id: 'search' as const, label: '법령·자료 검색', icon: <MagnifyingGlassIcon className="w-4 h-4 text-emerald-300" /> },
    { id: 'ordinance' as const, label: '지자체 조례·의회', icon: <BuildingLibraryIcon className="w-4 h-4 text-sky-400" /> },
    { id: 'history' as const, label: '분석 이력', icon: <ClockIcon className="w-4 h-4" /> },
    { id: 'docs' as const, label: '참고자료', icon: <FolderPlusIcon className="w-4 h-4" /> },
    { id: 'lawdb' as const, label: '법령 DB', icon: <ServerStackIcon className="w-4 h-4" /> },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {!disclaimerAgreed && <DisclaimerBanner onAgree={agreeDisclaimer} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} />}

      {/* Copy Toast Notification */}
      {copyToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-fade-in">
          <ClipboardDocumentCheckIcon className="w-4 h-4 text-green-400" />
          <span>요약 내용이 클립보드에 복사되었습니다!</span>
        </div>
      )}

      {/* Premium Header */}
      <header className="header-gradient sticky top-0 z-30 shadow-xl border-b border-slate-800/80 backdrop-blur-md">
        {/* Tier 1: Brand & User Topbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Logo & Service Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30 shrink-0">
              <ScaleIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  AI LawReview
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  v2.2
                </span>
              </div>
              <span className="hidden lg:inline-block text-slate-600 font-light">|</span>
              <p className="text-xs text-slate-400 hidden lg:block font-normal">
                대한민국 법령 기반 계약서 검토 & 지능형 법률 비서
              </p>
            </div>
          </div>

          {/* Right: DB Status Indicator & Auth Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Live Database Sync Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-sm shadow-emerald-400/50"></span>
              <span className="text-slate-300 text-[11px] font-medium whitespace-nowrap">
                {lawStatus ? (
                  <>
                    <strong className="text-emerald-400 font-semibold">{(lawStatus.law_count + (lawStatus.ordinance_count || 0)).toLocaleString()}</strong>개 조항 연동
                  </>
                ) : (
                  '법령 DB 연결 확인 중...'
                )}
              </span>
            </div>

            {/* User Login / Profile Button */}
            {user ? (
              <div className="flex items-center gap-2 bg-slate-800/90 py-1 px-3 rounded-lg border border-slate-700 shadow-sm shrink-0">
                <span className="text-xs text-blue-300 font-medium whitespace-nowrap">
                  <UserCircleIcon className="w-4 h-4 inline mr-1 text-blue-400" />
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-white p-0.5 transition-colors"
                  title="로그아웃"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-blue-500/25 whitespace-nowrap shrink-0 cursor-pointer"
              >
                로그인
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Dedicated Navigation Tab Bar */}
        <div className="border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-3 sm:px-6">
            <nav className="overflow-x-auto scrollbar-none py-1.5 flex items-center gap-1 sm:gap-2">
              {tabs.map(t => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id);
                      if (t.id === 'review') {
                        setResult(null);
                        setReviewFiles([]);
                      }
                    }}
                    className={`whitespace-nowrap shrink-0 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="shrink-0">{t.icon}</span>
                    <span>{t.label}</span>
                    {t.id === 'ordinance' && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                      }`}>
                        천안시
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* ============================================================ */}
        {/* Tab 1: Review (계약서 검토 - 다중 파일 및 다중 사진 지원)     */}
        {/* ============================================================ */}
        {activeTab === 'review' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <span className="text-xs uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                AI 법령 대조 독소조항 감지 (최대 200MB 지원)
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2 mb-3">계약서를 업로드하고 법적 리스크를 진단하세요</h2>
              <p className="text-slate-600 max-w-xl mx-auto text-sm leading-relaxed">
                PDF, Word, HWP 문서는 물론 <strong>여러 장의 계약서 사진(JPG, PNG)을 한 번에 다중 선택</strong>하여
                대한민국 법령과 순차 대조 분석할 수 있습니다.
              </p>
            </div>

            {!result ? (
              <div
                className={`bg-white rounded-2xl shadow-sm border-2 border-dashed p-8 md:p-10 flex flex-col items-center justify-center transition-all cursor-pointer card-hover ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
                } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files.length > 0) {
                    const valid = filterValidFiles(e.dataTransfer.files);
                    if (valid.length > 0) setReviewFiles(valid);
                  }
                }}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      const valid = filterValidFiles(e.target.files);
                      if (valid.length > 0) setReviewFiles(valid);
                    }
                  }}
                  className="hidden"
                  accept=".pdf,.docx,.hwp,.hwpx,.png,.jpg,.jpeg,.webp"
                />

                {isUploading ? (
                  <div className="flex flex-col items-center text-blue-600 py-8">
                    <ArrowPathIcon className="w-12 h-12 animate-spin mb-4" />
                    <h3 className="text-lg font-semibold mb-2">AI가 계약서 정밀 검토 중...</h3>
                    <p className="text-xs text-slate-500">
                      {reviewFiles.length > 1
                        ? `총 ${reviewFiles.length}개 파일(페이지)을 병렬로 OCR 판독 후 법령 DB와 대조하고 있습니다.`
                        : '문서 텍스트 인식 및 대한민국 법령 DB 대조 분석을 진행하고 있습니다.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 text-blue-600">
                      <ArrowUpTrayIcon className="w-8 h-8" />
                    </div>

                    {reviewFiles.length === 0 ? (
                      <>
                        <h3 className="text-lg font-semibold text-slate-800 mb-1.5">
                          계약서 파일들을 끌어다 놓거나 클릭하여 다중 선택하세요
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          여러 장의 스마트폰 계약서 사진(JPG, PNG)도 한 번에 선택 가능 (최대 200MB)
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-1.5 text-xs text-slate-500 mb-6">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">PDF</span>
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">DOCX</span>
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">HWP / HWPX</span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium border border-blue-200">
                            📸 다중 사진 (JPG, PNG, WEBP)
                          </span>
                        </div>
                        <button className="font-semibold py-2.5 px-7 rounded-xl shadow-sm bg-blue-600 hover:bg-blue-700 text-white text-sm">
                          파일 선택 (다중 선택 가능)
                        </button>
                      </>
                    ) : (
                      <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-slate-700">
                            선택된 파일 <strong>{reviewFiles.length}개</strong> (총{' '}
                            {formatFileSize(reviewFiles.reduce((acc, f) => acc + f.size, 0))})
                          </span>
                          <button
                            onClick={() => setReviewFiles([])}
                            className="text-xs text-red-500 hover:underline flex items-center gap-0.5"
                          >
                            <TrashIcon className="w-3.5 h-3.5" /> 전체 취소
                          </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1.5 mb-6 pr-1">
                          {reviewFiles.map((f, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-bold text-blue-600 text-[10px] w-5">#{i + 1}</span>
                                <span className="truncate font-medium text-slate-800">{f.name}</span>
                                <span className="text-slate-400 shrink-0 text-[11px]">({formatFileSize(f.size)})</span>
                              </div>
                              <button
                                onClick={() => setReviewFiles(reviewFiles.filter((_, idx) => idx !== i))}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                <XMarkIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 px-4 rounded-xl border border-slate-300"
                          >
                            + 파일 추가
                          </button>
                          <button
                            onClick={uploadReviewFiles}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-7 rounded-xl shadow-md text-sm transition-all"
                          >
                            {reviewFiles.length}개 파일 분석 시작
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in-up">
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <CheckCircleIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">계약서 검토 완료</h3>
                      <p className="text-xs text-slate-500">{result.filename}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={exportReport}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                      리포트 Word 다운로드
                    </button>
                    <button
                      onClick={() => {
                        setResult(null);
                        setReviewFiles([]);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm py-2 px-4 rounded-lg border border-slate-300 transition-all"
                    >
                      다른 문서
                    </button>
                  </div>
                </div>

                {result.mock && (
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-200 mb-5 flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>알림:</strong> {result.message} (테스트 샘플 모드)
                    </div>
                  </div>
                )}

                {result.analysis?.general_advice && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 mb-6">
                    <h4 className="font-bold text-blue-950 mb-2 flex items-center gap-2">
                      <ScaleIcon className="w-5 h-5 text-blue-600" />
                      전반적 총평 및 자문
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed">{result.analysis.general_advice}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-base">조항별 세부 위험도 분석</h4>
                  {result.analysis?.clauses?.map((c: any, i: number) => {
                    const bg = c.risk_level === 'high' ? 'risk-high' : c.risk_level === 'warning' ? 'risk-warning' : 'risk-info';
                    const label = c.risk_level === 'high' ? '🚨 고위험 독소조항' : c.risk_level === 'warning' ? '⚠️ 주의 요망' : 'ℹ️ 일반 정보';
                    return (
                      <div key={i} className="bg-slate-50 rounded-xl p-5 border border-slate-200 card-hover">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className={`text-xs px-3 py-1 rounded-full font-bold ${bg}`}>{label}</span>
                          <span className="font-bold text-slate-800 text-sm">{c.clause_name}</span>
                        </div>
                        <div className="bg-white p-3.5 rounded-lg border border-slate-200 mb-3 text-xs text-slate-700 leading-relaxed font-mono">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">원본 조항</span>
                          {c.original_text}
                        </div>
                        <div className="text-sm leading-relaxed mb-2">
                          <span className="font-bold text-blue-700">AI 검토 의견: </span>
                          <span className="text-slate-800">{c.ai_review}</span>
                        </div>
                        {c.legal_basis && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                            <span className="font-medium text-slate-700">📖 관련 법령: {c.legal_basis}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                              신뢰도: {c.confidence === 'high' ? '높음' : c.confidence === 'medium' ? '보통' : '낮음'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-center text-slate-400 mt-6 pt-4 border-t border-slate-100">
                  ⚠️ 본 결과는 인공지능이 제공하는 참고 정보이며, 공인된 법률 자문이 아닙니다. 중요 사안은 반드시 변호사의 검토를 받으십시오.
                </p>
              </div>
            )}

            {!result && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
                {[
                  {
                    icon: <PhotoIcon className="w-6 h-6 text-blue-600" />,
                    title: '다중 사진(JPG, PNG) OCR',
                    desc: '스마트폰으로 여러 장 찍은 계약서 사진을 한꺼번에 올리면 순서대로 판독하여 결합 분석합니다.',
                  },
                  {
                    icon: <ScaleIcon className="w-6 h-6 text-blue-600" />,
                    title: '최대 200MB 대용량 지원',
                    desc: '수백 페이지의 대형 스캔 PDF, 고화질 사진 문서도 용량 걱정 없이 즉시 업로드 가능합니다.',
                  },
                  {
                    icon: <DocumentTextIcon className="w-6 h-6 text-blue-600" />,
                    title: 'Word 리포트 원클릭 생성',
                    desc: '조항별 검토 내역과 법적 근거가 정리된 공식 Word 문서를 바로 다운로드할 수 있습니다.',
                  },
                ].map((f, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm card-hover">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3 text-blue-600">
                      {f.icon}
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1.5">{f.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* Tab 2: Summarize (문서 자체 요약 - 다중 파일/사진 지원)       */}
        {/* ============================================================ */}
        {activeTab === 'summarize' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                AI 지능형 구조화 요약 (다중 사진 지원)
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2 mb-2">문서를 넣으면 핵심 요약과 쟁점을 추출합니다</h2>
              <p className="text-slate-600 max-w-xl mx-auto text-sm leading-relaxed">
                복잡한 계약서나 여러 장의 서류 사진을 올리면 <strong>당사자, 핵심 조항, 권리·의무, 일정 및 대금 조건</strong>을 일목요연하게 구조화 요약합니다.
              </p>
            </div>

            {!summaryResult ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                {/* Input Mode Selector */}
                <div className="flex justify-center mb-6">
                  <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-xs font-semibold">
                    <button
                      onClick={() => setSumInputMode('file')}
                      className={`px-4 py-1.5 rounded-lg transition-all ${
                        sumInputMode === 'file' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      📁 파일 / 다중 사진 업로드
                    </button>
                    <button
                      onClick={() => setSumInputMode('text')}
                      className={`px-4 py-1.5 rounded-lg transition-all ${
                        sumInputMode === 'text' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      ✍️ 텍스트 직접 입력
                    </button>
                  </div>
                </div>

                {sumInputMode === 'file' ? (
                  <div
                    className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50"
                    onClick={() => sumFileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={sumFileInputRef}
                      multiple
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          const valid = filterValidFiles(e.target.files);
                          if (valid.length > 0) setSumFiles(valid);
                        }
                      }}
                      className="hidden"
                      accept=".pdf,.docx,.hwp,.hwpx,.png,.jpg,.jpeg,.webp"
                    />

                    <SparklesIcon className="w-12 h-12 text-amber-500 mb-3" />

                    {sumFiles.length === 0 ? (
                      <>
                        <h4 className="font-bold text-slate-800 mb-1">요약할 문서를 선택하거나 끌어다 놓으세요</h4>
                        <p className="text-xs text-slate-500 mb-4">
                          PDF, Word, HWP 및 계약서 사진 여러 장(JPG, PNG)도 다중 선택 가능 (최대 200MB)
                        </p>
                        <button className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-5 rounded-lg shadow-sm">
                          파일 선택 (다중 선택 가능)
                        </button>
                      </>
                    ) : (
                      <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">
                            선택된 파일 <strong>{sumFiles.length}개</strong> (총{' '}
                            {formatFileSize(sumFiles.reduce((acc, f) => acc + f.size, 0))})
                          </span>
                          <button
                            onClick={() => setSumFiles([])}
                            className="text-xs text-red-500 hover:underline flex items-center gap-0.5"
                          >
                            <TrashIcon className="w-3.5 h-3.5" /> 취소
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 mb-4 pr-1">
                          {sumFiles.map((f, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs"
                            >
                              <span className="truncate text-slate-800 font-medium">#{i + 1} {f.name}</span>
                              <span className="text-slate-400 text-[11px] shrink-0 ml-2">{formatFileSize(f.size)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => sumFileInputRef.current?.click()}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200"
                          >
                            + 파일 추가
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">요약할 계약서 또는 문서 내용</label>
                    <textarea
                      value={sumText}
                      onChange={e => setSumText(e.target.value)}
                      rows={10}
                      placeholder="계약서나 법률 문서 텍스트를 여기에 붙여넣으세요..."
                      className="w-full p-4 border border-slate-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-amber-400 outline-none bg-slate-50/50 font-mono"
                    />
                  </div>
                )}

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleSummarize}
                    disabled={isSummarizing || (sumInputMode === 'file' && sumFiles.length === 0) || (sumInputMode === 'text' && !sumText.trim())}
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
                  >
                    {isSummarizing ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        AI 문서 구조화 요약 중...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-5 h-5" />
                        {sumFiles.length > 1 ? `${sumFiles.length}개 파일 통합 요약 실행` : '문서 핵심 요약 실행'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in-up">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                        {summaryResult.summary?.doc_type || '문서 요약'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">({summaryResult.char_count?.toLocaleString()}자 분석)</span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-800">{summaryResult.summary?.title || summaryResult.filename}</h3>
                    <p className="text-xs text-slate-500 mt-1">파일명: {summaryResult.filename}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copySummaryText}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center gap-1.5 border border-slate-200 transition-all"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4 text-slate-600" />
                      요약 복사
                    </button>
                    <button
                      onClick={() => {
                        setSummaryResult(null);
                        setSumFiles([]);
                        setSumText('');
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-2 px-3.5 rounded-lg transition-all"
                    >
                      새 문서 요약
                    </button>
                  </div>
                </div>

                {/* 1. Executive Summary */}
                <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/70 border border-amber-200 rounded-xl p-5 mb-6">
                  <h4 className="font-bold text-amber-950 text-sm mb-2 flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-amber-600" />
                    핵심 요약 (Executive Summary)
                  </h4>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">{summaryResult.summary?.executive_summary}</p>
                </div>

                {/* 2. Parties */}
                {summaryResult.summary?.parties?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">당사자 정보</h4>
                    <div className="flex flex-wrap gap-2">
                      {summaryResult.summary.parties.map((p: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200">
                          👤 {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Key Terms Grid */}
                {summaryResult.summary?.key_terms?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">주요 조항 및 핵심 내용</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {summaryResult.summary.key_terms.map((t: any, i: number) => (
                        <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                          <h5 className="font-bold text-slate-800 text-xs mb-1 text-blue-700">📌 {t.term}</h5>
                          <p className="text-xs text-slate-700 leading-relaxed">{t.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Rights & Obligations */}
                {summaryResult.summary?.rights_and_obligations?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">당사자별 권리 및 의무 관계</h4>
                    <div className="space-y-2">
                      {summaryResult.summary.rights_and_obligations.map((ro: any, i: number) => (
                        <div key={i} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
                          <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs shrink-0">{ro.party}</span>
                          <p className="text-xs text-slate-700 leading-relaxed">{ro.duties_and_rights}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Dates & Financial Terms */}
                {summaryResult.summary?.dates_and_money?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">주요 일정, 기한 및 대금 조건</h4>
                    <ul className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                      {summaryResult.summary.dates_and_money.map((dm: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold">✓</span>
                          <span>{dm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 6. Key Cautions */}
                {summaryResult.summary?.key_cautions?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                      서명 전 확인해야 할 핵심 유의사항
                    </h4>
                    <ul className="bg-red-50/60 p-4 rounded-xl border border-red-200 space-y-2 text-xs text-red-900">
                      {summaryResult.summary.key_cautions.map((kc: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 font-bold">⚠️</span>
                          <span className="font-medium">{kc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 7. Raw Text Toggle */}
                {summaryResult.raw_text_preview && (
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => setShowRawText(!showRawText)}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
                    >
                      {showRawText ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                      추출된 원문 텍스트 {showRawText ? '접기' : '보기'}
                    </button>
                    {showRawText && (
                      <div className="mt-3 p-4 bg-slate-100 rounded-xl text-xs text-slate-700 max-h-60 overflow-y-auto font-mono whitespace-pre-wrap">
                        {summaryResult.raw_text_preview}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* Tab 3: Search (법령·자료 시맨틱 통합 검색)                   */}
        {/* ============================================================ */}
        {activeTab === 'search' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                시맨틱 AI 통합 검색
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2 mb-2">법령과 사내 규정에서 필요한 조항을 바로 찾으세요</h2>
              <p className="text-slate-600 max-w-xl mx-auto text-sm leading-relaxed">
                키워드가 정확히 일치하지 않아도, <strong>의미와 맥락(Vector Embedding)</strong>을 기반으로 가장 관련성 높은 법령과 사내 규정 조문을 찾아냅니다.
              </p>
            </div>

            {/* Search Box */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="flex gap-2 mb-4"
              >
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="검색어를 입력하세요 (예: 위약벌 감액, 계약 해제 조건, 퇴직금 지급 기한)"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-all text-sm shrink-0 flex items-center gap-1.5"
                >
                  {isSearching ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                  검색
                </button>
              </form>

              {/* Scope Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-medium">검색 대상:</span>
                  {[
                    { id: 'all' as const, label: '🌐 전체 자료' },
                    { id: 'law' as const, label: '⚖️ 대한민국 법령' },
                    { id: 'ordinance' as const, label: '🏛️ 지자체 조례(천안시)' },
                    { id: 'custom' as const, label: '🏢 사내 참고자료' },
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSearchScope(s.id);
                        if (searchQuery.trim()) handleSearch(searchQuery, s.id);
                      }}
                      className={`px-3 py-1 rounded-full font-semibold transition-all ${
                        searchScope === s.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Quick Queries */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400">추천 검색:</span>
                  {['위약금 감액 기준', '퇴직금 지급 기한', '천안시 기업지원', '천안시의회 회의규칙', '하도급 대금 감액'].map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSearchQuery(q);
                        handleSearch(q, searchScope);
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded text-[11px] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('catalog')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'catalog'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  📖 법령 목차별 전문 열람 ({lawsCatalog?.total_laws ?? 41}개 법률·조례)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('search')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'search'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  🔍 키워드 검색 결과 {searchTotal > 0 ? `(${searchTotal}건)` : ''}
                </button>
              </div>
              <span className="text-[11px] text-slate-500 pr-2">
                총 <strong className="text-emerald-700">{(lawsCatalog?.total_articles ?? 1676).toLocaleString()}개 조문</strong> 탑재됨
              </span>
            </div>

            {/* Mode 1: Laws Catalog (전체 법령 및 자치법규 목차) */}
            {viewMode === 'catalog' && (
              <div className="space-y-4">
                {/* Catalog Filter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setCatalogCategory('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        catalogCategory === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      전체 ({lawsCatalog?.total_laws ?? 41})
                    </button>
                    <button
                      onClick={() => setCatalogCategory('national')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        catalogCategory === 'national'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ⚖️ 대한민국 국가 법령 ({lawsCatalog?.national.length ?? 18})
                    </button>
                    <button
                      onClick={() => setCatalogCategory('ordinance')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        catalogCategory === 'ordinance'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      🏛️ 천안시 자치법규 ({lawsCatalog?.ordinance.length ?? 23})
                    </button>
                  </div>

                  <div className="relative">
                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={catalogFilter}
                      onChange={e => setCatalogFilter(e.target.value)}
                      placeholder="법령명 빠른 검색 (예: 근로, 소상공인, 하도급)..."
                      className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 w-full sm:w-64"
                    />
                  </div>
                </div>

                {/* Catalog Grid Cards */}
                {isLoadingCatalog ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">법령 목차를 불러오는 중입니다...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {(() => {
                      let items = [];
                      if (catalogCategory === 'all' || catalogCategory === 'national') {
                        items.push(...(lawsCatalog?.national || []));
                      }
                      if (catalogCategory === 'all' || catalogCategory === 'ordinance') {
                        items.push(...(lawsCatalog?.ordinance || []));
                      }
                      if (catalogFilter.trim()) {
                        const kw = catalogFilter.toLowerCase();
                        items = items.filter(it => it.name.toLowerCase().includes(kw));
                      }

                      if (items.length === 0) {
                        return (
                          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                            일치하는 법령이 없습니다.
                          </div>
                        );
                      }

                      return items.map((law, idx) => {
                        const isOrdin = law.type === 'ordinance';
                        return (
                          <div
                            key={idx}
                            onClick={() => openLawFullText(law.name)}
                            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isOrdin
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {law.org || (isOrdin ? '천안시' : '대한민국 법률')}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  {law.count}개 조문
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors line-clamp-2 mb-2">
                                {law.name}
                              </h4>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
                              <span className="text-[11px] text-slate-400">전문 보기 클릭</span>
                              <span className="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                전문 열람 ↗
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Search Results */}
            {viewMode === 'search' && (
              <>
                {isSearching ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">벡터 데이터베이스 시맨틱 검색 중...</p>
                  </div>
                ) : searchSearched && searchResults.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500">
                    <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-700">일치하는 검색 결과가 없습니다.</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">다른 키워드나 검색 범위를 조정해 보세요.</p>
                    <button
                      onClick={() => setViewMode('catalog')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 transition"
                    >
                      👉 전체 법령 목록에서 전문 열람하기
                    </button>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-slate-600">
                        검색 결과 <strong>{searchTotal}건</strong> 발견
                      </span>
                      <span className="text-[11px] text-slate-400">유사도 순 정렬</span>
                    </div>

                    {searchResults.map((r, i) => {
                      const score = r.score || 0;
                      const scoreBadge =
                        score >= 50
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : score >= 20
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200';

                      return (
                        <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm card-hover">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${scoreBadge}`}>
                                관련도 {score}%
                              </span>
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                                {r.source_type === 'law' ? '⚖️ 법령' : `🏢 ${catLabels[r.category] || '사내 자료'}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openLawFullText(r.source_name)}
                                className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                              >
                                <DocumentTextIcon className="w-3.5 h-3.5" />
                                법령 전문 보기
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${r.source_name} ${r.article}\n${r.content}`);
                                  setCopyToast(true);
                                  setTimeout(() => setCopyToast(false), 2000);
                                }}
                                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
                              >
                                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                                복사
                              </button>
                            </div>
                          </div>

                          <h4 className="font-bold text-slate-800 text-base mb-2">
                            {r.source_name} {r.article && <span className="text-blue-700 font-semibold">{r.article}</span>}
                          </h4>

                          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-mono whitespace-pre-wrap">
                            {r.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500">
                    <p className="text-sm font-semibold text-slate-700 mb-2">검색어를 입력하고 검색 버튼을 눌러주세요.</p>
                    <button
                      onClick={() => setViewMode('catalog')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 transition"
                    >
                      👉 법령 목록에서 전문 바로보기
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Law Full-Text Reader Modal */}
            {selectedLawFull && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col border border-slate-200 animate-scale-in">
                  {/* Modal Header */}
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {selectedLawFull.org || '대한민국'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          총 {selectedLawFull.total}개 조문 수록
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-xl tracking-tight">
                        {selectedLawFull.source_name}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedLawFull(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  {/* In-Law Search / Filter Bar */}
                  <div className="p-4 bg-slate-50/70 border-b border-slate-100">
                    <div className="relative">
                      <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={inLawFilter}
                        onChange={e => setInLawFilter(e.target.value)}
                        placeholder="이 법령 안에서 조문 번호나 단어 검색 (예: 제23조, 해고, 계약, 지원...)"
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Articles Content */}
                  <div className="p-6 overflow-y-auto space-y-4 flex-1">
                    {isLoadingFullText ? (
                      <div className="py-16 text-center">
                        <ArrowPathIcon className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                        <p className="text-xs text-slate-500">법령 전문 조항들을 불러오는 중입니다...</p>
                      </div>
                    ) : (
                      (() => {
                        let filtered = selectedLawFull.articles || [];
                        if (inLawFilter.trim()) {
                          const kw = inLawFilter.toLowerCase();
                          filtered = filtered.filter(
                            a => a.article.toLowerCase().includes(kw) || a.content.toLowerCase().includes(kw)
                          );
                        }

                        if (filtered.length === 0) {
                          return (
                            <p className="text-center py-12 text-slate-500 text-xs">
                              검색 조건과 일치하는 조문이 없습니다.
                            </p>
                          );
                        }

                        return filtered.map((art, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 hover:border-emerald-300 transition"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-bold text-emerald-800 text-sm">
                                {art.article}
                              </h5>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${selectedLawFull.source_name} ${art.article}\n${art.content}`);
                                  setCopyToast(true);
                                  setTimeout(() => setCopyToast(false), 2000);
                                }}
                                className="text-[11px] text-slate-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                              >
                                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                                조문 복사
                              </button>
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                              {art.content}
                            </p>
                          </div>
                        ));
                      })()
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center text-xs">
                    <span className="text-slate-500">
                      총 {selectedLawFull.total}개 조문 중 {inLawFilter.trim() ? '필터링' : '전체'} 표시
                    </span>
                    <button
                      onClick={() => setSelectedLawFull(null)}
                      className="px-5 py-2 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* Tab: Ordinance (지자체 자치법규 & 의회 정보 — 천안시 특화)  */}
        {/* ============================================================ */}
        {activeTab === 'ordinance' && (
          <div className="animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-8">
              <span className="text-xs uppercase font-bold tracking-wider text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                Local Ordinance & Municipal Council (충청남도 천안시 & 천안시의회)
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2 mb-2">지자체 자치법규 & 지방의회 정보</h2>
              <p className="text-slate-600 text-sm max-w-2xl mx-auto">
                충청남도 천안시 조례·규칙 및 천안시의회 회의규칙을 실시간 조회하고, 인허가·기업지원·관내 공공계약 관련 자치법규를 AI로 검색·비교합니다.
              </p>
            </div>

            {/* Top Stats Banner */}
            <div className="bg-gradient-to-r from-sky-900 to-indigo-950 text-white rounded-2xl p-6 mb-6 shadow-md border border-sky-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="bg-sky-500/20 text-sky-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-sky-400/30">
                      천안시 전용 DB 연동 상태
                    </span>
                    <span className="text-xs text-slate-300">
                      ChromaDB 적재: <b className="text-sky-300">{lawStatus?.ordinance_count ?? 366}개 조문</b> (21개 핵심 조례·규칙)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">충청남도 천안시 자치법규 및 천안시의회 규칙 실시간 동기화</h3>
                  <p className="text-xs text-sky-200/80 mt-0.5">
                    국가법령정보 공동활용 Open API (OC Key: {lawStatus?.has_api_key ? '정상 연결' : '샘플'}) 기반
                  </p>
                </div>
                <button
                  onClick={syncOrdinances}
                  disabled={isOrdinSyncing}
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50 shrink-0"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isOrdinSyncing ? 'animate-spin' : ''}`} />
                  {isOrdinSyncing ? '천안시 조례 최신화 동기화 중...' : '천안시 조례·의회 최신화 동기화'}
                </button>
              </div>

              {ordinSyncMsg && (
                <div className="mt-3 p-3 bg-white/10 rounded-lg text-xs flex items-center gap-2 border border-white/20">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{ordinSyncMsg.message}</span>
                </div>
              )}
            </div>

            {/* Search & Selector Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              {/* Target Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700">조회 대상:</span>
                  <button
                    onClick={() => { setOrdinTarget('cheonan_city'); fetchOrdinances('천안시'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      ordinTarget === 'cheonan_city'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🏢 충청남도 천안시 조례
                  </button>
                  <button
                    onClick={() => { setOrdinTarget('cheonan_council'); fetchOrdinances('천안시의회'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      ordinTarget === 'cheonan_council'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🏛️ 천안시의회 규칙·조례
                  </button>
                  <button
                    onClick={() => { setOrdinTarget('custom'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      ordinTarget === 'custom'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🔍 타 지자체 직접 검색
                  </button>
                </div>

                {ordinTarget === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customGovName}
                      onChange={(e) => setCustomGovName(e.target.value)}
                      placeholder="예: 아산시, 세종시..."
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 w-36"
                    />
                    <button
                      onClick={() => fetchOrdinances(customGovName)}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
                    >
                      조회
                    </button>
                  </div>
                )}
              </div>

              {/* Search Input Bar */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ordinQuery}
                    onChange={(e) => setOrdinQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchOrdinances(); }}
                    placeholder="자치법규명 또는 키워드 입력 (예: 기업지원, 소상공인, 건축, 위원회, 폐기물...)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                  />
                </div>
                <button
                  onClick={() => fetchOrdinances()}
                  disabled={isOrdinSearching}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-sm shrink-0"
                >
                  {isOrdinSearching ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                  검색
                </button>
              </div>

              {/* Quick Keyword Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">천안시 추천 키워드:</span>
                {[
                  '천안시 기업지원', '천안시 소상공인', '천안시의회 회의규칙',
                  '천안시 지역건설', '천안시 투자유치', '천안시 청년', '천안시 폐기물'
                ].map(kw => (
                  <button
                    key={kw}
                    onClick={() => {
                      setOrdinQuery(kw);
                      fetchOrdinances(kw);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 border border-slate-200 transition"
                  >
                    #{kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-3">
              {!isOrdinSearching && ordinResults.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      자치법규 목록 <span className="text-sky-600 font-extrabold">{ordinResults.length}건</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      (조례·규칙 문서 단위)
                    </span>
                  </div>
                  <div className="text-[11px] text-sky-800 bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-lg">
                    💡 조례 1건당 수십 개 조항(총 366개 조문)이 연동되어 있으며, <strong>[조문 전체보기]</strong>를 누르면 전체 조항이 열립니다.
                  </div>
                </div>
              )}
              {isOrdinSearching ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <ArrowPathIcon className="w-8 h-8 animate-spin text-sky-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">국가법령정보센터에서 자치법규를 실시간 검색 중입니다...</p>
                </div>
              ) : ordinResults.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <BuildingLibraryIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">조회된 자치법규가 없습니다.</p>
                  <p className="text-xs text-slate-500 mt-1">상단의 검색창이나 추천 키워드를 클릭해 보세요.</p>
                </div>
              ) : (
                ordinResults.map((item, idx) => (
                  <div
                    key={item.mst || idx}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-sky-300 transition-all card-hover"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                          {item.org || '충청남도 천안시'}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.type || '조례'}
                        </span>
                        {item.date && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            시행: {item.date}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewArticles(item.mst, item.name, item.org)}
                          className="px-3 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold border border-sky-200 transition flex items-center gap-1"
                        >
                          <DocumentTextIcon className="w-3.5 h-3.5" />
                          조문 전체보기
                        </button>
                        <a
                          href={`http://www.law.go.kr/DRF/lawService.do?OC=lawreview2026&target=ordin&MST=${item.mst}&type=HTML`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs rounded-lg border border-slate-200 transition"
                        >
                          공식 원문 ↗
                        </a>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base mb-1">
                      {item.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      일련번호(MST): {item.mst} | 법령ID: {item.id || '—'}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Articles Modal / Drawer */}
            {selectedOrdin && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 animate-scale-in">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                    <div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        {selectedOrdin.org}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-lg mt-1">{selectedOrdin.name}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedOrdin(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto space-y-4 flex-1">
                    {isLoadingArticles ? (
                      <div className="py-12 text-center">
                        <ArrowPathIcon className="w-8 h-8 animate-spin text-sky-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">국가법령정보 API로부터 조문 상세 내용을 불러오는 중입니다...</p>
                      </div>
                    ) : ordinArticles.length === 0 ? (
                      <p className="text-center py-10 text-slate-500 text-sm">표시할 조문 내용이 없습니다.</p>
                    ) : (
                      ordinArticles.map((art, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <h5 className="font-bold text-sky-800 text-sm mb-1.5">{art.article}</h5>
                          <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">{art.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center text-xs">
                    <span className="text-slate-500">총 {ordinArticles.length}개 조문</span>
                    <button
                      onClick={() => setSelectedOrdin(null)}
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* Tab 4: History (분석 이력)                                   */}
        {/* ============================================================ */}
        {activeTab === 'history' && <HistoryTab token={token} />}

        {/* ============================================================ */}
        {/* Tab 5: Docs (참고자료 관리 - 다중 파일 지원)                  */}
        {/* ============================================================ */}
        {activeTab === 'docs' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                Custom Reference Management (최대 200MB 지원)
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2 mb-2">사내 참고자료 관리</h2>
              <p className="text-slate-600 text-sm">회사 사규, 공공기관 규정, 내부 지침 등을 등록하면 AI 검토 시 함께 대조 분석합니다.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ArrowUpTrayIcon className="w-5 h-5 text-blue-600" />새 참고자료 등록
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  placeholder="문서 명칭 (예: 당사 외주용역 표준관리지침)"
                  className="auth-input"
                />
                <select value={docCategory} onChange={e => setDocCategory(e.target.value)} className="auth-input bg-white">
                  <option value="company_rule">🏢 회사 규정 / 사규</option>
                  <option value="public_rule">🏛️ 공공기관 규정 / 조례</option>
                  <option value="internal_guideline">📋 내부 업무 지침</option>
                  <option value="other">📄 기타 참고자료</option>
                </select>
                <div className="flex flex-col gap-1">
                  <input
                    type="file"
                    ref={docFileRef}
                    multiple
                    accept=".pdf,.docx,.hwp,.hwpx,.png,.jpg,.jpeg,.webp"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        const valid = filterValidFiles(e.target.files);
                        setDocFiles(valid);
                      }
                    }}
                    className="auth-input"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-400 pl-1">
                    <span>지원: PDF, Word, HWP, HWPX 및 여러 장의 서류 사진(JPG, PNG)</span>
                    {docFiles.length > 0 && (
                      <span className="font-semibold text-blue-600">
                        {docFiles.length}개 파일 선택됨 ({formatFileSize(docFiles.reduce((acc, f) => acc + f.size, 0))})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={uploadDoc}
                  disabled={docFiles.length === 0 || !docName.trim() || isDocUploading}
                  className="auth-btn"
                >
                  {isDocUploading ? '인덱싱 중...' : '참고자료 등록 (ChromaDB 자동 적재)'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-800 mb-4">등록된 사내 참고자료 ({customDocs.length}건)</h3>
              {isDocsLoading ? (
                <div className="text-center py-10">
                  <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                </div>
              ) : customDocs.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <FolderPlusIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>등록된 참고자료가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customDocs.map(d => (
                    <div
                      key={d.doc_id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 card-hover"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{d.doc_name}</p>
                        <div className="flex gap-2 mt-1.5 items-center">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                            {catLabels[d.category] || '기타'}
                          </span>
                          <span className="text-xs text-slate-400">{d.chunks_count}개 청크 임베딩</span>
                          <span className="text-[11px] text-slate-400">{d.created_at ? new Date(d.created_at).toLocaleDateString('ko-KR') : ''}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteDoc(d.doc_id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Tab 6: Law DB (법령 DB 동기화)                               */}
        {/* ============================================================ */}
        {activeTab === 'lawdb' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                National Law Vector Storage
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2 mb-2">법령 DB 관리</h2>
              <p className="text-slate-600 text-sm">국가법령정보센터 Open API를 통해 최신 대한민국 법령을 벡터 데이터베이스에 동기화합니다.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <ScaleIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-xs text-slate-500">국가 법령 조문</span>
                </div>
                <p className="text-2xl font-bold">
                  {lawStatus?.law_count ?? '—'}
                  <span className="text-xs font-normal text-slate-500 ml-1">개 조문</span>
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <BuildingLibraryIcon className="w-5 h-5 text-sky-500" />
                  <span className="text-xs text-slate-500">천안시 조례·의회</span>
                </div>
                <p className="text-2xl font-bold">
                  {lawStatus?.ordinance_count ?? 366}
                  <span className="text-xs font-normal text-slate-500 ml-1">개 조문</span>
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <FolderPlusIcon className="w-5 h-5 text-indigo-500" />
                  <span className="text-xs text-slate-500">사내 참고자료 청크</span>
                </div>
                <p className="text-2xl font-bold">
                  {lawStatus?.custom_count ?? '—'}
                  <span className="text-xs font-normal text-slate-500 ml-1">개 청크</span>
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <ServerStackIcon className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs text-slate-500">국가법령 API 상태</span>
                </div>
                <p className="text-base font-bold mt-1">
                  {lawStatus?.has_api_key ? (
                    <span className="text-emerald-600 font-semibold">✓ Open API 연동됨</span>
                  ) : (
                    <span className="text-amber-600 font-semibold">내장 샘플 모드</span>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                <CloudArrowDownIcon className="w-5 h-5 text-blue-600" />법령 데이터 동기화
              </h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                {lawStatus?.has_api_key
                  ? 'Open API를 통해 근로기준법, 민법, 상법, 하도급법, 약관규제법 등 주요 10개 법령을 자동 갱신합니다.'
                  : 'API 키 없이도 기본 제공되는 핵심 20개 법령 조문(근로기준법, 민법, 하도급법, 약관규제법 등)으로 동기화합니다.'}
              </p>
              <button onClick={syncLaw} disabled={isSyncing} className="auth-btn max-w-xs">
                {isSyncing ? '동기화 진행 중...' : '법령 동기화 시작'}
              </button>
              {syncResult && (
                <div
                  className={`mt-4 p-4 rounded-xl text-xs border leading-relaxed ${
                    syncResult.status === 'error'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <strong>{syncResult.status === 'error' ? '오류:' : '완료!'}</strong> {syncResult.message}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ChatWidget />
    </main>
  );
}
