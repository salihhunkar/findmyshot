import json
import logging
from datetime import date
from urllib.parse import parse_qs, urlparse

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.database import get_db
from app.models import Event, EventAssignedPhotographer, Photo, User
from app.services.storage_service import StorageService
from app.utils.mailer import send_photographer_invite_email
from app.utils.event_access import build_accessible_events_query, user_can_access_event
from app.utils.security import hash_password

router = APIRouter(prefix="/events", tags=["events"])
storage_service = StorageService()
logger = logging.getLogger(__name__)


class EventLogoPlacement(BaseModel):
    x: int = 0
    y: int = 0
    size: int = 100


class EventSalesPricing(BaseModel):
    currency: str | None = None
    single_price: float | None = None
    pack_5_price: float | None = None
    pack_10_price: float | None = None
    pack_20_price: float | None = None
    pricing_note: str | None = None


class EventMaterials(BaseModel):
    covers: list[str] = Field(default_factory=list)
    selected_cover: str | None = None
    frame_horizontal: str | None = None
    frame_vertical: str | None = None
    frame_color: str | None = None
    frame_thickness: int = 28
    logo_asset: str | None = None
    qr_logo: str | None = None
    logo_placement: EventLogoPlacement = Field(default_factory=EventLogoPlacement)
    distribution_mode: str = "paid"
    sales_pricing: EventSalesPricing | None = None


class AssignedPhotographerPayload(BaseModel):
    id: str | None = None
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=1, max_length=255)
    password: str | None = Field(default=None, min_length=6)


class AssignedPhotographerResponse(BaseModel):
    id: str
    name: str
    email: str
    password: str | None = None


class EventCreateRequest(BaseModel):
    title: str
    slug: str
    event_date: date | None = None
    event_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    location: str | None = None
    status: str = "draft"
    materials: EventMaterials | None = None
    assigned_photographers: list[AssignedPhotographerPayload] | None = None


class EventUpdateRequest(BaseModel):
    title: str
    slug: str
    event_date: date | None = None
    event_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    location: str | None = None
    status: str = "draft"
    materials: EventMaterials | None = None
    assigned_photographers: list[AssignedPhotographerPayload] | None = None


class EventResponse(BaseModel):
    id: str
    owner_id: str | None
    title: str
    slug: str
    event_date: date | None
    event_time: str | None
    location: str | None
    status: str
    qr_code_url: str | None
    materials: EventMaterials | None = None
    assigned_photographers: list[AssignedPhotographerResponse] = Field(default_factory=list)


class EventListItem(BaseModel):
    id: str
    owner_id: str | None
    title: str
    slug: str
    event_date: date | None
    event_time: str | None
    location: str | None
    status: str
    qr_code_url: str | None
    materials: EventMaterials | None = None
    photo_count: int = 0
    assigned_photographers: list[AssignedPhotographerResponse] = Field(default_factory=list)


class PublicEventResponse(BaseModel):
    id: str
    title: str
    slug: str
    event_date: date | None
    event_time: str | None
    location: str | None
    status: str
    materials: EventMaterials | None = None


class PublicEventListItem(BaseModel):
    id: str
    title: str
    slug: str
    event_date: date | None
    event_time: str | None
    location: str | None
    status: str
    materials: EventMaterials | None = None
    photo_count: int = 0


class EventSummaryResponse(BaseModel):
    total_events: int
    total_photos: int
    total_faces: int
    cover_ready_events: int
    media_ready_events: int
    upcoming_events: int
    past_events: int
    draft_events: int
    photographer_count: int


def parse_event_materials(value: str | None) -> EventMaterials | None:
    if not value:
        return None
    try:
        return EventMaterials.model_validate(json.loads(value))
    except (json.JSONDecodeError, ValueError):
        return None


def sign_material_url(file_url: str | None) -> str | None:
    if not file_url:
        return None
    if file_url.startswith("data:") or file_url.startswith("blob:"):
        return file_url
    query = parse_qs(urlparse(file_url).query)
    if "X-Amz-Signature" in query:
        return file_url
    try:
        object_key = storage_service.extract_object_key(file_url)
        return storage_service.generate_download_url(object_key)
    except RuntimeError:
        return file_url


def sign_event_materials(materials: EventMaterials | None) -> EventMaterials | None:
    if materials is None:
        return None

    payload = materials.model_dump()
    payload["selected_cover"] = sign_material_url(materials.selected_cover)
    payload["covers"] = [
        signed
        for signed in (sign_material_url(item) for item in materials.covers)
        if signed is not None
    ]
    payload["logo_asset"] = sign_material_url(materials.logo_asset)
    payload["qr_logo"] = sign_material_url(materials.qr_logo)
    return EventMaterials.model_validate(payload)


def serialize_assigned_photographer(
    assignment: EventAssignedPhotographer,
) -> AssignedPhotographerResponse:
    return AssignedPhotographerResponse(
        id=assignment.id,
        name=assignment.photographer_name,
        email=assignment.photographer_email,
        password=assignment.password_plaintext,
    )


