import uuid
import enum
from datetime import datetime, date

from sqlalchemy import Column, String, Date, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship

from .database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class RecordCategory(str, enum.Enum):
    lab_report = "lab_report"
    prescription = "prescription"
    scan = "scan"
    vaccination = "vaccination"
    appointment = "appointment"
    other = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    records = relationship("Record", back_populates="owner", cascade="all, delete-orphan")


class Record(Base):
    __tablename__ = "records"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    category = Column(Enum(RecordCategory), nullable=False, default=RecordCategory.other)
    title = Column(String, nullable=False)
    record_date = Column(Date, nullable=False)

    file_url = Column(String, nullable=False)   # relative path / storage key
    file_type = Column(String, nullable=False)  # pdf, jpg, png, etc.
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="records")
