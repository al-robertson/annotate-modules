"""CRUD + sub-collection router for the User resource."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user_model import UserModel
from app.models.group_model import GroupModel
from app.schemas.user_schema import (
    AssignGroupRequest,
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)
from app.schemas.group_schema import GroupResponse

router = APIRouter(prefix="/v1/users", tags=["Users"])


@router.get(
    "",
    summary="List users",
    description="Retrieve a paginated list of all users.",
    response_model=UserListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_users(
    limit: int = Query(20, ge=1, le=100, description="Max items to return."),
    offset: int = Query(0, ge=0, description="Number of items to skip."),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserModel).offset(offset).limit(limit + 1))
    rows = result.scalars().all()
    has_next = len(rows) > limit
    users = rows[:limit]
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        next_offset=offset + limit if has_next else None,
    )


@router.get(
    "/{user_id}",
    summary="Get a user",
    description="Retrieve a single user by their unique ID.",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserResponse.model_validate(user)


@router.post(
    "",
    summary="Create a user",
    description="Create a new user resource.",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    user = UserModel(**payload.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch(
    "/{user_id}",
    summary="Update a user",
    description="Partially update an existing user. Only provided fields are changed.",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
async def update_user(user_id: int, payload: UserUpdate, db: AsyncSession = Depends(get_db)):
    user = await db.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete(
    "/{user_id}",
    summary="Delete a user",
    description="Permanently delete a user by their unique ID.",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    await db.delete(user)
    await db.commit()


# --- Sub-collection: User's Groups ---


@router.get(
    "/{user_id}/groups",
    summary="List a user's groups",
    description="Retrieve all groups that the specified user belongs to.",
    response_model=list[GroupResponse],
    status_code=status.HTTP_200_OK,
)
async def list_user_groups(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return [GroupResponse.model_validate(g) for g in user.groups]


@router.post(
    "/{user_id}/groups",
    summary="Assign a user to a group",
    description="Add the specified user to an existing group by providing the group ID.",
    response_model=GroupResponse,
    status_code=status.HTTP_200_OK,
)
async def assign_user_to_group(
    user_id: int,
    payload: AssignGroupRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    group = await db.get(GroupModel, payload.group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    if group in user.groups:
        raise HTTPException(status_code=409, detail="User is already a member of this group.")
    user.groups.append(group)
    await db.commit()
    return GroupResponse.model_validate(group)
