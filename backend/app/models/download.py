import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Download(Base):
    __tablename__ = "downloads"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    order_id: Mapped[str] = mapped_column(String(36), ForeignKey("orders.id"), index=True)
    photo_id: Mapped[str] = mapped_column(String(36), ForeignKey("photos.id"), index=True)
    access_type: Mapped[str] = mapped_column(String(50), default="purchase")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    order = relationship("Order", back_populates="downloads")
    photo = relationship("Photo", back_populates="downloads")
