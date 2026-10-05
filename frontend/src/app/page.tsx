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
  BuildingOffice2Icon,
  DocumentCheckIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import AuthModal from './components/AuthModal';
import DisclaimerBanner from './components/DisclaimerBanner';
import ChatWidget from './components/ChatWidget';
import HistoryTab from './components/HistoryTab';
import { API_BASE as API } from '../lib/api';

type CustomDoc = { doc_id: string; doc_name: string; category: string; chunks_count: number; created_at: string };
type User = { id: number; email: string; name: string };
type TabType = 'search' | 'national_law' | 'ordinance' | 'inspector' | 'review' | 'summarize' | 'docs' | 'history';

const ALLOWED_EXTS = ['.pdf', '.docx', '.hwp', '.hwpx', '.png', '.jpg', '.jpeg', '.webp'];

const DEFAULT_NATIONAL_LAWS = [
  { name: '근로기준법', count: 136, org: '고용노동부', type: 'law', cat: 'labor', catName: '근로·노동', desc: '근로조건의 기준, 임금, 법정근로시간, 해고의 제한 및 퇴직금 규정' },
  { name: '근로기준법 시행령', count: 80, org: '고용노동부', type: 'ordinance', cat: 'labor', catName: '근로·노동', desc: '근로기준법 위임사항, 연장·야간·휴일근로 가산수당 산정 세부기준' },
  { name: '독점규제 및 공정거래에 관한 법률', count: 147, org: '공정거래위원회', type: 'law', cat: 'fair_trade', catName: '공정거래', desc: '시장지배적 지위남용 금지, 부당한 공동행위(담합) 및 불공정거래 규제' },
  { name: '독점규제 및 공정거래에 관한 법률 시행령', count: 105, org: '공정거래위원회', type: 'ordinance', cat: 'fair_trade', catName: '공정거래', desc: '기업결합 신고, 지주회사 기준, 과징금 부과 및 감면 세부기준' },
  { name: '하도급거래 공정화에 관한 법률', count: 69, org: '공정거래위원회', type: 'law', cat: 'fair_trade', catName: '공정거래·하도급', desc: '하도급 서면교부 의무, 부당한 대금결정·감액 금지, 대금 직접지급의무' },
  { name: '하도급거래 공정화에 관한 법률 시행령', count: 39, org: '공정거래위원회', type: 'ordinance', cat: 'fair_trade', catName: '공정거래·하도급', desc: '하도급대금 연체이율, 계약이행보증, 법위반 과징금 산정기준' },
  { name: '약관의 규제에 관한 법률', count: 49, org: '공정거래위원회', type: 'law', cat: 'consumer', catName: '소비자·약관', desc: '불공정 약관조항의 무효, 설명의무 위반, 고객에게 부당하게 불리한 조항 무효' },
  { name: '약관의 규제에 관한 법률 시행령', count: 28, org: '공정거래위원회', type: 'ordinance', cat: 'consumer', catName: '소비자·약관', desc: '약관심사 청구 절차, 과태료 부과 및 시정명령 세부기준' },
  { name: '전자상거래 등에서의 소비자보호에 관한 법률', count: 65, org: '공정거래위원회', type: 'law', cat: 'consumer', catName: '소비자·전자상거래', desc: '통신판매 신원표시, 7일 청약철회권 보장, 결제대금예치제(에스크로)' },
  { name: '전자상거래 등에서의 소비자보호에 관한 법률 시행령', count: 64, org: '공정거래위원회', type: 'ordinance', cat: 'consumer', catName: '소비자·전자상거래', desc: '통신판매업 신고 면제기준, 청약철회 제한사유, 임시중지명령 절차' },
  { name: '주택임대차보호법', count: 42, org: '법무부·국토교통부', type: 'law', cat: 'real_estate', catName: '부동산·임대차', desc: '주거용 건물 임대차 최단 존속기간 2년 보장, 대항력, 계약갱신요구권' },
  { name: '주택임대차보호법 시행령', count: 35, org: '법무부·국토교통부', type: 'ordinance', cat: 'real_estate', catName: '부동산·임대차', desc: '최우선변제 소액보증금 범위, 월차임 전환산정률 기준' },
  { name: '상가건물 임대차보호법', count: 33, org: '법무부·국토교통부', type: 'law', cat: 'real_estate', catName: '부동산·임대차', desc: '상가건물 10년 계약갱신요구권, 권리금 회수기회 보호, 대항력 규정' },
  { name: '상가건물 임대차보호법 시행령', count: 24, org: '법무부·국토교통부', type: 'ordinance', cat: 'real_estate', catName: '부동산·임대차', desc: '상가보증금 적용범위 환산보증금 기준, 권리금 감정평가 세부기준' },
  { name: '개인정보 보호법', count: 140, org: '개인정보보호위원회', type: 'law', cat: 'privacy', catName: '개인정보·보안', desc: '개인정보 수집·이용 동의원칙, 제3자 제공, 안전성 확보조치 및 과징금' },
  { name: '개인정보 보호법 시행령', count: 152, org: '개인정보보호위원회', type: 'ordinance', cat: 'privacy', catName: '개인정보·보안', desc: '민감정보 및 고유식별정보 처리기준, 손해배상책임 보장 및 이행조치' },
  { name: '난민법', count: 54, org: '법무부', type: 'law', cat: 'special', catName: '기타 특별법', desc: '난민인정 심사절차, 난민인정자의 처우 및 이의신청' },
  { name: '난민법 시행령', count: 29, org: '법무부', type: 'ordinance', cat: 'special', catName: '기타 특별법', desc: '난민인정 신청서식, 생계비 등 지원기준' },
  { name: '1980년해직공무원의보상등에관한특별조치법', count: 6, org: '행정안전부', type: 'law', cat: 'special', catName: '기타 특별법', desc: '1980년 부당 해직 공무원에 대한 명예회복 및 보상 조치' },
  { name: '1980년해직공무원의보상등에관한특별조치법시행령', count: 13, org: '행정안전부', type: 'ordinance', cat: 'special', catName: '기타 특별법', desc: '보상금 지급신청 절차 및 보상심의위원회 구성' },
];