def sync_event_assigned_photographers(
    db: Session,
    event: Event,
    photographers: list[AssignedPhotographerPayload] | None,
) -> None:
    if photographers is None:
        return

    cleaned_photographers = [
        photographer
        for photographer in photographers
        if photographer.name.strip() and photographer.email.strip()
    ]
    emails = {photographer.email.strip().lower() for photographer in cleaned_photographers}
    users_by_email = (
        {
            user.email.lower(): user
            for user in db.scalars(select(User).where(User.email.in_(emails))).all()
        }
        if emails
        else {}
    )

    event.assigned_photographers.clear()
    db.flush()
    for photographer in cleaned_photographers:
        normalized_email = photographer.email.strip().lower()
        matched_user = users_by_email.get(normalized_email)
        password = photographer.password.strip() if photographer.password else ""
        stored_password = password or None
        if matched_user is None:
            if not password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{photographer.email} icin sifre gerekli.",
                )
            matched_user = User(
                email=normalized_email,
                password_hash=hash_password(password),
                full_name=photographer.name.strip(),
                role="photographer",
            )
            db.add(matched_user)
            db.flush()
            users_by_email[normalized_email] = matched_user
        elif matched_user.role != "admin":
            if password:
                matched_user.password_hash = hash_password(password)
            if not matched_user.full_name:
                matched_user.full_name = photographer.name.strip()
        event.assigned_photographers.append(
            EventAssignedPhotographer(
                user_id=matched_user.id if matched_user else None,
                photographer_name=photographer.name.strip(),
                photographer_email=normalized_email,
                password_plaintext=stored_password,
            )
        )


def send_event_photographer_invites(
    *,
    event: Event,
    photographers: list[AssignedPhotographerPayload] | None,
) -> None:
    if not photographers:
        return

    for photographer in photographers:
        name = photographer.name.strip()
        email = photographer.email.strip().lower()
        password = photographer.password.strip() if photographer.password else ""
        if not name or not email or not password:
            continue

        try:
            send_photographer_invite_email(
                photographer_name=name,
                photographer_email=email,
                password=password,
                event_title=event.title,
                event_slug=event.slug,
            )
        except Exception as exc:  # pragma: no cover - delivery is best-effort
            logger.warning(
                "Photographer invite email could not be sent to %s for event %s: %s",
                email,
                event.slug,
                exc,
            )


def serialize_event(event: Event) -> EventResponse:
    signed_materials = sign_event_materials(parse_event_materials(event.materials_json))
    return EventResponse(
        id=event.id,
        owner_id=event.owner_id,
        title=event.title,
        slug=event.slug,
        event_date=event.event_date,
        event_time=event.event_time,
        location=event.location,
        status=event.status,
        qr_code_url=event.qr_code_url,
        materials=signed_materials,
        assigned_photographers=[
            serialize_assigned_photographer(item)
            for item in event.assigned_photographers
        ],
    )


def serialize_public_event(event: Event) -> PublicEventResponse:
    signed_materials = sign_event_materials(parse_event_materials(event.materials_json))
    return PublicEventResponse(
        id=event.id,
        title=event.title,
        slug=event.slug,
        event_date=event.event_date,
        event_time=event.event_time,
        location=event.location,
        status=event.status,
        materials=signed_materials,
    )


def _photo_uploaded_by_payload(user: User | None) -> dict[str, str | None] | None:
    if not user:
        return None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
    }


def build_photo_count_map(db: Session, event_ids: list[str]) -> dict[str, int]:
    if not event_ids:
        return {}

    rows = db.execute(
        select(Photo.event_id, func.count(Photo.id))
        .where(Photo.event_id.in_(event_ids))
        .group_by(Photo.event_id)
    ).all()
    return {event_id: count for event_id, count in rows}


def serialize_event_list_item(event: Event, photo_count: int = 0) -> EventListItem:
    signed_materials = sign_event_materials(parse_event_materials(event.materials_json))
    return EventListItem(
        id=event.id,
        owner_id=event.owner_id,
        title=event.title,
        slug=event.slug,
        event_date=event.event_date,
        event_time=event.event_time,
        location=event.location,
        status=event.status,
        qr_code_url=event.qr_code_url,
        materials=signed_materials,
        photo_count=photo_count,
        assigned_photographers=[
            serialize_assigned_photographer(item)
            for item in event.assigned_photographers
        ],
    )


def serialize_public_event_list_item(
    event: Event,
    photo_count: int = 0,
) -> PublicEventListItem:
    signed_materials = sign_event_materials(parse_event_materials(event.materials_json))
    return PublicEventListItem(
        id=event.id,
        title=event.title,
        slug=event.slug,
        event_date=event.event_date,
        event_time=event.event_time,
        location=event.location,
        status=event.status,
        materials=signed_materials,
        photo_count=photo_count,
    )


