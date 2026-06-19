from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Download, Event, Order, Photo
from app.services.storage_service import StorageService

router = APIRouter(prefix="/commerce", tags=["commerce"])
storage_service = StorageService()

PACKAGE_PRICES = {
    "five": 1000,
    "ten": 1500,
    "all": 2500,
}


class CheckoutRequest(BaseModel):
    event_id: str
    photo_ids: list[str]
    package_type: str = "all"
    guest_email: EmailStr | None = None


class UnlockedPhoto(BaseModel):
    photo_id: str
    download_url: str


class CheckoutResponse(BaseModel):
    order_id: str
    status: str
    package_type: str
    amount_cents: int
    currency: str
    unlocked_photos: list[UnlockedPhoto]


class RestoreOrderRequest(BaseModel):
    event_id: str
    guest_email: EmailStr | None = None


class RestoreOrderResponse(BaseModel):
    order_id: str
    status: str
    package_type: str
    amount_cents: int
    currency: str
    unlocked_photos: list[UnlockedPhoto]


def sign_photo_url(file_url: str) -> str:
    object_key = storage_service.extract_object_key(file_url)
    return storage_service.generate_download_url(object_key)


def get_unlocked_photos(db: Session, order_id: str) -> list[UnlockedPhoto]:
    rows = db.execute(
        select(Download.photo_id, Photo.original_url)
        .join(Photo, Photo.id == Download.photo_id)
        .where(Download.order_id == order_id)
    ).all()
    return [
        UnlockedPhoto(
            photo_id=photo_id,
            download_url=sign_photo_url(original_url),
        )
        for photo_id, original_url in rows
    ]


@router.post("/checkout/mock")
def create_mock_checkout(payload: CheckoutRequest) -> CheckoutResponse:
    db: Session = SessionLocal()
    try:
        event = db.get(Event, payload.event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found.",
            )

        if not payload.photo_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Select at least one photo to unlock.",
            )

        photos = db.scalars(
            select(Photo).where(
                Photo.event_id == payload.event_id,
                Photo.id.in_(payload.photo_ids),
            )
        ).all()

        if len(photos) != len(set(payload.photo_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more selected photos do not belong to this event.",
            )

        package_type = payload.package_type if payload.package_type in PACKAGE_PRICES else "all"
        order = Order(
            event_id=payload.event_id,
            guest_email=payload.guest_email.lower() if payload.guest_email else None,
            package_type=package_type,
            amount_cents=PACKAGE_PRICES[package_type],
            currency="USD",
            status="paid",
        )
        db.add(order)
        db.flush()

        unlocked_photos: list[UnlockedPhoto] = []
        for photo in photos:
            db.add(
                Download(
                    order_id=order.id,
                    photo_id=photo.id,
                    access_type="purchase",
                )
            )
            unlocked_photos.append(
                UnlockedPhoto(
                    photo_id=photo.id,
                    download_url=sign_photo_url(photo.original_url),
                )
            )

        db.commit()
        return CheckoutResponse(
            order_id=order.id,
            status=order.status,
            package_type=package_type,
            amount_cents=order.amount_cents,
            currency=order.currency,
            unlocked_photos=unlocked_photos,
        )
    finally:
        db.close()


@router.post("/orders/{order_id}/downloads")
def restore_order_downloads(
    order_id: str,
    payload: RestoreOrderRequest,
) -> RestoreOrderResponse:
    db: Session = SessionLocal()
    try:
        order = db.get(Order, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found.",
            )

        if order.event_id != payload.event_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Order does not belong to this event.",
            )

        if order.status != "paid":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order is not paid yet.",
            )

        if order.guest_email:
            if not payload.guest_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Guest email is required for this order.",
                )
            if order.guest_email.lower() != payload.guest_email.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Guest email does not match this order.",
                )

        return RestoreOrderResponse(
            order_id=order.id,
            status=order.status,
            package_type=order.package_type,
            amount_cents=order.amount_cents,
            currency=order.currency,
            unlocked_photos=get_unlocked_photos(db, order.id),
        )
    finally:
        db.close()
