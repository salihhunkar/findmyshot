from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from app.database import SessionLocal
from app.models import Photo
from app.services.face_service import FaceService
from app.services.pinecone_service import PineconeService
from app.services.storage_service import StorageService

face_service = FaceService()
pinecone_service = PineconeService()
storage_service = StorageService()


def process_uploaded_photo(photo_id: str) -> dict[str, str | int]:
    db = SessionLocal()
    temp_path = None
    try:
        photo = db.get(Photo, photo_id)
        if not photo:
            raise RuntimeError("Photo not found for indexing.")

        photo.processing_status = "processing"
        db.add(photo)
        db.commit()
        db.refresh(photo)

        object_key = storage_service.extract_object_key(photo.original_url)
        temp_path = storage_service.download_to_temp_file(
            object_key=object_key,
            suffix=Path(photo.file_name).suffix,
        )
        embeddings = face_service.extract_embeddings(temp_path)

        vectors = []
        for face in embeddings:
            vector_id = f"{photo.event_id}:{photo.id}:{face['face_index']}:{uuid4().hex[:8]}"
            vectors.append(
                {
                    "id": vector_id,
                    "values": face["embedding"],
                    "metadata": {
                        "photo_id": photo.id,
                        "event_id": photo.event_id,
                        "photo_url": photo.original_url,
                        "preview_url": photo.preview_url,
                        "thumbnail_url": photo.thumbnail_url,
                        "face_index": face["face_index"],
                        "confidence": face["confidence"],
                    },
                }
            )

        pinecone_service.upsert_faces(vectors=vectors)

        photo.faces_detected = len(embeddings)
        photo.processing_status = "completed"
        db.add(photo)
        db.commit()
        return {
            "photo_id": photo.id,
            "status": photo.processing_status,
            "faces_detected": len(embeddings),
        }
    except Exception:
        db.rollback()
        photo = db.get(Photo, photo_id)
        if photo:
            photo.processing_status = "failed"
            db.add(photo)
            db.commit()
        raise
    finally:
        if temp_path:
            Path(temp_path).unlink(missing_ok=True)
        db.close()
