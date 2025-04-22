# app/registry.py
from importlib import import_module
from typing import Dict, Type, Callable, Any
from sqlalchemy.orm import Session, declarative_base
from pydantic import BaseModel



class ModelRegistry:
    """Registry of all models and their related schemas and CRUD operations."""

    def __init__(self):
        self.models: Dict[str, Dict[str, Any]] = {}

    def register(self,
                 name: str,
                 db_model: Type[declarative_base],
                 create_schema: Type[BaseModel],
                 update_schema: Type[BaseModel],
                 response_schema: Type[BaseModel],
                 get_all_fn: Callable[[Session], list],
                 get_one_fn: Callable[[Session, int], Any],
                 create_fn: Callable[[Session, Any], Any],
                 update_fn: Callable[[Session, int, Any], Any],
                 delete_fn: Callable[[Session, int], None],
                 title: str = None):
        """Register a new model with all its related components."""

        self.models[name] = {
            "db_model": db_model,
            "schemas": {
                "create": create_schema,
                "update": update_schema,
                "response": response_schema
            },
            "crud": {
                "get_all": get_all_fn,
                "get_one": get_one_fn,
                "create": create_fn,
                "update": update_fn,
                "delete": delete_fn
            },
            "title": title or name.capitalize()
        }

    def get_model(self, name: str) -> Dict[str, Any]:
        """Get a registered model by name."""
        if name not in self.models:
            raise KeyError(f"Model '{name}' not registered")
        return self.models[name]

    def list_models(self) -> list:
        """List all registered model names."""
        return list(self.models.keys())


# Initialize the registry
registry = ModelRegistry()


# Function to auto-register models from modules
def register_models_from_modules(module_names: list[str]):
    """
    Automatically register models from specified modules.
    Each module should have a register_model() function that registers its model.
    """
    for module_name in module_names:
        try:
            module = import_module(module_name)
            if hasattr(module, 'register_model'):
                module.register_model(registry)
        except ImportError as e:
            print(f"Failed to import module {module_name}: {e}")
