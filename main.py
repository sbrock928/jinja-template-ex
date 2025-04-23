import uvicorn
from app import create_app

app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",  # Use the import string format: module_name:app_instance
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
    )
