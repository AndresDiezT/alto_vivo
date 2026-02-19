from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.database import get_db
from app.models.inventory import (
    Product, ProductPresentation, ProductCategory,
    ProductStock, ProductLot, InventoryMovement,
    Warehouse
)
from app.models.enums import MovementType
from app.models.user import User
from app.schemas.inventory import (
    ProductCreate, ProductUpdate, ProductResponse,
    PresentationCreate, PresentationUpdate, PresentationResponse,
    CategoryCreate, CategoryUpdate, CategoryResponse,
    WarehouseCreate, WarehouseUpdate, WarehouseResponse,
    EntryCreate, AdjustmentCreate, TransferCreate, MovementResponse,
    LowStockAlert, ExpiryAlert, LotResponse,
)
from app.api.deps import get_current_active_user, verify_business_access
from app.utils.audit import log_action

router = APIRouter(prefix="/businesses/{business_id}/inventory", tags=["Inventario"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_or_create_stock(presentation_id: int, warehouse_id: int, db: Session) -> ProductStock:
    stock = db.query(ProductStock).filter(
        ProductStock.presentation_id == presentation_id,
        ProductStock.warehouse_id == warehouse_id
    ).first()
    if not stock:
        stock = ProductStock(presentation_id=presentation_id, warehouse_id=warehouse_id, quantity=0)
        db.add(stock)
        db.flush()
    return stock


def build_stock_response(presentation: ProductPresentation) -> list:
    return [
        {"warehouse_id": s.warehouse_id, "warehouse_name": s.warehouse.name, "quantity": s.quantity}
        for s in presentation.stock
    ]


# ── Categorías ────────────────────────────────────────────────────────────────

@router.post("/categories", response_model=CategoryResponse, status_code=201)
def create_category(
    business_id: int, data: CategoryCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    category = ProductCategory(business_id=business_id, **data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    business_id: int, result=Depends(verify_business_access), db: Session = Depends(get_db)
):
    return db.query(ProductCategory).filter(
        ProductCategory.business_id == business_id,
        ProductCategory.is_active == True
    ).all()

@router.patch("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    business_id: int, category_id: int, data: CategoryUpdate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    cat = db.query(ProductCategory).filter(
        ProductCategory.id == category_id,
        ProductCategory.business_id == business_id
    ).first()
    if not cat:
        raise HTTPException(404, "Categoría no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categories/{category_id}", status_code=204)
def delete_category(
    business_id: int, category_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    cat = db.query(ProductCategory).filter(
        ProductCategory.id == category_id,
        ProductCategory.business_id == business_id
    ).first()
    if not cat:
        raise HTTPException(404, "Categoría no encontrada")
    # Desasociar productos antes de eliminar
    db.query(Product).filter(Product.category_id == category_id).update({"category_id": None})
    cat.is_active = False
    db.commit()


# ── Bodegas ───────────────────────────────────────────────────────────────────

@router.post("/warehouses", response_model=WarehouseResponse, status_code=201)
def create_warehouse(
    business_id: int, data: WarehouseCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if data.is_default:
        # Solo una bodega puede ser default
        db.query(Warehouse).filter(
            Warehouse.business_id == business_id
        ).update({"is_default": False})

    warehouse = Warehouse(business_id=business_id, **data.model_dump())
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse

@router.get("/warehouses", response_model=List[WarehouseResponse])
def list_warehouses(
    business_id: int, result=Depends(verify_business_access), db: Session = Depends(get_db)
):
    return db.query(Warehouse).filter(
        Warehouse.business_id == business_id,
        Warehouse.is_active == True
    ).all()

@router.patch("/warehouses/{warehouse_id}", response_model=WarehouseResponse)
def update_warehouse(
    business_id: int, warehouse_id: int, data: WarehouseUpdate,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    wh = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.business_id == business_id
    ).first()
    if not wh:
        raise HTTPException(404, "Bodega no encontrada")
    if data.is_default:
        db.query(Warehouse).filter(Warehouse.business_id == business_id).update({"is_default": False})
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(wh, field, value)
    db.commit()
    db.refresh(wh)
    return wh

@router.delete("/warehouses/{warehouse_id}", status_code=204)
def delete_warehouse(
    business_id: int, warehouse_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    wh = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.business_id == business_id,
        Warehouse.is_default == False  # No eliminar la default
    ).first()
    if not wh:
        raise HTTPException(404, "Bodega no encontrada o es la bodega por defecto")
    has_stock = db.query(ProductStock).filter(
        ProductStock.warehouse_id == warehouse_id,
        ProductStock.quantity > 0
    ).first()
    if has_stock:
        raise HTTPException(400, "La bodega tiene stock. Transfiere el inventario antes de eliminar.")
    wh.is_active = False
    db.commit()


# ── Productos ─────────────────────────────────────────────────────────────────

@router.post("/products", response_model=ProductResponse, status_code=201)
def create_product(
    business_id: int, data: ProductCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    presentations = data.presentations
    product_data = data.model_dump(exclude={"presentations"})

    product = Product(business_id=business_id, **product_data)
    db.add(product)
    db.flush()

    for p in presentations:
        presentation = ProductPresentation(
            product_id=product.id,
            business_id=business_id,
            **p.model_dump()
        )
        db.add(presentation)

    db.commit()
    db.refresh(product)
    log_action(db, current_user.id, "CREATE", "Product", product.id, business_id=business_id)
    return product

@router.get("/products", response_model=List[ProductResponse])
def list_products(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    is_perishable: Optional[bool] = Query(None),
    low_stock: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 50,
):
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.presentations).joinedload(ProductPresentation.stock).joinedload(ProductStock.warehouse)
    ).filter(
        Product.business_id == business_id,
        Product.is_active == True
    )

    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if is_perishable is not None:
        query = query.filter(Product.is_perishable == is_perishable)

    products = query.order_by(Product.name).offset(skip).limit(limit).all()

    if low_stock:
        products = [
            p for p in products
            if any(
                any(s.quantity <= pres.min_stock for s in pres.stock)
                for pres in p.presentations if pres.is_active
            )
        ]

    return products

@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    business_id: int, product_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    product = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.presentations).joinedload(ProductPresentation.stock).joinedload(ProductStock.warehouse)
    ).filter(
        Product.id == product_id,
        Product.business_id == business_id,
        Product.is_active == True
    ).first()
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    return product

@router.patch("/products/{product_id}", response_model=ProductResponse)
def update_product(
    business_id: int, product_id: int, data: ProductUpdate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id, Product.business_id == business_id
    ).first()
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    log_action(db, current_user.id, "UPDATE", "Product", product.id, business_id=business_id)
    return product

@router.delete("/products/{product_id}", status_code=204)
def delete_product(
    business_id: int, product_id: int,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id, Product.business_id == business_id
    ).first()
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    has_stock = any(
        any(s.quantity > 0 for s in p.stock)
        for p in product.presentations
    )
    if has_stock:
        raise HTTPException(400, "El producto tiene stock activo. Ajusta el inventario antes de eliminar.")
    product.is_active = False
    db.commit()
    log_action(db, current_user.id, "DELETE", "Product", product.id, business_id=business_id)


# ── Presentaciones ────────────────────────────────────────────────────────────

@router.post("/products/{product_id}/presentations", response_model=PresentationResponse, status_code=201)
def add_presentation(
    business_id: int, product_id: int, data: PresentationCreate,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id, Product.business_id == business_id
    ).first()
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    presentation = ProductPresentation(
        product_id=product_id, business_id=business_id, **data.model_dump()
    )
    db.add(presentation)
    db.commit()
    db.refresh(presentation)
    return presentation

@router.patch("/products/{product_id}/presentations/{presentation_id}", response_model=PresentationResponse)
def update_presentation(
    business_id: int, product_id: int, presentation_id: int, data: PresentationUpdate,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    pres = db.query(ProductPresentation).filter(
        ProductPresentation.id == presentation_id,
        ProductPresentation.product_id == product_id,
        ProductPresentation.business_id == business_id
    ).first()
    if not pres:
        raise HTTPException(404, "Presentación no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(pres, field, value)
    db.commit()
    db.refresh(pres)
    return pres


# ── Movimientos de inventario ─────────────────────────────────────────────────

@router.post("/entry", response_model=MovementResponse, status_code=201)
def register_entry(
    business_id: int, data: EntryCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Entrada de inventario — crea lote y actualiza stock."""
    # Crear lote
    lot = ProductLot(
        presentation_id=data.presentation_id,
        warehouse_id=data.warehouse_id,
        business_id=business_id,
        lot_number=data.lot_number,
        quantity=data.quantity,
        remaining=data.quantity,
        cost_per_unit=data.cost_per_unit,
        arrival_date=data.arrival_date or datetime.utcnow(),
        expiry_date=data.expiry_date,
    )
    db.add(lot)
    db.flush()

    # Actualizar stock
    stock = get_or_create_stock(data.presentation_id, data.warehouse_id, db)
    stock.quantity += data.quantity

    # Movimiento
    movement = InventoryMovement(
        business_id=business_id,
        presentation_id=data.presentation_id,
        warehouse_id=data.warehouse_id,
        lot_id=lot.id,
        movement_type=MovementType.ENTRY,
        quantity=data.quantity,
        cost_per_unit=data.cost_per_unit,
        reason=data.reason,
        created_by=current_user.id,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    log_action(db, current_user.id, "ENTRY", "Inventory", movement.id, business_id=business_id,
               details={"presentation_id": data.presentation_id, "quantity": str(data.quantity)})
    return movement


@router.post("/adjustment", response_model=MovementResponse, status_code=201)
def register_adjustment(
    business_id: int, data: AdjustmentCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Ajuste manual — puede ser positivo o negativo."""
    stock = get_or_create_stock(data.presentation_id, data.warehouse_id, db)

    new_quantity = stock.quantity + data.quantity
    if new_quantity < 0:
        raise HTTPException(400, f"Stock insuficiente. Disponible: {stock.quantity}")

    stock.quantity = new_quantity

    movement = InventoryMovement(
        business_id=business_id,
        presentation_id=data.presentation_id,
        warehouse_id=data.warehouse_id,
        movement_type=MovementType.ADJUSTMENT,
        quantity=data.quantity,
        reason=data.reason,
        created_by=current_user.id,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    log_action(db, current_user.id, "ADJUSTMENT", "Inventory", movement.id, business_id=business_id,
               details={"reason": data.reason, "quantity": str(data.quantity)})
    return movement


@router.post("/transfer", response_model=MovementResponse, status_code=201)
def register_transfer(
    business_id: int, data: TransferCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Transferencia entre bodegas."""
    if data.from_warehouse_id == data.to_warehouse_id:
        raise HTTPException(400, "Las bodegas de origen y destino deben ser diferentes")

    stock_out = get_or_create_stock(data.presentation_id, data.from_warehouse_id, db)
    if stock_out.quantity < data.quantity:
        raise HTTPException(400, f"Stock insuficiente en bodega origen. Disponible: {stock_out.quantity}")

    stock_out.quantity -= data.quantity
    stock_in = get_or_create_stock(data.presentation_id, data.to_warehouse_id, db)
    stock_in.quantity += data.quantity

    movement = InventoryMovement(
        business_id=business_id,
        presentation_id=data.presentation_id,
        warehouse_id=data.from_warehouse_id,
        movement_type=MovementType.TRANSFER_OUT,
        quantity=data.quantity,
        reason=data.reason,
        destination_warehouse_id=data.to_warehouse_id,
        created_by=current_user.id,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    log_action(db, current_user.id, "TRANSFER", "Inventory", movement.id, business_id=business_id)
    return movement


@router.get("/movements", response_model=List[MovementResponse])
def list_movements(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    presentation_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    movement_type: Optional[MovementType] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(InventoryMovement).filter(
        InventoryMovement.business_id == business_id
    )
    if presentation_id:
        query = query.filter(InventoryMovement.presentation_id == presentation_id)
    if warehouse_id:
        query = query.filter(InventoryMovement.warehouse_id == warehouse_id)
    if movement_type:
        query = query.filter(InventoryMovement.movement_type == movement_type)
    return query.order_by(desc(InventoryMovement.created_at)).offset(skip).limit(limit).all()


# ── Lotes ─────────────────────────────────────────────────────────────────────

@router.get("/products/{product_id}/presentations/{presentation_id}/lots", response_model=List[LotResponse])
def list_lots(
    business_id: int, product_id: int, presentation_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    return db.query(ProductLot).filter(
        ProductLot.presentation_id == presentation_id,
        ProductLot.business_id == business_id,
        ProductLot.is_active == True
    ).order_by(ProductLot.expiry_date.asc().nullslast()).all()


# ── Alertas ───────────────────────────────────────────────────────────────────

@router.get("/alerts/low-stock", response_model=List[LowStockAlert])
def get_low_stock_alerts(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    alerts = []
    presentations = db.query(ProductPresentation).join(Product).filter(
        Product.business_id == business_id,
        Product.is_active == True,
        ProductPresentation.is_active == True,
        ProductPresentation.min_stock > 0
    ).options(
        joinedload(ProductPresentation.product),
        joinedload(ProductPresentation.stock).joinedload(ProductStock.warehouse)
    ).all()

    for pres in presentations:
        for stock in pres.stock:
            if stock.quantity <= pres.min_stock:
                alerts.append(LowStockAlert(
                    product_id=pres.product.id,
                    product_name=pres.product.name,
                    presentation_id=pres.id,
                    presentation_name=pres.name,
                    warehouse_id=stock.warehouse_id,
                    warehouse_name=stock.warehouse.name,
                    current_stock=stock.quantity,
                    min_stock=pres.min_stock,
                ))
    return alerts


@router.get("/alerts/expiring", response_model=List[ExpiryAlert])
def get_expiring_alerts(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    days: int = Query(7, description="Alertar lotes que vencen en los próximos N días")
):
    threshold = datetime.utcnow() + timedelta(days=days)
    lots = db.query(ProductLot).filter(
        ProductLot.business_id == business_id,
        ProductLot.is_active == True,
        ProductLot.expiry_date <= threshold,
        ProductLot.remaining > 0
    ).options(
        joinedload(ProductLot.presentation).joinedload(ProductPresentation.product)
    ).order_by(ProductLot.expiry_date.asc()).all()

    return [
        ExpiryAlert(
            product_id=lot.presentation.product.id,
            product_name=lot.presentation.product.name,
            presentation_id=lot.presentation_id,
            presentation_name=lot.presentation.name,
            lot_id=lot.id,
            lot_number=lot.lot_number,
            expiry_date=lot.expiry_date,
            days_to_expiry=lot.days_to_expiry,
            remaining=lot.remaining,
        )
        for lot in lots
    ]