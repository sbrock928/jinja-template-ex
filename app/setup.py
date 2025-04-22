from typing import AsyncGenerator
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.database import init_db

from fastapi.staticfiles import StaticFiles
from app.registry import register_models_from_modules
from app.main import router

def create_app() -> FastAPI:
    app = FastAPI(title="Dynamic Resource Manager")
    app.mount("/static", StaticFiles(directory="static"), name="static")

    # Register all models
    register_models_from_modules([
        'app.models.employee',
        'app.models.user'
        # Add more model modules here as needed
    ])
    init_db()



    app.include_router(router)



    return app

