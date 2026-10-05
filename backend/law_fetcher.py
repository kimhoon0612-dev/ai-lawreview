"""
국가법령정보센터 Open API 연동 모듈
- API 키가 있으면: 실제 API를 통해 법령 데이터 수집
- API 키가 없으면: 확장된 샘플 데이터로 fallback
"""
import os
import requests
import xml.etree.ElementTree as ET
from typing import List, Optional
from dotenv import load_dotenv
from langchain_core.documents import Document

load_dotenv()

BASE_URL = "http://www.law.go.kr/DRF"

# 기본 수집 대상 법령 키워드
DEFAULT_LAW_KEYWORDS = [
    "근로기준법", "민법", "상법", "약관의 규제에 관한 법률",
    "하도급거래 공정화에 관한 법률", "전자상거래 등에서의 소비자보호에 관한 법률",
    "개인정보 보호법", "공정거래법", "주택임대차보호법", "상가건물 임대차보호법",
]


def get_law_api_key() -> Optional[str]:
    """환경변수에서 법령 API 키를 가져옵니다."""
    key = os.getenv("LAW_API_KEY", "")
    if not key or key == "YOUR_LAW_API_KEY_HERE":
        return None
    return key


def search_laws(keyword: str, api_key: str) -> List[dict]:
    """키워드로 법령 목록을 검색합니다."""
    try:
        url = f"{BASE_URL}/lawSearch.do"
        params = {"OC": api_key, "target": "law", "type": "JSON", "query": keyword, "display": 5}
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if "LawSearch" not in data or "law" not in data["LawSearch"]:
            return []

        laws = data["LawSearch"]["law"]
        if isinstance(laws, dict):
            laws = [laws]
        return [{"name": law.get("법령명한글", ""), "mst": law.get("법령일련번호", ""), "id": law.get("법령ID", "")} for law in laws if law.get("법령일련번호")]
    except Exception as e:
        print(f"[법령검색 오류] {keyword}: {e}")
        return []


def fetch_law_articles(law_mst: str, api_key: str) -> List[dict]:
    """특정 법령의 조문들을 가져옵니다."""
    try:
        url = f"{BASE_URL}/lawService.do"
        params = {"OC": api_key, "target": "law", "MST": law_mst, "type": "XML"}
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()

        root = ET.fromstring(resp.content)
        law_name = ""
        name_el = root.find(".//법령명_한글")
        if name_el is not None and name_el.text:
            law_name = name_el.text

        articles = []
        for jo in root.findall(".//조문단위"):
            article_no = ""
            content_parts = []
            no_el = jo.find("조문번호")
            if no_el is not None and no_el.text:
                article_no = f"제{no_el.text}조"
            title_el = jo.find("조문제목")
            if title_el is not None and title_el.text:
                article_no += f"({title_el.text})"
            content_el = jo.find("조문내용")
            if content_el is not None and content_el.text:
                content_parts.append(content_el.text.strip())
            for hang in jo.findall(".//항"):
                hang_content = hang.find("항내용")
                if hang_content is not None and hang_content.text:
                    content_parts.append(hang_content.text.strip())

            full_text = " ".join(content_parts).strip()
            if full_text and len(full_text) > 10:
                articles.append({"law_name": law_name, "article": article_no, "content": full_text})
        return articles
    except Exception as e:
        print(f"[법령본문 오류] MST={law_mst}: {e}")
        return []


def sync_laws_from_api(keywords: List[str] = None) -> dict:
    """API를 통해 법령을 수집하고 Document 리스트로 반환합니다."""
    api_key = get_law_api_key()
    if not api_key:
        return {"status": "no_key", "message": "LAW_API_KEY가 설정되지 않았습니다.", "documents": get_fallback_documents()}

    if keywords is None:
        keywords = DEFAULT_LAW_KEYWORDS

    all_documents = []
    stats = {"keywords_searched": 0, "laws_found": 0, "articles_indexed": 0}

    for keyword in keywords:
        stats["keywords_searched"] += 1
        laws = search_laws(keyword, api_key)
        for law in laws[:2]:  # 키워드당 최대 2개 법령
            stats["laws_found"] += 1
            articles = fetch_law_articles(law["mst"], api_key)
            for idx, art in enumerate(articles):
                doc = Document(
                    page_content=f"{art['law_name']} {art['article']}: {art['content']}",
                    metadata={
                        "source": art["law_name"], "article": art["article"],
                        "doc_id": f"law_{law['mst']}_{art['article']}_{idx}",
                        "source_type": "law", "law_mst": law["mst"],
                    }
                )
                all_documents.append(doc)
                stats["articles_indexed"] += 1

    return {"status": "success", "message": f"{stats['laws_found']}개 법령에서 {stats['articles_indexed']}개 조문 수집", "documents": all_documents, "stats": stats}


