from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urlparse
from uuid import uuid4

from app.config import get_settings


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None

    def upload_file(
        self,
        file_obj,
        file_name: str,
        content_type: str,
        folder: str,
    ) -> dict[str, str]:
        safe_name = self._safe_file_name(file_name)
        object_key = f"{folder.rstrip('/')}/{uuid4()}-{safe_name}"
        client = self._get_client()
        file_obj.seek(0)
        client.upload_fileobj(
            file_obj,
            self.settings.storage_bucket_name,
            object_key,
            ExtraArgs={"ContentType": content_type},
        )
        return {
            "file_name": safe_name,
            "content_type": content_type,
            "object_key": object_key,
            "url": self.build_object_url(object_key),
        }

    def build_object_url(self, object_key: str) -> str:
        endpoint = self.settings.storage_endpoint_url.rstrip("/")
        bucket = self.settings.storage_bucket_name
        return f"{endpoint}/{bucket}/{object_key}"

    def generate_download_url(self, object_key: str, expires_in: int = 3600) -> str:
        client = self._get_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.settings.storage_bucket_name, "Key": object_key},
            ExpiresIn=expires_in,
        )

    def extract_object_key(self, file_url: str) -> str:
        parsed = urlparse(file_url)
        expected_prefix = f"/{self.settings.storage_bucket_name}/"
        if not parsed.path.startswith(expected_prefix):
            raise RuntimeError("Could not derive object key from file URL.")
        return parsed.path.removeprefix(expected_prefix)

    def download_to_temp_file(self, object_key: str, suffix: str = "") -> str:
        client = self._get_client()
        temp_file = NamedTemporaryFile(suffix=suffix, delete=False)
        try:
            client.download_fileobj(
                self.settings.storage_bucket_name,
                object_key,
                temp_file,
            )
            temp_file.flush()
            return temp_file.name
        finally:
            temp_file.close()

    def _get_client(self):
        if self._client is None:
            if not self.settings.storage_endpoint_url:
                raise RuntimeError("STORAGE_ENDPOINT_URL is not configured.")
            if not self.settings.storage_access_key or not self.settings.storage_secret_key:
                raise RuntimeError("R2 credentials are not configured.")

            import boto3

            self._client = boto3.client(
                service_name="s3",
                endpoint_url=self.settings.storage_endpoint_url,
                aws_access_key_id=self.settings.storage_access_key,
                aws_secret_access_key=self.settings.storage_secret_key,
                region_name=self.settings.storage_region,
            )
        return self._client

    def _safe_file_name(self, file_name: str) -> str:
        ext = Path(file_name).suffix.lower()
        stem = Path(file_name).stem.lower().replace(" ", "-")
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        return f"{stem}-{timestamp}{ext}"