const SAMPLE_CUSTOM_DOCS = [
  {
    id: 9991,
    name: '사내 표준 용역외주계약 관리지침',
    category: 'company_rule',
    chunk_count: 8,
    content: '제1조(목적) 본 지침은 당사의 외주 용역계약 체결 시 불공정 독소조항을 방지하고 하도급법 및 상위 법령을 준수함을 목적으로 한다.\n\n제4조(위약금의 한도) 계약 불이행에 따른 위약벌 및 손해배상 예정액은 총 계약금액의 10%를 초과할 수 없으며, 과도한 위약벌 조항은 무효로 한다.\n\n제7조(대금 지급) 검수 완료일로부터 14일 이내에 현금 또는 계좌이체로 지급하여야 하며, 부당한 대금 감액은 엄격히 금지된다.\n\n제10조(비밀유지) 계약 종료 후 2년간 영업비밀을 보호하며, 비밀유지 의무 위반 시 실손해액을 기준으로 배상한다.',
  },
  {
    id: 9992,
    name: '사내 취업규칙 복무 및 퇴직 관리규정',
    category: 'company_rule',
    chunk_count: 12,
    content: '제1조(목적) 본 규정은 임직원의 근로조건과 복무에 관한 기본 사항을 정함을 목적으로 한다.\n\n제15조(해고 및 예고) 회사는 정당한 사유 없이 직원을 해고할 수 없으며, 30일 전에 해고를 예고하거나 30일분의 통상임금을 지급한다.\n\n제22조(퇴직금 지급) 계속근로연수 1년에 대하여 30일분의 평균임금을 퇴직일로부터 14일 이내에 지급한다.\n\n제28조(연차유급휴가) 근로기준법에 따라 1년간 80퍼센트 이상 출근한 근로자에게 15일의 유급휴가를 부여한다.',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('search');

  // Review Criteria Selection State (국가법령, 천안시 조례, 사내 참고자료)
  const [reviewSources, setReviewSources] = useState<{
    national: boolean;
    ordinance: boolean;
    custom: boolean;
  }>({
    national: true,
    ordinance: true,
    custom: true,
  });

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

  // Search State (Multi-Scope Selection)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScopes, setSearchScopes] = useState<{
    law: boolean;
    ordinance: boolean;
    custom: boolean;
  }>({
    law: true,
    ordinance: true,
    custom: true,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchSearched, setSearchSearched] = useState(false);

  // National Law Directory State
  const [nationalLawMode, setNationalLawMode] = useState<'core' | 'live'>('core');
  const [nationalLawFilter, setNationalLawFilter] = useState('');
  const [nationalLawCategory, setNationalLawCategory] = useState<string>('all');
  const [liveLawQuery, setLiveLawQuery] = useState('');
  const [liveLawResults, setLiveLawResults] = useState<any[]>([]);
  const [isLiveLawSearching, setIsLiveLawSearching] = useState(false);

  // Laws Catalog & Multi-Layout Reader State
  const [lawsCatalog, setLawsCatalog] = useState<{ national: any[]; ordinance: any[]; total_laws: number; total_articles: number } | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [selectedLawFull, setSelectedLawFull] = useState<{ source_name: string; org: string; total: number; articles: any[] } | null>(null);
  const [isLoadingFullText, setIsLoadingFullText] = useState(false);
  const [inLawFilter, setInLawFilter] = useState('');
  const [viewMode, setViewMode] = useState<'catalog' | 'search'>('catalog');

  // Multi-Layout State (1단 / 2단 / 3단 완전 가변 뷰)
  const [layoutMode, setLayoutMode] = useState<'1col' | '2col' | '3col'>('2col');
  const [singleSource, setSingleSource] = useState<'law' | 'ordinance' | 'custom'>('law');
  const [leftSource, setLeftSource] = useState<'law' | 'ordinance' | 'custom'>('ordinance');
  const [rightSource, setRightSource] = useState<'law' | 'ordinance' | 'custom'>('custom');
  const [col1Source, setCol1Source] = useState<'law' | 'ordinance' | 'custom'>('law');
  const [col2Source, setCol2Source] = useState<'law' | 'ordinance' | 'custom'>('ordinance');
  const [col3Source, setCol3Source] = useState<'law' | 'ordinance' | 'custom'>('custom');
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [selectedCustomDoc, setSelectedCustomDoc] = useState<any | null>(null);

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

    const activeSources = [];
    if (reviewSources.national) activeSources.push('law');
    if (reviewSources.ordinance) activeSources.push('ordinance');
    if (reviewSources.custom) activeSources.push('custom');

    if (activeSources.length === 0) {
      alert('최소 1개 이상의 검토 기준(국가법령, 천안시 조례, 사내 참고자료)을 선택해 주세요.');
      return;
    }

    setIsUploading(true);
    setResult(null);

    const fd = new FormData();
    reviewFiles.forEach(f => fd.append('files', f));
    fd.append('sources', JSON.stringify(activeSources));

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

  const isAllSearchScopes = searchScopes.law && searchScopes.ordinance && searchScopes.custom;

  const toggleAllSearchScopes = () => {
    if (isAllSearchScopes) {
      setSearchScopes({ law: false, ordinance: false, custom: false });
    } else {
      setSearchScopes({ law: true, ordinance: true, custom: true });
    }
  };

  const toggleSearchScope = (scopeKey: 'law' | 'ordinance' | 'custom') => {
    setSearchScopes(prev => ({ ...prev, [scopeKey]: !prev[scopeKey] }));
  };

  // Search Action (Multi-Scope RAG vector query)
  const handleSearch = async (
    overrideQuery?: string,
    overrideScopes?: { law: boolean; ordinance: boolean; custom: boolean }
  ) => {
    const q = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const scopesObj = overrideScopes !== undefined ? overrideScopes : searchScopes;
    if (!q.trim()) return;

    const activeScopes: string[] = [];
    if (scopesObj.law) activeScopes.push('law');
    if (scopesObj.ordinance) activeScopes.push('ordinance');
    if (scopesObj.custom) activeScopes.push('custom');

    if (activeScopes.length === 0) {
      alert('검색 대상을 최소 1개 이상 선택해 주세요.');
      return;
    }

    setIsSearching(true);
    setSearchSearched(true);
    setViewMode('search');
    try {
      const r = await fetch(`${API}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q.trim(),
          scope: activeScopes.length === 3 ? 'all' : (activeScopes.length === 1 ? activeScopes[0] : 'all'),
          scopes: activeScopes,
          limit: 15,
        }),
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

  const openLawFullText = async (lawName: string, mst?: string) => {
    setIsLoadingFullText(true);
    setSelectedLawFull({ source_name: lawName, org: '', total: 0, articles: [] });
    setInLawFilter('');
    try {
      const url = mst
        ? `${API}/api/laws/full-text?source_name=${encodeURIComponent(lawName)}&mst=${encodeURIComponent(mst)}`
        : `${API}/api/laws/full-text?source_name=${encodeURIComponent(lawName)}`;
      const r = await fetch(url);
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

  const fetchLiveLaws = async (keyword?: string) => {
    const q = keyword !== undefined ? keyword : liveLawQuery;
    if (!q.trim()) return;
    setIsLiveLawSearching(true);
    try {
      const r = await fetch(`${API}/api/laws/live-search?query=${encodeURIComponent(q.trim())}&display=25`);
      if (r.ok) {
        const d = await r.json();
        setLiveLawResults(d.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLiveLawSearching(false);
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
    if (activeTab === 'ordinance' || activeTab === 'national_law') fetchLaw();
    if (activeTab === 'search' || activeTab === 'inspector' || activeTab === 'national_law') {
      if (!lawsCatalog) fetchLawsCatalog();
    }
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
    { id: 'search' as const, label: '통합 검색', icon: <MagnifyingGlassIcon className="w-4 h-4 text-emerald-300" /> },
    { id: 'national_law' as const, label: '대한민국 법령', icon: <ScaleIcon className="w-4 h-4 text-amber-300" /> },
    { id: 'ordinance' as const, label: '지자체 조례·의회', icon: <BuildingLibraryIcon className="w-4 h-4 text-sky-400" /> },
    { id: 'inspector' as const, label: '2단·3단 비교 대조', icon: <BuildingOffice2Icon className="w-4 h-4 text-indigo-300" /> },
    { id: 'review' as const, label: '계약서 AI 검토', icon: <DocumentCheckIcon className="w-4 h-4 text-blue-300" /> },
    { id: 'summarize' as const, label: '문서 요약', icon: <SparklesIcon className="w-4 h-4 text-purple-300" /> },
    { id: 'docs' as const, label: '사내 참고자료', icon: <FolderPlusIcon className="w-4 h-4" /> },
    { id: 'history' as const, label: '분석 이력', icon: <ClockIcon className="w-4 h-4" /> },
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
            <div className="text-center mb-6">
              <span className="text-xs uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                AI 법령 대조 독소조항 감지 (최대 200MB 지원)
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2 mb-2">계약서를 업로드하고 법적 리스크를 진단하세요</h2>
              <p className="text-slate-600 max-w-xl mx-auto text-sm leading-relaxed">
                PDF, Word, HWP 문서는 물론 <strong>여러 장의 계약서 사진(JPG, PNG)을 한 번에 다중 선택</strong>하여
                원하는 법령 및 조례 기준과 교차 대조 분석할 수 있습니다.
              </p>
            </div>

            {/* Criteria Selection Bar */}
            <div className="mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    🎯 AI 계약서 검토 기준 소스 선택
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  체크한 법령 및 지침을 바탕으로 교차 분석을 진행합니다 (중복 선택 가능)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. National Law */}
                <div
                  onClick={() => setReviewSources(prev => ({ ...prev, national: !prev.national }))}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    reviewSources.national
                      ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/30 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={reviewSources.national}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-extrabold text-slate-800">대한민국 국가법령</span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/90 px-1.5 py-0.2 rounded">1,310조</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      근로기준법, 하도급법, 약관규제법, 상가임대차법 등 강행규정
                    </p>
                  </div>
                </div>

                {/* 2. Cheonan Ordinance */}
                <div
                  onClick={() => setReviewSources(prev => ({ ...prev, ordinance: !prev.ordinance }))}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    reviewSources.ordinance
                      ? 'bg-sky-50/80 border-sky-400 ring-1 ring-sky-400/30 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={reviewSources.ordinance}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-extrabold text-slate-800">천안시 자치법규·조례</span>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100/90 px-1.5 py-0.2 rounded">366조</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      천안시 하도급업체보호, 건축조례, 기업유치, 소상공인지원
                    </p>
                  </div>
                </div>

                {/* 3. Custom Docs */}
                <div
                  onClick={() => setReviewSources(prev => ({ ...prev, custom: !prev.custom }))}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    reviewSources.custom
                      ? 'bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-400/30 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={reviewSources.custom}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-extrabold text-slate-800">사내 규정 및 참고자료</span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/90 px-1.5 py-0.2 rounded">
                        {customDocs.length || SAMPLE_CUSTOM_DOCS.length}건
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      사내 취업규칙, 표준 용역지침(위약금 10% 한도), 내부 지침
                    </p>
                  </div>
                </div>
              </div>
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
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold mr-0.5">적용 기준:</span>
                        {reviewSources.national && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            🏛️ 국가법령 (1,310조)
                          </span>
                        )}
                        {reviewSources.ordinance && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            🏢 천안시 조례 (366조)
                          </span>
                        )}
                        {reviewSources.custom && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            📁 사내 규정 & 지침
                          </span>
                        )}
                      </div>
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
        {/* ============================================================ */}
        {/* Tab 3: Search (국가법령 · 천안시 조례 · 사내규정 통합 검색)   */}
        {/* ============================================================ */}
        {activeTab === 'search' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                시맨틱 AI 통합 검색
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2 mb-2">국가법령 · 천안시 조례 · 사내 규정 통합 검색</h2>
              <p className="text-slate-600 max-w-xl mx-auto text-sm leading-relaxed">
                키워드 하나로 <strong>대한민국 법령 1,310조, 천안시 조례 366조, 사내 지침</strong> 전체에서 일치 및 유사 조항을 실시간 검색합니다.
              </p>
            </div>

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

              {/* Scope Multi-Select Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <FunnelIcon className="w-3.5 h-3.5 text-slate-400" />
                    검색 대상:
                  </span>

                  {/* All Scopes Toggle */}
                  <button
                    type="button"
                    onClick={toggleAllSearchScopes}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      isAllSearchScopes
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        isAllSearchScopes ? 'bg-emerald-500 text-white font-extrabold' : 'border border-slate-300'
                      }`}
                    >
                      {isAllSearchScopes ? '✓' : ''}
                    </span>
                    <span>전체 자료</span>
                  </button>

                  {/* Law Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSearchScope('law')}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      searchScopes.law
                        ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-sm ring-1 ring-amber-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        searchScopes.law ? 'bg-amber-600 text-white font-extrabold' : 'border border-slate-300'
                      }`}
                    >
                      {searchScopes.law ? '✓' : ''}
                    </span>
                    <span>⚖️ 대한민국 법령 (1,310조)</span>
                  </button>

                  {/* Ordinance Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSearchScope('ordinance')}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      searchScopes.ordinance
                        ? 'bg-sky-50 text-sky-900 border-sky-300 shadow-sm ring-1 ring-sky-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        searchScopes.ordinance ? 'bg-sky-600 text-white font-extrabold' : 'border border-slate-300'
                      }`}
                    >
                      {searchScopes.ordinance ? '✓' : ''}
                    </span>
                    <span>🏛️ 천안시 조례·의회 (366조)</span>
                  </button>

                  {/* Custom Docs Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSearchScope('custom')}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      searchScopes.custom
                        ? 'bg-purple-50 text-purple-900 border-purple-300 shadow-sm ring-1 ring-purple-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        searchScopes.custom ? 'bg-purple-600 text-white font-extrabold' : 'border border-slate-300'
                      }`}
                    >
                      {searchScopes.custom ? '✓' : ''}
                    </span>
                    <span>🏢 사내 참고자료 & 규정</span>
                  </button>
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
                        handleSearch(q, searchScopes);
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded text-[11px] transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Direct Search Results */}
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
                                {r.source_type === 'ordinance' ? '🏛️ 천안시 조례' : r.source_type === 'law' ? '⚖️ 대한민국 법령' : `🏢 ${catLabels[r.category] || '사내 참고자료'}`}
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
          </div>
        )}

        {/* ============================================================ */}
        {/* Tab: National Law Directory (대한민국 국가법령 전용 게시판) */}
        {/* ============================================================ */}
        {activeTab === 'national_law' && (
          <div className="animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Republic of Korea National Laws (대한민국 법령 열람 & 검색)
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2 mb-2">대한민국 국가법령 디렉토리</h2>
              <p className="text-slate-600 text-sm max-w-2xl mx-auto">
                실무 핵심 20대 법률·시행령(1,310개 조문) 및 대한민국 5,000+ 전체 법령을 법제처 Open API와 실시간 연동하여 전문을 확인하고 대조실로 가져옵니다.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-center mb-6">
              <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center gap-2 max-w-xl w-full shadow-inner">
                <button
                  type="button"
                  onClick={() => setNationalLawMode('core')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    nationalLawMode === 'core'
                      ? 'bg-white text-slate-900 shadow-md font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ScaleIcon className="w-4 h-4 text-amber-600" />
                  📁 실무 핵심 20대 법령 DB (1,310조)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNationalLawMode('live');
                    if (liveLawResults.length === 0 && !liveLawQuery) {
                      setLiveLawQuery('중대재해');
                      fetchLiveLaws('중대재해');
                    }
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    nationalLawMode === 'live'
                      ? 'bg-amber-600 text-white shadow-md font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <SparklesIcon className="w-4 h-4 text-amber-200" />
                  🌐 5,000+ 전체 법령 실시간 검색 (API)
                </button>
              </div>
            </div>

            {/* Sub-view 1: Core 20 Laws */}
            {nationalLawMode === 'core' && (
              <div>
                {/* Top Stats Banner with clear explanation */}
                <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white rounded-2xl p-6 mb-6 shadow-md border border-amber-800/60">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="bg-amber-500/20 text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30">
                          ChromaDB 벡터 사전 색인 완료
                        </span>
                        <span className="text-xs text-slate-300">
                          수록 현황: <strong className="text-amber-300">20개 실무 핵심 법률·시행령</strong> (총 1,310개 조문)
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">실무 핵심 20대 법률 & 시행령 분야별 보관함</h3>
                      <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                        💡 <strong>왜 20개인가요?</strong> 근로·공정거래·하도급·임대차·개인정보 등 계약서 작성 및 검토 시 빈번히 참조되는 6개 분야 핵심 법률 20개를 엄선하여 조문 단위로 정밀 벡터화해 둔 DB입니다.<br />
                        아래 <strong>분야 필터 버튼을 누르면 해당 분야 법령만</strong> 볼 수 있으며, 5,000개 이상의 다른 대한민국 법률은 상단 <strong>[5,000+ 전체 법령 실시간 검색]</strong>에서 바로 찾으실 수 있습니다.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setLayoutMode('2col');
                          setLeftSource('law');
                          setRightSource('ordinance');
                          setActiveTab('inspector');
                        }}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                      >
                        <BuildingOffice2Icon className="w-4 h-4" />
                        2단 대조실에서 조례와 비교하기
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Filter & Search Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                    {/* Category Pills with EXACT COUNTS */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
                        <FunnelIcon className="w-3.5 h-3.5 text-slate-400" />
                        분야 필터:
                      </span>
                      {[
                        { id: 'all', label: '전체 (20개)' },
                        { id: 'labor', label: '👷 근로·노동 (2개)' },
                        { id: 'fair_trade', label: '🤝 공정거래·하도급 (4개)' },
                        { id: 'consumer', label: '🛒 소비자·약관 (4개)' },
                        { id: 'real_estate', label: '🏢 부동산·임대차 (4개)' },
                        { id: 'privacy', label: '🔒 개인정보·보안 (2개)' },
                        { id: 'special', label: '📜 기타 특별법 (4개)' },
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setNationalLawCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                            nationalLawCategory === cat.id
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Instant Law Search Input */}
                    <div className="relative w-full sm:w-72">
                      <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={nationalLawFilter}
                        onChange={e => setNationalLawFilter(e.target.value)}
                        placeholder="20대 법령 내 검색 (법령명, 소관부처)..."
                        className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition"
                      />
                      {nationalLawFilter && (
                        <button
                          onClick={() => setNationalLawFilter('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* National Laws List Cards */}
                  {(() => {
                    const sourceList = (lawsCatalog?.national && lawsCatalog.national.length > 0)
                      ? lawsCatalog.national.map(item => {
                          const found = DEFAULT_NATIONAL_LAWS.find(d => d.name === item.name);
                          return {
                            name: item.name,
                            count: item.count || found?.count || 0,
                            org: item.org || found?.org || '대한민국',
                            type: item.type || found?.type || 'law',
                            cat: found?.cat || 'special',
                            catName: found?.catName || '기타',
                            desc: found?.desc || '대한민국 주요 법률 규정'
                          };
                        })
                      : DEFAULT_NATIONAL_LAWS;

                    let filtered = sourceList;
                    if (nationalLawCategory !== 'all') {
                      filtered = filtered.filter(l => l.cat === nationalLawCategory);
                    }
                    if (nationalLawFilter.trim()) {
                      const kw = nationalLawFilter.toLowerCase();
                      filtered = filtered.filter(l =>
                        l.name.toLowerCase().includes(kw) ||
                        l.org.toLowerCase().includes(kw) ||
                        l.desc.toLowerCase().includes(kw) ||
                        l.catName.toLowerCase().includes(kw)
                      );
                    }

                    if (filtered.length === 0) {
                      return (
                        <div className="py-12 text-center text-slate-500 text-xs">
                          <p className="font-semibold text-slate-700 mb-1">검색 조건과 일치하는 핵심 법령이 없습니다.</p>
                          <p className="text-slate-400 mb-3">대한민국 5,000여 개 전체 법령에서 찾으시려면 상단의 '5,000+ 전체 법령 실시간 검색' 탭을 이용해보세요.</p>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setNationalLawCategory('all'); setNationalLawFilter(''); }}
                              className="text-amber-600 hover:underline font-semibold"
                            >
                              필터 초기화
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => {
                                setNationalLawMode('live');
                                setLiveLawQuery(nationalLawFilter);
                                fetchLiveLaws(nationalLawFilter);
                              }}
                              className="text-blue-600 hover:underline font-bold"
                            >
                              전체 법령 실시간 검색으로 이동 ↗
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map((law, idx) => {
                          const isDecree = law.name.includes('시행령');
                          return (
                            <div
                              key={idx}
                              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between group"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isDecree ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900'}`}>
                                      {isDecree ? '대통령령(시행령)' : '법률(상위법)'}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-500">
                                      {law.org}
                                    </span>
                                  </div>
                                  <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                    {law.count}개 조문
                                  </span>
                                </div>

                                <h4 className="font-extrabold text-slate-900 text-base mb-1.5 group-hover:text-amber-700 transition">
                                  {law.name}
                                </h4>

                                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                                  {law.desc}
                                </p>
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                                <span className="text-[11px] font-semibold text-slate-400">
                                  분야: <span className="text-slate-600 font-bold">{law.catName}</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openLawFullText(law.name)}
                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition flex items-center gap-1 shadow-sm cursor-pointer"
                                  >
                                    <DocumentTextIcon className="w-3.5 h-3.5" />
                                    전문 열람 ↗
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLayoutMode('2col');
                                      setLeftSource('law');
                                      setRightSource('ordinance');
                                      setActiveTab('inspector');
                                    }}
                                    title="2단 대조실에서 조례 및 사내규정과 비교"
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                  >
                                    대조실 ↗
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Sub-view 2: Republic of Korea 5,000+ Live Laws Open API */}
            {nationalLawMode === 'live' && (
              <div>
                {/* Live Search Top Banner */}
                <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 mb-6 shadow-md border border-blue-800/60">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="bg-blue-500/20 text-blue-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30">
                      국가법령정보센터 공식 Open API 연동
                    </span>
                    <span className="text-xs text-slate-300">
                      검색 범위: <strong className="text-blue-300">대한민국 현행 전체 법령 5,000여 개</strong> (법률·대통령령·부령)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    대한민국 5,000+ 전체 법령 실시간 검색 및 전문 열람실
                  </h3>
                  <p className="text-xs text-blue-200/90 leading-relaxed">
                    20개 실무 법령 외에도 법제처 국가법령정보센터에서 제공하는 <strong>대한민국 전체 5,000여 개 법령</strong>을 실시간으로 검색할 수 있습니다.<br />
                    검색된 법령의 <strong>[전문 열람]</strong>을 클릭하면 법제처에서 제1조부터 최신 전문을 즉시 불러와 열람하실 수 있습니다.
                  </p>
                </div>

                {/* Live Search Bar & Quick Chips */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      fetchLiveLaws();
                    }}
                    className="flex flex-col sm:flex-row gap-2.5 mb-4"
                  >
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={liveLawQuery}
                        onChange={e => setLiveLawQuery(e.target.value)}
                        placeholder="대한민국 법령명 검색 (예: 중대재해처벌법, 산업안전보건법, 민법, 상법, 건축법, 개인정보...)"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLiveLawSearching}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {isLiveLawSearching ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          검색 중...
                        </>
                      ) : (
                        <>
                          <MagnifyingGlassIcon className="w-4 h-4" />
                          실시간 검색
                        </>
                      )}
                    </button>
                  </form>

                  {/* Quick Recommendation Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap text-xs pt-3 border-t border-slate-100">
                    <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
                      <SparklesIcon className="w-3.5 h-3.5 text-blue-500" />
                      추천 검색어:
                    </span>
                    {[
                      '중대재해',
                      '산업안전보건법',
                      '민법',
                      '상법',
                      '전자금융거래법',
                      '건축법',
                      '국유재산법',
                      '중소기업기본법',
                    ].map((kw, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setLiveLawQuery(kw);
                          fetchLiveLaws(kw);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg font-medium transition cursor-pointer"
                      >
                        #{kw}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results Section */}
                {isLiveLawSearching ? (
                  <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <ArrowPathIcon className="w-9 h-9 animate-spin text-blue-600 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-700">국가법령정보센터에서 법령을 실시간 검색 중입니다...</p>
                    <p className="text-xs text-slate-400 mt-1">대한민국 5,000+ 법령 데이터베이스를 조회하고 있습니다.</p>
                  </div>
                ) : liveLawResults.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-600 font-semibold">
                        검색 결과 <strong className="text-blue-600">{liveLawResults.length}건</strong>
                      </span>
                      <span className="text-slate-400">클릭 시 제1조부터 최신 전문이 열립니다</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {liveLawResults.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                  {item.type || '법률'}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500">
                                  {item.org || '대한민국'}
                                </span>
                              </div>
                              {item.mst && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  MST: {item.mst}
                                </span>
                              )}
                            </div>

                            <h4 className="font-extrabold text-slate-900 text-base mb-2 group-hover:text-blue-700 transition">
                              {item.name}
                            </h4>

                            <div className="text-[11px] text-slate-500 space-y-0.5 mb-4">
                              {item.date && <p>공포/시행: {item.date}</p>}
                              {item.id && <p className="font-mono text-slate-400 text-[10px]">법령ID: {item.id}</p>}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                            <span className="text-[11px] text-slate-400">
                              국가법령정보센터 실시간
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openLawFullText(item.name, item.mst)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition flex items-center gap-1 shadow-sm cursor-pointer"
                              >
                                <DocumentTextIcon className="w-3.5 h-3.5" />
                                전문 열람 ↗
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setLayoutMode('2col');
                                  setLeftSource('law');
                                  setRightSource('ordinance');
                                  setActiveTab('inspector');
                                }}
                                title="2단 대조실로 이동"
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                              >
                                대조실 ↗
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-xs">
                    <BuildingLibraryIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm mb-1">
                      원하는 법령명을 입력하고 실시간 검색을 눌러보세요.
                    </p>
                    <p className="text-slate-500 max-w-md mx-auto">
                      중대재해처벌법, 산업안전보건법, 민법 등 대한민국 5,000여 개 전체 법률·시행령·시행규칙을 법제처 국가법령정보센터에서 즉시 검색하고 전문을 확인할 수 있습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* Tab 4: Inspector (2단·3단 멀티 비교 대조실)                   */}
        {/* ============================================================ */}
        {activeTab === 'inspector' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                1단 · 2단 · 3단 멀티 레이아웃 비교 대조실
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-2 mb-2">국가법령 · 천안시 조례 · 사내규정 비교 대조</h2>
              <p className="text-slate-600 max-w-xl mx-auto text-sm leading-relaxed">
                원하는 단수(1단/2단/3단)를 선택하여 상위법령과 지자체 조례, 사내 참고자료를 나란히 대조하고 제1조부터 전체 전문을 확인하세요.
              </p>
            </div>

            {/* Guidance: Difference Between Search and Inspector */}
            <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-200/90 rounded-2xl p-5 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
                    <BuildingOffice2Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-indigo-950 text-sm flex items-center gap-2">
                      <span>💡 '통합 검색'과 '2단·3단 비교 대조'의 차이점</span>
                    </h4>
                    <div className="text-xs text-slate-700 mt-1 space-y-1 leading-relaxed">
                      <p>
                        <strong className="text-emerald-700">🔍 통합 검색:</strong> 키워드를 입력하여 법령·천안시 조례·사내규정 전체에서 <strong>관련 조문만 핀포인트로 발췌</strong>하여 찾아주는 시맨틱 검색 엔진입니다.
                      </p>
                      <p>
                        <strong className="text-indigo-700">▥ 2단·3단 비교 대조실:</strong> 국가법령(상위법), 천안시 조례(지자체 규범), 사내 지침을 <strong>화면에 나란히 펼쳐놓고 제1조부터 전문을 조문별로 1:1 대조</strong>하여 법률 위반 및 상충 조항을 정밀 검토하는 전문 대조 뷰어입니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
                {/* Multi-Layout Toolbar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Layout Mode Buttons */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setLayoutMode('1col')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        layoutMode === '1col'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="1개 영역에 집중하여 넓게 열람"
                    >
                      <span className="font-mono text-sm">▤</span> 1단 집중 뷰
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutMode('2col')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        layoutMode === '2col'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="2개 영역을 나란히 선택 비교"
                    >
                      <span className="font-mono text-sm">▥</span> 2단 분할 비교
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutMode('3col')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        layoutMode === '3col'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="국가법령 - 천안시조례 - 사내규정 3자 동시 대조"
                    >
                      <span className="font-mono text-sm">☱</span> 3단 종합 대조
                    </button>
                  </div>

                  {/* Right: Unified Multi-Column Instant Filter */}
                  <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={columnSearchQuery}
                      onChange={e => setColumnSearchQuery(e.target.value)}
                      placeholder="활성화된 화면 전체 동시 필터링 (예: 하도급, 소상공인, 지원, 해고)..."
                      className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                    />
                    {columnSearchQuery && (
                      <button
                        onClick={() => setColumnSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* 1-Column Single View Source Selector */}
                {layoutMode === '1col' && (
                  <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex-wrap">
                    <span className="text-xs font-bold text-slate-500 mr-1">열람 대상 선택:</span>
                    <button
                      onClick={() => setSingleSource('law')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        singleSource === 'law' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ⚖️ 대한민국 국가 법령 ({lawsCatalog?.national.length ?? 18})
                    </button>
                    <button
                      onClick={() => setSingleSource('ordinance')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        singleSource === 'ordinance' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      🏛️ 천안시 자치법규 ({lawsCatalog?.ordinance.length ?? 23})
                    </button>
                    <button
                      onClick={() => setSingleSource('custom')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        singleSource === 'custom' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      🏢 사내 참고자료 & 지침 ({customDocs.length || SAMPLE_CUSTOM_DOCS.length})
                    </button>
                  </div>
                )}

                {/* 2-Column Mode Presets & Dynamic Source Selector */}
                {layoutMode === '2col' && (
                  <div className="bg-gradient-to-r from-indigo-50/90 via-sky-50/50 to-blue-50/90 p-4 rounded-2xl border border-indigo-200 shadow-sm flex flex-col gap-3.5">
                    {/* Presets Row */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-extrabold text-slate-800 mr-1 flex items-center gap-1.5">
                        <SparklesIcon className="w-4 h-4 text-indigo-600" />
                        자주 쓰는 2단 비교 조합 (원클릭 전환):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setLeftSource('ordinance');
                          setRightSource('custom');
                        }}
                        className={`px-3.5 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          leftSource === 'ordinance' && rightSource === 'custom'
                            ? 'bg-indigo-600 text-white shadow-indigo-200'
                            : 'bg-white text-indigo-950 border border-indigo-200 hover:bg-indigo-50/80'
                        }`}
                      >
                        <span>🏛️ 천안시 조례</span>
                        <span className="opacity-60 font-normal">vs</span>
                        <span>🏢 사내 참고자료</span>
                        {leftSource === 'ordinance' && rightSource === 'custom' && (
                          <span className="bg-indigo-400/80 text-[10px] px-1.5 py-0.2 rounded-full text-white ml-0.5">선택됨</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLeftSource('law');
                          setRightSource('ordinance');
                        }}
                        className={`px-3.5 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          leftSource === 'law' && rightSource === 'ordinance'
                            ? 'bg-indigo-600 text-white shadow-indigo-200'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>⚖️ 국가 법령</span>
                        <span className="opacity-60 font-normal">vs</span>
                        <span>🏛️ 천안시 조례</span>
                        {leftSource === 'law' && rightSource === 'ordinance' && (
                          <span className="bg-indigo-400/80 text-[10px] px-1.5 py-0.2 rounded-full text-white ml-0.5">선택됨</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLeftSource('law');
                          setRightSource('custom');
                        }}
                        className={`px-3.5 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          leftSource === 'law' && rightSource === 'custom'
                            ? 'bg-indigo-600 text-white shadow-indigo-200'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>⚖️ 국가 법령</span>
                        <span className="opacity-60 font-normal">vs</span>
                        <span>🏢 사내 참고자료</span>
                        {leftSource === 'law' && rightSource === 'custom' && (
                          <span className="bg-indigo-400/80 text-[10px] px-1.5 py-0.2 rounded-full text-white ml-0.5">선택됨</span>
                        )}
                      </button>
                    </div>

                    {/* Direct Column Selector & Swap */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-indigo-100">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-slate-600 shrink-0">◀ 좌측 화면:</span>
                        <select
                          value={leftSource}
                          onChange={(e) => setLeftSource(e.target.value as any)}
                          className="w-full bg-white text-xs font-bold text-slate-800 px-3 py-2 rounded-xl border border-indigo-200 shadow-xs focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                        >
                          <option value="law">⚖️ 대한민국 국가 법령 (1,310조)</option>
                          <option value="ordinance">🏛️ 충남 천안시 자치법규 (366조)</option>
                          <option value="custom">🏢 사내 참고자료 & 규정지침</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const temp = leftSource;
                          setLeftSource(rightSource);
                          setRightSource(temp);
                        }}
                        className="px-4 py-2 bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-700 font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-xs cursor-pointer shrink-0"
                        title="좌측과 우측의 비교 대상을 맞바꿉니다"
                      >
                        <span className="text-sm">⇄</span>
                        <span>좌우 맞바꾸기</span>
                      </button>

                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-slate-600 shrink-0">우측 화면 ▶:</span>
                        <select
                          value={rightSource}
                          onChange={(e) => setRightSource(e.target.value as any)}
                          className="w-full bg-white text-xs font-bold text-slate-800 px-3 py-2 rounded-xl border border-indigo-200 shadow-xs focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                        >
                          <option value="law">⚖️ 대한민국 국가 법령 (1,310조)</option>
                          <option value="ordinance">🏛️ 충남 천안시 자치법규 (366조)</option>
                          <option value="custom">🏢 사내 참고자료 & 규정지침</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3-Column Mode Customizer */}
                {layoutMode === '3col' && (
                  <div className="bg-gradient-to-r from-emerald-50/80 via-white to-sky-50/80 p-4 rounded-2xl border border-emerald-200 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          <SparklesIcon className="w-4 h-4 text-emerald-600" />
                          3단 컬럼 맞춤 구성:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCol1Source('law');
                            setCol2Source('ordinance');
                            setCol3Source('custom');
                          }}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-500 transition cursor-pointer"
                        >
                          기본 3자 종합 대조 (국가법령 + 천안시조례 + 사내규정)
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-500">각 단마다 원하는 법률·조례·규정을 자유롭게 지정하세요</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 shrink-0">1단:</span>
                        <select
                          value={col1Source}
                          onChange={(e) => setCol1Source(e.target.value as any)}
                          className="w-full bg-white text-xs font-bold text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs focus:ring-2 focus:ring-emerald-400 outline-none cursor-pointer"
                        >
                          <option value="law">⚖️ 대한민국 국가 법령</option>
                          <option value="ordinance">🏛️ 천안시 자치법규</option>
                          <option value="custom">🏢 사내 참고자료</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 shrink-0">2단:</span>
                        <select
                          value={col2Source}
                          onChange={(e) => setCol2Source(e.target.value as any)}
                          className="w-full bg-white text-xs font-bold text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs focus:ring-2 focus:ring-emerald-400 outline-none cursor-pointer"
                        >
                          <option value="law">⚖️ 대한민국 국가 법령</option>
                          <option value="ordinance">🏛️ 천안시 자치법규</option>
                          <option value="custom">🏢 사내 참고자료</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 shrink-0">3단:</span>
                        <select
                          value={col3Source}
                          onChange={(e) => setCol3Source(e.target.value as any)}
                          className="w-full bg-white text-xs font-bold text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs focus:ring-2 focus:ring-emerald-400 outline-none cursor-pointer"
                        >
                          <option value="law">⚖️ 대한민국 국가 법령</option>
                          <option value="ordinance">🏛️ 천안시 자치법규</option>
                          <option value="custom">🏢 사내 참고자료</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Columns Container */}
                {isLoadingCatalog ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">법령 및 자치법규 데이터를 불러오는 중입니다...</p>
                  </div>
                ) : (
                  <div>
                    {/* Helper to render a data column */}
                    {(() => {
                      const renderDataColumn = (
                        src: 'law' | 'ordinance' | 'custom',
                        canChange?: boolean,
                        onChange?: (next: 'law' | 'ordinance' | 'custom') => void
                      ) => {
                        const isLaw = src === 'law';
                        const isOrdin = src === 'ordinance';
                        const isCustom = src === 'custom';

                        const title = isLaw
                          ? '⚖️ 대한민국 국가 법령'
                          : isOrdin
                          ? '🏛️ 충남 천안시 자치법규'
                          : '🏢 사내 참고자료 & 규정';

                        const subtitle = isLaw
                          ? '상위법 기준 · 18개 법률 (1,310조)'
                          : isOrdin
                          ? '지자체 조례·규칙 · 23개 조례 (366조)'
                          : '회사 내부 규범 기준 · 취업규칙/용역지침';

                        const headerTheme = isLaw
                          ? 'bg-blue-50/90 border-blue-200 text-blue-900'
                          : isOrdin
                          ? 'bg-sky-50/90 border-sky-200 text-sky-900'
                          : 'bg-indigo-50/90 border-indigo-200 text-indigo-900';

                        let rawItems: any[] = [];
                        if (isLaw) rawItems = lawsCatalog?.national || [];
                        else if (isOrdin) rawItems = lawsCatalog?.ordinance || [];
                        else rawItems = customDocs.length > 0 ? customDocs : SAMPLE_CUSTOM_DOCS;

                        const q = columnSearchQuery.trim().toLowerCase();
                        const items = q
                          ? rawItems.filter(
                              it =>
                                (it.name || it.filename || '').toLowerCase().includes(q) ||
                                (it.content || it.text_preview || '').toLowerCase().includes(q)
                            )
                          : rawItems;

                        return (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[660px]">
                            {/* Column Header */}
                            <div className={`p-4 border-b ${headerTheme}`}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                                  {title}
                                </h4>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 text-slate-700">
                                  {items.length}건
                                </span>
                              </div>
                              <p className="text-[11px] opacity-80 mb-2">{subtitle}</p>

                              {/* If changeable in 2-column or 3-column mode */}
                              {canChange && onChange && (
                                <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-200/80 mt-1">
                                  <span className="text-[11px] font-bold text-slate-600">이 열의 데이터:</span>
                                  <select
                                    value={src}
                                    onChange={(e) => onChange(e.target.value as any)}
                                    className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-300 rounded-lg shadow-xs focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                                  >
                                    <option value="law">⚖️ 대한민국 국가 법령</option>
                                    <option value="ordinance">🏛️ 충남 천안시 자치법규</option>
                                    <option value="custom">🏢 사내 참고자료 & 규정</option>
                                  </select>
                                </div>
                              )}
                            </div>

                            {/* Column Card List */}
                            <div className="p-3 overflow-y-auto space-y-2.5 flex-1 bg-slate-50/50">
                              {items.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 text-xs">
                                  일치하는 항목이 없습니다.
                                </div>
                              ) : (
                                items.map((item, idx) => {
                                  if (isCustom) {
                                    const docName = item.name || item.filename || '사내 규정';
                                    const count = item.chunk_count || 1;
                                    return (
                                      <div
                                        key={item.id || idx}
                                        onClick={() => setSelectedCustomDoc(item)}
                                        className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-400 hover:shadow-sm transition cursor-pointer group"
                                      >
                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                            {catLabels[item.category] || '사내 지침'}
                                          </span>
                                          <span className="text-[10px] font-semibold text-slate-400">{count}개 조항</span>
                                        </div>
                                        <h5 className="font-bold text-slate-800 text-xs group-hover:text-indigo-700 transition line-clamp-2 mb-1.5">
                                          {docName}
                                        </h5>
                                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                                          <span className="text-slate-400 text-[10px]">내용 확인</span>
                                          <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                            내용 열람 ↗
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Law or Ordinance item
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => openLawFullText(item.name)}
                                      className={`p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs transition cursor-pointer group ${
                                        isOrdin ? 'hover:border-sky-400' : 'hover:border-blue-400'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1 mb-1.5">
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isOrdin ? 'bg-sky-100 text-sky-800' : 'bg-blue-100 text-blue-800'
                                          }`}
                                        >
                                          {item.org || (isOrdin ? '충청남도 천안시' : '대한민국 법률')}
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                          {item.count}개 조문
                                        </span>
                                      </div>
                                      <h5
                                        className={`font-bold text-slate-800 text-xs transition line-clamp-2 mb-1.5 ${
                                          isOrdin ? 'group-hover:text-sky-700' : 'group-hover:text-blue-700'
                                        }`}
                                      >
                                        {item.name}
                                      </h5>
                                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                                        <span className="text-slate-400 text-[10px]">제1조부터 전문</span>
                                        <span
                                          className={`font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 ${
                                            isOrdin ? 'text-sky-600' : 'text-blue-600'
                                          }`}
                                        >
                                          전문 열람 ↗
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}

                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('docs')}
                                  className="w-full mt-2 py-2.5 px-3 bg-white border border-dashed border-indigo-300 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <FolderPlusIcon className="w-4 h-4" />
                                  + 내 사내 규정 파일(PDF, HWP) 등록하기
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      };

                      if (layoutMode === '3col') {
                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {renderDataColumn(col1Source, true, setCol1Source)}
                            {renderDataColumn(col2Source, true, setCol2Source)}
                            {renderDataColumn(col3Source, true, setCol3Source)}
                          </div>
                        );
                      }

                      if (layoutMode === '2col') {
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {renderDataColumn(leftSource, true, setLeftSource)}
                            {renderDataColumn(rightSource, true, setRightSource)}
                          </div>
                        );
                      }

                      return (
                        <div className="max-w-4xl mx-auto">
                          {renderDataColumn(singleSource)}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
          </div>
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

            {/* Custom Doc Reader Modal */}
            {selectedCustomDoc && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 animate-scale-in">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                    <div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        {catLabels[selectedCustomDoc.category] || '사내 참고자료'}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-lg mt-1">
                        {selectedCustomDoc.name || selectedCustomDoc.filename}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedCustomDoc(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1">
                    <p className="text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {selectedCustomDoc.content || selectedCustomDoc.text_preview || '본문 내용이 없습니다.'}
                    </p>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center text-xs">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedCustomDoc.content || selectedCustomDoc.text_preview || '');
                        setCopyToast(true);
                        setTimeout(() => setCopyToast(false), 2000);
                      }}
                      className="text-xs text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      내용 복사
                    </button>
                    <button
                      onClick={() => setSelectedCustomDoc(null)}
                      className="px-5 py-2 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                </div>
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


      </div>

      <ChatWidget />
    </main>
  );
}
