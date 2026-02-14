from pydantic_settings import BaseSettings
from functools import lru_cache
from urllib.parse import quote_plus


class Settings(BaseSettings):
    # ── Proxmox ──────────────────────────────────────────────
    proxmox_host: str = "192.168.1.100"
    proxmox_token_name: str = "root@pam!ucp-token"
    proxmox_token_value: str = ""
    proxmox_verify_ssl: bool = False

    # ── Database (individual vars — avoids special char issues) ──
    postgres_user: str = "ucp"
    postgres_password: str = "ucp_secret"
    postgres_host: str = "db"
    postgres_port: int = 5432
    postgres_db: str = "ucp_vm"

    # ── Google OAuth2 ────────────────────────────────────────
    google_client_id: str = ""

    # ── JWT ──────────────────────────────────────────────────
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24h

    @property
    def database_url(self) -> str:
        password = quote_plus(self.postgres_password)
        return f"postgresql+asyncpg://{self.postgres_user}:{password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
