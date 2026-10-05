import os
from dotenv import load_dotenv
from vector_store import get_vector_store
from law_fetcher import sync_laws_from_api, get_fallback_documents

load_dotenv()

def seed_database():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        print("[오류] OPENAI_API_KEY가 설정되지 않아 데이터베이스를 시드할 수 없습니다.")
        return

    vector_store = get_vector_store()
    if vector_store is None:
        print("[오류] Vector Store 초기화 실패")
        return

    # 기존 법령 데이터만 초기화 (사용자 커스텀 문서는 보존)
    try:
        existing = vector_store._collection.get(where={"source_type": "law"})
        existing_ids = existing.get("ids", [])
        if existing_ids:
            print(f"[정보] 기존 법령 데이터 {len(existing_ids)}건 삭제 중... (사용자 참고자료는 보존)")
            vector_store._collection.delete(ids=existing_ids)
    except Exception as e:
        print(f"[경고] 기존 데이터 정리 중 오류 (무시): {e}")

    # 국가법령정보센터 API 시도
    print("[진행] 국가법령정보센터 API를 통해 법령 데이터 수집을 시도합니다...")
    result = sync_laws_from_api()
    documents = result.get("documents", [])

    if result["status"] == "no_key":
        print(f"[안내] {result['message']}")
        print(f"[안내] 확장된 샘플 법령 {len(documents)}개로 대체합니다.")
    else:
        print(f"[성공] {result['message']}")

    if not documents:
        print("[경고] 수집된 법령이 없습니다. 기본 샘플을 사용합니다.")
        documents = get_fallback_documents()

    doc_ids = [f"{doc.metadata.get('doc_id', 'law')}_{idx}" for idx, doc in enumerate(documents)]
    vector_store.add_documents(documents, ids=doc_ids)
    print(f"[완료] 법령 {len(documents)}개 조문이 ChromaDB에 저장되었습니다!")

if __name__ == "__main__":
    seed_database()