@router.get("")
def list_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, list[EventListItem]]:
    query = build_accessible_events_query(current_user).order_by(Event.created_at.desc())

    items = db.scalars(query).all()
    photo_count_map = build_photo_count_map(db, [item.id for item in items])
    return {
        "items": [
            serialize_event_list_item(item, photo_count_map.get(item.id, 0))
            for item in items
        ]
    }


@router.get("/public-feed")
def list_public_events(
    limit: int = 4,
    status_filter: str = "published",
    db: Session = Depends(get_db),
) -> dict[str, list[PublicEventListItem]]:
    safe_limit = max(1, min(limit, 12))
    query = select(Event).order_by(Event.created_at.desc())
    if status_filter != "all":
        query = query.where(Event.status == status_filter)

    items = db.scalars(query.limit(safe_limit)).all()
    photo_count_map = build_photo_count_map(db, [item.id for item in items])
    return {
        "items": [
            serialize_public_event_list_item(item, photo_count_map.get(item.id, 0))
            for item in items
        ]
    }


@router.get("/dashboard-summary")
def get_event_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, EventSummaryResponse]:
    query = build_accessible_events_query(current_user).order_by(Event.created_at.desc())

    items = db.scalars(query).all()
    event_ids = [item.id for item in items]

    if event_ids:
        photo_count_map = build_photo_count_map(db, event_ids)
        total_photos, total_faces = db.execute(
            select(
                func.count(Photo.id),
                func.coalesce(func.sum(Photo.faces_detected), 0),
            ).where(Photo.event_id.in_(event_ids))
        ).one()
    else:
        photo_count_map = {}
        total_photos, total_faces = 0, 0

    summary = EventSummaryResponse(
        total_events=len(items),
        total_photos=int(total_photos or 0),
        total_faces=int(total_faces or 0),
        cover_ready_events=sum(
            1
            for item in items
            if (
                materials := parse_event_materials(item.materials_json)
            ) is not None
            and ((materials.selected_cover is not None) or len(materials.covers) > 0)
        ),
        media_ready_events=sum(1 for item in items if photo_count_map.get(item.id, 0) > 0),
        upcoming_events=sum(
            1
            for item in items
            if item.event_date is not None and item.event_date >= date.today()
        ),
        past_events=sum(
            1 for item in items if item.event_date is not None and item.event_date < date.today()
        ),
        draft_events=sum(1 for item in items if item.status == "draft"),
        photographer_count=len({item.owner_id for item in items if item.owner_id}),
    )
    return {"summary": summary}


@router.get("/slug/{slug}")
def get_event_by_slug(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, EventResponse]:
    event = db.scalar(select(Event).where(Event.slug == slug))
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )
    if not user_can_access_event(current_user, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this event.",
        )

    return {"event": serialize_event(event)}


@router.post("")
def create_event(
    payload: EventCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, EventResponse]:
    existing = db.scalar(select(Event).where(Event.slug == payload.slug))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event slug already exists.",
        )

    event = Event(
        owner_id=current_user.id,
        title=payload.title,
        slug=payload.slug,
        event_date=payload.event_date,
        event_time=payload.event_time,
        location=payload.location,
        status=payload.status,
        qr_code_url=f"/e/{payload.slug}",
        materials_json=payload.materials.model_dump_json() if payload.materials else None,
    )
    db.add(event)
    sync_event_assigned_photographers(db, event, payload.assigned_photographers)
    db.commit()
    db.refresh(event)
    send_event_photographer_invites(event=event, photographers=payload.assigned_photographers)

    return {
        "event": serialize_event(event),
    }


@router.put("/{event_id}")
def update_event(
    event_id: str,
    payload: EventUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, EventResponse]:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )
    if not user_can_access_event(current_user, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this event.",
        )

    existing = db.scalar(
        select(Event).where(Event.slug == payload.slug, Event.id != event_id)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event slug already exists.",
        )

    event.title = payload.title
    event.slug = payload.slug
    event.event_date = payload.event_date
    event.event_time = payload.event_time
    event.location = payload.location
    event.status = payload.status
    event.qr_code_url = f"/e/{payload.slug}"
    # Preserve existing materials unless the client explicitly sends the `materials` field.
    if "materials" in payload.model_fields_set:
        event.materials_json = (
            payload.materials.model_dump_json() if payload.materials else None
        )
    sync_event_assigned_photographers(db, event, payload.assigned_photographers)
    db.commit()
    db.refresh(event)
    send_event_photographer_invites(event=event, photographers=payload.assigned_photographers)

    return {
        "event": serialize_event(event),
    }


@router.get("/public/{slug}")
def get_public_event(slug: str, db: Session = Depends(get_db)) -> dict[str, PublicEventResponse]:
    event = db.scalar(select(Event).where(Event.slug == slug))
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )
    if event.status == "draft":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event is not published.",
        )

    return {
        "event": serialize_public_event(event),
    }


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )
    if current_user.role != "admin" and event.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this event.",
        )

    db.delete(event)
    db.commit()
