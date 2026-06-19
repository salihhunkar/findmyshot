from io import BytesIO

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from PIL import Image, ImageOps

from app.dependencies.auth import get_current_user
from app.database import get_db
from app.models import Event, Photo, User
from app.services.storage_service import StorageService
from app.utils.event_access import user_can_access_event
from app.workers.face_index_worker import process_uploaded_photo

router = APIRouter(prefix="/photos", tags=["photos"])
storage_service = StorageService()


class PhotoResponse(BaseModel):
    id: str
    event_id: str
    uploaded_by: dict[str, str | None] | None = None
    file_name: str
    original_url: str
    preview_url: str
    thumbnail_url: str
    processing_status: str
    faces_detected: int


class PhotoIndexResponse(BaseModel):
    photo_id: str
    status: str
    faces_detected: int


def sign_file_url(file_url: str) -> str:
    object_key = storage_service.extract_object_key(file_url)
    return storage_service.generate_download_url(object_key)


def build_variant_bytes(
    image_bytes: bytes,
    max_size: tuple[int, int],
    quality: int,
) -> bytes:
    with Image.open(BytesIO(image_bytes)) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        out = BytesIO()
        image.save(out, format="JPEG", quality=quality, optimize=True)
        return out.getvalue()


def to_photo_response(photo: Photo) -> PhotoResponse:
    try:
        signed_original = sign_file_url(photo.original_url)
    except RuntimeError:
        signed_original = photo.original_url

    return PhotoResponse(
        id=photo.id,
        event_id=photo.event_id,
        uploaded_by=_photo_uploaded_by_payload(photo.uploaded_by),
        file_name=photo.file_name,
        original_url=signed_original,
        preview_url=signed_original,
        thumbnail_url=signed_original,
        processing_status=photo.processing_status,
        faces_detected=photo.faces_detected,
    )


def _photo_uploaded_by_payload(user: User | None) -> dict[str, str | None] | None:
    if not user:
        return None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
    }


@router.get("/event/{event_id}")
def list_event_photos(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, list[PhotoResponse]]:
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

    items = db.scalars(
        select(Photo).where(Photo.event_id == event_id).order_by(Photo.created_at.desc())
    ).all()
    uploaded_by_ids = {item.uploaded_by_user_id for item in items if item.uploaded_by_user_id}
    users_by_id = (
        {
            user.id: user
            for user in db.scalars(select(User).where(User.id.in_(uploaded_by_ids))).all()
        }
        if uploaded_by_ids
        else {}
    )
    for item in items:
        if item.uploaded_by_user_id and item.uploaded_by is None:
            item.uploaded_by = users_by_id.get(item.uploaded_by_user_id)
    return {"items": [to_photo_response(item) for item in items]}


@router.post("/upload")
async def upload_photo(
    event_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, PhotoResponse]:
    event = db.scalar(select(Event).where(Event.id == event_id))
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

    file_name = file.filename or "unknown"
    content_type = file.content_type or "application/octet-stream"
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        original_stored = storage_service.upload_file(
            file_obj=BytesIO(file_bytes),
            file_name=file_name,
            content_type=content_type,
            folder=f"events/{event_id}/originals",
        )

        preview_bytes = build_variant_bytes(
            image_bytes=file_bytes,
            max_size=(1600, 1600),
            quality=82,
        )
        thumbnail_bytes = build_variant_bytes(
            image_bytes=file_bytes,
            max_size=(480, 480),
            quality=75,
        )
        preview_stored = storage_service.upload_file(
            file_obj=BytesIO(preview_bytes),
            file_name=f"{original_stored['file_name']}-preview.jpg",
            content_type="image/jpeg",
            folder=f"events/{event_id}/previews",
        )
        thumbnail_stored = storage_service.upload_file(
            file_obj=BytesIO(thumbnail_bytes),
            file_name=f"{original_stored['file_name']}-thumb.jpg",
            content_type="image/jpeg",
            folder=f"events/{event_id}/thumbnails",
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image processing failed: {exc}",
        ) from exc

    photo = Photo(
        event_id=event_id,
        uploaded_by_user_id=current_user.id,
        file_name=original_stored["file_name"],
        content_type=content_type,
        original_url=original_stored["url"],
        preview_url=preview_stored["url"],
        thumbnail_url=thumbnail_stored["url"],
        processing_status="queued",
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    try:
        process_uploaded_photo(photo.id)
        db.refresh(photo)
    except Exception as exc:
        db.refresh(photo)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Photo uploaded but indexing failed: {exc}",
        ) from exc

    return {
        "photo": to_photo_response(photo),
    }


@router.delete("/{photo_id}")
def delete_photo(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found.",
        )
    event = db.get(Event, photo.event_id)
    if not event or not (current_user.role == "admin" or event.owner_id == current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this photo.",
        )
    db.delete(photo)
    db.commit()
    return {"deleted": photo_id}


class BulkDeleteRequest(BaseModel):
    photo_ids: list[str]


@router.post("/bulk-delete")
def bulk_delete_photos(
    body: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    deleted = []
    for photo_id in body.photo_ids:
        photo = db.get(Photo, photo_id)
        if not photo:
            continue
        event = db.get(Event, photo.event_id)
        if not event or not (current_user.role == "admin" or event.owner_id == current_user.id):
            continue
        db.delete(photo)
        deleted.append(photo_id)
    db.commit()
    return {"deleted": deleted, "count": len(deleted)}


@router.post("/{photo_id}/index")
def index_photo(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PhotoIndexResponse:
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found.",
        )

    event = db.get(Event, photo.event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )
    if not user_can_access_event(current_user, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this photo.",
        )

    try:
        result = process_uploaded_photo(photo_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Indexing failed: {exc}",
        ) from exc

    return PhotoIndexResponse(**result)
