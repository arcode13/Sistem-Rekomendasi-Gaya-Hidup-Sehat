from typing import List
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from open_notebook.database.repository import repo_query

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class MonthlyStat(BaseModel):
    month: str
    users: int
    chats: int


class DashboardStatsResponse(BaseModel):
    total_users: int
    total_chats: int
    users_this_month: int
    chats_this_month: int
    monthly_stats: List[MonthlyStat]


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats():
    try:
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        total_users_result = await repo_query("SELECT VALUE count() FROM user", {})
        total_users = 0
        if total_users_result:
            if isinstance(total_users_result, list) and len(total_users_result) > 0:
                first_item = total_users_result[0]
                if all(isinstance(item, dict) and 'count' in item for item in total_users_result):
                    total_users = len(total_users_result)
                elif isinstance(first_item, (int, float)):
                    total_users = int(first_item)
                elif isinstance(first_item, dict):
                    for key in ['count()', 'count', 'value']:
                        if key in first_item:
                            total_users = int(first_item[key])
                            break
            elif isinstance(total_users_result, (int, float)):
                total_users = int(total_users_result)
        
        if total_users == 0:
            try:
                all_users = await repo_query("SELECT id FROM user", {})
                total_users = len(all_users) if all_users else 0
            except Exception:
                total_users = 0
        
        total_chats_result = await repo_query("SELECT VALUE count() FROM health_examination", {})
        total_chats = 0
        if total_chats_result:
            if isinstance(total_chats_result, list) and len(total_chats_result) > 0:
                first_item = total_chats_result[0]
                if all(isinstance(item, dict) and 'count' in item for item in total_chats_result):
                    total_chats = len(total_chats_result)
                elif isinstance(first_item, (int, float)):
                    total_chats = int(first_item)
                elif isinstance(first_item, dict):
                    for key in ['count()', 'count', 'value']:
                        if key in first_item:
                            total_chats = int(first_item[key])
                            break
            elif isinstance(total_chats_result, (int, float)):
                total_chats = int(total_chats_result)
        
        if total_chats == 0:
            try:
                all_chats = await repo_query("SELECT id FROM health_examination", {})
                total_chats = len(all_chats) if all_chats else 0
            except Exception:
                total_chats = 0
        
        all_users_data = await repo_query("SELECT created FROM user", {})
        users_this_month = 0
        if all_users_data:
            for user in all_users_data:
                try:
                    user_created = user.get("created")
                    if user_created:
                        if isinstance(user_created, str):
                            user_created = datetime.fromisoformat(user_created.replace('Z', '+00:00'))
                        elif isinstance(user_created, datetime):
                            if user_created.tzinfo is None:
                                user_created = user_created.replace(tzinfo=timezone.utc)
                        else:
                            continue
                        if user_created >= start_of_month:
                            users_this_month += 1
                except Exception:
                    continue
        
        all_chats_data = await repo_query("SELECT created FROM health_examination", {})
        chats_this_month = 0
        if all_chats_data:
            for chat in all_chats_data:
                try:
                    chat_created = chat.get("created")
                    if chat_created:
                        if isinstance(chat_created, str):
                            chat_created = datetime.fromisoformat(chat_created.replace('Z', '+00:00'))
                        elif isinstance(chat_created, datetime):
                            if chat_created.tzinfo is None:
                                chat_created = chat_created.replace(tzinfo=timezone.utc)
                        else:
                            continue
                        if chat_created >= start_of_month:
                            chats_this_month += 1
                except Exception:
                    continue
        monthly_stats = []
        for i in range(12):
            month_start = (start_of_year + timedelta(days=32 * i)).replace(day=1)
            if month_start > now:
                break
            if month_start.month == 12:
                month_end = (month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1))
            else:
                month_end = (month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1))
            if month_end > now:
                month_end = now
            
            month_start = month_start.replace(tzinfo=timezone.utc)
            month_end = month_end.replace(tzinfo=timezone.utc)
            
            month_users = 0
            if all_users_data:
                for user in all_users_data:
                    try:
                        user_created = user.get("created")
                        if user_created:
                            if isinstance(user_created, str):
                                user_created = datetime.fromisoformat(user_created.replace('Z', '+00:00'))
                            elif isinstance(user_created, datetime):
                                if user_created.tzinfo is None:
                                    user_created = user_created.replace(tzinfo=timezone.utc)
                            else:
                                continue
                            if month_start <= user_created <= month_end:
                                month_users += 1
                    except Exception:
                        continue
            
            month_chats = 0
            if all_chats_data:
                for chat in all_chats_data:
                    try:
                        chat_created = chat.get("created")
                        if chat_created:
                            if isinstance(chat_created, str):
                                chat_created = datetime.fromisoformat(chat_created.replace('Z', '+00:00'))
                            elif isinstance(chat_created, datetime):
                                if chat_created.tzinfo is None:
                                    chat_created = chat_created.replace(tzinfo=timezone.utc)
                            else:
                                continue
                            if month_start <= chat_created <= month_end:
                                month_chats += 1
                    except Exception:
                        continue
            
            month_name = month_start.strftime('%b %Y')
            monthly_stats.append(MonthlyStat(
                month=month_name,
                users=month_users,
                chats=month_chats
            ))
        
        return DashboardStatsResponse(
            total_users=total_users,
            total_chats=total_chats,
            users_this_month=users_this_month,
            chats_this_month=chats_this_month,
            monthly_stats=monthly_stats
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")

