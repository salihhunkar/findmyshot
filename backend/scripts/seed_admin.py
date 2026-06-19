from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal, init_db
from app.models import User, Event
from app.utils.security import hash_password


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        # Create admin user
        existing_user = db.query(User).filter(User.email == "admin@findmyshot.app").first()
        if not existing_user:
            user = User(
                email="admin@findmyshot.app",
                full_name="FindMyShot Admin",
                role="admin",
                password_hash=hash_password("admin123"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print("Seeded admin user: admin@findmyshot.app / admin123")
        else:
            user = existing_user
            print("Admin user already exists: admin@findmyshot.app")

        # Create test events
        events = [
            {
                "id": "gusto-furniture-event",
                "title": "Gusto Furniture Etkinliği",
                "slug": "gusto-furniture-event",
                "status": "published",
            },
            {
                "id": "liwa-fest",
                "title": "Liwa International Festival",
                "slug": "liwa-fest",
                "status": "published",
            },
        ]

        for event_data in events:
            existing_event = db.query(Event).filter(Event.id == event_data["id"]).first()
            if not existing_event:
                event = Event(
                    id=event_data["id"],
                    title=event_data["title"],
                    slug=event_data["slug"],
                    status=event_data["status"],
                    owner_id=user.id,
                )
                db.add(event)
                db.commit()
                print(f"Seeded event: {event_data['title']} ({event_data['id']})")
            else:
                print(f"Event already exists: {event_data['id']}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
