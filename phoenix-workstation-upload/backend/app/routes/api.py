import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.news_service import news_service
from app.services.deepseek import chat_with_agent, track_news
from app.services.scraper import get_all_sources, scrape_source, PRESET_SOURCES
from app.config import settings
from app.database import async_session
from app.models import CustomSource
from sqlalchemy import select
import hashlib

router = APIRouter()

class LoginRequest(BaseModel):
    password: str

class ChatRequest(BaseModel):
    messages: list[dict]
    agentType: str = None  # 写稿Agent类型：LVO/SOT/SBLVO/SBONLY/干稿/干+图

class SourceAddRequest(BaseModel):
    name: str
    url: str
    source_type: str = "rss"
    lang: str = "zh"

class TrackRequest(BaseModel):
    title: str
    summary: str = ""
    source_names: list[str] = []
    source_urls: list[str] = []

@router.post("/api/login")
async def login(req: LoginRequest):
    if req.password == settings.admin_password:
        return {"success": True, "token": "phoenix-session"}
    raise HTTPException(status_code=401, detail="密码错误")

@router.get("/api/news")
async def get_news(limit: int = 50, refresh: int = 0, source: str = ""):
    if refresh:
        asyncio.create_task(news_service.run_scrape_cycle())
    items = await news_service.get_recent_news(limit)
    if source:
        items = [i for i in items if i["source_name"] == source]
    return {"items": items}

@router.get("/api/news/sources")
async def get_sources():
    sources = await get_all_sources()
    async with async_session() as db:
        result = await db.execute(select(CustomSource))
        custom_map = {row.url: row.id for row in result.scalars().all()}
    for s in sources:
        if s.get("custom") and s["url"] in custom_map:
            s["source_id"] = custom_map[s["url"]]
    return {"sources": sorted(set(s["name"] for s in sources)), "details": sources}

@router.get("/api/news/sources/preset")
async def get_preset_sources():
    async with async_session() as db:
        result = await db.execute(select(CustomSource))
        custom_urls = {row.url for row in result.scalars().all()}
    preset = []
    for s in PRESET_SOURCES:
        preset.append({**s, "added": s["url"] in custom_urls})
    return {"presets": preset}

@router.post("/api/news/sources")
async def add_source(req: SourceAddRequest):
    source_id = hashlib.md5(req.url.encode()).hexdigest()[:12]
    async with async_session() as db:
        existing = await db.get(CustomSource, source_id)
        if existing:
            raise HTTPException(status_code=400, detail="该URL已存在")
        cs = CustomSource(id=source_id, name=req.name, url=req.url, source_type=req.source_type, lang=req.lang)
        db.add(cs)
        await db.commit()
    return {"success": True, "id": source_id}

@router.delete("/api/news/sources/{source_id}")
async def delete_source(source_id: str):
    async with async_session() as db:
        cs = await db.get(CustomSource, source_id)
        if cs:
            await db.delete(cs)
            await db.commit()
    return {"success": True}

@router.post("/api/chat")
async def chat(req: ChatRequest):
    async def generate():
        try:
            async for chunk in chat_with_agent(req.messages, req.agentType):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except Exception as e:
            logger.error(f"/api/chat error: {e}")
            yield f"data: {json.dumps({'content': f'[错误] 服务异常: {type(e).__name__}'})}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")

@router.post("/api/track")
async def track(req: TrackRequest):
    async def generate():
        try:
            async for chunk in track_news(req.title, req.summary, req.source_names, req.source_urls):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except Exception as e:
            logger.error(f"/api/track error: {e}")
            yield f"data: {json.dumps({'content': f'[错误] 服务异常: {type(e).__name__}'})}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")

@router.get("/api/news/{news_id}")
async def get_news_detail(news_id: str):
    items = await news_service.get_recent_news(200)
    for item in items:
        if item["id"] == news_id:
            return {"item": item}
    raise HTTPException(status_code=404, detail="新闻不存在")

@router.websocket("/ws/news")
async def websocket_news(ws: WebSocket):
    await ws.accept()
    q = news_service.subscribe()
    try:
        items = await news_service.get_recent_news(30)
        await ws.send_json({"type": "init", "data": items})
        while True:
            msg = await q.get()
            await ws.send_json(msg)
    except WebSocketDisconnect:
        pass
    finally:
        news_service.unsubscribe(q)
