import json
from io import BytesIO
from urllib.parse import parse_qs, urlparse

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Event, Photo
from app.services.face_service import FaceService
from app.services.pinecone_service import PineconeService
from app.services.storage_service import StorageService

router = APIRouter(prefix="/search", tags=["search"])
settings = get_settings()
face_service = FaceService()
pinecone_service = PineconeService()
storage_service = StorageService()


class FaceMatch(BaseModel):
    vector_id: str
    score: float
    photo_id: str | None = None
    event_id: str | None = None
    photo_url: str | None = None
    preview_url: str | None = None
    thumbnail_url: str | None = None


class SearchResponse(BaseModel):
    event_id: str
    selfie_url: str
    matches: list[FaceMatch]


def sign_file_url(file_url: str | None) -> str | None:
    if not file_url:
        return None
    if "variant" in parse_qs(urlparse(file_url).query):
        return None

    try:
        object_key = storage_service.extract_object_key(file_url)
        return storage_service.generate_download_url(object_key)
    except RuntimeError:
        return file_url


def normalize_matches(raw_matches: list[dict]) -> list[FaceMatch]:
    best_by_photo: dict[str, FaceMatch] = {}

    for match in raw_matches:
        score = float(match.get("score", 0.0))
        if score < settings.face_match_threshold:
            continue

        metadata = match.get("metadata", {}) or {}
        photo_id = metadata.get("photo_id")
        if not photo_id:
            continue

        candidate = FaceMatch(
            vector_id=match.get("id", ""),
            score=score,
            photo_id=photo_id,
            event_id=metadata.get("event_id"),
            photo_url=None,
            preview_url=None,
            thumbnail_url=None,
        )

        existing = best_by_photo.get(photo_id)
        if existing is None or candidate.score > existing.score:
            best_by_photo[photo_id] = candidate

    ranked = sorted(
        best_by_photo.values(),
        key=lambda item: item.score,
        reverse=True,
    )
    return ranked[: settings.face_match_limit]


def is_event_free_distribution(event: Event) -> bool:
    if not event.materials_json:
        return False

    try:
        payload = json.loads(event.materials_json)
    except json.JSONDecodeError:
        return False

    return payload.get("distribution_mode") == "free"


@router.post("/selfie")
async def search_by_selfie(
    event_id: str = Form(...),
    selfie: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> SearchResponse:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )

    content_type = selfie.content_type or "application/octet-stream"
    try:
        selfie_bytes = await selfie.read()
        stored = storage_service.upload_file(
            file_obj=BytesIO(selfie_bytes),
            file_name=selfie.filename or "selfie.jpg",
            content_type=content_type,
            folder=f"events/{event_id}/selfies",
        )
        primary_face = face_service.extract_primary_embedding_from_bytes(
            selfie_bytes,
            selfie.filename or "selfie.jpg",
        )
        matches = pinecone_service.search_faces(
            vector=primary_face["embedding"],
            namespace=settings.pinecone_namespace,
            top_k=settings.pinecone_top_k,
            filters={"event_id": {"$eq": event_id}},
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Search failed: {exc}",
        ) from exc

    normalized_matches = normalize_matches(matches)
    photo_ids = [match.photo_id for match in normalized_matches if match.photo_id]
    photos_by_id: dict[str, Photo] = {}
    if photo_ids:
        photos = db.scalars(select(Photo).where(Photo.id.in_(photo_ids))).all()
        photos_by_id = {photo.id: photo for photo in photos}

    for match in normalized_matches:
        if not match.photo_id:
            continue
        photo = photos_by_id.get(match.photo_id)
        if not photo:
            continue
        match.preview_url = sign_file_url(photo.preview_url)
        match.thumbnail_url = sign_file_url(photo.thumbnail_url)

    if is_event_free_distribution(event):
        for match in normalized_matches:
            if not match.photo_id:
                continue
            photo = photos_by_id.get(match.photo_id)
            if not photo:
                continue
            match.photo_url = sign_file_url(photo.original_url)
    elif normalized_matches and normalized_matches[0].photo_id:
        free_photo = photos_by_id.get(normalized_matches[0].photo_id)
        if free_photo:
            normalized_matches[0].photo_url = sign_file_url(free_photo.original_url)

    return SearchResponse(
        event_id=event_id,
        selfie_url=stored["url"],
        matches=normalized_matches,
    )
