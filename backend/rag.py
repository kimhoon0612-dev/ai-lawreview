import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from pydantic import BaseModel, Field
from typing import List, Literal

from vector_store import get_vector_store

# 환경변수 로드
load_dotenv()

class ClauseAnalysis(BaseModel):
    clause_name: str = Field(description="조항의 이름 (예: 제 5조 (계약의 해지))")
    risk_level: Literal["high", "warning", "info"] = Field(description="위험도 (고위험: high, 주의: warning, 정보: info)")
    original_text: str = Field(description="계약서 원문 조항 내용")
    ai_review: str = Field(description="AI의 법률 리뷰 결과 및 근거 법령")
    legal_basis: str = Field(default="", description="인용된 법령명과 조항 (예: 근로기준법 제20조). 검색된 법령에 없으면 '일반 법리에 기반한 의견'으로 표기")
    confidence: Literal["high", "medium", "low"] = Field(default="medium", description="분석 신뢰도. 검색된 법령에 직접 근거가 있으면 high, 유사 법리 적용이면 medium, 일반론이면 low")

class ContractReview(BaseModel):
    clauses: List[ClauseAnalysis] = Field(description="분석된 조항 목록")
    general_advice: str = Field(description="계약서 전반에 대한 일반적인 조언")

# 면책 문구 상수
DISCLAIMER = "\n\n---\n⚠️ 본 분석은 AI가 제공하는 참고용 법률 정보이며, 공인된 법률 자문이 아닙니다. 중요한 법률적 판단은 반드시 전문 변호사의 검토를 받으시기 바랍니다."

# 시스템 프롬프트: 변호사 페르소나 및 대한민국 법령 기반 검토 지시
SYSTEM_PROMPT = """당신은 대한민국 기업 법무 분야의 법률 정보 분석 AI입니다.
사용자가 제공하는 계약서 내용을 분석하여, 대한민국의 법령(근로기준법, 하도급법, 약관규제법, 민법 등)에 위배되거나 사용자에게 불리한 '독소조항'이 있는지 검토하십시오.

아래는 Vector DB에서 검색된 참고 자료입니다. 분석 시 반드시 이 자료를 최우선으로 참고하여 법적 근거를 제시하십시오.

{retrieved_context}

## 중요 규칙
1. **법적 근거 인용 시, 위에서 제공된 참고 자료에 포함된 법령만 정확히 인용하십시오.**
2. 참고 자료에 없는 법령을 인용해야 할 경우, legal_basis에 "일반 법리에 기반한 의견"이라고 명시하고 confidence를 "low"로 설정하십시오.
3. 확실하지 않은 내용은 단정적으로 말하지 말고 "~할 수 있습니다", "~의 소지가 있습니다"로 표현하십시오.
4. 본 분석은 참고용 법률 정보이며 공인된 법률 자문이 아님을 인지하십시오.

위법 소지가 높으면 "high"(고위험 조항), 불리하게 작용할 수 있으면 "warning"(주의 조항), 일반적인 내용은 "info"로 분류하십시오.
제공된 JSON 스키마에 맞춰 정확한 분석 결과를 반환해야 합니다.
"""

def _format_retrieved_docs(docs) -> str:
    """검색된 문서들을 출처 유형별로 포맷팅합니다."""
    if not docs:
        return "관련 참고 자료를 찾을 수 없습니다. 일반적인 법리를 적용하세요."
    
    law_docs = []
    custom_docs = []
    
    for doc in docs:
        source_type = doc.metadata.get("source_type", "law")
        source_name = doc.metadata.get("source", "출처 미상")
        
        if source_type == "custom":
            category = doc.metadata.get("category", "other")
            category_labels = {
                "company_rule": "회사 규정",
                "public_rule": "공공기관 규정",
                "internal_guideline": "내부 지침",
                "other": "기타 자료"
            }
            category_label = category_labels.get(category, "기타 자료")
            custom_docs.append(f"[{category_label}: {source_name}]\n{doc.page_content}")
        else:
            article = doc.metadata.get("article", "")
            label = f"{source_name} {article}" if article else source_name
            law_docs.append(f"[법령: {label}]\n{doc.page_content}")
    
    sections = []
    if law_docs:
        sections.append("=== 관련 법령 ===\n" + "\n\n".join(law_docs))
    if custom_docs:
        sections.append("=== 사용자 참고자료 (회사 규정/내부 지침 등) ===\n" + "\n\n".join(custom_docs))
    
    return "\n\n".join(sections) if sections else "관련 참고 자료를 찾을 수 없습니다. 일반적인 법리를 적용하세요."


