from fastapi import APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from .jwt import hash_password, verify_password, create_access_token, decode_token
from ..database.crud import Database
from ..models.schemas import UserResponse, LoginRequest, RegisterRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])
db = Database()


async def get_current_user(request: Request):
    """Dependency to get current authenticated user from JWT token"""
    token = request.cookies.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("user_id")
    tenant_id = payload.get("tenant_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"user": user, "tenant_id": tenant_id}


@router.post("/register")
async def register(req: RegisterRequest, response: Response):
    """Register a new user"""
    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="Nome é obrigatório")

    existing_user = await db.get_user_by_username(req.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    password_hash = hash_password(req.password)
    user = await db.create_user(
        username=req.username,
        password_hash=password_hash,
        name=req.name,
        email=req.email,
    )

    # Create default tenant for new user
    tenant = await db.create_tenant(
        name=f"{req.name}'s Workspace",
        description="Default workspace",
        user_id=user["id"],
    )

    # Create JWT token
    token = create_access_token({
        "user_id": user["id"],
        "tenant_id": tenant["id"],
        "username": user["username"],
    })

    response.set_cookie("token", token, httponly=True, samesite="lax", max_age=86400)
    return {
        "user": UserResponse(**user),
        "tenant_id": tenant["id"],
    }


@router.post("/login")
async def login(req: LoginRequest, response: Response):
    """Login user"""
    user = await db.get_user_by_username(req.username)
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    tenants = await db.get_user_tenants(user["id"])
    tenant_id = tenants[0]["id"] if tenants else None

    if not tenant_id:
        raise HTTPException(status_code=403, detail="Nenhum tenant associado a esta conta")

    token = create_access_token({
        "user_id": user["id"],
        "tenant_id": tenant_id,
        "username": user["username"],
    })

    response.set_cookie("token", token, httponly=True, samesite="lax", max_age=86400)
    return {
        "authenticated": True,
        "user": UserResponse(
            id=user["id"],
            username=user["username"],
            name=user["name"],
            email=user["email"],
        ),
        "tenant_id": tenant_id,
        "currentTenantId": tenant_id,
        "tenants": [{"id": t["id"], "name": t["name"], "role": t.get("role")} for t in tenants],
    }


@router.post("/logout")
async def logout(response: Response):
    """Logout user"""
    response.delete_cookie("token")
    return {"status": "logged out"}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    user_data = current_user["user"]
    tenant_id = current_user["tenant_id"]

    tenants = await db.get_user_tenants(user_data["id"])

    return {
        "authenticated": True,
        "user": UserResponse(
            id=user_data["id"],
            username=user_data["username"],
            name=user_data["name"],
            email=user_data.get("email"),
        ),
        "tenant_id": tenant_id,
        "currentTenantId": tenant_id,
        "tenants": tenants,
    }
