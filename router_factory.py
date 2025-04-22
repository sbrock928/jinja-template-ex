# router_factory.py
from fastapi import APIRouter, HTTPException, Depends
from typing import Generic, TypeVar, Type, List, Dict, Any, Optional, Callable
from pydantic import BaseModel
from models import BaseModelSchema
from db import InMemoryDB

# Type variables for our generic router
T = TypeVar('T', bound=BaseModelSchema)
CreateT = TypeVar('CreateT', bound=BaseModel)
UpdateT = TypeVar('UpdateT', bound=BaseModel)


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
            get_item_dependency: Optional[Callable] = None
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
                    raise HTTPException(status_code=404, detail=f"{self.model_cls.__name__} not found")
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
        async def create_item(item_data: self.create_schema):
            # Create a new instance of the model
            new_item = self.model_cls(**item_data.dict())
            return self.db.create(new_item)

        # Read all operation
        @router.get("/", response_model=List[self.model_cls])
        async def get_items():
            return self.db.get_all()

        # Read one operation
        @router.get("/{item_id}", response_model=self.model_cls)
        async def get_item(item: self.model_cls = Depends(self.get_item_dependency)):
            return item

        # Update operation
        @router.patch("/{item_id}", response_model=self.model_cls)
        async def update_item(update_data: self.update_schema,
                              item: self.model_cls = Depends(self.get_item_dependency)):
            # Filter out unset fields
            update_dict = update_data.dict(exclude_unset=True)

            if not update_dict:
                raise HTTPException(status_code=400, detail="No fields to update")

            updated_item = self.db.update(item.id, update_dict)
            if updated_item is None:
                raise HTTPException(status_code=404, detail=f"{self.model_cls.__name__} not found")

            return updated_item

        # Delete operation
        @router.delete("/{item_id}")
        async def delete_item(item: self.model_cls = Depends(self.get_item_dependency)):
            success = self.db.delete(item.id)
            if success:
                return {"message": f"{self.model_cls.__name__} deleted successfully"}
            raise HTTPException(status_code=404, detail=f"{self.model_cls.__name__} not found")

        return router