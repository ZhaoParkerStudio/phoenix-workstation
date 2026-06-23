import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    webos_user: str = ""
    webos_cookie: str = ""
    admin_password: str = "admin123"  # 请在.env中设置实际密码
    database_url: str = "sqlite+aiosqlite:///./phoenix.db"
    deepseek_model: str = "deepseek-chat"

    class Config:
        env_file = ".env"

settings = Settings()