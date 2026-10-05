import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'AI LawReview - 이용약관' };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-8">이용약관</h1>
        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-bold text-slate-800">제1조 (목적)</h2>
            <p>본 약관은 AI LawReview(이하 &quot;서비스&quot;)가 제공하는 AI 기반 법률 정보 분석 서비스의 이용조건 및 절차, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">제2조 (서비스의 성격)</h2>
            <p>본 서비스는 인공지능(AI)을 활용하여 계약서 등 법률 문서를 분석하고 참고용 정보를 제공하는 서비스입니다. <strong>본 서비스는 법률 사무소나 변호사가 제공하는 법률 자문 서비스가 아니며, 법률 전문가의 조언을 대체할 수 없습니다.</strong></p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">제3조 (면책)</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>본 서비스의 분석 결과는 참고용이며, 법적 효력을 가지지 않습니다.</li>
              <li>AI 분석의 정확성을 100% 보장하지 않으며, 분석 결과에 따른 법적 책임을 지지 않습니다.</li>
              <li>중요한 법률적 의사결정은 반드시 자격을 갖춘 법률 전문가와 상의하시기 바랍니다.</li>
              <li>서비스 이용 중 발생하는 데이터 손실, 서비스 중단 등에 대해 책임을 지지 않습니다.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">제4조 (이용자의 의무)</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>이용자는 서비스를 법률이 허용하는 범위 내에서만 이용하여야 합니다.</li>
              <li>타인의 개인정보를 무단으로 수집하거나 도용하여서는 안 됩니다.</li>
              <li>서비스의 안정적 운영을 방해하는 행위를 하여서는 안 됩니다.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">제5조 (지적재산권)</h2>
            <p>서비스에 포함된 AI 모델, 소프트웨어, 디자인 등의 지적재산권은 서비스 제공자에게 귀속됩니다. 이용자가 업로드한 문서에 대한 권리는 이용자에게 있습니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-800">제6조 (서비스 변경 및 중단)</h2>
            <p>서비스 제공자는 운영상, 기술상의 필요에 의해 서비스를 변경하거나 중단할 수 있으며, 사전에 공지합니다.</p>
          </section>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-200">
          <Link href="/" className="text-blue-600 hover:underline text-sm">← 메인으로 돌아가기</Link>
        </div>
      </div>
    </main>
  );
}
