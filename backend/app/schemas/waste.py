from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.enums import WasteCause


class WasteCreate(BaseModel):
    presentation_id: int
    warehouse_id: int
    lot_id: Optional[int] = None
    cause: WasteCause
    quantity: Decimal
    notes: Optional[str] = None


class WasteResponse(BaseModel):
    id: int
    business_id: int
    presentation_id: int
    warehouse_id: int
    lot_id: Optional[int]
    created_by: int
    cause: WasteCause
    quantity: Decimal
    cost_per_unit: Optional[Decimal]
    total_cost: Optional[Decimal]
    notes: Optional[str]
    is_auto: bool
    created_at: datetime
    # Info extra
    product_name: Optional[str] = None
    presentation_name: Optional[str] = None
    warehouse_name: Optional[str] = None
    lot_number: Optional[str] = None
    creator_name: Optional[str] = None

    class Config:
        from_attributes = True


class WasteSummary(BaseModel):
    total_records: int
    total_cost: Decimal
    by_cause: List['WasteByCause']


class WasteByCause(BaseModel):
    cause: WasteCause
    count: int
    total_cost: Decimal


WasteSummary.model_rebuild()


class AutoWasteResult(BaseModel):
    processed: int
    total_cost: Decimal
    records: List[WasteResponse]