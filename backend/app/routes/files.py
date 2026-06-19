from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.services.storage_service import StorageService

router = APIRouter(prefix="/files", tags=["files"])
storage_service = StorageService()


def _resolve_download_name(source_url: str, filename: str | None) -> str:
    if filename and filename.strip():
        return filename.strip()

    parsed = urlparse(source_url)
    candidate = Path(parsed.path).name
    return candidate or "findmyshot-download.jpg"


@router.get("/download")
def download_file(
    source_url: str = Query(..., min_length=1),
    filename: str | None = Query(default=None),
):
    try:
        object_key = storage_service.extract_object_key(source_url)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail="Geçersiz indirme bağlantısı.") from exc

    suffix = Path(urlparse(source_url).path).suffix or ".jpg"
    temp_file_path = storage_service.download_to_temp_file(object_key, suffix=suffix)
    return FileResponse(
        path=temp_file_path,
        filename=_resolve_download_name(source_url, filename),
        media_type="application/octet-stream",
        background=BackgroundTask(os.unlink, temp_file_path),
    )
