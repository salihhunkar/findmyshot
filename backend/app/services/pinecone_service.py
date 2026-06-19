from __future__ import annotations

from app.config import get_settings


class PineconeService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None
        self._index = None

    def upsert_faces(self, vectors: list[dict], namespace: str | None = None) -> int:
        if not vectors:
            return 0

        index = self._get_index()
        response = index.upsert(
            vectors=vectors,
            namespace=namespace or self.settings.pinecone_namespace,
        )
        if hasattr(response, "upserted_count"):
            return response.upserted_count
        if isinstance(response, dict):
            return response.get("upserted_count", len(vectors))
        return len(vectors)

    def search_faces(
        self,
        vector: list[float],
        namespace: str | None = None,
        top_k: int = 20,
        filters: dict | None = None,
    ) -> list[dict]:
        index = self._get_index()
        response = index.query(
            vector=vector,
            namespace=namespace or self.settings.pinecone_namespace,
            top_k=top_k,
            include_values=False,
            include_metadata=True,
            filter=filters,
        )
        matches = response.matches if hasattr(response, "matches") else response.get("matches", [])
        normalized_matches: list[dict] = []
        for match in matches:
            if isinstance(match, dict):
                normalized_matches.append(match)
                continue

            normalized_matches.append(
                {
                    "id": getattr(match, "id", ""),
                    "score": getattr(match, "score", 0.0),
                    "metadata": getattr(match, "metadata", {}) or {},
                }
            )
        return normalized_matches

    def _get_index(self):
        if self._index is None:
            client = self._get_client()
            if self.settings.pinecone_index_host:
                self._index = client.Index(host=self.settings.pinecone_index_host)
            else:
                self._index = client.Index(name=self.settings.pinecone_index_name)
        return self._index

    def _get_client(self):
        if self._client is None:
            if not self.settings.pinecone_api_key:
                raise RuntimeError("PINECONE_API_KEY is not configured.")
            if not self.settings.pinecone_index_name:
                raise RuntimeError("PINECONE_INDEX_NAME is not configured.")

            from pinecone import Pinecone

            self._client = Pinecone(api_key=self.settings.pinecone_api_key)
        return self._client
