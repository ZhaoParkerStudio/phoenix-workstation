import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float, Boolean
from app.database import Base

class NewsItem(Base):
    __tablename__ = "news_items"
    id = Column(String, primary_key=True)
    title_cn = Column(String(500), nullable=False)
    summary = Column(Text, default="")
    source_name = Column(String(200), default="")
    source_url = Column(String(1000), default="")
    language = Column(String(20), default="zh")
    published_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    importance = Column(Float, default=0.0)
    raw_content = Column(Text, default="")
    status = Column(String(20), default="new")

class CustomSource(Base):
    __tablename__ = "custom_sources"
    id = Column(String, primary_key=True)
    name = Column(String(200), nullable=False)
    url = Column(String(1000), nullable=False)
    source_type = Column(String(20), default="rss")
    lang = Column(String(20), default="zh")
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
