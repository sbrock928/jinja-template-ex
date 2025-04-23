from fastapi import FastAPI, Request


from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from datetime import datetime, date

from app.config import get_settings
from app.models.models import (
    User,
    UserCreate,
    UserUpdate,
    Employee,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeePosition,
    Subscriber,
    SubscriberCreate,
    SubscriberUpdate,
)
from app.db.db import user_db, employee_db, subscriber_db
from app.routes.router_factory import RouterFactory


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_TITLE,
        description=settings.APP_DESCRIPTION,
        version=settings.APP_VERSION,
    )

    # Mount static files
    app.mount("/static", StaticFiles(directory="static"), name="static")

    # Setup templates
    app.state.templates = Jinja2Templates(directory="templates")

    # Create and include routers
    user_router = RouterFactory(
        db=user_db,
        prefix="/api/users",
        tags=["Users"],
        model_cls=User,
        create_schema=UserCreate,
        update_schema=UserUpdate,
    ).create_router()

    employee_router = RouterFactory(
        db=employee_db,
        prefix="/api/employees",
        tags=["Employees"],
        model_cls=Employee,
        create_schema=EmployeeCreate,
        update_schema=EmployeeUpdate,
    ).create_router()

    subscriber_router = RouterFactory(
        db=subscriber_db,
        prefix="/api/subscribers",
        tags=["Subscribers"],
        model_cls=Subscriber,
        create_schema=SubscriberCreate,
        update_schema=SubscriberUpdate,
    ).create_router()

    app.include_router(user_router)
    app.include_router(employee_router)
    app.include_router(subscriber_router)

    # Frontend route
    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        return app.state.templates.TemplateResponse("index.html", {"request": request})

    # Metadata endpoint
    @app.get("/api/metadata")
    async def get_metadata():
        print("Metadata endpoint called")  # Add this line
        return {
            "models": [
                {
                    "name": "users",
                    "display_name": "Users",
                    "icon": "bi-people-fill",
                    "fields": [
                        {
                            "name": "id",
                            "display_name": "ID",
                            "type": "text",
                            "editable": False,
                        },
                        {
                            "name": "first_name",
                            "display_name": "First Name",
                            "type": "text",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "last_name",
                            "display_name": "Last Name",
                            "type": "text",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "email",
                            "display_name": "Email",
                            "type": "email",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "created_at",
                            "display_name": "Created At",
                            "type": "datetime",
                            "editable": False,
                        },
                    ],
                },
                {
                    "name": "employees",
                    "display_name": "Employees",
                    "icon": "bi-briefcase-fill",
                    "fields": [
                        {
                            "name": "id",
                            "display_name": "ID",
                            "type": "text",
                            "editable": False,
                        },
                        {
                            "name": "first_name",
                            "display_name": "First Name",
                            "type": "text",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "last_name",
                            "display_name": "Last Name",
                            "type": "text",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "email",
                            "display_name": "Email",
                            "type": "email",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "department",
                            "display_name": "Department",
                            "type": "text",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "position",
                            "display_name": "Position",
                            "type": "enum",
                            "editable": True,
                            "required": True,
                            "options": [
                                {
                                    "value": pos.value,
                                    "name": pos.name.replace("_", " ").title(),
                                }
                                for pos in EmployeePosition
                            ],
                        },
                        {
                            "name": "hire_date",
                            "display_name": "Hire Date",
                            "type": "date",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "created_at",
                            "display_name": "Created At",
                            "type": "datetime",
                            "editable": False,
                        },
                    ],
                },
                {
                    "name": "subscribers",
                    "display_name": "Subscribers",
                    "icon": "bi-envelope-check-fill",
                    "fields": [
                        {
                            "name": "id",
                            "display_name": "ID",
                            "type": "text",
                            "editable": False,
                        },
                        {
                            "name": "name",
                            "display_name": "Name",
                            "type": "text",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "email",
                            "display_name": "Email",
                            "type": "email",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "subscription_type",
                            "display_name": "Subscription Type",
                            "type": "text",
                            "editable": True,
                            "required": True,
                        },
                        {
                            "name": "is_active",
                            "display_name": "Active",
                            "type": "boolean",
                            "editable": True,
                            "required": False,
                        },
                        {
                            "name": "created_at",
                            "display_name": "Created At",
                            "type": "datetime",
                            "editable": False,
                        },
                    ],
                },
            ]
        }

    # Add startup event
    @app.on_event("startup")
    async def startup_event():
        # Add sample users
        sample_users = [
            UserCreate(
                first_name="John", last_name="Doe", email="john.doe@example.com"
            ),
            UserCreate(
                first_name="Jane", last_name="Smith", email="jane.smith@example.com"
            ),
        ]

        for user_data in sample_users:
            user = User(
                **user_data.dict(),
                id=str(datetime.now().timestamp()),
                created_at=datetime.now()
            )
            user_db.create(user)

        # Add sample employees
        sample_employees = [
            EmployeeCreate(
                first_name="Alice",
                last_name="Williams",
                email="alice.williams@example.com",
                department="Engineering",
                position=EmployeePosition.SENIOR_SPECIALIST,
                hire_date=date(2021, 3, 15),
            ),
            EmployeeCreate(
                first_name="Bob",
                last_name="Johnson",
                email="bob.johnson@example.com",
                department="Sales",
                position=EmployeePosition.MANAGER,
                hire_date=date(2020, 6, 1),
            ),
        ]

        for employee_data in sample_employees:
            employee = Employee(
                **employee_data.dict(),
                id=str(datetime.now().timestamp()),
                created_at=datetime.now()
            )
            employee_db.create(employee)

        # Add sample subscribers
        sample_subscribers = [
            SubscriberCreate(
                name="Michael Wilson",
                email="michael.wilson@example.com",
                subscription_type="Premium",
                is_active=True,
            ),
            SubscriberCreate(
                name="Sarah Brown",
                email="sarah.brown@example.com",
                subscription_type="Basic",
                is_active=True,
            ),
        ]

        for subscriber_data in sample_subscribers:
            subscriber = Subscriber(
                **subscriber_data.dict(),
                id=str(datetime.now().timestamp()),
                created_at=datetime.now()
            )
            subscriber_db.create(subscriber)

    return app