def analyze_contract_text(text: str, target_sources: Optional[List[str]] = None) -> dict:
    """추출된 계약서 텍스트를 사용자가 선택한 법령/조례/사내자료 기준에 따라 분석합니다.
    target_sources: ['law', 'ordinance', 'custom']
    """
    if target_sources is None:
        target_sources = ["law", "ordinance", "custom"]

    source_names_map = {
        "law": "대한민국 국가법령",
        "ordinance": "천안시 자치법규·조례",
        "custom": "사내 규정 및 참고자료"
    }
    selected_names = [source_names_map.get(s, s) for s in target_sources]
    criteria_str = ", ".join(selected_names) if selected_names else "대한민국 법령 일반"

    api_key = os.getenv("OPENAI_API_KEY")
    
    # API 키가 설정되지 않은 경우 (모의 분석 반환)
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        clauses = []
        if "law" in target_sources:
            clauses.append({
                "clause_name": "제 5조 (계약의 해지 및 위약벌)",
                "risk_level": "high",
                "original_text": "\"을\"의 귀책사유로 계약이 해지될 경우, \"을\"은 \"갑\"에게 총 계약금액의 30%를 위약벌로 즉시 배상한다.",
                "ai_review": "해당 조항은 [하도급거래 공정화에 관한 법률] 제11조 및 [약관의 규제에 관한 법률] 제8조에 위배될 소지가 높습니다. 부당하게 과중한 손해배상 의무(30%)를 부담시키는 조항으로 무효화될 수 있으므로, 실제 발생한 실손해액을 기준으로 배상하도록 수정을 권장합니다.",
                "legal_basis": "하도급거래 공정화에 관한 법률 제11조, 약관규제법 제8조",
                "confidence": "high"
            })
            clauses.append({
                "clause_name": "제 9조 (관할 법원의 지정)",
                "risk_level": "warning",
                "original_text": "본 계약과 관련하여 분쟁이 발생할 경우, \"갑\"의 본점 소재지를 관할하는 법원을 전속관할로 한다.",
                "ai_review": "약관의 규제에 관한 법률 제14조에 따라 일방 당사자에게 불리한 전속관할 합의는 무효로 판단될 수 있습니다. '민사소송법에 따른 관할법원'으로 완화할 것을 권고합니다.",
                "legal_basis": "약관의 규제에 관한 법률 제14조",
                "confidence": "high"
            })
        if "ordinance" in target_sources:
            clauses.append({
                "clause_name": "제 7조 (하도급 대금 지급 및 지역업체 우선)",
                "risk_level": "warning",
                "original_text": "\"갑\"은 기성금 수령 후 30일 이내에 \"을\"에게 지급하며, 천안시 관내 자재 우선 사용 의무는 배제한다.",
                "ai_review": "[천안시 발주계약의 하도급업체 보호 조례] 및 [천안시 대형유통기업 지역기여 권고 조례] 권고 기준에 따르면 기성금은 15일 이내 지급 및 지역 업체·장비 우선 사용을 권장하고 있습니다. 천안시 발주 및 인허가 연계 사업일 경우 조례 저촉 리스크가 있습니다.",
                "legal_basis": "천안시 발주계약의 하도급업체 보호 조례 제6조",
                "confidence": "medium"
            })
        if "custom" in target_sources:
            clauses.append({
                "clause_name": "제 12조 (비밀유지 및 위약금)",
                "risk_level": "info",
                "original_text": "계약 종료 후 3년간 모든 영업정보를 비밀로 유지한다.",
                "ai_review": "[사내 표준 용역외주 관리지침 제10조] 기준(2년 비밀유지 및 실손해액 배상)과 비교 시 기간이 1년 길게 설정되어 있습니다. 업무 성격에 따라 2년으로 단축 조정을 검토하시기 바랍니다.",
                "legal_basis": "사내 표준 용역외주 관리지침 제10조",
                "confidence": "medium"
            })

        return {
            "status": "success",
            "mock": True,
            "message": f"선택된 검토 기준({criteria_str})을 바탕으로 분석된 결과입니다.",
            "analysis": {
                "clauses": clauses,
                "general_advice": f"선택하신 검토 기준 [{criteria_str}]을 중심으로 계약서를 정밀 교차 검토하였습니다. 주요 독소조항 및 권고사항을 확인하시기 바랍니다."
            },
            "extracted_text_preview": text[:200] + "..." if len(text) > 200 else text
        }

    try:
        from vector_store import search_documents
        # LLM 초기화 (GPT-4o 또는 gpt-3.5-turbo 사용)
        llm = ChatOpenAI(model="gpt-4o", temperature=0.1, api_key=api_key)
        structured_llm = llm.with_structured_output(ContractReview)
        
        # 사용자가 선택한 target_sources 기반으로 RAG 검색 수행
        retrieved_context = "관련 참고 자료를 찾을 수 없습니다. 일반적인 법리를 적용하세요."
        try:
            searched_docs = search_documents(query=text[:300], limit=8, target_sources=target_sources)
            if searched_docs:
                formatted_lines = []
                for d in searched_docs:
                    stype = d.get("source_type", "law")
                    sname = d.get("source_name", "출처")
                    art = d.get("article", "")
                    content = d.get("content", "")
                    lbl = f"{sname} {art}".strip()
                    if stype == "ordinance":
                        formatted_lines.append(f"[천안시 조례: {lbl}]\n{content}")
                    elif stype == "custom":
                        formatted_lines.append(f"[사내 참고자료: {lbl}]\n{content}")
                    else:
                        formatted_lines.append(f"[국가법령: {lbl}]\n{content}")
                retrieved_context = "\n\n".join(formatted_lines)
        except Exception as e:
            print(f"RAG retrieval failed: {e}")
        
        custom_system_prompt = f"""{SYSTEM_PROMPT}

## 사용자 지정 검토 기준
본 검토는 다음 선택된 법률 소스를 기준으로 중점 분석해야 합니다:
{criteria_str}
"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", custom_system_prompt),
            ("human", "다음 계약서 내용을 검토해 주세요:\n\n{contract_text}")
        ])
        
        chain = prompt | structured_llm
        
        response = chain.invoke({
            "retrieved_context": retrieved_context,
            "contract_text": text
        })
        
        return {
            "status": "success",
            "mock": False,
            "analysis": response.model_dump(),
            "extracted_text_preview": text[:200] + "..." if len(text) > 200 else text
        }
        
    except Exception as e:
        print(f"Error during AI analysis: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

# 시스템 프롬프트: 법률 상담 페르소나
CHAT_SYSTEM_PROMPT = """당신은 대한민국 기업 법무 및 일반 법률 상담을 전문으로 하는 AI 변호사입니다.
사용자의 질문에 대해 아래 제공된 참고 자료를 바탕으로 친절하고 명확하게 답변해 주세요.

