from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import datetime
from uuid import UUID

from ..database import get_session
from ..models import User, UserCreate, UserRead, UserRole
from ..auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from ..dependencies import get_current_user, require_manager, require_admin
from fastapi import Response, Request
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder


# UserRead contains id, username, email, full_name, role, is_active, user_metadata

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(
    user_data: UserCreate,
    actor: UserRead = Depends(require_manager),
    session: Session = Depends(get_session),
):
    """
    Closed-onboarding: accounts are created only by admin or manager staff.
    Bootstrap (first user) is handled exclusively by seed_data.py / reset_db.py.

    Role-creation matrix:
      admin   → any role
      manager → cashier, technician only
      others  → 403 (FastAPI dependency rejects before reaching here)
    """
    # Determine which roles the caller may assign
    if actor.role == UserRole.admin:
        allowed_roles = set(UserRole)
    else:  # manager
        allowed_roles = {UserRole.cashier, UserRole.technician}

    if user_data.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Your role ({actor.role.value}) cannot create a "
                f"'{user_data.role.value}' account. "
                f"Allowed roles: {[r.value for r in sorted(allowed_roles, key=lambda r: r.value)]}"
            ),
        )

    # Uniqueness check
    existing_user = session.exec(
        select(User).where(
            (User.username == user_data.username) | (User.email == user_data.email)
        )
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered",
        )

    db_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=True,
        hashed_password=get_password_hash(user_data.password),
        user_metadata=user_data.user_metadata or {},
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


@router.post("/login")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    """
    Handles user login, verifies credentials, and sets HttpOnly cookies.
    """
    user = session.exec(select(User).where(User.username == form_data.username)).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
        )

    # Create tokens
    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    # Update last_login time
    user.last_login = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)

    # Construct the response
    user_data = UserRead.model_validate(user).model_dump()
    response = JSONResponse(content=jsonable_encoder(user_data))

    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=30 * 60,
        samesite="lax",
        secure=False,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
        secure=False,
    )

    return response


@router.post("/refresh", response_model=UserRead)
def refresh_access_token(
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
):
    """
    Uses the refresh token cookie to issue a new access token cookie.
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing"
        )

    payload = decode_token(refresh_token, expected_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    user_id = payload.get("sub")
    user = session.exec(select(User).where(User.id == UUID(user_id))).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new access token
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )

    # Set new access token cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=30 * 60,
        samesite="lax",
        secure=False,
    )

    return user


@router.post("/logout")
def logout(response: Response):
    """
    Clears the authentication cookies.
    """
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    return {"detail": "Successfully logged out"}


@router.get("/me", response_model=UserRead)
def read_users_me(current_user: UserRead = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return current_user


# ── User management (admin / manager only) ────────────────────────────────────

from ..models import UserUpdate  # noqa: E402


@router.get("/users", response_model=list[UserRead])
def list_users(
    actor: UserRead = Depends(require_manager),
    session: Session = Depends(get_session),
):
    """
    List all user accounts.
    Managers see cashier/technician accounts only.
    Admins see everyone.
    """
    users = session.exec(select(User).order_by(User.created_at)).all()
    if actor.role == UserRole.manager:
        users = [u for u in users if u.role in (UserRole.cashier, UserRole.technician)]
    return users


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    actor: UserRead = Depends(require_manager),
    session: Session = Depends(get_session),
):
    """
    Update a user account.

    Managers can only edit cashier/technician accounts and cannot promote to
    admin/manager. Admins have no restrictions (except they cannot demote
    themselves — a guard against accidental lock-out).
    """
    target = session.exec(select(User).where(User.id == user_id)).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Managers cannot touch admin or manager accounts
    if actor.role == UserRole.manager:
        if target.role in (UserRole.admin, UserRole.manager):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers cannot edit admin or manager accounts",
            )
        if payload.role and payload.role in (UserRole.admin, UserRole.manager):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers cannot promote users to admin or manager",
            )

    # Admins cannot accidentally remove their own admin status
    if actor.role == UserRole.admin and str(actor.id) == str(user_id):
        if payload.role and payload.role != UserRole.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot demote themselves — ask another admin",
            )
        if payload.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot deactivate their own account",
            )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(target, field, value)

    # Re-hash password if supplied
    if payload.model_fields_set and "password" in payload.model_fields_set:
        target.hashed_password = get_password_hash(payload.password)  # type: ignore[attr-defined]

    session.add(target)
    session.commit()
    session.refresh(target)
    return target


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: UUID,
    actor: UserRead = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """
    Hard-deactivate (soft-delete) a user account. Admin only.
    The account is flagged is_active=False — login is blocked but audit
    history referencing the user ID remains intact.
    """
    if str(actor.id) == str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot deactivate your own account",
        )

    target = session.exec(select(User).where(User.id == user_id)).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target.is_active = False
    session.add(target)
    session.commit()
