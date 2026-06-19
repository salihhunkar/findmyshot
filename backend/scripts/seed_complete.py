#!/usr/bin/env python3
"""
Comprehensive seed script for FindMyShot.
Creates admin user, photographers, events with materials, and guest photos.
"""
import json
import sys
from datetime import datetime, date
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal, init_db
from app.models.user import User
from app.models.event import Event
from app.models.photo import Photo
from app.models.event_assigned_photographer import EventAssignedPhotographer
from app.utils.security import hash_password


def seed_complete():
    """Seed comprehensive test data."""
    init_db()
    session = SessionLocal()

    try:
        # === USERS ===
        # Check if admin exists
        admin = session.query(User).filter(User.email == "admin@findmyshot.app").first()
        if not admin:
            admin = User(
                email="admin@findmyshot.app",
                full_name="FindMyShot Admin",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            session.add(admin)
            session.commit()
            print(f"✓ Admin: {admin.email}")
        else:
            print(f"✓ Admin already exists: {admin.email}")

        # Photographer users
        photographers_data = [
            {
                "email": "ayse.ozturk@findmyshot.app",
                "full_name": "Ayşe Öztürk",
            },
            {
                "email": "mehmet.kaya@findmyshot.app",
                "full_name": "Mehmet Kaya",
            },
        ]

        photographers = {}
        for ph_data in photographers_data:
            ph = session.query(User).filter(User.email == ph_data["email"]).first()
            if not ph:
                ph = User(
                    email=ph_data["email"],
                    full_name=ph_data["full_name"],
                    password_hash=hash_password("photo123"),
                    role="photographer",
                )
                session.add(ph)
                session.commit()
                print(f"✓ Photographer: {ph.full_name} ({ph.email})")
            photographers[ph_data["email"]] = ph

        # === EVENTS ===
        events_data = [
            {
                "title": "Liwa International Festival 2026",
                "slug": "liwa-international-festival-2026",
                "location": "Dubai, UAE",
                "event_date": date(2026, 3, 31),
                "cover_file": "/Users/folajans/Desktop/findmyshot/Liwa-International-Festival-_193c55bd97f_large.avif",
            },
            {
                "title": "Gusto Furniture Showcase",
                "slug": "gusto-furniture-showcase-2026",
                "location": "İstanbul, Turkey",
                "event_date": date(2026, 4, 15),
                "cover_file": None,  # No cover image for this one
            },
        ]

        events = {}
        for event_data in events_data:
            event = session.query(Event).filter(Event.slug == event_data["slug"]).first()
            if not event:
                # Build materials JSON
                materials = {
                    "covers": [],
                    "selected_cover": None,
                    "frames": [],
                    "logos": [],
                }

                # Add cover if file exists
                if event_data["cover_file"] and Path(event_data["cover_file"]).exists():
                    cover_url = event_data["cover_file"]
                    materials["covers"] = [
                        {
                            "id": "cover-1",
                            "url": cover_url,
                            "name": Path(cover_url).name,
                        }
                    ]
                    materials["selected_cover"] = "cover-1"

                event = Event(
                    owner_id=admin.id,
                    title=event_data["title"],
                    slug=event_data["slug"],
                    location=event_data["location"],
                    event_date=event_data["event_date"],
                    status="published",
                    materials_json=json.dumps(materials),
                )
                session.add(event)
                session.commit()
                print(
                    f"✓ Event: {event.title} ({event.slug}) - {event.event_date}"
                )
            events[event_data["slug"]] = event

        # === PHOTOGRAPHER ASSIGNMENTS ===
        for idx, (slug, event) in enumerate(events.items()):
            # Assign first photographer to first event, second to second
            ph_email = photographers_data[idx % len(photographers_data)]["email"]
            photographer = photographers[ph_email]

            # Check if assignment already exists
            existing = session.query(EventAssignedPhotographer).filter(
                EventAssignedPhotographer.event_id == event.id,
                EventAssignedPhotographer.user_id == photographer.id,
            ).first()

            if not existing:
                assignment = EventAssignedPhotographer(
                    event_id=event.id,
                    user_id=photographer.id,
                    photographer_name=photographer.full_name,
                    photographer_email=photographer.email,
                    password_plaintext="photo123",
                )
                session.add(assignment)
                session.commit()
                print(
                    f"✓ Assignment: {photographer.full_name} → {event.title}"
                )

        # === GUEST PHOTOS ===
        # Realistic guest photo data
        photos_data = [
            # Liwa International Festival
            {
                "event_slug": "liwa-international-festival-2026",
                "file_name": "guest-aisha-khan-selfie.jpg",
                "original_url": "https://storage.example.com/liwa-2026/guest-aisha-khan-selfie.jpg",
                "preview_url": "https://storage.example.com/liwa-2026/preview-guest-aisha-khan-selfie.jpg",
                "thumbnail_url": "https://storage.example.com/liwa-2026/thumb-guest-aisha-khan-selfie.jpg",
                "faces_detected": 1,
            },
            {
                "event_slug": "liwa-international-festival-2026",
                "file_name": "guest-ali-group-photo.jpg",
                "original_url": "https://storage.example.com/liwa-2026/guest-ali-group-photo.jpg",
                "preview_url": "https://storage.example.com/liwa-2026/preview-guest-ali-group-photo.jpg",
                "thumbnail_url": "https://storage.example.com/liwa-2026/thumb-guest-ali-group-photo.jpg",
                "faces_detected": 3,
            },
            {
                "event_slug": "liwa-international-festival-2026",
                "file_name": "guest-layla-evening-shot.jpg",
                "original_url": "https://storage.example.com/liwa-2026/guest-layla-evening-shot.jpg",
                "preview_url": "https://storage.example.com/liwa-2026/preview-guest-layla-evening-shot.jpg",
                "thumbnail_url": "https://storage.example.com/liwa-2026/thumb-guest-layla-evening-shot.jpg",
                "faces_detected": 1,
            },
            # Gusto Furniture Showcase
            {
                "event_slug": "gusto-furniture-showcase-2026",
                "file_name": "guest-emre-with-furniture.jpg",
                "original_url": "https://storage.example.com/gusto-2026/guest-emre-with-furniture.jpg",
                "preview_url": "https://storage.example.com/gusto-2026/preview-guest-emre-with-furniture.jpg",
                "thumbnail_url": "https://storage.example.com/gusto-2026/thumb-guest-emre-with-furniture.jpg",
                "faces_detected": 1,
            },
            {
                "event_slug": "gusto-furniture-showcase-2026",
                "file_name": "guest-zeynep-showroom.jpg",
                "original_url": "https://storage.example.com/gusto-2026/guest-zeynep-showroom.jpg",
                "preview_url": "https://storage.example.com/gusto-2026/preview-guest-zeynep-showroom.jpg",
                "thumbnail_url": "https://storage.example.com/gusto-2026/thumb-guest-zeynep-showroom.jpg",
                "faces_detected": 2,
            },
            {
                "event_slug": "gusto-furniture-showcase-2026",
                "file_name": "guest-fatih-design-corner.jpg",
                "original_url": "https://storage.example.com/gusto-2026/guest-fatih-design-corner.jpg",
                "preview_url": "https://storage.example.com/gusto-2026/preview-guest-fatih-design-corner.jpg",
                "thumbnail_url": "https://storage.example.com/gusto-2026/thumb-guest-fatih-design-corner.jpg",
                "faces_detected": 1,
            },
        ]

        for photo_data in photos_data:
            event = events[photo_data["event_slug"]]
            existing = session.query(Photo).filter(
                Photo.event_id == event.id,
                Photo.file_name == photo_data["file_name"],
            ).first()

            if not existing:
                photo = Photo(
                    event_id=event.id,
                    file_name=photo_data["file_name"],
                    original_url=photo_data["original_url"],
                    preview_url=photo_data["preview_url"],
                    thumbnail_url=photo_data["thumbnail_url"],
                    processing_status="done",
                    faces_detected=photo_data["faces_detected"],
                    uploaded_by_user_id=admin.id,
                )
                session.add(photo)
                session.commit()
                print(
                    f"✓ Photo: {photo_data['file_name']} ({photo_data['faces_detected']} faces) → {event.title}"
                )

        print("\n✅ Comprehensive seed complete!")
        print(f"\n📊 Data Summary:")
        print(f"   Admin users: 1")
        print(f"   Photographers: {len(photographers)}")
        print(f"   Events: {len(events)}")
        print(f"   Total photos: {len(photos_data)}")
        print(f"\n🔐 Credentials:")
        print(f"   Admin: admin@findmyshot.app / admin123")
        print(f"   Photographer 1: {photographers_data[0]['email']} / photo123")
        print(f"   Photographer 2: {photographers_data[1]['email']} / photo123")

    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_complete()
