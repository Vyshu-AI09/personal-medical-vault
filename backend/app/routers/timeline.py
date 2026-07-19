from collections import OrderedDict
from typing import Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("", response_model=Dict[str, List[schemas.RecordOut]])
def get_timeline(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns records grouped by year-month, most recent first.
    e.g. { "2025-03": [...], "2025-01": [...] }
    """
    records = (
        db.query(models.Record)
        .filter(models.Record.user_id == current_user.id)
        .order_by(models.Record.record_date.desc())
        .all()
    )

    grouped: "OrderedDict[str, List[models.Record]]" = OrderedDict()
    for record in records:
        key = record.record_date.strftime("%Y-%m")
        grouped.setdefault(key, []).append(record)

    return grouped
