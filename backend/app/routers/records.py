import os
import uuid
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..config import settings

router = APIRouter(prefix="/records", tags=["records"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def _validate_and_save_file(file: UploadFile, user_id: str) -> tuple[str, str]:
    """Save the uploaded file to local storage. Returns (file_url, file_type)."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Non-guessable filename, namespaced by user
    user_dir = os.path.join(settings.storage_dir, user_id)
    os.makedirs(user_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4()}{ext}"
    dest_path = os.path.join(user_dir, stored_name)

    size = 0
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    with open(dest_path, "wb") as out_file:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                out_file.close()
                os.remove(dest_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Max size is {settings.max_upload_size_mb}MB",
                )
            out_file.write(chunk)

    # file_url stores a relative key. A future cloud-storage swap only changes
    # how this key is generated and how GET /records/{id}/file resolves it.
    file_url = f"{user_id}/{stored_name}"
    file_type = ext.lstrip(".")
    return file_url, file_type


@router.post("", response_model=schemas.RecordOut, status_code=201)
def upload_record(
    title: str = Form(...),
    category: models.RecordCategory = Form(...),
    record_date: date = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    file_url, file_type = _validate_and_save_file(file, current_user.id)

    record = models.Record(
        user_id=current_user.id,
        category=category,
        title=title,
        record_date=record_date,
        file_url=file_url,
        file_type=file_type,
        notes=notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=List[schemas.RecordOut])
def list_records(
    category: Optional[models.RecordCategory] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Record).filter(models.Record.user_id == current_user.id)
    if category:
        query = query.filter(models.Record.category == category)
    if date_from:
        query = query.filter(models.Record.record_date >= date_from)
    if date_to:
        query = query.filter(models.Record.record_date <= date_to)
    return query.order_by(models.Record.record_date.desc()).all()


def _get_owned_record(record_id: str, db: Session, current_user: models.User) -> models.Record:
    record = (
        db.query(models.Record)
        .filter(models.Record.id == record_id, models.Record.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.get("/{record_id}", response_model=schemas.RecordOut)
def get_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _get_owned_record(record_id, db, current_user)


@router.get("/{record_id}/file")
def download_record_file(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    record = _get_owned_record(record_id, db, current_user)
    full_path = os.path.join(settings.storage_dir, record.file_url)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found in storage")
    return FileResponse(full_path)


@router.patch("/{record_id}", response_model=schemas.RecordOut)
def update_record(
    record_id: str,
    payload: schemas.RecordUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    record = _get_owned_record(record_id, db, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=204)
def delete_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    record = _get_owned_record(record_id, db, current_user)
    full_path = os.path.join(settings.storage_dir, record.file_url)
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(record)
    db.commit()
    return None
