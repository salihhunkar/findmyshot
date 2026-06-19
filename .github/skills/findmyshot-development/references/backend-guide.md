# Backend Geliştirme Rehberi

FastAPI backend'de yeni özellik eklemek veya hata düzeltmek.

## Backend Mimarisi

```
backend/app/
├── models/           # SQLAlchemy ORM (database tables)
├── routes/           # API endpoint'leri (controllers)
├── services/         # İş mantığı (business logic)
├── dependencies/     # Dependency injection (auth, access control)
├── utils/            # Yardımcı fonksiyonlar (helpers)
├── config.py         # Ayarlar
├── database.py       # DB bağlantısı
└── main.py           # FastAPI app + routes
```

## Model Ekleme (Database Tablosu)

**Dosya**: `backend/app/models/`

```python
# backend/app/models/my_feature.py
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class MyFeature(Base):
    __tablename__ = "my_features"
    
    id = Column(String, primary_key=True)
    event_id = Column(String, ForeignKey("events.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String)
    status = Column(String, default="active")  # active, archived, etc
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    event = relationship("Event", back_populates="my_features")
    
    def __repr__(self):
        return f"<MyFeature {self.id} - {self.title}>"
```

**main.py'da import et:**
```python
# backend/app/main.py
from backend.app.models.my_feature import MyFeature
```

## API Endpoint Ekleme (Route)

**Dosya**: `backend/app/routes/my_feature.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.models.my_feature import MyFeature
from backend.app.database import get_db
from backend.app.dependencies.auth import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/my-features", tags=["my-features"])

# Request/Response models (Pydantic)
class MyFeatureCreate(BaseModel):
    event_id: str
    title: str
    description: str = None

class MyFeatureResponse(BaseModel):
    id: str
    event_id: str
    title: str
    description: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True  # SQLAlchemy model'den otomatik

# GET - Tümünü al
@router.get("/")
async def list_features(
    event_id: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(MyFeature)
    
    if event_id:
        query = query.filter(MyFeature.event_id == event_id)
    
    features = query.all()
    return {"success": True, "data": features, "count": len(features)}

# GET - Spesifik
@router.get("/{feature_id}")
async def get_feature(
    feature_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    feature = db.query(MyFeature).filter(MyFeature.id == feature_id).first()
    
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    return {"success": True, "data": feature}

# POST - Yeni ekle
@router.post("/")
async def create_feature(
    feature: MyFeatureCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Validation
    if not feature.title:
        raise HTTPException(status_code=400, detail="Title required")
    
    # Create
    new_feature = MyFeature(
        id=f"mf_{datetime.utcnow().timestamp()}",
        **feature.dict()
    )
    
    db.add(new_feature)
    db.commit()
    db.refresh(new_feature)
    
    return {"success": True, "data": new_feature}

# PUT - Güncelle
@router.put("/{feature_id}")
async def update_feature(
    feature_id: str,
    feature: MyFeatureCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_feature = db.query(MyFeature).filter(MyFeature.id == feature_id).first()
    
    if not db_feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    # Update fields
    for key, value in feature.dict().items():
        setattr(db_feature, key, value)
    
    db_feature.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_feature)
    
    return {"success": True, "data": db_feature}

# DELETE - Sil
@router.delete("/{feature_id}")
async def delete_feature(
    feature_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_feature = db.query(MyFeature).filter(MyFeature.id == feature_id).first()
    
    if not db_feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    db.delete(db_feature)
    db.commit()
    
    return {"success": True, "message": "Feature deleted"}
```

**main.py'da route'u include et:**
```python
# backend/app/main.py
from backend.app.routes import my_feature

app = FastAPI()
app.include_router(my_feature.router)
```

## Service (İş Mantığı) Ekleme

Karmaşık işlemler için ayrı service dosyası oluştur:

**Dosya**: `backend/app/services/my_feature_service.py`

```python
from sqlalchemy.orm import Session
from backend.app.models.my_feature import MyFeature
import logging

logger = logging.getLogger(__name__)

class MyFeatureService:
    @staticmethod
    def process_feature_data(feature: MyFeature, db: Session):
        """Complex business logic"""
        try:
            # İş mantığı buraya
            result = do_complex_operation(feature)
            
            logger.info(f"Processed feature {feature.id}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing feature: {e}")
            raise
    
    @staticmethod
    def validate_feature(feature: MyFeature) -> bool:
        """Validation logic"""
        if not feature.title:
            return False
        if len(feature.title) > 255:
            return False
        return True
```

**Route'da kullan:**
```python
from backend.app.services.my_feature_service import MyFeatureService

@router.post("/")
async def create_feature(...):
    if not MyFeatureService.validate_feature(feature):
        raise HTTPException(status_code=400, detail="Invalid feature")
    
    result = MyFeatureService.process_feature_data(new_feature, db)
    return {"success": True, "data": result}
```

## Veritabanı Migration

Model değişikliklerini veritabanına uygulamak:

```bash
# Migration oluştur (Alembic)
alembic revision --autogenerate -m "Add my_features table"

# Migration'ı kontrol et
cat backend/alembic/versions/[new_migration].py

# Uygula
alembic upgrade head

# Geri al (gerekirse)
alembic downgrade -1
```

## Authentication ve Authorization

**Kimlik Doğrulama (JWT Token):**
```python
@router.get("/protected")
async def protected_route(
    current_user = Depends(get_current_user)
):
    return {"user_id": current_user.id}
```

**Yetkilendirme (Access Control):**
```python
from backend.app.utils.event_access import has_event_access

@router.get("/events/{event_id}")
async def get_event(
    event_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    
    # Erişim kontrolü
    if not has_event_access(current_user, event):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return event
```

## Error Handling

```python
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

@router.post("/")
async def create_feature(...):
    try:
        # ... code ...
        db.commit()
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Database error occurred"
        )
    
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred"
        )
```

## Logging

```python
import logging

logger = logging.getLogger(__name__)

@router.post("/")
async def create_feature(...):
    logger.info(f"Creating feature for event {feature.event_id}")
    
    try:
        # ... code ...
        logger.info(f"Feature created: {new_feature.id}")
        
    except Exception as e:
        logger.error(f"Feature creation failed: {e}", exc_info=True)
        raise
```

## Test Etme

### Manual Test (cURL)

```bash
# Create
curl -X POST http://localhost:8000/api/my-features \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "event_id": "liwa-fest",
    "title": "Test Feature",
    "description": "Test description"
  }'

# List
curl http://localhost:8000/api/my-features?event_id=liwa-fest

# Get
curl http://localhost:8000/api/my-features/mf_123

# Update
curl -X PUT http://localhost:8000/api/my-features/mf_123 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# Delete
curl -X DELETE http://localhost:8000/api/my-features/mf_123
```

### Automated Test (pytest)

```python
# backend/tests/test_my_feature.py
import pytest
from sqlalchemy.orm import Session

def test_create_feature(db: Session):
    from backend.app.models.my_feature import MyFeature
    
    feature = MyFeature(
        id="test_1",
        event_id="test-event",
        title="Test"
    )
    
    db.add(feature)
    db.commit()
    
    assert feature.id == "test_1"
```

---

**Backend'de eklemek istediğiniz şey var mı? Spesifik tarif verelim!**
