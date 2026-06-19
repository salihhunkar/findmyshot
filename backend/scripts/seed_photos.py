from pathlib import Path
import sys
from datetime import datetime

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal, init_db
from app.models import Photo, Event, User


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        # Get events
        gusto_event = db.query(Event).filter(Event.id == "gusto-furniture-event").first()
        liwa_event = db.query(Event).filter(Event.id == "liwa-fest").first()
        
        if not gusto_event or not liwa_event:
            print("Events not found!")
            return
        
        # Create test photos for each event
        events_data = [
            (gusto_event, "gusto-photo-1.jpg"),
            (gusto_event, "gusto-photo-2.jpg"),
            (liwa_event, "liwa-photo-1.jpg"),
            (liwa_event, "liwa-photo-2.jpg"),
        ]
        
        for event, filename in events_data:
            # Check if photo already exists
            existing = db.query(Photo).filter(
                Photo.event_id == event.id,
                Photo.file_name == filename
            ).first()
            
            if existing:
                print(f"Photo already exists: {filename}")
                continue
            
            photo = Photo(
                event_id=event.id,
                file_name=filename,
                original_url=f"https://storage.example.com/{event.id}/{filename}",
                preview_url=f"https://storage.example.com/{event.id}/preview-{filename}",
                thumbnail_url=f"https://storage.example.com/{event.id}/thumb-{filename}",
                processing_status="done",
                faces_detected=1,
                uploaded_by_user_id=event.owner_id,
            )
            db.add(photo)
            db.commit()
            print(f"Seeded photo: {filename} for event {event.id}")
        
    finally:
        db.close()


if __name__ == "__main__":
    main()
