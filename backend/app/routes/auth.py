import json

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.database import get_db
from app.models import (
    OnboardingProfile,
    SavedViewTemplate,
    SavedViewTemplateVersion,
    User,
    UserSavedView,
)
from app.utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str | None = None
    account_type: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, str | None]


class RegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, str | None]
    onboarding: dict[str, str | int | bool | None]


class CurrentUserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None
    role: str


class OnboardingStatusResponse(BaseModel):
    onboarding: dict[str, str | int | bool | None]


class OnboardingProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    country: str | None = None
    city: str | None = None
    address: str | None = None
    birth_date: str | None = None
    phone: str | None = None


class OnboardingVerifyEmailRequest(BaseModel):
    code: str = Field(min_length=1, max_length=16)


class SavedViewFiltersPayload(BaseModel):
    status: str = "all"
    date: str = "all"
    quick: str = "all"
    searchQuery: str = ""
    sort: str = "recent"


class SavedViewPayload(BaseModel):
    id: str
    label: str = Field(min_length=1, max_length=255)
    category: str | None = None
    createdAt: str
    order: int = 0
    pinned: bool = False
    sharedWithTeam: bool = False
    ownerEmail: str | None = None
    ownerName: str | None = None
    filters: SavedViewFiltersPayload = Field(default_factory=SavedViewFiltersPayload)


class SavedViewsResponse(BaseModel):
    items: list[SavedViewPayload]
    shared_items: list[SavedViewPayload] = Field(default_factory=list)


class SavedViewsUpdateRequest(BaseModel):
    items: list[SavedViewPayload] = Field(default_factory=list)


class SavedViewTemplatePayload(BaseModel):
    id: str
    label: str = Field(min_length=1, max_length=255)
    category: str | None = None
    description: str | None = None
    changeNote: str | None = None
    targetRole: str = "photographer"
    status: str = "draft"
    version: int = 1
    order: int = 0
    filters: SavedViewFiltersPayload = Field(default_factory=SavedViewFiltersPayload)


class SavedViewTemplatesResponse(BaseModel):
    items: list[SavedViewTemplatePayload]


class SavedViewTemplatesUpdateRequest(BaseModel):
    items: list[SavedViewTemplatePayload] = Field(default_factory=list)


class SavedViewTemplateHistoryItem(BaseModel):
    id: str
    templateId: str
    label: str
    category: str | None = None
    description: str | None = None
    changeNote: str | None = None
    targetRole: str = "photographer"
    status: str = "draft"
    version: int = 1
    createdAt: str
    filters: SavedViewFiltersPayload = Field(default_factory=SavedViewFiltersPayload)


class SavedViewTemplateHistoryResponse(BaseModel):
    items: list[SavedViewTemplateHistoryItem]


class SavedViewTemplateRollbackRequest(BaseModel):
    version: int = Field(ge=1)


class SavedViewTemplateArchiveItem(BaseModel):
    templateId: str
    label: str
    category: str | None = None
    description: str | None = None
    changeNote: str | None = None
    targetRole: str = "photographer"
    status: str = "draft"
    latestVersion: int = 1
    archivedAt: str
    historyCount: int = 0


class SavedViewTemplateArchivesResponse(BaseModel):
    items: list[SavedViewTemplateArchiveItem]


class SavedViewTemplateArchiveDeleteResponse(BaseModel):
    templateId: str
    removedVersions: int


class SavedViewTemplateArchiveRestoreRequest(BaseModel):
    version: int | None = Field(default=None, ge=1)


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _serialize_user(user: User) -> dict[str, str | None]:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
    }


def _serialize_onboarding(
    profile: OnboardingProfile,
    user: User | None = None,
) -> dict[str, str | int | bool | None]:
    return {
        "step": profile.step,
        "email_verified": profile.email_verified,
        "email": user.email if user else None,
        "full_name": user.full_name if user else None,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "country": profile.country,
        "city": profile.city,
        "address": profile.address,
        "birth_date": profile.birth_date,
        "phone": profile.phone,
    }