{retrieved_context}

법적 근거(법령 명칭과 조항)가 있다면 반드시 포함하여 설명하고, 사용자가 등록한 참고자료(회사 규정, 내부 지침 등)가 검색되었다면 해당 내용도 함께 안내하십시오.
정보가 부족하다면 일반적인 법리를 바탕으로 조언하되 확정적인 법적 판단은 피하십시오. 답변은 Markdown 형식으로 가독성 좋게 작성하십시오.
"""

def chat_with_law_db(message: str, history: List[dict] = None) -> dict:
    """사용자의 질문을 바탕으로 법령 DB를 검색하고 대화형 답변을 반환합니다."""
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        return {
            "status": "success",
            "reply": "API 키가 설정되지 않았습니다. 테스트 모드에서는 상세한 법률 상담이 제한될 수 있습니다."
        }

    try:
        llm = ChatOpenAI(model="gpt-4o", temperature=0.3, api_key=api_key)
        
        # RAG 검색 로직 (법령 + 사용자 참고자료 통합 검색)
        retrieved_context = "관련 참고 자료를 찾을 수 없습니다."
        try:
            vector_store = get_vector_store()
            if vector_store:
                retriever = vector_store.as_retriever(search_kwargs={"k": 5})
                docs = retriever.invoke(message)
                if docs:
                    retrieved_context = _format_retrieved_docs(docs)
        except Exception as e:
            print(f"Vector DB retrieval failed for chat: {e}")
        
        system_content = CHAT_SYSTEM_PROMPT.format(retrieved_context=retrieved_context)
        messages = [SystemMessage(content=system_content)]
        
        if history:
            for h in history:
                if h.get("role") == "user":
                    messages.append(HumanMessage(content=h.get("content", "")))
                elif h.get("role") == "assistant":
                    messages.append(AIMessage(content=h.get("content", "")))
                    
        messages.append(HumanMessage(content=message))
        
        response = llm.invoke(messages)
        
        return {
            "status": "success",
            "reply": response.content
        }
        
    except Exception as e:
        print(f"Error during AI chat: {e}")
        return {
            "status": "error",
            "reply": f"상담 처리 중 오류가 발생했습니다: {str(e)}"
        }


# ============================================================
# 문서 구조화 요약 모델 및 파이프라인
# ============================================================

class TermItem(BaseModel):
    term: str = Field(description="조항 또는 항목명 (예: 대금 지급 조건, 계약 기간 등)")
    description: str = Field(description="내용 요약")

class PartyDuty(BaseModel):
    party: str = Field(description="당사자 (예: 갑, 을, 프리랜서 등)")
    duties_and_rights: str = Field(description="주요 권리 및 의무 사항")

class DocumentSummary(BaseModel):
    title: str = Field(description="문서명 또는 계약명 추정")
    doc_type: str = Field(description="문서 유형 (예: 근로계약서, 용역계약서, 비밀유지서약서, 사내규정, 합의서 등)")
    executive_summary: str = Field(description="전체 문서의 핵심 내용을 2~3문장으로 명확히 요약")
    parties: List[str] = Field(default_factory=list, description="계약/문서 당사자 목록")
    key_terms: List[TermItem] = Field(default_factory=list, description="주요 조항 및 핵심 내용 요약")
    rights_and_obligations: List[PartyDuty] = Field(default_factory=list, description="당사자별 권리 및 의무 관계")
    dates_and_money: List[str] = Field(default_factory=list, description="주요 일정, 계약 기간, 대금 및 정산 금액 조건")
    key_cautions: List[str] = Field(default_factory=list, description="서명/체결 전 반드시 확인해야 할 유의사항 및 리스크")


def summarize_document_text(text: str) -> dict:
    """문서 원문(텍스트)을 분석하여 핵심 요약, 당사자, 권리의무, 일정/금액, 유의사항을 추출합니다."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        return {
            "status": "success",
            "mock": True,
            "summary": {
                "title": "샘플 계약서 (테스트 모드)",
                "doc_type": "표준 용역계약서",
                "executive_summary": "본 계약은 소프트웨어 개발 용역에 관한 표준 계약으로, 개발 범위와 검수 및 대금 지급 조건을 규정하고 있습니다.",
                "parties": ["갑: (주)테스트소프트", "을: 홍길동"],
                "key_terms": [
                    {"term": "용역 범위", "description": "웹 애플리케이션 개발"},
                    {"term": "계약 기간", "description": "체결일로부터 3개월"}
                ],
                "rights_and_obligations": [
                    {"party": "갑", "duties_and_rights": "검수 완료 후 14일 이내 대금 지급 의무"},
                    {"party": "을", "duties_and_rights": "기한 내 산출물 납품 의무"}
                ],
                "dates_and_money": ["계약금: 30%, 잔금: 70%", "검수 기한: 납품 후 7일 이내"],
                "key_cautions": ["지체상금 및 비밀유지 의무 조항을 면밀히 검토하십시오."]
            },
            "raw_text_preview": text[:300] + "..." if len(text) > 300 else text,
            "char_count": len(text),
        }

    try:
        llm = ChatOpenAI(model="gpt-4o", temperature=0.1, api_key=api_key)
        structured_llm = llm.with_structured_output(DocumentSummary)

        prompt = ChatPromptTemplate.from_messages([
            ("system", "당신은 대한민국 최고 수준의 기업 법무 및 계약서 분석 전문가입니다.\n"
                       "제공된 계약서 또는 비즈니스 문서를 면밀히 분석하여, 경영진과 실무자가 한눈에 파악할 수 있도록 핵심 내용을 일목요연하게 구조화 요약하십시오.\n"
                       "모든 항목을 누락하지 말고 전문적이고 명확한 한국어로 작성하십시오."),
            ("human", "다음 문서를 요약해 주세요:\n\n{document_text}")
        ])

        chain = prompt | structured_llm
        truncated_text = text[:100000]
        response = chain.invoke({"document_text": truncated_text})

        return {
            "status": "success",
            "mock": False,
            "summary": response.model_dump(),
            "raw_text_preview": text[:300] + "..." if len(text) > 300 else text,
            "char_count": len(text),
        }
    except Exception as e:
        print(f"Error during document summarization: {e}")
        return {
            "status": "error",
            "message": f"문서 요약 중 오류 발생: {str(e)}"
        }

