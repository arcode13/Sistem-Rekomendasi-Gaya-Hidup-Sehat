import os
import re
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Header

from api.models import (
    UserLoginRequest,
    UserLoginResponse,
    UserRegisterRequest,
    UserResponse,
    UserUpdateRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from api.email_service import email_service
from open_notebook.database.repository import repo_query, ensure_record_id
from open_notebook.domain.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
async def register_user(request: UserRegisterRequest) -> UserResponse:
    try:
        if not request.email or not request.email.strip():
            raise HTTPException(status_code=400, detail="Email wajib diisi")
        
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, request.email):
            raise HTTPException(status_code=400, detail="Format email tidak valid")
        
        existing_email = await repo_query(
            "SELECT * FROM user WHERE email = $email LIMIT 1",
            {"email": request.email.lower()},
        )
        if existing_email:
            raise HTTPException(status_code=400, detail="Email sudah terdaftar")
        
        if not request.phone or not request.phone.strip():
            raise HTTPException(status_code=400, detail="Nomor telepon wajib diisi")
        
        def format_phone_number(phone: str) -> str:
            if not phone:
                return phone
            cleaned = re.sub(r'\D', '', phone)
            if cleaned.startswith('628'):
                return cleaned
            elif cleaned.startswith('08'):
                return '62' + cleaned[1:]
            elif cleaned.startswith('8'):
                return '62' + cleaned
            elif cleaned.startswith('62'):
                return cleaned
            else:
                return '628' + cleaned
        
        formatted_phone = format_phone_number(request.phone)
        
        if not formatted_phone.isdigit():
            raise HTTPException(status_code=400, detail="Nomor telepon hanya boleh berisi angka")
        
        if len(formatted_phone) < 9:
            raise HTTPException(status_code=400, detail="Nomor telepon minimal 9 digit")
        
        if len(formatted_phone) > 13:
            raise HTTPException(status_code=400, detail="Nomor telepon maksimal 13 digit")
        
        existing_phone = await repo_query(
            "SELECT * FROM user WHERE phone = $phone LIMIT 1",
            {"phone": formatted_phone},
        )
        if existing_phone:
            raise HTTPException(status_code=400, detail="Nomor telepon sudah terdaftar")
        
        request.phone = formatted_phone
        
        if not request.password or not request.password.strip():
            raise HTTPException(status_code=400, detail="Kata sandi wajib diisi")
        
        if len(request.password) < 6:
            raise HTTPException(status_code=400, detail="Kata sandi minimal 6 karakter")
        
        if len(request.password) > 100:
            raise HTTPException(status_code=400, detail="Kata sandi maksimal 100 karakter")
        
        if request.gender is not None and request.gender not in [1, 2]:
            raise HTTPException(status_code=400, detail="Jenis kelamin tidak valid")

        password_hash = User.hash_password(request.password)
        user = User(
            email=request.email.lower(),
            password_hash=password_hash,
            name=request.name,
            phone=request.phone,
            gender=request.gender,
            role="Pasien",
        )
        await user.save()

        if not user.id:
            raise HTTPException(status_code=500, detail="Gagal membuat user")

        user_id_clean = user.id.split(":")[-1] if ":" in user.id else user.id

        created_value = getattr(user, "created", None)
        updated_value = getattr(user, "updated", None)
        
        created_str = None
        if created_value:
            try:
                if isinstance(created_value, str):
                    created_str = created_value
                else:
                    created_str = created_value.isoformat() if hasattr(created_value, 'isoformat') else str(created_value)
            except Exception:
                created_str = str(created_value) if created_value else None
        
        updated_str = None
        if updated_value:
            try:
                if isinstance(updated_value, str):
                    updated_str = updated_value
                else:
                    updated_str = updated_value.isoformat() if hasattr(updated_value, 'isoformat') else str(updated_value)
            except Exception:
                updated_str = str(updated_value) if updated_value else None

        return UserResponse(
            id=user_id_clean,
            name=user.name,
            email=user.email,
            phone=user.phone,
            gender=user.gender,
            is_active=getattr(user, "is_active", True),
            role=getattr(user, "role", "Pasien"),
            created=created_str,
            updated=updated_str,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during registration: {str(e)}")


@router.post("/login", response_model=UserLoginResponse)
async def login_user(request: UserLoginRequest) -> UserLoginResponse:
    if not request.email or not request.email.strip():
        raise HTTPException(status_code=400, detail="Email wajib diisi")
    
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, request.email):
        raise HTTPException(status_code=400, detail="Format email tidak valid")
    
    if not request.password or not request.password.strip():
        raise HTTPException(status_code=400, detail="Kata sandi wajib diisi")
    
    rows = await repo_query(
        "SELECT * FROM user WHERE email = $email LIMIT 1",
        {"email": request.email.lower()},
    )
    if not rows:
        raise HTTPException(status_code=401, detail="Email tidak ditemukan")

    user = User(**rows[0])
    if not user.verify_password(request.password):
        raise HTTPException(status_code=401, detail="Password salah")

    if not user.id:
        raise HTTPException(status_code=500, detail="User ID tidak valid")

    token = uuid.uuid4().hex
    user.session_token = token
    await user.save()

    user_id_clean = user.id.split(":")[-1] if ":" in user.id else user.id

    created_value = getattr(user, "created", None)
    updated_value = getattr(user, "updated", None)
    
    created_str = None
    if created_value:
        if isinstance(created_value, str):
            created_str = created_value
        else:
            created_str = created_value.isoformat() if hasattr(created_value, 'isoformat') else str(created_value)
    
    updated_str = None
    if updated_value:
        if isinstance(updated_value, str):
            updated_str = updated_value
        else:
            updated_str = updated_value.isoformat() if hasattr(updated_value, 'isoformat') else str(updated_value)

    return UserLoginResponse(
        user=UserResponse(
            id=user_id_clean,
            name=user.name,
            email=user.email,
            phone=user.phone,
            gender=user.gender,
            is_active=getattr(user, "is_active", True),
            role=getattr(user, "role", "Pasien"),
            created=created_str,
            updated=updated_str,
        ),
        token=token,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(x_user_id: str = Header(..., alias="X-User-Id")) -> UserResponse:
    rows = await repo_query(
        "SELECT * FROM user WHERE session_token = $session_token LIMIT 1",
        {"session_token": x_user_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    data = rows[0]
    user_id = data.get("id", "")
    user_id_clean = user_id.split(":")[-1] if ":" in user_id else user_id

    created_value = data.get("created")
    updated_value = data.get("updated")
    
    created_str = None
    if created_value:
        if isinstance(created_value, str):
            created_str = created_value
        else:
            created_str = created_value.isoformat() if hasattr(created_value, 'isoformat') else str(created_value)
    
    updated_str = None
    if updated_value:
        if isinstance(updated_value, str):
            updated_str = updated_value
        else:
            updated_str = updated_value.isoformat() if hasattr(updated_value, 'isoformat') else str(updated_value)

    return UserResponse(
        id=user_id_clean,
        name=data.get("name"),
        email=data.get("email"),
        phone=data.get("phone"),
        gender=data.get("gender"),
        is_active=data.get("is_active", True),
        role=data.get("role", "Pasien"),
        created=created_str,
        updated=updated_str,
    )


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    request: UserUpdateRequest,
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> UserResponse:
    rows = await repo_query(
        "SELECT * FROM user WHERE session_token = $session_token LIMIT 1",
        {"session_token": x_user_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    user = User(**rows[0])

    if request.name is not None:
        user.name = request.name
    if request.email is not None:
        user.email = request.email.lower()
    if request.phone is not None:
        user.phone = request.phone
    if request.gender is not None:
        user.gender = request.gender
    if request.password:
        user.password_hash = User.hash_password(request.password)

    await user.save()

    user_id = user.id or ""
    user_id_clean = user_id.split(":")[-1] if ":" in user_id else user_id

    created_value = getattr(user, "created", None)
    updated_value = getattr(user, "updated", None)
    
    created_str = None
    if created_value:
        if isinstance(created_value, str):
            created_str = created_value
        else:
            created_str = created_value.isoformat() if hasattr(created_value, 'isoformat') else str(created_value)
    
    updated_str = None
    if updated_value:
        if isinstance(updated_value, str):
            updated_str = updated_value
        else:
            updated_str = updated_value.isoformat() if hasattr(updated_value, 'isoformat') else str(updated_value)

    return UserResponse(
        id=user_id_clean,
        name=user.name,
        email=user.email,
        phone=user.phone,
        gender=user.gender,
        is_active=user.is_active,
        role=getattr(user, "role", "Pasien"),
        created=created_str,
        updated=updated_str,
    )


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """
    Request password reset - sends email with reset link
    """
    if not request.email or not request.email.strip():
        raise HTTPException(status_code=400, detail="Email wajib diisi")
    
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, request.email):
        raise HTTPException(status_code=400, detail="Format email tidak valid")
    
    rows = await repo_query(
        "SELECT * FROM user WHERE email = $email LIMIT 1",
        {"email": request.email.lower()},
    )
    if not rows:
        return {"success": True, "message": "Jika email terdaftar, link reset kata sandi telah dikirim ke email Anda."}
    
    raw_user_row = rows[0]
    user = User(**raw_user_row)
    user_id = raw_user_row.get("id") or user.id or ""
    
    reset_token = uuid.uuid4().hex
    
    await repo_query(
        "DELETE password_reset_token WHERE user_id = $user_id",
        {"user_id": user_id}
    )
    
    await repo_query(
        "CREATE password_reset_token SET user_id = $user_id, reset_token = $reset_token, expires_at = time::now() + 1h, used = false, created = time::now()",
        {
            "user_id": user_id,
            "reset_token": reset_token
        }
    )
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8502")
    if frontend_url.endswith("/"):
        frontend_url = frontend_url[:-1]
    
    reset_url = f"{frontend_url}/health?token={reset_token}"
    
    user_name = user.name if hasattr(user, 'name') and user.name else None
    email_sent = email_service.send_password_reset_email(
        to_email=request.email.lower(),
        reset_token=reset_token,
        reset_url=reset_url,
        user_name=user_name
    )
    
    if not email_sent:
        raise HTTPException(
            status_code=500,
            detail="Gagal mengirim email reset kata sandi. Silakan coba lagi nanti."
        )
    
    return {"success": True, "message": "Jika email terdaftar, link reset kata sandi telah dikirim ke email Anda."}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    Reset password using token from email
    """
    if not request.token or not request.token.strip():
        raise HTTPException(status_code=400, detail="Token wajib diisi")
    
    if not request.new_password or not request.new_password.strip():
        raise HTTPException(status_code=400, detail="Kata sandi baru wajib diisi")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Kata sandi minimal 6 karakter")
    
    if len(request.new_password) > 100:
        raise HTTPException(status_code=400, detail="Kata sandi maksimal 100 karakter")
    
    token_rows = await repo_query(
        "SELECT * FROM password_reset_token WHERE reset_token = $reset_token LIMIT 1",
        {"reset_token": request.token}
    )
    
    if not token_rows:
        raise HTTPException(status_code=400, detail="Token tidak valid atau sudah kedaluwarsa")
    
    token_data = token_rows[0]
    
    if token_data.get("used", False):
        raise HTTPException(status_code=400, detail="Token sudah digunakan")
    
    expires_at_str = token_data.get("expires_at")
    if expires_at_str:
        try:
            if isinstance(expires_at_str, str):
                expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
            else:
                expires_at = expires_at_str
            if expires_at < datetime.now(expires_at.tzinfo) if hasattr(expires_at, 'tzinfo') and expires_at.tzinfo else datetime.now():
                raise HTTPException(status_code=400, detail="Token sudah kedaluwarsa")
        except Exception:
            raise HTTPException(status_code=400, detail="Token tidak valid")
    
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Token tidak valid")
    
    user_rows = await repo_query(
        "SELECT * FROM $user_id",
        {"user_id": ensure_record_id(user_id)}
    )
    
    if not user_rows:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    user = User(**user_rows[0])
    
    user.password_hash = User.hash_password(request.new_password)
    await user.save()
    
    await repo_query(
        "UPDATE password_reset_token SET used = true WHERE reset_token = $reset_token",
        {"reset_token": request.token}
    )
    
    return {"success": True, "message": "Kata sandi berhasil direset. Silakan login dengan kata sandi baru."}