def get_fallback_documents() -> List[Document]:
    """API 키 없을 때 사용할 확장된 샘플 법령 데이터"""
    samples = [
        ("하도급거래 공정화에 관한 법률", "제11조(감액금지)", "원사업자는 수급사업자에게 제조등의 위탁을 할 때 정한 하도급대금을 정당한 사유 없이 감액하여서는 아니 된다. 부당한 손해배상액의 예정(위약벌 포함)은 감액에 해당할 수 있다."),
        ("약관의 규제에 관한 법률", "제14조(소송 제기의 금지 등)", "고객에게 부당하게 불리한 소송 제기 금지 조항이나 상당한 이유 없이 고객에게 입증책임을 부담시키는 약관 조항은 무효로 한다."),
        ("근로기준법", "제20조(위약 예정의 금지)", "사용자는 근로계약 불이행에 대한 위약금 또는 손해배상액을 예정하는 계약을 체결하지 못한다."),
        ("근로기준법", "제17조(근로조건의 명시)", "사용자는 근로계약을 체결할 때에 근로자에게 임금, 소정근로시간, 휴일, 연차 유급휴가 등의 근로조건을 명시하여야 한다."),
        ("근로기준법", "제36조(금품 청산)", "사용자는 근로자가 사망 또는 퇴직한 경우에는 그 지급 사유가 발생한 때부터 14일 이내에 임금, 보상금, 그 밖에 일체의 금품을 지급하여야 한다."),
        ("민법", "제103조(반사회질서의 법률행위)", "선량한 풍속 기타 사회질서에 위반한 사항을 내용으로 하는 법률행위는 무효로 한다."),
        ("민법", "제104조(불공정한 법률행위)", "당사자의 궁박, 경솔 또는 무경험으로 인하여 현저하게 공정을 잃은 법률행위는 무효로 한다."),
        ("민법", "제398조(배상액의 예정)", "당사자는 채무불이행에 관한 손해배상액을 예정할 수 있다. 손해배상의 예정액이 부당히 과다한 경우에는 법원은 적당히 감액할 수 있다."),
        ("민법", "제543조(해지, 해제권)", "계약 또는 법률의 규정에 의하여 당사자의 일방이나 쌍방이 해지 또는 해제의 권리가 있는 때에는 그 해지 또는 해제는 상대방에 대한 의사표시로 한다."),
        ("민법", "제674조(도급인의 해제권)", "완성된 목적물의 하자로 인하여 계약의 목적을 달성할 수 없는 때에는 도급인은 계약을 해제할 수 있다."),
        ("상법", "제398조(이사 등과 회사 간의 거래)", "이사, 주요주주 등은 이사회의 승인이 있는 경우에만 회사와 거래를 할 수 있다. 이 경우 거래의 내용과 절차는 공정하여야 한다."),
        ("전자상거래 등에서의 소비자보호에 관한 법률", "제17조(청약철회등)", "소비자는 계약내용에 관한 서면을 받은 날부터 7일 이내에 청약철회등을 할 수 있다."),
        ("전자상거래 등에서의 소비자보호에 관한 법률", "제21조(금지행위)", "전자상거래를 하는 사업자 또는 통신판매업자는 소비자에게 거짓 또는 과장된 사실을 알리거나 기만적 방법을 사용하여 소비자를 유인 또는 거래하여서는 아니 된다."),
        ("개인정보 보호법", "제26조(업무위탁에 따른 개인정보의 처리 제한)", "개인정보처리자가 제3자에게 개인정보의 처리 업무를 위탁하는 경우에는 문서에 의하여야 하며, 수탁자가 개인정보를 안전하게 처리하는지를 감독하여야 한다."),
        ("개인정보 보호법", "제39조(손해배상책임)", "정보주체는 개인정보처리자가 이 법을 위반한 행위로 손해를 입으면 개인정보처리자에게 손해배상을 청구할 수 있다."),
        ("주택임대차보호법", "제3조(대항력 등)", "임대차는 그 등기가 없는 경우에도 임차인이 주택의 인도와 주민등록을 마친 때에는 그 다음 날부터 제삼자에 대하여 효력이 생긴다."),
        ("주택임대차보호법", "제6조의3(월차임 전환 시 산정률의 제한)", "보증금의 전부 또는 일부를 월 단위의 차임으로 전환하는 경우에는 그 전환되는 금액에 은행법에 따른 은행의 대출금리와 해당 지역의 경제 여건 등을 고려하여 대통령령으로 정하는 비율을 곱한 월차임의 범위를 초과할 수 없다."),
        ("상가건물 임대차보호법", "제10조(계약갱신 요구 등)", "임대인은 임차인이 임대차기간이 만료되기 6개월 전부터 1개월 전까지 사이에 계약갱신을 요구할 경우 정당한 사유 없이 거절하지 못한다."),
        ("독점규제 및 공정거래에 관한 법률", "제45조(불공정거래행위의 금지)", "사업자는 공정한 거래를 저해할 우려가 있는 행위를 하여서는 아니 된다. 거래상 지위를 부당하게 이용하여 상대방에게 불이익을 주는 행위를 포함한다."),
        ("약관의 규제에 관한 법률", "제6조(일반원칙)", "신의성실의 원칙에 반하여 공정을 잃은 약관 조항은 무효이다. 고객에게 부당하게 불리한 조항, 고객이 계약의 거래형태 등 관련된 모든 사정에 비추어 예상하기 어려운 조항은 무효이다."),
    ]
    docs = []
    for source, article, content in samples:
        doc_id = f"sample_{source}_{article}".replace(" ", "_").replace("(", "").replace(")", "")
        docs.append(Document(
            page_content=f"{source} {article}: {content}",
            metadata={"source": source, "article": article, "doc_id": doc_id, "source_type": "law"}
        ))
    return docs


