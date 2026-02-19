from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, Token, RegisterRequest
from app.schemas.user import UserResponse, UserChangePassword
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_refresh_token
)
from app.api.deps import get_current_active_user
from app.utils.audit import log_action
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "El email ya está registrado")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "El username ya está en uso")

    user = User(
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        phone=data.phone,
        hashed_password=get_password_hash(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_action(db, user.id, "REGISTER", "User", user.id,
               details={"username": user.username})
    return user


@router.post("/login", response_model=Token)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    # Login por email
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(400, "Cuenta inactiva")

    token_data = {"sub": str(user.id), "email": user.email, "role": user.system_role}
    access_token  = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    log_action(db, user.id, "LOGIN", "User", user.id,
               ip_address=request.client.host)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
def refresh_token(data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_refresh_token(data.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")

    token_data = {"sub": str(user.id), "email": user.email, "role": user.system_role}
    return {
        "access_token":  create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer"
    }


@router.post("/change-password")
def change_password(
    data: UserChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(400, "Contraseña actual incorrecta")

    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()

    log_action(db, current_user.id, "CHANGE_PASSWORD", "User", current_user.id)
    return {"message": "Contraseña actualizada correctamente"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user