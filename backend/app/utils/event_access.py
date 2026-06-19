from sqlalchemy import or_, select

from app.models import Event, EventAssignedPhotographer, User


def build_accessible_events_query(current_user: User):
    query = select(Event)
    
    # Admin da dahil, herkes sadece kendi event'lerini + atanmış olduğu event'leri görsün
    return query.where(
        or_(
            Event.owner_id == current_user.id,
            Event.assigned_photographers.any(
                or_(
                    EventAssignedPhotographer.user_id == current_user.id,
                    EventAssignedPhotographer.photographer_email == current_user.email,
                )
            ),
        )
    )


def user_can_access_event(current_user: User, event: Event) -> bool:
    if current_user.role == "admin":
        return True
    if event.owner_id == current_user.id:
        return True
    return any(
        assignment.user_id == current_user.id
        or assignment.photographer_email == current_user.email
        for assignment in event.assigned_photographers
    )
