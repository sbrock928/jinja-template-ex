from fastapi import FastAPI, Request, Depends, status, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from sqlalchemy.orm import Session
from typing import Annotated

from app import crud, models, schemas
from app.database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Employee Manager")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="app/templates")


@app.get("/employees", tags=['UI','Employees'], response_class=HTMLResponse)
def employees_page(request: Request):
    return templates.TemplateResponse("employees.html", {"request": request})

@app.get("/employees/table",tags=['UI','Employees'], response_class=HTMLResponse)
def get_employee_table(request: Request, db: Session = Depends(get_db)):
    employees = crud.get_employees(db)
    schema = schemas.EmployeeResponse
    fields = list(schema.model_fields.keys())  # Pydantic v2

    # Optional: exclude internal or unwanted fields
    visible_fields = [f for f in fields if f != "id"]

    return templates.TemplateResponse("partials/table.html", {
        "request": request,
        "records": employees,
        "fields": visible_fields,
        "editable": True  # or False for read-only
    })


@app.get("/employees/modal",tags=['UI','Employees'], response_class=HTMLResponse)
def new_employee_modal(request: Request):
    schema = schemas.EmployeeCreate
    return templates.TemplateResponse(
        "partials/form.html",
        {
            "request": request,
            "form_data": {},
            "fields": schema.model_fields,
            "method": "post",
            "action": "/api/employees",
            "title": "Add Employee",
        },
    )

@app.get("/employees/modal/{employee_id}",tags=['UI','Employees'], response_class=HTMLResponse)
def get_edit_modal(employee_id: int, request: Request, db: Session = Depends(get_db)):
    employee = crud.get_employee(db, employee_id)
    return templates.TemplateResponse("partials/form.html", {
        "request": request,
        "form_data": schemas.EmployeeResponse.model_validate(employee).model_dump(),
        "fields": schemas.EmployeeUpdate.model_fields,
        "action": f"/api/employees/{employee_id}",
        "title": "Edit Employee",
        "method": "patch"  # 👈 add this line!
    })



@app.get("/api/employees", tags=['API', 'Employees'], response_model=list[schemas.EmployeeResponse])
def get_employees(db: Session = Depends(get_db)):
    return crud.get_employees(db)





@app.post("/api/employees", tags=['API', 'Employees'], response_model=schemas.EmployeeResponse)
async def create_employee(data: Annotated[schemas.EmployeeCreate, Form()], db: Session = Depends(get_db)):

    employee = crud.create_employee(db, data)
    return employee



@app.patch("/api/employees/{employee_id}", tags=['API', 'Employees'], response_model=schemas.EmployeeResponse)
async def update_employee(
    employee_id: int, data: Annotated[schemas.EmployeeCreate, Form()], db: Session = Depends(get_db)
):
    employee = crud.update_employee(db, employee_id, data)
    return employee


@app.delete("/api/employees/{employee_id}", tags=['API', 'Employees'])
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    crud.delete_employee(db, employee_id)
    return {"detail": "Deleted"}
