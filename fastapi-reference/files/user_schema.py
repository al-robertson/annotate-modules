"""Pydantic schemas for the User resource."""

from pydantic import BaseModel, Field


class UserBase(BaseModel):
    """Shared properties for a User."""

    display_name: str = Field(
        ...,
        description="The user's full display name.",
        examples=["Ada Lovelace"],
    )
    email: str = Field(
        ...,
        description="The user's unique email address.",
        examples=["ada@example.com"],
    )


class UserCreate(UserBase):
    """Payload for creating a new User."""


class UserUpdate(BaseModel):
    """Payload for partially updating a User (all fields optional)."""

    display_name: str | None = Field(
        default=None,
        description="Updated display name.",
        examples=["Grace Hopper"],
    )
    email: str | None = Field(
        default=None,
        description="Updated email address.",
        examples=["grace@example.com"],
    )


class UserResponse(UserBase):
    """Response schema returned when reading a User."""

    id: int = Field(
        ...,
        description="The server-generated unique identifier for the user.",
        examples=[1],
    )

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """Paginated list response for Users."""

    users: list[UserResponse] = Field(
        ..., description="The page of user resources."
    )
    next_offset: int | None = Field(
        default=None,
        description="Offset for the next page, or null if this is the last page.",
        examples=[20],
    )


class AssignGroupRequest(BaseModel):
    """Payload for assigning a user to a group."""

    group_id: int = Field(
        ...,
        description="The ID of the group to assign the user to.",
        examples=[1],
    )
