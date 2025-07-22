from pydantic import BaseModel, Field, JsonValue


class Success(BaseModel):
    message: str
    detail: JsonValue = Field(None)
