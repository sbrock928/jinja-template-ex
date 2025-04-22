from fastapi import FastAPI, Request, Depends, status, Form, HTTPException, APIRouter
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from sqlalchemy.orm import Session
from typing import Annotated, Dict, Any

from app.database import Base, engine, get_db
from app.registry import registry, register_models_from_modules
from app.utils import handle_validation_error
from app.crud_router import create_crud_router

# from app.models.employee import Employee
# register_models_from_modules()
# Base.metadata.create_all(bind=engine)

router = APIRouter()

templates = Jinja2Templates(directory="app/templates")
async def get_form_data(request: Request) -> Dict:
    """
    Parse form data from a request and return it as a dictionary.
    Handles both regular form submissions and multipart forms.
    """
    form_data = {}

    # Check if we have form data
    if request.headers.get("Content-Type", "").startswith("multipart/form-data"):
        # For multipart form data (with file uploads)
        form = await request.form()
        for key, value in form.items():
            # Handle file uploads separately if needed
            if hasattr(value, "filename"):
                # This is a file upload
                form_data[key] = value
            else:
                form_data[key] = value
    else:
        # For regular form data
        form = await request.form()
        for key, value in form.items():
            form_data[key] = value

    return form_data

@router.route("/")
def home(request: Request):
    return templates.TemplateResponse("content/home.html", {
        "request": request,
    })

# Home route to list all available models
@router.get("/resources", tags=['UI'], response_class=HTMLResponse)
def index(request: Request):
    models = registry.list_models()
    model_info = []

    for model_name in models:
        model = registry.get_model(model_name)
        model_info.append({
            "name": model_name,
            "title": model["title"]
        })

    return templates.TemplateResponse("content/resources.html", {
        "request": request,
        "models": model_info
    })


# Generic model page route
@router.get("/{model_name}", tags=['UI'], response_class=HTMLResponse)
def model_page(model_name: str, request: Request):
    try:
        model = registry.get_model(model_name)
        return templates.TemplateResponse("content/model_page.html", {
            "request": request,
            "model_name": model_name,
            "model_title": model["title"]
        })
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")


# Generic table route
@router.get("/{model_name}/table", tags=['UI'], response_class=HTMLResponse)
def get_table(model_name: str, request: Request, db: Session = Depends(get_db)):
    try:
        model = registry.get_model(model_name)
        records = model["crud"]["get_all"](db)
        schema = model["schemas"]["response"]
        fields = list(schema.model_fields.keys())

        # Exclude internal fields
        visible_fields = [f for f in fields if f != "id"]

        return templates.TemplateResponse("partials/table.html", {
            "request": request,
            "records": records,
            "fields": visible_fields,
            "model_name": model_name,
            "editable": True
        })
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")


# Generic "new" modal route
@router.get("/{model_name}/modal", tags=['UI'], response_class=HTMLResponse)
def new_modal(model_name: str, request: Request):
    try:
        model = registry.get_model(model_name)
        schema = model["schemas"]["create"]

        return templates.TemplateResponse("partials/form.html", {
            "request": request,
            "form_data": {},
            "fields": schema.model_fields,
            "model_name": model_name,
            "method": "POST",
            "title": f"Add {model['title']}"
        })
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")


# Generic "edit" modal route
@router.get("/{model_name}/modal/{record_id}", tags=['UI'], response_class=HTMLResponse)
def edit_modal(model_name: str, record_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        model = registry.get_model(model_name)
        record = model["crud"]["get_one"](db, record_id)

        if not record:
            raise HTTPException(status_code=404, detail=f"{model['title']} with ID {record_id} not found")

        return templates.TemplateResponse("partials/form.html", {
            "request": request,
            "form_data": model["schemas"]["response"].model_validate(record).model_dump(),
            "fields": model["schemas"]["update"].model_fields,
            "model_name": model_name,
            "record_id": record_id,
            "method": "PATCH",
            "title": f"Edit {model['title']}"
        })
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")


# API Routes

@router.get("/api/{model_name}", tags=['API'])
def get_records(model_name: str, db: Session = Depends(get_db)):
    try:
        model = registry.get_model(model_name)
        records = model["crud"]["get_all"](db)
        return records
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")


@router.post("/api/{model_name}")
def create_record(model_name: str, form_data: Annotated[Dict, Depends(get_form_data)], db: Session = Depends(get_db)):
    try:
        model = registry.get_model(model_name)
        create_schema = model["schemas"]["create"]
        validated_data = create_schema(**form_data)
        record = model["crud"]["create"](db, validated_data)
        return {"message": f"{model['title']} created successfully"}
    except ValidationError as e:
        return handle_validation_error(e)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")


@router.patch("/api/{model_name}/{record_id}", tags=['API'])
async def update_record(
    model_name: str, 
    record_id: int, 
    form_data: Annotated[Dict, Depends(get_form_data)],
    db: Session = Depends(get_db)
):
    try:
        model = registry.get_model(model_name)
        update_schema = model["schemas"]["update"]

        try:
            data = update_schema(**form_data)
            record = model["crud"]["update"](db, record_id, data)
            if not record:
                raise HTTPException(status_code=404, detail=f"{model['title']} with ID {record_id} not found")
            return {"message": f"{model['title']} updated successfully"}
        except ValidationError as e:
            return handle_validation_error(e)

    except KeyError:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")


@router.delete("/api/{model_name}/{record_id}", tags=['API'])
def delete_record(model_name: str, record_id: int, db: Session = Depends(get_db)):
    try:
        model = registry.get_model(model_name)
        record = model["crud"]["get_one"](db, record_id)

        if not record:
            raise HTTPException(status_code=404, detail=f"{model['title']} with ID {record_id} not found")

        model["crud"]["delete"](db, record_id)
        return {"detail": "Deleted"}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
