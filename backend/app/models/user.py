import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="photographer")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    events = relationship("Event", back_populates="owner")
    onboarding_profile = relationship(
        "OnboardingProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    saved_views = relationship(
        "UserSavedView",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    event_assignments = relationship(
        "EventAssignedPhotographer",
        back_populates="user",
    )
