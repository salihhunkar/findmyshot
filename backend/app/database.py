from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

engine_kwargs = {"pool_pre_ping": True}
if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from app.models import (  # noqa: F401
        Download,
        Event,
        EventAssignedPhotographer,
        OnboardingProfile,
        Order,
        Photo,
        SavedViewTemplate,
        SavedViewTemplateVersion,
        User,
        UserSavedView,
    )

    Base.metadata.create_all(bind=engine)

    # Keep the local SQLite schema forward-compatible without a full migration tool.
    if settings.database_url.startswith("sqlite"):
        inspector = inspect(engine)
        columns = {column["name"] for column in inspector.get_columns("events")}
        with engine.begin() as connection:
            if "materials_json" not in columns:
                connection.execute(text("ALTER TABLE events ADD COLUMN materials_json TEXT"))
            if "event_time" not in columns:
                connection.execute(text("ALTER TABLE events ADD COLUMN event_time VARCHAR(5)"))
        if "user_saved_views" in inspector.get_table_names():
            saved_view_columns = {
                column["name"] for column in inspector.get_columns("user_saved_views")
            }
            with engine.begin() as connection:
                if "category" not in saved_view_columns:
                    connection.execute(
                        text("ALTER TABLE user_saved_views ADD COLUMN category VARCHAR(120)")
                    )
                if "shared_with_team" not in saved_view_columns:
                    connection.execute(
                        text(
                            "ALTER TABLE user_saved_views ADD COLUMN shared_with_team BOOLEAN DEFAULT 0"
                        )
                    )
        if "saved_view_templates" in inspector.get_table_names():
            template_columns = {
                column["name"] for column in inspector.get_columns("saved_view_templates")
            }
            with engine.begin() as connection:
                if "status" not in template_columns:
                    connection.execute(
                        text(
                            "ALTER TABLE saved_view_templates ADD COLUMN status VARCHAR(30) DEFAULT 'draft'"
                        )
                    )
                if "version" not in template_columns:
                    connection.execute(
                        text(
                            "ALTER TABLE saved_view_templates ADD COLUMN version INTEGER DEFAULT 1"
                        )
                    )
                if "change_note" not in template_columns:
                    connection.execute(
                        text(
                            "ALTER TABLE saved_view_templates ADD COLUMN change_note VARCHAR(255)"
                        )
                    )
        if "saved_view_template_versions" in inspector.get_table_names():
            template_version_columns = {
                column["name"]
                for column in inspector.get_columns("saved_view_template_versions")
            }
            with engine.begin() as connection:
                if "change_note" not in template_version_columns:
                    connection.execute(
                        text(
                            "ALTER TABLE saved_view_template_versions ADD COLUMN change_note VARCHAR(255)"
                        )
                    )
        if "photos" in inspector.get_table_names():
            photo_columns = {column["name"] for column in inspector.get_columns("photos")}
            with engine.begin() as connection:
                if "uploaded_by_user_id" not in photo_columns:
                    connection.execute(
                        text(
                            "ALTER TABLE photos ADD COLUMN uploaded_by_user_id VARCHAR(36)"
                        )
                    )
        if "event_assigned_photographers" in inspector.get_table_names():
            assignment_columns = {
                column["name"]
                for column in inspector.get_columns("event_assigned_photographers")
            }
            with engine.begin() as connection:
                if "password_plaintext" not in assignment_columns:
                    connection.execute(
                        text(
                            "ALTER TABLE event_assigned_photographers ADD COLUMN password_plaintext VARCHAR(255)"
                        )
                    )


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
