"""
JWT 인증 모듈
- 비밀번호 해싱 (bcrypt)
- JWT 토큰 발행/검증
- FastAPI 의존성 주입
"""
import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

from database import get_user_by_email, get_user_by_id, create_user

load_dotenv()

# JWT 설정
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "lawreview-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer(auto_error=False)


# ==================== 비밀번호 ====================

def hash_password(password: str) -> str:
    """비밀번호를 해싱합니다."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호를 검증합니다."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


# ==================== JWT 토큰 ====================

def create_access_token(user_id: int, email: str) -> str:
    """JWT 액세스 토큰을 생성합니다."""
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """JWT 토큰을 디코딩합니다."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ==================== FastAPI 의존성 ====================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """현재 인증된 사용자를 반환합니다. 인증 필수 엔드포인트에 사용."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다.",
        )

    user_id = int(payload.get("sub", 0))
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다.",
        )

    return user


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """인증된 사용자가 있으면 반환, 없으면 None. 선택적 인증에 사용."""
    if credentials is None:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload is None:
            return None
        user_id = int(payload.get("sub", 0))
        return get_user_by_id(user_id)
    except Exception:
        return None


# ==================== 회원가입/로그인 ====================

def register_user(email: str, password: str, name: str) -> dict:
    """새 사용자를 등록합니다."""
    # 이메일 형식 검증
    if "@" not in email or "." not in email:
        return {"status": "error", "message": "유효한 이메일 주소를 입력해 주세요."}

    # 비밀번호 길이 검증
    if len(password) < 6:
        return {"status": "error", "message": "비밀번호는 6자 이상이어야 합니다."}

    # 이름 검증
    if len(name.strip()) < 2:
        return {"status": "error", "message": "이름은 2자 이상이어야 합니다."}

    # 중복 확인
    existing = get_user_by_email(email)
    if existing:
        return {"status": "error", "message": "이미 등록된 이메일입니다."}

    # 생성
    pw_hash = hash_password(password)
    user = create_user(email, pw_hash, name.strip())
    if user is None:
        return {"status": "error", "message": "회원가입에 실패했습니다."}

    token = create_access_token(user["id"], user["email"])
    return {
        "status": "success",
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": name.strip()}
    }


def login_user(email: str, password: str) -> dict:
    """사용자 로그인 처리."""
    user = get_user_by_email(email)
    if not user:
        return {"status": "error", "message": "이메일 또는 비밀번호가 올바르지 않습니다."}

    if not verify_password(password, user["password_hash"]):
        return {"status": "error", "message": "이메일 또는 비밀번호가 올바르지 않습니다."}

    token = create_access_token(user["id"], user["email"])
    return {
        "status": "success",
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"]}
    }