def _serialize_saved_view(
    saved_view: UserSavedView,
    *,
    owner_email: str | None = None,
    owner_name: str | None = None,
) -> SavedViewPayload:
    try:
        filters = SavedViewFiltersPayload.model_validate(json.loads(saved_view.filters_json))
    except (json.JSONDecodeError, ValueError):
        filters = SavedViewFiltersPayload()

    return SavedViewPayload(
        id=saved_view.id,
        label=saved_view.label,
        category=saved_view.category,
        createdAt=saved_view.created_at.isoformat(),
        order=saved_view.sort_order,
        pinned=saved_view.pinned,
        sharedWithTeam=saved_view.shared_with_team,
        ownerEmail=owner_email,
        ownerName=owner_name,
        filters=filters,
    )


def _serialize_saved_view_template(
    template: SavedViewTemplate,
) -> SavedViewTemplatePayload:
    try:
        filters = SavedViewFiltersPayload.model_validate(json.loads(template.filters_json))
    except (json.JSONDecodeError, ValueError):
        filters = SavedViewFiltersPayload()

    return SavedViewTemplatePayload(
        id=template.id,
        label=template.label,
        category=template.category,
        description=template.description,
        changeNote=template.change_note,
        targetRole=template.target_role,
        status=template.status,
        version=template.version,
        order=template.sort_order,
        filters=filters,
    )


def _serialize_saved_view_template_history(
    version: SavedViewTemplateVersion,
) -> SavedViewTemplateHistoryItem:
    try:
        filters = SavedViewFiltersPayload.model_validate(json.loads(version.filters_json))
    except (json.JSONDecodeError, ValueError):
        filters = SavedViewFiltersPayload()

    return SavedViewTemplateHistoryItem(
        id=version.id,
        templateId=version.template_id,
        label=version.label,
        category=version.category,
        description=version.description,
        changeNote=version.change_note,
        targetRole=version.target_role,
        status=version.status,
        version=version.version,
        createdAt=version.created_at.isoformat(),
        filters=filters,
    )


def _snapshot_saved_view_template(
    template: SavedViewTemplate,
    db: Session,
) -> SavedViewTemplateVersion:
    version_row = SavedViewTemplateVersion(
        template_id=template.id,
        label=template.label,
        category=template.category,
        description=template.description,
        change_note=template.change_note,
        target_role=template.target_role,
        status=template.status,
        version=template.version,
        filters_json=template.filters_json,
    )
    db.add(version_row)
    return version_row


def _serialize_saved_view_template_archive(
    latest_version: SavedViewTemplateVersion,
    *,
    history_count: int,
) -> SavedViewTemplateArchiveItem:
    return SavedViewTemplateArchiveItem(
        templateId=latest_version.template_id,
        label=latest_version.label,
        category=latest_version.category,
        description=latest_version.description,
        changeNote=latest_version.change_note,
        targetRole=latest_version.target_role,
        status=latest_version.status,
        latestVersion=latest_version.version,
        archivedAt=latest_version.created_at.isoformat(),
        historyCount=history_count,
    )


def _ensure_onboarding_profile(user: User, db: Session) -> OnboardingProfile:
    profile = db.scalar(
        select(OnboardingProfile).where(OnboardingProfile.user_id == user.id)
    )
    if profile:
        return profile

    # Backward compatibility for existing users created before onboarding.
    profile = OnboardingProfile(user_id=user.id, step=4, email_verified=True)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/login")
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(subject=user.id)
    return LoginResponse(access_token=token, user=_serialize_user(user))


