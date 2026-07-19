from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

from .models import RecordCategory


# ---------- Auth ----------

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: Optional[str]
    date_of_birth: Optional[date]
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Records ----------

class RecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    category: RecordCategory
    title: str
    record_date: date
    file_url: str
    file_type: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class RecordUpdate(BaseModel):
    category: Optional[RecordCategory] = None
    title: Optional[str] = None
    record_date: Optional[date] = None
    notes: Optional[str] = None
