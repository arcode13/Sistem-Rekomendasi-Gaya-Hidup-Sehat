from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query

from api.models import (
    ChatListResponse,
    ChatListItem,
    ChatDetailResponse,
)
from open_notebook.database.repository import repo_query, ensure_record_id
from open_notebook.domain.health import HealthExamination, HealthChatSession

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("", response_model=ChatListResponse)
async def get_chats(
    search: Optional[str] = Query(None, description="Search by user name"),
    limit: int = Query(50, ge=1, le=100, description="Number of chats to return (1-100)"),
    offset: int = Query(0, ge=0, description="Number of chats to skip"),
    sort_by: str = Query("created", description="Field to sort by (created or updated)"),
    sort_order: str = Query("desc", description="Sort order (asc or desc)"),
):
    try:
        if sort_by not in ["created", "updated"]:
            raise HTTPException(status_code=400, detail="sort_by must be 'created' or 'updated'")
        if sort_order.lower() not in ["asc", "desc"]:
            raise HTTPException(status_code=400, detail="sort_order must be 'asc' or 'desc'")

        order_clause = f"ORDER BY {sort_by} {sort_order.upper()}"

        where_clause = ""
        
        count_query = "SELECT VALUE count() FROM health_examination"
        count_result = await repo_query(count_query, {})
        
        total_all = 0
        if count_result:
            if isinstance(count_result, list) and len(count_result) > 0:
                first_item = count_result[0]
                if all(isinstance(item, dict) and 'count' in item for item in count_result):
                    total_all = len(count_result)
                elif isinstance(first_item, (int, float)):
                    total_all = int(first_item)
                elif isinstance(first_item, dict):
                    for key in ['count()', 'count', 'value']:
                        if key in first_item:
                            total_all = int(first_item[key])
                            break
            elif isinstance(count_result, (int, float)):
                total_all = int(count_result)
        
        if total_all == 0:
            try:
                all_records = await repo_query("SELECT id FROM health_examination", {})
                total_all = len(all_records) if all_records else 0
            except Exception as e:
                total_all = 0

        if search:
            fetch_limit = min(limit * 5, 1000)
            params = {"limit": fetch_limit, "offset": 0}
        else:
            params = {"limit": limit, "offset": offset}

        query = f"""
            SELECT 
                id,
                user_id,
                age,
                gender,
                risk_level,
                prediction_proba,
                created,
                updated
            FROM health_examination
            {where_clause}
            {order_clause}
            LIMIT $limit START $offset
        """

        result = await repo_query(query, params)

        chats = []
        for row in result:
            exam_id = row.get("id", "")
            exam_id_clean = exam_id.split(":")[-1] if ":" in exam_id else exam_id
            
            user_id = row.get("user_id")
            user_id_clean = None
            user_name = None
            if user_id:
                user_id_clean = user_id.split(":")[-1] if ":" in user_id else user_id
                try:
                    user_rows = await repo_query(
                        "SELECT name FROM $user_id LIMIT 1",
                        {"user_id": ensure_record_id(user_id)},
                    )
                    if user_rows:
                        user_name = user_rows[0].get("name")
                except Exception:
                    pass

            if search:
                if not user_name or search.lower() not in user_name.lower():
                    continue

            created_value = row.get("created")
            created_str = (
                created_value.isoformat() if isinstance(created_value, datetime) else str(created_value)
                if created_value is not None
                else ""
            )
            
            updated_value = row.get("updated")
            updated_str = (
                updated_value.isoformat() if isinstance(updated_value, datetime) else str(updated_value)
                if updated_value is not None
                else ""
            )

            chats.append(ChatListItem(
                id=exam_id_clean,
                user_id=user_id_clean,
                user_name=user_name,
                age=row.get("age", 0),
                gender=row.get("gender", 0),
                risk_level=row.get("risk_level", ""),
                prediction_proba=row.get("prediction_proba", 0.0),
                created=created_str,
                updated=updated_str,
            ))

            if len(chats) >= limit:
                break

        if search:
            chats = chats[offset:offset + limit]
            if len(chats) < limit:
                total = offset + len(chats)
            else:
                total = max(offset + len(chats), total_all)
        else:
            total = total_all

        return ChatListResponse(
            chats=chats,
            total=total,
            limit=limit,
            offset=offset,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching chats: {str(e)}")


@router.get("/{examination_id}", response_model=ChatDetailResponse)
async def get_chat_detail(examination_id: str):
    try:
        exam_record_id = ensure_record_id(f"health_examination:{examination_id}")
        
        rows = await repo_query(
            "SELECT * FROM $exam_id LIMIT 1",
            {"exam_id": exam_record_id},
        )
        
        if not rows:
            raise HTTPException(status_code=404, detail="Examination tidak ditemukan")

        exam_data = rows[0]
        
        user_id = exam_data.get("user_id")
        user_name = None
        if user_id:
            try:
                user_rows = await repo_query(
                    "SELECT name FROM $user_id LIMIT 1",
                    {"user_id": ensure_record_id(user_id)},
                )
                if user_rows:
                    user_name = user_rows[0].get("name")
            except Exception:
                pass

        exam_id_clean = exam_data.get("id", "").split(":")[-1] if ":" in exam_data.get("id", "") else exam_data.get("id", "")
        
        created_value = exam_data.get("created")
        created_str = None
        if created_value:
            try:
                if isinstance(created_value, str):
                    created_str = created_value
                else:
                    created_str = created_value.isoformat() if hasattr(created_value, 'isoformat') else str(created_value)
            except Exception:
                created_str = str(created_value) if created_value else None
        
        updated_value = exam_data.get("updated")
        updated_str = None
        if updated_value:
            try:
                if isinstance(updated_value, str):
                    updated_str = updated_value
                else:
                    updated_str = updated_value.isoformat() if hasattr(updated_value, 'isoformat') else str(updated_value)
            except Exception:
                updated_str = str(updated_value) if updated_value else None

        user_id_clean = None
        if user_id:
            try:
                user_id_clean = user_id.split(":")[-1] if ":" in user_id else user_id
            except Exception:
                user_id_clean = str(user_id) if user_id else None

        examination = {
            "id": exam_id_clean,
            "user_id": user_id_clean,
            "user_name": user_name,
            "age": exam_data.get("age"),
            "gender": exam_data.get("gender"),
            "height": exam_data.get("height"),
            "weight": exam_data.get("weight"),
            "systolic_bp": exam_data.get("systolic_bp"),
            "diastolic_bp": exam_data.get("diastolic_bp"),
            "bmi": exam_data.get("bmi"),
            "pulse_pressure": exam_data.get("pulse_pressure"),
            "risk_level": exam_data.get("risk_level"),
            "prediction_proba": exam_data.get("prediction_proba"),
            "cholesterol": exam_data.get("cholesterol"),
            "glucose": exam_data.get("glucose"),
            "smoking": exam_data.get("smoking"),
            "alcohol": exam_data.get("alcohol"),
            "physical_activity": exam_data.get("physical_activity"),
            "created": created_str,
            "updated": updated_str,
        }

        examination_id_string = f"health_examination:{examination_id}"
        session_rows = await repo_query(
            "SELECT * FROM health_chat_session WHERE examination_id = $exam_id ORDER BY created ASC",
            {"exam_id": examination_id_string},
        )

        chat_sessions = []
        for session_row in session_rows:
            try:
                session_id = session_row.get("id", "")
                session_id_clean = session_id.split(":")[-1] if ":" in session_id else session_id
                
                session_created = session_row.get("created")
                session_created_str = None
                if session_created:
                    try:
                        if isinstance(session_created, str):
                            session_created_str = session_created
                        else:
                            session_created_str = session_created.isoformat() if hasattr(session_created, 'isoformat') else str(session_created)
                    except Exception:
                        session_created_str = str(session_created) if session_created else None
                
                session_updated = session_row.get("updated")
                session_updated_str = None
                if session_updated:
                    try:
                        if isinstance(session_updated, str):
                            session_updated_str = session_updated
                        else:
                            session_updated_str = session_updated.isoformat() if hasattr(session_updated, 'isoformat') else str(session_updated)
                    except Exception:
                        session_updated_str = str(session_updated) if session_updated else None
                
                chat_sessions.append({
                    "id": session_id_clean,
                    "title": session_row.get("title"),
                    "messages": session_row.get("messages", []),
                    "created": session_created_str,
                    "updated": session_updated_str,
                })
            except Exception:
                continue

        return ChatDetailResponse(
            examination=examination,
            chat_sessions=chat_sessions,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching chat detail: {str(e)}")

