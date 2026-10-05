'use client';
import { XMarkIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

type Props = { onAgree: () => void };

export default function DisclaimerBanner({ onAgree }: Props) {
  return (
    <>
      <div className="modal-backdrop" />
      <div className="modal-content max-w-lg">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
            <ShieldExclamationIcon className="w-12 h-12 mx-auto mb-2" />
            <h2 className="text-xl font-bold">법률 면책 고지</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 space-y-2">
              <p className="font-semibold">⚠️ 본 서비스 이용 전 반드시 확인하세요</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>본 서비스는 AI가 제공하는 <strong>참고용 법률 정보</strong>이며, 공인된 법률 자문이 아닙니다.</li>
                <li>중요한 법률적 판단은 반드시 <strong>전문 변호사</strong>의 검토를 받으시기 바랍니다.</li>
                <li>AI 분석 결과에 의존하여 발생하는 법적 불이익에 대해 책임을 지지 않습니다.</li>
                <li>분석 결과의 정확성을 100% 보장하지 않습니다.</li>
              </ul>
            </div>
            <div className="text-xs text-slate-500 text-center">
              계속하면 <Link href="/terms" className="text-blue-600 hover:underline">이용약관</Link> 및{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">개인정보처리방침</Link>에 동의하는 것으로 간주합니다.
            </div>
            <button onClick={onAgree} className="auth-btn">
              동의하고 서비스 이용하기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
