import os
import uuid
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from typing import List, Optional
from datetime import datetime

# Chroma DB 저장 경로
DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")

_cached_store = None


def get_vector_store():
    """ChromaDB 인스턴스를 반환합니다. (싱글톤 캐싱 적용)"""
    global _cached_store
    if _cached_store is not None:
        return _cached_store

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        print("Warning: OPENAI_API_KEY가 없어 Vector Store를 초기화할 수 없습니다.")
        return None

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=api_key)

    vector_store = Chroma(
        collection_name="korean_laws",
        embedding_function=embeddings,
        persist_directory=DB_DIR
    )

    _cached_store = vector_store
    return vector_store


def split_text_into_chunks(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    """긴 텍스트를 청크 단위로 분할합니다."""
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            for sep in ['\n\n', '\n', '. ', '。', ', ']:
                last_sep = text[start:end].rfind(sep)
                if last_sep > chunk_size // 2:
                    end = start + last_sep + len(sep)
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap

    return chunks


def add_custom_documents(text: str, doc_name: str, category: str) -> dict:
    """사용자 정의 참고자료를 ChromaDB에 추가합니다."""
    vector_store = get_vector_store()
    if vector_store is None:
        return {"status": "error", "message": "Vector Store 초기화 실패"}

    doc_id = f"custom_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now().isoformat()

    chunks = split_text_into_chunks(text)

    documents = []
    chunk_ids = []
    for idx, chunk in enumerate(chunks):
        documents.append(Document(
            page_content=chunk,
            metadata={
                "source": doc_name,
                "source_type": "custom",
                "category": category,
                "doc_id": doc_id,
                "chunk_index": idx,
                "total_chunks": len(chunks),
                "created_at": created_at,
            }
        ))
        chunk_ids.append(f"{doc_id}_chunk_{idx}")

    vector_store.add_documents(documents, ids=chunk_ids)

    return {
        "status": "success",
        "doc_id": doc_id,
        "doc_name": doc_name,
        "category": category,
        "chunks_count": len(chunks),
        "created_at": created_at,
    }


def list_custom_documents() -> List[dict]:
    """저장된 사용자 정의 참고자료 목록을 반환합니다."""
    vector_store = get_vector_store()
    if vector_store is None:
        return []

    try:
        results = vector_store._collection.get(
            where={"source_type": "custom"}
        )

        if not results or not results.get("ids"):
            return []

        docs_map = {}
        metadatas = results.get("metadatas", [])

        for meta in metadatas:
            doc_id = meta.get("doc_id", "unknown")
            if doc_id not in docs_map:
                docs_map[doc_id] = {
                    "doc_id": doc_id,
                    "doc_name": meta.get("source", "이름 없음"),
                    "category": meta.get("category", "other"),
                    "chunks_count": meta.get("total_chunks", 1),
                    "created_at": meta.get("created_at", ""),
                }

        doc_list = sorted(docs_map.values(), key=lambda x: x.get("created_at", ""), reverse=True)
        return doc_list

    except Exception as e:
        print(f"Error listing custom documents: {e}")
        return []


def delete_custom_document(doc_id: str) -> dict:
    """특정 doc_id에 해당하는 사용자 정의 참고자료를 삭제합니다."""
    vector_store = get_vector_store()
    if vector_store is None:
        return {"status": "error", "message": "Vector Store 초기화 실패"}

    try:
        results = vector_store._collection.get(
            where={"doc_id": doc_id}
        )

        ids_to_delete = results.get("ids", [])

        if not ids_to_delete:
            return {"status": "error", "message": "해당 문서를 찾을 수 없습니다."}

        vector_store._collection.delete(ids=ids_to_delete)

        return {
            "status": "success",
            "message": f"문서가 삭제되었습니다. ({len(ids_to_delete)}개 청크 삭제)",
            "deleted_chunks": len(ids_to_delete)
        }

    except Exception as e:
        print(f"Error deleting custom document: {e}")
        return {"status": "error", "message": f"삭제 중 오류 발생: {str(e)}"}


def sqlite_search_fallback(query: str, scope: str = "all", limit: int = 15, target_sources: Optional[List[str]] = None) -> List[dict]:
    """ChromaDB의 HNSW 인덱스 오류 발생 시 SQLite를 통해 법령 및 조례 전문을 직접 검색하는 고신뢰 폴백입니다."""
    import sqlite3
    db_path = os.path.join(DB_DIR, "chroma.sqlite3")
    if not os.path.exists(db_path):
        return []
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        where_clauses = ["m_src.key = 'source'"]
        params = []

        # 텍스트 검색 조건 (법령명, 조문명, 또는 본문)
        if query and query.strip():
            q_clean = query.strip()
            where_clauses.append("(m_doc.string_value LIKE ? OR m_src.string_value LIKE ? OR m_art.string_value LIKE ?)")
            params.extend([f"%{q_clean}%", f"%{q_clean}%", f"%{q_clean}%"])

        # 스코프 필터링
        if target_sources:
            placeholders = ",".join(["?"] * len(target_sources))
            where_clauses.append(f"COALESCE(m_type.string_value, 'law') IN ({placeholders})")
            params.extend(target_sources)
        elif scope in ["law", "ordinance", "custom"]:
            where_clauses.append("COALESCE(m_type.string_value, 'law') = ?")
            params.append(scope)

        params.append(limit)
        where_sql = " AND ".join(where_clauses)

        sql = f"""
            SELECT 
                m_src.string_value AS source_name,
                COALESCE(m_art.string_value, '') AS article,
                COALESCE(m_type.string_value, 'law') AS source_type,
                COALESCE(m_org.string_value, '') AS org,
                COALESCE(m_doc.string_value, '') AS content,
                m_src.id AS doc_id
            FROM embedding_metadata m_src
            LEFT JOIN embedding_metadata m_art ON m_art.id = m_src.id AND m_art.key = 'article'
            LEFT JOIN embedding_metadata m_type ON m_type.id = m_src.id AND m_type.key = 'source_type'
            LEFT JOIN embedding_metadata m_org ON m_org.id = m_src.id AND m_org.key = 'org'
            LEFT JOIN embedding_metadata m_doc ON m_doc.id = m_src.id AND m_doc.key = 'chroma:document'
            WHERE {where_sql}
            ORDER BY 
                CASE 
                    WHEN m_src.string_value LIKE ? THEN 1
                    WHEN m_art.string_value LIKE ? THEN 2
                    ELSE 3 
                END,
                m_src.id ASC
            LIMIT ?
        """
        # Order by params
        q_order = f"%{query.strip()}%" if query and query.strip() else "%"
        order_params = [q_order, q_order]
        cur.execute(sql, params[:-1] + order_params + [params[-1]])
        results = []
        for row in cur.fetchall():
            results.append({
                "doc_id": row[5],
                "source_type": row[2],
                "source_name": row[0],
                "article": row[1] or "",
                "category": row[2],
                "org": row[3],
                "content": row[4],
                "score": 95.0 if query in (row[0] or '') else 88.0
            })
        conn.close()
        return results
    except Exception as err:
        print(f"SQLite search fallback error: {err}")
        return []


def search_documents(query: str, scope: str = "all", limit: int = 8, target_sources: Optional[List[str]] = None) -> List[dict]:
    """ChromaDB 내 법령 및 사내 등록 문서를 시맨틱 검색합니다.
    scope: 'all' | 'law' | 'custom' | 'ordinance'
    target_sources: ['law', 'ordinance', 'custom'] 등 다중 소스 선택
    """
    vector_store = get_vector_store()
    if vector_store is None:
        return sqlite_search_fallback(query, scope, limit, target_sources)

    try:
        filter_dict = None
        if target_sources:
            if len(target_sources) == 1:
                filter_dict = {"source_type": target_sources[0]}
            else:
                filter_dict = {"source_type": {"$in": target_sources}}
        elif scope in ["law", "custom", "ordinance"]:
            filter_dict = {"source_type": scope}

        # similarity_search_with_relevance_scores 수행
        docs_and_scores = vector_store.similarity_search_with_relevance_scores(
            query,
            k=limit,
            filter=filter_dict
        )

        results = []
        for doc, score in docs_and_scores:
            meta = doc.metadata or {}
            source_type = meta.get("source_type", "law")
            category = meta.get("category", source_type)
            article = meta.get("article", "")
            source_name = meta.get("source", "출처 미상")
            org = meta.get("org", meta.get("local_gov", ""))

            # 유사도 스코어 정규화 (보통 0.0 ~ 1.0)
            score_val = max(0.0, min(1.0, float(score)))

            results.append({
                "doc_id": meta.get("doc_id", ""),
                "source_type": source_type,
                "source_name": source_name,
                "article": article,
                "category": category,
                "org": org,
                "content": doc.page_content,
                "score": round(score_val * 100, 1),
            })

        if not results and query:
            # 벡터 스코어 임계치로 필터링되어 비어있는 경우 SQLite 텍스트 검색으로 보완
            return sqlite_search_fallback(query, scope, limit, target_sources)

        return results
    except Exception as e:
        print(f"Error during document search, falling back to SQLite: {e}")
        return sqlite_search_fallback(query, scope, limit, target_sources)
