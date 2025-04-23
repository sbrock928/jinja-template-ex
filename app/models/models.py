# models.py
from pydantic import BaseModel, EmailStr, validator, Field
from typing import List, Optional, Dict, Any, TypeVar, Generic, Type
from enum import Enum
import uuid
from datetime import datetime, date


# Enum for employee positions
class EmployeePosition(str, Enum):
    ASSOCIATE = "Associate"
    ANALYST = "Analyst"
    SPECIALIST = "Specialist"
    SENIOR_SPECIALIST = "Senior Specialist"
    MANAGER = "Manager"
    SENIOR_MANAGER = "Senior Manager"
    DIRECTOR = "Director"
    VICE_PRESIDENT = "Vice President"
    EXECUTIVE = "Executive"

    @classmethod
    def _missing_(cls, value):
        # Handle conversion from frontend format
        if isinstance(value, str):
            # Try matching by normalized value (convert spaces to underscores)
            normalized = value.replace(" ", "_").upper()
            try:
                return cls[normalized]
            except KeyError:
                pass
        return None


# Generic base class for all models
class BaseModelSchema(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime | None = None

    def model_update(self, **kwargs):
        # Create a new dict with current values
        current_data = self.model_dump()
        # Update with new values
        current_data.update(kwargs)
        # Return a new instance
        return self.__class__(**current_data)


# Base class for database models with update method
class BaseDBModel(BaseModel):
    id: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    def update(self, **kwargs):
        kwargs["updated_at"] = datetime.now()
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)


# User models
class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr

    @validator("first_name", "last_name")
    def name_must_not_be_empty(cls, v):
        if not v or v.strip() == "":
            raise ValueError("Name fields cannot be empty")
        return v


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None

    @validator("first_name", "last_name")
    def name_must_not_be_empty(cls, v):
        if v is not None and v.strip() == "":
            raise ValueError("Name fields cannot be empty")
        return v


class User(UserBase, BaseModelSchema):
    pass


# Employee models with date fields and position enum
class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    department: str
    position: EmployeePosition
    hire_date: date
    contract_end_date: Optional[date] = None

    @validator("first_name", "last_name", "department")
    def fields_must_not_be_empty(cls, v):
        if not v or v.strip() == "":
            raise ValueError("Fields cannot be empty")
        return v


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    position: Optional[EmployeePosition] = None
    hire_date: Optional[date] = None
    contract_end_date: Optional[date] = None

    @validator("first_name", "last_name", "department")
    def fields_must_not_be_empty(cls, v):
        if v is not None and v.strip() == "":
            raise ValueError("Fields cannot be empty")
        return v


class Employee(EmployeeBase, BaseModelSchema):
    pass


# Subscriber models
class SubscriberBase(BaseModel):
    name: str
    email: EmailStr
    subscription_type: str
    is_active: bool = True

    @validator("name", "subscription_type")
    def fields_must_not_be_empty(cls, v):
        if not v or v.strip() == "":
            raise ValueError("Fields cannot be empty")
        return v


class SubscriberCreate(SubscriberBase):
    pass


class SubscriberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    subscription_type: Optional[str] = None
    is_active: Optional[bool] = None

    @validator("name", "subscription_type")
    def fields_must_not_be_empty(cls, v):
        if v is not None and v.strip() == "":
            raise ValueError("Fields cannot be empty")
        return v


class Subscriber(SubscriberBase, BaseModelSchema):
    pass
