from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import Session
from app.database import Base
from app import schemas


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    department = Column(String, nullable=False)


# CRUD functions for employee
def get_all(db: Session):
    return db.query(Employee).all()


def get_one(db: Session, id: int):
    return db.query(Employee).filter(Employee.id == id).first()


def create(db: Session, employee_data):
    db_employee = Employee(**employee_data.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


def update(db: Session, id: int, employee_data):
    db_employee = get_one(db, id)
    if db_employee:
        for key, value in employee_data.model_dump().items():
            setattr(db_employee, key, value)
        db.commit()
        db.refresh(db_employee)
    return db_employee


def delete(db: Session, id: int):
    db_employee = get_one(db, id)
    if db_employee:
        db.delete(db_employee)
        db.commit()
    return db_employee


def register_model(registry):
    registry.register(
        name="employees",
        db_model=Employee,
        create_schema=schemas.EmployeeCreate,
        update_schema=schemas.EmployeeUpdate,
        response_schema=schemas.EmployeeResponse,
        get_all_fn=get_all,
        get_one_fn=get_one,
        create_fn=create,
        update_fn=update,
        delete_fn=delete,
        title="Employee"
    )
