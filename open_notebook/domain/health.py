from typing import ClassVar, Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from surrealdb import RecordID

from open_notebook.domain.base import ObjectModel


class HealthExamination(ObjectModel):
    table_name: ClassVar[str] = "health_examination"

    user_id: Optional[str] = None
    age: int
    gender: int
    height: float
    weight: float
    systolic_bp: int
    diastolic_bp: int
    bmi: float
    pulse_pressure: float
    risk_level: str
    prediction_proba: float
    cholesterol: Optional[int] = None
    glucose: Optional[int] = None
    smoking: Optional[int] = None
    alcohol: Optional[int] = None
    physical_activity: Optional[int] = None


class HealthChatSession(ObjectModel):
    table_name: ClassVar[str] = "health_chat_session"

    user_id: Optional[str] = None
    examination_id: Optional[Union[str, RecordID]] = None
    title: Optional[str] = None
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    
    class Config:
        arbitrary_types_allowed = True
    
    @field_validator("examination_id", mode="before")
    @classmethod
    def parse_examination_id(cls, value):
        if value is None:
            return None
        if isinstance(value, RecordID):
            return str(value)
        return str(value) if value else None
    
    def _prepare_save_data(self) -> Dict[str, Any]:
        data = super()._prepare_save_data()
        
        # examination_id should be stored as string, not RecordID
        # The database schema expects option<string>
        if data.get("examination_id") is not None:
            data["examination_id"] = str(data["examination_id"])
        
        data["messages"] = self.messages if hasattr(self, "messages") else []
        
        return data

