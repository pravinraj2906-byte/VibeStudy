import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import LearningAnalyticsOverview
from app.services.analytics.analytics_service import AnalyticsService

router = APIRouter()
logger = logging.getLogger("proofforge.api.analytics")

@router.get(
    "/overview",
    response_model=LearningAnalyticsOverview,
    summary="Get user learning analytics and demonstrated competency metrics"
)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return AnalyticsService.get_user_overview(db, current_user.id)
