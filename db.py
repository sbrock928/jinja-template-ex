# db.py
from typing import Dict, List, Type, TypeVar, Generic, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from models import User, Subscriber, Employee

T = TypeVar('T')


class InMemoryDB(Generic[T]):
    def __init__(self):
        self.data: Dict[str, T] = {}

    def create(self, item: T) -> T:
        self.data[item.id] = item
        return item

    def get_all(self) -> List[T]:
        return list(self.data.values())

    def get_by_id(self, item_id: str) -> Optional[T]:
        return self.data.get(item_id)

    def update(self, item_id: str, update_data: Dict[str, Any]) -> Optional[T]:
        if item_id not in self.data:
            return None

        item = self.data[item_id]

        for field, value in update_data.items():
            setattr(item, field, value)

        setattr(item, 'updated_at', datetime.now())
        self.data[item_id] = item
        return item

    def delete(self, item_id: str) -> bool:
        if item_id in self.data:
            del self.data[item_id]
            return True
        return False


# Initialize in-memory databases for each model type
user_db = InMemoryDB[User]()
employee_db = InMemoryDB[Employee]()
subscriber_db = InMemoryDB[Subscriber]()