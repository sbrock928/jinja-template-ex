# app/schemas.py
from typing import List

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator


class EmployeeBase(BaseModel):
    name: str = Field(..., title="Full Name")
    email: EmailStr = Field(..., title="Email Address")
    department: str = Field(..., title="Department")

    model_config = ConfigDict(from_attributes=True)

    @field_validator('name')
    def no_numbers_in_name(cls, value):
        if any(char.isdigit() for char in value):
            raise ValueError('name must not contain numbers')

        return value

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(EmployeeBase):
    pass

class EmployeeResponse(EmployeeBase):
    id: int

class EmployeeListResponse(BaseModel):
    employees: List[EmployeeResponse]
