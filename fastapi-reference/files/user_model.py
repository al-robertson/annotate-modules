"""SQLAlchemy model for the User resource."""

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.association import user_group_association


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)

    groups = relationship(
        "GroupModel",
        secondary=user_group_association,
        back_populates="users",
        lazy="selectin",
    )
