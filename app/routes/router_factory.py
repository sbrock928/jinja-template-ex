# router_factory.py
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Generic, TypeVar, Type, List, Dict, Any, Optional, Callable
from pydantic import BaseModel
from app.models.models import BaseModelSchema
from app.db.db import InMemoryDB
from datetime import datetime
from functools import wraps
from fastapi import HTTPException
from typing import Callable

# Type variables for our generic router
T = TypeVar("T", bound=BaseModelSchema)
CreateT = TypeVar("CreateT", bound=BaseModel)
UpdateT = TypeVar("UpdateT", bound=BaseModel)


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    skip: int
    limit: int


def handle_route_errors(func: Callable):
    """Decorator to handle common route errors"""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            # Re-raise FastAPI's own HTTP exceptions
            raise
        except Exception as e:
            # Convert other exceptions to 500 errors
            raise HTTPException(status_code=500, detail=str(e))

    return wrapper


class RouterFactory(Generic[T, CreateT, UpdateT]):
    """
    Factory class to create CRUD routers for different models
    """

    def __init__(
        self,
        db: InMemoryDB,
        prefix: str,
        tags: List[str],
        model_cls: Type[T],
        create_schema: Type[CreateT],
        update_schema: Type[UpdateT],
        get_item_dependency: Optional[Callable] = None,
    ):
        self.db = db
        self.prefix = prefix
        self.tags = tags
        self.model_cls = model_cls
        self.create_schema = create_schema
        self.update_schema = update_schema

        # Create a default item dependency if none provided
        if get_item_dependency is None:

            def get_item_by_id(item_id: str):
                item = self.db.get_by_id(item_id)
                if item is None:
                    raise HTTPException(
                        status_code=404, detail=f"{self.model_cls.__name__} not found"
                    )
                return item

            self.get_item_dependency = get_item_by_id
        else:
            self.get_item_dependency = get_item_dependency

    def create_router(self) -> APIRouter:
        """
        Create a router with CRUD endpoints for the model
        """
        router = APIRouter(prefix=self.prefix, tags=self.tags)

        # Create operation
        @router.post("/", response_model=self.model_cls)
        @handle_route_errors
        async def create_item(item: self.create_schema):
            # Convert Pydantic model to dict
            item_data = item.model_dump()

            # Add required fields for new items
            current_time = datetime.now()
            additional_fields = {
                "id": str(current_time.timestamp()),
                "created_at": current_time,
                "updated_at": current_time,
            }

            # Create new item with all fields
            new_item = self.model_cls(**item_data, **additional_fields)

            # Save to database
            created_item = self.db.create(new_item)
            return created_item

        # Read all operation
        @router.get("/", response_model=PaginatedResponse[self.model_cls])
        @handle_route_errors
        async def get_items(
            skip: int = Query(default=0, ge=0),
            limit: int = Query(default=10, ge=1, le=100),
        ):
            items, total_count = self.db.get_all(skip=skip, limit=limit)
            return {"items": items, "total": total_count, "skip": skip, "limit": limit}

        # Read one operation
        @router.get("/{item_id}", response_model=self.model_cls)
        @handle_route_errors
        async def get_item(item: self.model_cls = Depends(self.get_item_dependency)):
            return item

        # Update operation
        @router.patch("/{item_id}", response_model=self.model_cls)
        @handle_route_errors
        async def update_item(
            update_data: self.update_schema,
            item: self.model_cls = Depends(self.get_item_dependency),
        ):
            # Filter out unset fields
            update_dict = update_data.dict(exclude_unset=True)
            update_dict["updated_at"] = datetime.now()

            if not update_dict:
                raise HTTPException(status_code=400, detail="No fields to update")

            updated_item = self.db.update(item.id, update_dict)
            if updated_item is None:
                raise HTTPException(
                    status_code=404, detail=f"{self.model_cls.__name__} not found"
                )

            return updated_item

        # Delete operation
        @router.delete("/{item_id}")
        @handle_route_errors
        async def delete_item(item: self.model_cls = Depends(self.get_item_dependency)):
            success = self.db.delete(item.id)
            if success:
                return {"message": f"{self.model_cls.__name__} deleted successfully"}
            raise HTTPException(
                status_code=404, detail=f"{self.model_cls.__name__} not found"
            )

        return router