@router.post("/register")
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
) -> RegisterResponse:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered.",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=_clean_text(payload.full_name),
        role="admin",
    )
    db.add(user)
    db.flush()

    profile = OnboardingProfile(
        user_id=user.id,
        step=2,
        email_verified=False,
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    db.refresh(profile)

    token = create_access_token(subject=user.id)
    return RegisterResponse(
        access_token=token,
        user=_serialize_user(user),
        onboarding=_serialize_onboarding(profile, user),
    )


@router.get("/me")
def me(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
    )


@router.get("/saved-views")
def list_saved_views(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedViewsResponse:
    items = db.scalars(
        select(UserSavedView)
        .where(UserSavedView.user_id == current_user.id)
        .order_by(
            UserSavedView.pinned.desc(),
            UserSavedView.sort_order.asc(),
            UserSavedView.created_at.desc(),
        )
    ).all()
    shared_items = db.scalars(
        select(UserSavedView)
        .where(
            UserSavedView.user_id != current_user.id,
            UserSavedView.shared_with_team.is_(True),
        )
        .order_by(
            UserSavedView.updated_at.desc(),
            UserSavedView.created_at.desc(),
        )
    ).all()
    return SavedViewsResponse(
        items=[_serialize_saved_view(item) for item in items],
        shared_items=[
            _serialize_saved_view(
                item,
                owner_email=item.user.email if item.user else None,
                owner_name=item.user.full_name if item.user else None,
            )
            for item in shared_items
        ],
    )


@router.put("/saved-views")
def replace_saved_views(
    payload: SavedViewsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedViewsResponse:
    existing_items = db.scalars(
        select(UserSavedView).where(UserSavedView.user_id == current_user.id)
    ).all()
    for item in existing_items:
        db.delete(item)
    db.flush()

    next_items: list[UserSavedView] = []
    for index, item in enumerate(payload.items):
        next_item = UserSavedView(
            id=item.id,
            user_id=current_user.id,
            label=item.label.strip(),
            category=item.category.strip() if item.category else None,
            filters_json=item.filters.model_dump_json(),
            pinned=item.pinned,
            shared_with_team=item.sharedWithTeam,
            sort_order=index,
        )
        db.add(next_item)
        next_items.append(next_item)

    db.commit()
    for item in next_items:
        db.refresh(item)

    return SavedViewsResponse(
        items=[_serialize_saved_view(item) for item in next_items],
        shared_items=[],
    )


@router.get("/saved-view-templates")
def list_saved_view_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedViewTemplatesResponse:
    query = select(SavedViewTemplate).order_by(
        SavedViewTemplate.sort_order.asc(),
        SavedViewTemplate.created_at.desc(),
    )
    if current_user.role != "admin":
        query = query.where(
            SavedViewTemplate.target_role.in_(["all", current_user.role]),
            SavedViewTemplate.status == "published",
        )

    items = db.scalars(query).all()
    return SavedViewTemplatesResponse(
        items=[_serialize_saved_view_template(item) for item in items]
    )


@router.put("/saved-view-templates")
def replace_saved_view_templates(
    payload: SavedViewTemplatesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedViewTemplatesResponse:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage shared templates.",
        )

    existing_items = db.scalars(select(SavedViewTemplate)).all()
    for item in existing_items:
        db.delete(item)
    db.flush()

    next_items: list[SavedViewTemplate] = []
    for index, item in enumerate(payload.items):
        next_item = SavedViewTemplate(
            id=item.id,
            label=item.label.strip(),
            category=item.category.strip() if item.category else None,
            description=item.description.strip() if item.description else None,
            change_note=item.changeNote.strip() if item.changeNote else None,
            target_role=item.targetRole.strip() or "photographer",
            status=item.status.strip() or "draft",
            version=max(1, item.version),
            filters_json=item.filters.model_dump_json(),
            sort_order=index,
        )
        db.add(next_item)
        next_items.append(next_item)

    db.flush()
    for item in next_items:
        _snapshot_saved_view_template(item, db)

    db.commit()
    for item in next_items:
        db.refresh(item)

    return SavedViewTemplatesResponse(
        items=[_serialize_saved_view_template(item) for item in next_items]
    )


@router.get("/saved-view-template-archives")
def list_saved_view_template_archives(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedViewTemplateArchivesResponse:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can inspect archived template history.",
        )

    active_template_ids = set(db.scalars(select(SavedViewTemplate.id)).all())
    history_versions = db.scalars(
        select(SavedViewTemplateVersion).order_by(
            SavedViewTemplateVersion.template_id.asc(),
            SavedViewTemplateVersion.version.desc(),
            SavedViewTemplateVersion.created_at.desc(),
        )
    ).all()

    archived_groups: dict[str, list[SavedViewTemplateVersion]] = {}
    for version in history_versions:
        if version.template_id in active_template_ids:
            continue
        archived_groups.setdefault(version.template_id, []).append(version)

    items = [
        _serialize_saved_view_template_archive(group[0], history_count=len(group))
        for group in archived_groups.values()
        if group
    ]
    items.sort(key=lambda item: item.archivedAt, reverse=True)
    return SavedViewTemplateArchivesResponse(items=items)


@router.delete("/saved-view-template-archives/{template_id}")
def delete_saved_view_template_archive(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedViewTemplateArchiveDeleteResponse:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can clean archived template history.",
        )

    if db.get(SavedViewTemplate, template_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Active templates cannot be cleaned from archive history.",
        )

    archived_versions = db.scalars(
        select(SavedViewTemplateVersion).where(
            SavedViewTemplateVersion.template_id == template_id
        )
    ).all()
    if not archived_versions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archived template history not found.",
        )

    removed_count = len(archived_versions)
    for version in archived_versions:
        db.delete(version)
    db.commit()

    return SavedViewTemplateArchiveDeleteResponse(
        templateId=template_id,
        removedVersions=removed_count,
    )


@router.post("/saved-view-template-archives/{template_id}/restore")
def restore_saved_view_template_archive(
    template_id: str,
    payload: SavedViewTemplateArchiveRestoreRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedViewTemplatePayload:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can restore archived templates.",
        )

    if db.get(SavedViewTemplate, template_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Template is already active.",
        )

    archived_versions = db.scalars(
        select(SavedViewTemplateVersion)
        .where(SavedViewTemplateVersion.template_id == template_id)
        .order_by(
            SavedViewTemplateVersion.version.desc(),
            SavedViewTemplateVersion.created_at.desc(),
        )
    ).all()
    if not archived_versions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archived template history not found.",
        )

    target_version = (
        next((item for item in archived_versions if item.version == payload.version), None)
        if payload.version
        else archived_versions[0]
    )
    if not target_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archived template version not found.",
        )

    active_templates = db.scalars(select(SavedViewTemplate)).all()
    next_sort_order = max((item.sort_order for item in active_templates), default=-1) + 1
    next_version_number = max((item.version for item in archived_versions), default=0) + 1

    restored_template = SavedViewTemplate(
        id=template_id,
        label=target_version.label,
        category=target_version.category,
        description=target_version.description,
        change_note=f"Arsivden v{target_version.version} geri yuklendi.",
        target_role=target_version.target_role,
        status=target_version.status,
        version=next_version_number,
        filters_json=target_version.filters_json,
        sort_order=next_sort_order,
    )
    db.add(restored_template)
    db.flush()
    _snapshot_saved_view_template(restored_template, db)
    db.commit()
    db.refresh(restored_template)

    return _serialize_saved_view_template(restored_template)


