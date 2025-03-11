from pydantic import BaseModel, ConfigDict, UUID4, AwareDatetime


class Manifest(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    sec_hash: bytes | None = None

    model_config = ConfigDict(from_attributes=True)


class ManifestCreate(Manifest):
    sero_version: str


class ManifestUpdate(Manifest):
    sero_version: str | None  = None


class ManifestRetrieve(Manifest):
    sero_version: str