# =========================================================================
# 지자체 자치법규(조례, 규칙) 및 지방의회 연동 모듈 (충청남도 천안시 & 천안시의회 특화)
# =========================================================================

DEFAULT_ORDINANCE_KEYWORDS = [
    "천안시 기업", "천안시 소상공인", "천안시의회", "천안시 하도급",
    "천안시 투자유치", "천안시 건설", "천안시 폐기물", "천안시 청년"
]


def search_ordinances(query: str, api_key: str, display: int = 15) -> List[dict]:
    """자치법규(조례, 규칙 등) 목록을 검색합니다."""
    try:
        url = f"{BASE_URL}/lawSearch.do"
        params = {"OC": api_key, "target": "ordin", "type": "JSON", "query": query, "display": display}
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if "OrdinSearch" not in data or "law" not in data["OrdinSearch"]:
            return []

        laws = data["OrdinSearch"]["law"]
        if isinstance(laws, dict):
            laws = [laws]
        return [
            {
                "name": law.get("자치법규명", ""),
                "mst": law.get("자치법규일련번호", ""),
                "org": law.get("지자체기관명", "") or law.get("지자체명", "충청남도 천안시"),
                "id": law.get("자치법규ID", ""),
                "date": law.get("시행일자", "") or law.get("공포일자", ""),
                "type": law.get("자치법규종류", "조례"),
            }
            for law in laws if law.get("자치법규일련번호")
        ]
    except Exception as e:
        print(f"[자치법규검색 오류] {query}: {e}")
        return []


def fetch_ordinance_articles(mst: str, api_key: str) -> List[dict]:
    """특정 자치법규의 조문들을 가져옵니다."""
    try:
        url = f"{BASE_URL}/lawService.do"
        params = {"OC": api_key, "target": "ordin", "MST": mst, "type": "XML"}
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()

        root = ET.fromstring(resp.content)
        name = root.findtext(".//자치법규명") or ""
        org = root.findtext(".//지자체기관명") or root.findtext(".//지자체명") or "충청남도 천안시"

        articles = []
        for jo in root.findall(".//조"):
            art_no = jo.findtext("조문번호") or ""
            clean_no = art_no.lstrip("0")
            if clean_no.endswith("00"):
                clean_no = clean_no[:-2]
            title = jo.findtext("조제목") or ""
            content = jo.findtext("조내용") or ""
            
            art_label = f"제{clean_no}조" if clean_no else "조문"
            if title:
                art_label += f"({title})"

            full_text = content.strip()
            if full_text and len(full_text) > 5:
                articles.append({
                    "law_name": name,
                    "org": org,
                    "article": art_label,
                    "content": full_text
                })
        return articles
    except Exception as e:
        print(f"[자치법규조문 오류] MST={mst}: {e}")
        return []