@router.get("/saved-view-templates/{template_id}/history")
def get_saved_view_template_history(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedViewTemplateHistoryResponse:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can inspect template history.",
        )

    items = db.scalars(
        select(SavedViewTemplateVersion)
        .where(SavedViewTemplateVersion.template_id == template_id)
        .order_by(SavedViewTemplateVersion.version.desc())
    ).all()
    if not items and not db.get(SavedViewTemplate, template_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found.",
        )
    return SavedViewTemplateHistoryResponse(
        items=[_serialize_saved_view_template_history(item) for item in items]
    )


@router.post("/saved-view-templates/{template_id}/rollback")
def rollback_saved_view_template(
    template_id: str,
    payload: SavedViewTemplateRollbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedViewTemplatePayload:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can rollback templates.",
        )

    current_template = db.get(SavedViewTemplate, template_id)
    if not current_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found.",
        )

    target_version = db.scalar(
        select(SavedViewTemplateVersion).where(
            SavedViewTemplateVersion.template_id == template_id,
            SavedViewTemplateVersion.version == payload.version,
        )
    )
    if not target_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template version not found.",
        )

    latest_version = db.scalar(
        select(SavedViewTemplateVersion)
        .where(SavedViewTemplateVersion.template_id == template_id)
        .order_by(SavedViewTemplateVersion.version.desc())
    )
    next_version_number = (latest_version.version if latest_version else current_template.version) + 1

    current_template.label = target_version.label
    current_template.category = target_version.category
    current_template.description = target_version.description
    current_template.change_note = f"v{payload.version} surumune geri alindi."
    current_template.target_role = target_version.target_role
    current_template.status = target_version.status
    current_template.filters_json = target_version.filters_json
    current_template.version = next_version_number

    db.flush()
    _snapshot_saved_view_template(current_template, db)
    db.commit()
    db.refresh(current_template)

    return _serialize_saved_view_template(current_template)


