from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from app.registry import registry
from app.utils import handle_validation_error
from pydantic import ValidationError
from app.database import get_db

def create_crud_router(model_name: str):
    router = APIRouter()

    @router.get("/", tags=["API"])
    def get_records(db: Session = Depends(get_db)):
        try:
            model = registry.get_model(model_name)
            return model["crud"]["get_all"](db)
        except KeyError:
            raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")

    @router.post("/", tags=["API"])
    async def create_record(request: Request, db: Session = Depends(get_db)):
        try:
            model = registry.get_model(model_name)
            form_data = await request.form()
            create_schema = model["schemas"]["create"]
            validated_data = create_schema(**form_data)
            return model["crud"]["create"](db, validated_data)
        except ValidationError as e:
            return handle_validation_error(e)
        except KeyError:
            raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")

    return router