def sync_ordinances_from_api(keywords: List[str] = None, max_per_keyword: int = 3) -> dict:
    """천안시 및 의회 자치법규를 국가법령정보 API로부터 수집합니다."""
    api_key = get_law_api_key()
    if not api_key:
        fallback = get_fallback_ordinances()
        return {
            "status": "no_key",
            "message": "LAW_API_KEY가 없습니다. 샘플 데이터를 사용합니다.",
            "documents": fallback,
            "stats": {"ordinances_found": 0, "articles_indexed": len(fallback)}
        }

    if keywords is None:
        keywords = DEFAULT_ORDINANCE_KEYWORDS

    all_documents = []
    seen_msts = set()
    stats = {"keywords_searched": 0, "ordinances_found": 0, "articles_indexed": 0}

    for keyword in keywords:
        stats["keywords_searched"] += 1
        ordinances = search_ordinances(keyword, api_key, display=max_per_keyword)
        for ord_item in ordinances:
            mst = ord_item["mst"]
            if mst in seen_msts:
                continue
            seen_msts.add(mst)
            stats["ordinances_found"] += 1
            articles = fetch_ordinance_articles(mst, api_key)
            for idx, art in enumerate(articles):
                doc = Document(
                    page_content=f"[{art['org']}] {art['law_name']} {art['article']}: {art['content']}",
                    metadata={
                        "source": art["law_name"],
                        "org": art["org"],
                        "article": art["article"],
                        "doc_id": f"ordin_{mst}_{idx}",
                        "source_type": "ordinance",
                        "ordin_mst": mst,
                        "local_gov": art["org"]
                    }
                )
                all_documents.append(doc)
                stats["articles_indexed"] += 1

    return {
        "status": "success",
        "message": f"{stats['ordinances_found']}개 자치법규에서 {stats['articles_indexed']}개 조문 수집 완료",
        "documents": all_documents,
        "stats": stats
    }


def get_fallback_ordinances() -> List[Document]:
    """API 키가 없거나 실패 시 사용할 천안시 및 의회 핵심 자치법규 샘플"""
    samples = [
        ("천안시 기업인 예우 및 기업활동 지원에 관한 조례", "충청남도 천안시", "제1조(목적)", "이 조례는 천안시 관내 우수 기업인과 근로자를 우대하고 기업활동을 촉진하여 지역경제 활성화와 일자리 창출에 이바지함을 목적으로 한다."),
        ("천안시 기업인 예우 및 기업활동 지원에 관한 조례", "충청남도 천안시", "제6조(예우 및 지원)", "시장은 우수기업인으로 선정된 자에 대하여 천안시 중소기업 육성자금 우선 지원, 해외시장 개척단 파견 시 우선 참여 등의 예우를 할 수 있다."),
        ("천안시 소상공인 지원 조례", "충청남도 천안시", "제5조(창업 및 경영안정 지원)", "시장은 소상공인의 창업을 촉진하고 경영안정을 도모하기 위하여 특례보증 지원 및 이차보전 지원 사업을 추진할 수 있다."),
        ("천안시의회 회의 규칙", "천안시의회", "제1조(목적)", "이 규칙은 천안시의회의 회의진행과 내부규율 등에 관하여 필요한 사항을 정함으로써 의회의 민주적이고 능률적인 운영에 기여함을 목적으로 한다."),
        ("천안시의회 회의 규칙", "천안시의회", "제19조(의안의 제출)", "의회에서 의결할 의안은 의장이 발의하거나 시장 또는 재적의원 5분의 1 이상의 연서로 제출한다."),
        ("천안시 지역건설산업 활성화 촉진에 관한 조례", "충청남도 천안시", "제6조(지역업체 참여)", "시장은 관내 건설공사 발주 시 법령이 허용하는 범위에서 지역건설업체의 참여 및 지역생산 자재 구매를 적극 권장할 수 있다.")
    ]
    docs = []
    for idx, (name, org, art, content) in enumerate(samples):
        docs.append(Document(
            page_content=f"[{org}] {name} {art}: {content}",
            metadata={
                "source": name,
                "org": org,
                "article": art,
                "doc_id": f"sample_ordin_{idx}",
                "source_type": "ordinance",
                "local_gov": org
            }
        ))
    return docs