@router.get("/onboarding")
def onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OnboardingStatusResponse:
    profile = _ensure_onboarding_profile(current_user, db)
    return OnboardingStatusResponse(onboarding=_serialize_onboarding(profile, current_user))


@router.post("/onboarding/verify-email")
def onboarding_verify_email(
    payload: OnboardingVerifyEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OnboardingStatusResponse:
    profile = _ensure_onboarding_profile(current_user, db)
    normalized_code = payload.code.strip()
    if normalized_code != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dogrulama kodu gecersiz.",
        )
    profile.email_verified = True
    if profile.step < 3:
        profile.step = 3
    db.commit()
    db.refresh(profile)
    return OnboardingStatusResponse(onboarding=_serialize_onboarding(profile, current_user))


@router.put("/onboarding/profile")
def onboarding_update_profile(
    payload: OnboardingProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OnboardingStatusResponse:
    profile = _ensure_onboarding_profile(current_user, db)
    requested_full_name = _clean_text(payload.full_name)
    requested_email = _clean_text(payload.email)

    if requested_email and requested_email.lower() != current_user.email.lower():
        existing_user = db.scalar(select(User).where(User.email == requested_email))
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already registered.",
            )
        current_user.email = requested_email

    if requested_full_name:
        current_user.full_name = requested_full_name

    profile.first_name = _clean_text(payload.first_name)
    profile.last_name = _clean_text(payload.last_name)
    profile.country = _clean_text(payload.country)
    profile.city = _clean_text(payload.city)
    profile.address = _clean_text(payload.address)
    profile.birth_date = _clean_text(payload.birth_date)
    profile.phone = _clean_text(payload.phone)

    full_name_parts = [part for part in [profile.first_name, profile.last_name] if part]
    if full_name_parts and not requested_full_name:
        current_user.full_name = " ".join(full_name_parts)

    if profile.step < 4:
        profile.step = 4

    db.commit()
    db.refresh(profile)
    db.refresh(current_user)
    return OnboardingStatusResponse(onboarding=_serialize_onboarding(profile, current_user))


@router.post("/onboarding/complete")
def onboarding_complete(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OnboardingStatusResponse:
    profile = _ensure_onboarding_profile(current_user, db)
    profile.email_verified = True
    profile.step = 4
    db.commit()
    db.refresh(profile)
    return OnboardingStatusResponse(onboarding=_serialize_onboarding(profile, current_user))
