import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'AI LawReview - 개인정보처리방침' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-8">개인정보처리방침</h1>
        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-bold text-slate-800">1. 수집하는 개인정보</h2>
            <p>서비스 이용을 위해 다음 정보를 수집합니다:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>필수 항목:</strong> 이메일 주소, 비밀번호(암호화 저장), 이름</li>
              <li><strong>자동 수집:</strong> 서비스 이용 기록, 접속 로그</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>서비스 제공 및 계정 관리</li>
              <li>분석 이력 저장 및 관리</li>
              <li>서비스 개선 및 통계 분석</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">3. 개인정보 보유 기간</h2>
            <p>회원 탈퇴 시 즉시 삭제합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">4. 업로드 문서 처리</h2>
            <p>이용자가 업로드하는 계약서 등의 문서는 <strong>AI 분석 목적으로만 사용</strong>되며, 분석 완료 후 서버에 원본 파일을 저장하지 않습니다. 분석 결과 요약만 이력으로 보관됩니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">5. 개인정보 보호 조치</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>비밀번호는 bcrypt 알고리즘으로 단방향 암호화하여 저장</li>
              <li>JWT 토큰 기반 인증으로 무단 접근 차단</li>
              <li>API Rate Limiting으로 비정상적 접근 제한</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">6. 이용자의 권리</h2>
            <p>이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있으며, 회원 탈퇴를 요청할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">7. 제3자 제공</h2>
            <p>수집된 개인정보는 AI 분석을 위해 OpenAI API로 전송될 수 있습니다. 이 외에 이용자의 동의 없이 제3자에게 제공하지 않습니다.</p>
          </section>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-200">
          <Link href="/" className="text-blue-600 hover:underline text-sm">← 메인으로 돌아가기</Link>
        </div>
      </div>
    </main>
  );
}
