from fastapi.responses import JSONResponse
from pydantic import ValidationError

def handle_validation_error(e: ValidationError):
    error_list = [
        {"loc": error["loc"], "msg": error["msg"], "type": error["type"]}
        for error in e.errors()
    ]
    return JSONResponse(content={"success": False, "errors": error_list}, status_code=422)