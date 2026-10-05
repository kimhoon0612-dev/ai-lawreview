"""
SQLite 데이터베이스 모듈
- users: 사용자 정보
- analysis_history: 계약서 분석 이력
"""
import sqlite3
import os
import json
from datetime import datetime
from typing import List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "lawreview.db")


def get_connection():
    """SQLite 연결을 반환합니다."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_database():
    """데이터베이스 테이블을 초기화합니다."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            is_active INTEGER DEFAULT 1
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            status TEXT NOT NULL,
            analysis_json TEXT,
            extracted_text_preview TEXT,
            risk_summary TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_history_user ON analysis_history(user_id)
    """)

    conn.commit()
    conn.close()
    print("[DB] 데이터베이스 초기화 완료")


# ==================== Users ====================

def create_user(email: str, password_hash: str, name: str) -> Optional[dict]:
    """새 사용자를 생성합니다."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
            (email, password_hash, name)
        )
        conn.commit()
        return {"id": cursor.lastrowid, "email": email, "name": name}
    except sqlite3.IntegrityError:
        return None  # 이메일 중복
    finally:
        conn.close()


def get_user_by_email(email: str) -> Optional[dict]:
    """이메일로 사용자를 검색합니다."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def get_user_by_id(user_id: int) -> Optional[dict]:
    """ID로 사용자를 검색합니다."""
    conn = get_connection()
    row = conn.execute("SELECT id, email, name, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


# ==================== Analysis History ====================

def save_analysis(user_id: int, filename: str, status: str, analysis: dict,
                  extracted_text_preview: str = "") -> int:
    """분석 결과를 저장합니다."""
    conn = get_connection()

    # 위험도 요약 생성
    risk_summary = _make_risk_summary(analysis)

    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO analysis_history
           (user_id, filename, status, analysis_json, extracted_text_preview, risk_summary)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, filename, status, json.dumps(analysis, ensure_ascii=False),
         extracted_text_preview, risk_summary)
    )
    conn.commit()
    history_id = cursor.lastrowid
    conn.close()
    return history_id


def get_user_history(user_id: int, limit: int = 50) -> List[dict]:
    """사용자의 분석 이력 목록을 반환합니다."""
    conn = get_connection()
    rows = conn.execute(
        """SELECT id, filename, status, risk_summary, created_at
           FROM analysis_history WHERE user_id = ?
           ORDER BY created_at DESC LIMIT ?""",
        (user_id, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_history_detail(history_id: int, user_id: int) -> Optional[dict]:
    """특정 분석 이력의 상세 내용을 반환합니다."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM analysis_history WHERE id = ? AND user_id = ?",
        (history_id, user_id)
    ).fetchone()
    conn.close()
    if row:
        result = dict(row)
        if result.get("analysis_json"):
            result["analysis"] = json.loads(result["analysis_json"])
            del result["analysis_json"]
        return result
    return None


def delete_history(history_id: int, user_id: int) -> bool:
    """분석 이력을 삭제합니다."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM analysis_history WHERE id = ? AND user_id = ?",
        (history_id, user_id)
    )
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def _make_risk_summary(analysis: dict) -> str:
    """분석 결과에서 위험도 요약을 생성합니다."""
    if not analysis:
        return "분석 없음"
    clauses = analysis.get("clauses", [])
    high = sum(1 for c in clauses if c.get("risk_level") == "high")
    warning = sum(1 for c in clauses if c.get("risk_level") == "warning")
    info = sum(1 for c in clauses if c.get("risk_level") == "info")
    parts = []
    if high:
        parts.append(f"고위험 {high}건")
    if warning:
        parts.append(f"주의 {warning}건")
    if info:
        parts.append(f"정보 {info}건")
    return ", ".join(parts) if parts else "위험 항목 없음"


# 모듈 로드 시 DB 초기화
init_database()
