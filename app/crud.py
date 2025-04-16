from sqlalchemy.orm import Session
from app import models, schemas


def get_employees(db: Session):
    return db.query(models.Employee).all()


def create_employee(db: Session, employee: schemas.EmployeeCreate):
    db_employee = models.Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


def get_employee(db: Session, employee_id: int):
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()


def update_employee(db: Session, employee_id: int, employee: schemas.EmployeeCreate):
    db_employee = (
        db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    )
    if db_employee:
        for key, value in employee.model_dump().items():
            setattr(db_employee, key, value)
        db.commit()
        db.refresh(db_employee)
    return db_employee


def delete_employee(db: Session, employee_id: int):
    db_employee = (
        db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    )
    if db_employee:
        db.delete(db_employee)
        db.commit()
    return db_employee
