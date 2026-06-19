from __future__ import annotations

from io import BytesIO
from pathlib import Path
from tempfile import NamedTemporaryFile

from app.config import get_settings


class FaceService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._app = None

    def extract_embeddings(self, image_path: str) -> list[dict]:
        import cv2

        image = cv2.imread(image_path)
        if image is None:
            raise RuntimeError("Image could not be read for face extraction.")

        faces = self._get_app().get(image)
        embeddings: list[dict] = []
        for index, face in enumerate(faces):
            bbox = [float(value) for value in face.bbox.tolist()]
            embeddings.append(
                {
                    "face_index": index,
                    "bbox": bbox,
                    "confidence": float(face.det_score),
                    "embedding": face.embedding.tolist(),
                }
            )
        return embeddings

    def extract_primary_embedding_from_upload(self, upload_file) -> dict:
        suffix = Path(upload_file.filename or "selfie.jpg").suffix or ".jpg"
        upload_file.file.seek(0)
        with NamedTemporaryFile(suffix=suffix, delete=True) as temp_file:
            temp_file.write(upload_file.file.read())
            temp_file.flush()
            embeddings = self.extract_embeddings(temp_file.name)

        if not embeddings:
            raise RuntimeError("No face detected in uploaded image.")

        return max(embeddings, key=lambda item: item["confidence"])

    def extract_primary_embedding_from_bytes(self, file_bytes: bytes, file_name: str) -> dict:
        suffix = Path(file_name or "selfie.jpg").suffix or ".jpg"
        with NamedTemporaryFile(suffix=suffix, delete=True) as temp_file:
            temp_file.write(file_bytes)
            temp_file.flush()
            embeddings = self.extract_embeddings(temp_file.name)

        if not embeddings:
            raise RuntimeError("No face detected in uploaded image.")

        return max(embeddings, key=lambda item: item["confidence"])

    def _get_app(self):
        if self._app is None:
            from insightface.app import FaceAnalysis

            self._app = FaceAnalysis(
                name=self.settings.face_model_name,
                providers=[self.settings.face_provider],
            )
            self._app.prepare(ctx_id=0, det_size=(self.settings.face_detection_size,) * 2)
        return self._app
