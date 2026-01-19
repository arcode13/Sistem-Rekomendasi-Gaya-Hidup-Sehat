from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
import re

from api.models import (
    UserResponse,
    UserListResponse,
    UserCreateRequest,
    UserUpdateRequest,
)
from open_notebook.database.repository import repo_query, ensure_record_id, repo_update
from open_notebook.domain.user import User

router = APIRouter(prefix="/users", tags=["users"])


def format_phone_number(phone: str) -> str:
    """Format phone number to always start with 628"""
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


@router.get("", response_model=UserListResponse)
async def get_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    limit: int = Query(50, ge=1, le=100, description="Number of users to return (1-100)"),
    offset: int = Query(0, ge=0, description="Number of users to skip"),
    sort_by: str = Query("created", description="Field to sort by (created or updated)"),
    sort_order: str = Query("desc", description="Sort order (asc or desc)"),
):
    try:
        if sort_by not in ["created", "updated"]:
            raise HTTPException(status_code=400, detail="sort_by must be 'created' or 'updated'")
        if sort_order.lower() not in ["asc", "desc"]:
            raise HTTPException(status_code=400, detail="sort_order must be 'asc' or 'desc'")

        order_clause = f"ORDER BY {sort_by} {sort_order.upper()}"

        if search:
            params = {"limit": 1000, "offset": 0}
            query = f"""
                SELECT id, name, email, phone, gender, is_active, role, created, updated
                FROM user
                {order_clause}
                LIMIT $limit START $offset
            """
            all_result = await repo_query(query, params)

            search_lower = search.lower()
            filtered_result = [
                row for row in all_result
                if (row.get("name") and search_lower in row.get("name", "").lower()) or
                   (row.get("email") and search_lower in row.get("email", "").lower())
            ]
            total = len(filtered_result)
            result = filtered_result[offset:offset + limit]
        else:
            params = {"limit": limit, "offset": offset}
            query = f"""
                SELECT id, name, email, phone, gender, is_active, role, created, updated
                FROM user
                {order_clause}
                LIMIT $limit START $offset
            """
            result = await repo_query(query, params)
            
            count_query = "SELECT VALUE count() FROM user"
            count_result = await repo_query(count_query, {})
            
            total = 0
            if count_result:
                if isinstance(count_result, list) and len(count_result) > 0:
                    first_item = count_result[0]
                    # Check if all items are dicts with 'count' key (SurrealDB returns one count per row)
                    # In this case, the array length represents the total count
                    if all(isinstance(item, dict) and 'count' in item for item in count_result):
                        total = len(count_result)
                    elif isinstance(first_item, (int, float)):
                        # Direct numeric value
                        total = int(first_item)
                    elif isinstance(first_item, dict):
                        # Try different possible keys
                        for key in ['count()', 'count', 'value']:
                            if key in first_item:
                                total = int(first_item[key])
                                break
                elif isinstance(count_result, (int, float)):
                    total = int(count_result)
            
            # Fallback: if count query failed or returned 0, fetch all and count manually
            if total == 0:
                try:
                    all_records = await repo_query("SELECT id FROM user", {})
                    total = len(all_records) if all_records else 0
                except Exception as e:
                    total = 0

        users = []
        for row in result:
            user_id = row.get("id", "")
            user_id_clean = user_id.split(":")[-1] if ":" in user_id else user_id
            
            created_value = row.get("created")
            created_str = (
                created_value.isoformat() if isinstance(created_value, datetime) else str(created_value)
                if created_value is not None
                else None
            )
            
            updated_value = row.get("updated")
            updated_str = (
                updated_value.isoformat() if isinstance(updated_value, datetime) else str(updated_value)
                if updated_value is not None
                else None
            )
            
            users.append(UserResponse(
                id=user_id_clean,
                name=row.get("name"),
                email=row.get("email", ""),
                phone=row.get("phone"),
                gender=row.get("gender"),
                is_active=row.get("is_active", True),
                role=row.get("role", "Pasien"),
                created=created_str,
                updated=updated_str,
            ))

        return UserListResponse(
            users=users,
            total=total,
            limit=limit,
            offset=offset,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    try:
        user_record_id = ensure_record_id(f"user:{user_id}")
        rows = await repo_query(
            "SELECT * FROM $user_id LIMIT 1",
            {"user_id": user_record_id},
        )
        if not rows:
            raise HTTPException(status_code=404, detail="User tidak ditemukan")

        data = rows[0]
        user_id_clean = data.get("id", "").split(":")[-1] if ":" in data.get("id", "") else data.get("id", "")

        created_value = data.get("created")
        created_str = (
            created_value.isoformat() if isinstance(created_value, datetime) else str(created_value)
            if created_value is not None
            else None
        )
        
        updated_value = data.get("updated")
        updated_str = (
            updated_value.isoformat() if isinstance(updated_value, datetime) else str(updated_value)
            if updated_value is not None
            else None
        )

        return UserResponse(
            id=user_id_clean,
            name=data.get("name"),
            email=data.get("email", ""),
            phone=data.get("phone"),
            gender=data.get("gender"),
            is_active=data.get("is_active", True),
            role=data.get("role", "Pasien"),
            created=created_str,
            updated=updated_str,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")


@router.post("", response_model=UserResponse)
async def create_user(request: UserCreateRequest):
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
    
    if request.phone:
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
    
    if request.role not in ["Pasien", "Perawat"]:
        raise HTTPException(status_code=400, detail="Role harus 'Pasien' atau 'Perawat'")

    password_hash = User.hash_password(request.password)
    user = User(
        email=request.email.lower(),
        password_hash=password_hash,
        name=request.name,
        phone=request.phone,
        gender=request.gender,
        role=request.role,
    )
    await user.save()

    if not user.id:
        raise HTTPException(status_code=500, detail="Gagal membuat user")

    user_id_clean = user.id.split(":")[-1] if ":" in user.id else user.id
    
    created_value = getattr(user, "created", None)
    created_str = (
        created_value.isoformat() if isinstance(created_value, datetime) else str(created_value)
        if created_value is not None
        else None
    )
    
    updated_value = getattr(user, "updated", None)
    updated_str = (
        updated_value.isoformat() if isinstance(updated_value, datetime) else str(updated_value)
        if updated_value is not None
        else None
    )
    
    return UserResponse(
        id=user_id_clean,
        name=user.name,
        email=user.email,
        phone=user.phone,
        gender=user.gender,
        is_active=user.is_active,
        role=user.role or "Pasien",
        created=created_str,
        updated=updated_str,
    )


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, request: UserUpdateRequest):
    try:
        user_record_id = ensure_record_id(f"user:{user_id}")
        rows = await repo_query(
            "SELECT * FROM $user_id LIMIT 1",
            {"user_id": user_record_id},
        )
        if not rows:
            raise HTTPException(status_code=404, detail="User tidak ditemukan")

        user = User(**rows[0])

        if request.name is not None:
            user.name = request.name
        if request.email is not None:
            email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            if not re.match(email_regex, request.email):
                raise HTTPException(status_code=400, detail="Format email tidak valid")
            
            existing_email = await repo_query(
                "SELECT * FROM user WHERE email = $email AND id != $user_id LIMIT 1",
                {"email": request.email.lower(), "user_id": user_record_id},
            )
            if existing_email:
                raise HTTPException(status_code=400, detail="Email sudah terdaftar")
            
            user.email = request.email.lower()
        if request.phone is not None:
            formatted_phone = format_phone_number(request.phone)
            if not formatted_phone.isdigit():
                raise HTTPException(status_code=400, detail="Nomor telepon hanya boleh berisi angka")
            if len(formatted_phone) < 9:
                raise HTTPException(status_code=400, detail="Nomor telepon minimal 9 digit")
            if len(formatted_phone) > 13:
                raise HTTPException(status_code=400, detail="Nomor telepon maksimal 13 digit")
            
            existing_phone = await repo_query(
                "SELECT * FROM user WHERE phone = $phone AND id != $user_id LIMIT 1",
                {"phone": formatted_phone, "user_id": user_record_id},
            )
            if existing_phone:
                raise HTTPException(status_code=400, detail="Nomor telepon sudah terdaftar")
            
            user.phone = formatted_phone
        if request.gender is not None:
            if request.gender not in [1, 2]:
                raise HTTPException(status_code=400, detail="Jenis kelamin tidak valid")
            user.gender = request.gender
        if request.password is not None:
            if len(request.password) < 6:
                raise HTTPException(status_code=400, detail="Kata sandi minimal 6 karakter")
            if len(request.password) > 100:
                raise HTTPException(status_code=400, detail="Kata sandi maksimal 100 karakter")
            user.password_hash = User.hash_password(request.password)
        if request.is_active is not None:
            user.is_active = request.is_active
        if request.role is not None:
            if request.role not in ["Pasien", "Perawat"]:
                raise HTTPException(status_code=400, detail="Role harus 'Pasien' atau 'Perawat'")
            user.role = request.role

        await user.save()

        user_id_clean = user.id.split(":")[-1] if ":" in user.id else user.id
        
        created_value = getattr(user, "created", None)
        created_str = (
            created_value.isoformat() if isinstance(created_value, datetime) else str(created_value)
            if created_value is not None
            else None
        )
        
        updated_value = getattr(user, "updated", None)
        updated_str = (
            updated_value.isoformat() if isinstance(updated_value, datetime) else str(updated_value)
            if updated_value is not None
            else None
        )
        
        return UserResponse(
            id=user_id_clean,
            name=user.name,
            email=user.email,
            phone=user.phone,
            gender=user.gender,
            is_active=user.is_active,
            role=user.role or "Pasien",
            created=created_str,
            updated=updated_str,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")


@router.delete("/{user_id}")
async def delete_user(user_id: str):
    try:
        user_record_id = ensure_record_id(f"user:{user_id}")
        rows = await repo_query(
            "SELECT * FROM $user_id LIMIT 1",
            {"user_id": user_record_id},
        )
        if not rows:
            raise HTTPException(status_code=404, detail="User tidak ditemukan")

        await repo_query(
            "DELETE $user_id",
            {"user_id": user_record_id},
        )

        return {"success": True, "message": "User berhasil dihapus"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")