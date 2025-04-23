# db.py
from typing import Dict, List, Type, TypeVar, Generic, Any, Optional, Tuple
from pydantic import BaseModel
from datetime import datetime

from app.models.models import User, Subscriber, Employee

T = TypeVar("T", bound=BaseModel)


class InMemoryDB(Generic[T]):
    def __init__(self):
        self.data: Dict[str, T] = {}

    def create(self, item: T) -> T:
        if not hasattr(item, "id"):
            raise ValueError("Item must have an id field")

        self.data[item.id] = item
        return item

    def get_all(self, skip: int = 0, limit: int = 10) -> Tuple[List[T], int]:
        # Get all items sorted by created_at in descending order
        items = sorted(self.data.values(), key=lambda x: x.created_at, reverse=True)

        # Get total count before pagination
        total_count = len(items)

        # Apply pagination
        paginated_items = items[skip : skip + limit]

        return paginated_items, total_count

    def get_by_id(self, item_id: str) -> Optional[T]:
        return self.data.get(item_id)

    def update(self, item_id: str, update_data: Dict[str, Any]) -> Optional[T]:
        if item_id not in self.data:
            return None

        # Get current item
        current_item = self.data[item_id]

        # Add updated_at timestamp
        update_data["updated_at"] = datetime.now()

        # Create updated item using model_update method
        updated_item = current_item.model_update(**update_data)

        # Store updated item
        self.data[item_id] = updated_item

        return updated_item

    def delete(self, item_id: str) -> bool:
        if item_id in self.data:
            del self.data[item_id]
            return True
        return False


# Initialize in-memory databases for each model type
user_db = InMemoryDB[User]()
employee_db = InMemoryDB[Employee]()
subscriber_db = InMemoryDB[Subscriber]()
