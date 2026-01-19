from typing import ClassVar, Optional
import hashlib

from pydantic import Field

from open_notebook.domain.base import ObjectModel


class User(ObjectModel):
    table_name: ClassVar[str] = "user"

    email: str
    password_hash: str
    name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[int] = None
    is_active: bool = Field(default=True)
    role: Optional[str] = Field(default="Pasien")
    session_token: Optional[str] = None

    @staticmethod
    def hash_password(password: str) -> str:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()

    def verify_password(self, password: str) -> bool:
        return self.password_hash == self.hash_password(password)


