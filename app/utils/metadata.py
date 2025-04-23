from typing import Type, List, Dict, Any, Optional
from pydantic import BaseModel
from enum import Enum
import inspect


def get_field_type(field) -> str:
    """Convert Pydantic field types to frontend field types"""
    # Handle enum fields
    if hasattr(field.annotation, "__members__"):  # Check if it's an Enum
        return "enum"

    # Handle other types
    python_type = field.annotation
    if python_type == bool:
        return "boolean"
    elif python_type == int or python_type == float:
        return "number"
    elif python_type == str:
        return "text"

    return "text"


def generate_model_metadata(
    name: str,
    model_cls: Type[BaseModel],
    create_schema: Type[BaseModel],
    icon: str,
    enum_fields: Dict[str, Type[Enum]] = None,
) -> Dict[str, Any]:
    """Generate metadata for a model"""

    enum_fields = enum_fields or {}
    fields = []

    # Get required fields from create schema
    required_fields = create_schema.model_fields

    for field_name, field in model_cls.model_fields.items():
        # Determine if field is required
        is_required = field_name in required_fields and not field.default

        # Determine field type
        field_type = "text"  # default
        if field_name in enum_fields:
            field_type = "enum"
        elif get_field_type(field) == "boolean":
            field_type = "boolean"
        elif field_name == "email":
            field_type = "email"
        elif field_name == "created_at":
            field_type = "datetime"
        elif "date" in field_name:
            field_type = "date"

        # Build field metadata
        field_meta = {
            "name": field_name,
            "display_name": field_name.replace("_", " ").title(),
            "type": field_type,
            "editable": field_name not in ("id", "created_at"),
            "required": is_required,
        }

        # Add enum options if applicable
        if field_name in enum_fields:
            enum_class = enum_fields[field_name]
            field_meta["options"] = [
                {"value": item.value, "name": item.name.replace("_", " ").title()}
                for item in enum_class
            ]

        fields.append(field_meta)

    return {"name": name, "display_name": name.title(), "icon": icon, "fields": fields}
