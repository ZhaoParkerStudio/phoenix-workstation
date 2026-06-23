import asyncio
import json
import logging
from datetime import datetime
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session
from app.models import NewsItem
from app.services.scraper import scrape_all
from app.services.deepseek import translate_and_summarize

logger = logging.getLogger(__name__)

class NewsService:
    def __init__(self):
        self.subscribers: list[asyncio.Queue] = []
        self._task: asyncio.Task | None = None

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=500)
        self.subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.subscribers:
            self.subscribers.remove(q)

    async def broadcast(self, msg: dict):
        dead = []
        for q in self.subscribers:
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self.subscribers.remove(q)

    async def get_recent_news(self, limit: int = 50) -> list[dict]:
        async with async_session() as db:
            result = await db.execute(
                select(NewsItem)
                .order_by(NewsItem.published_at.desc())
                .limit(limit)
            )
            items = result.scalars().all()
            return [self._to_dict(item) for item in items]

    async def save_news(self, items: list[dict]):
        async with async_session() as db:
            for item in items:
                existing = await db.get(NewsItem, item["id"])
                if existing:
                    continue
                news = NewsItem(
                    id=item["id"],
                    title_cn=item.get("title_cn", item.get("title_raw", "")),
                    summary=item.get("summary", ""),
                    source_name=item.get("source_name", ""),
                    source_url=item.get("source_url", ""),
                    language=item.get("language", "zh"),
                    published_at=item.get("published_at", datetime.utcnow()),
                    importance=item.get("importance", 0.0),
                    raw_content=item.get("raw_content", ""),
                )
                db.add(news)
            await db.commit()

    async def run_scrape_cycle(self):
        """运行一次爬取+AI处理循环"""
        try:
            raw_items = await scrape_all()
            logger.info(f"Scraped {len(raw_items)} raw items")

            translated = await translate_and_summarize(raw_items)

            for item in raw_items:
                match = next((t for t in translated if t.get("id") == item["id"]), None)
                if match:
                    item["title_cn"] = match.get("title_cn", item["title_raw"])
                    item["summary"] = match.get("summary", "")
                    item["importance"] = match.get("importance", 0.0)

            await self.save_news(raw_items)

            for item in raw_items[:20]:
                await self.broadcast({
                    "type": "news",
                    "data": {
                        "id": item["id"],
                        "title_cn": item["title_cn"],
                        "summary": item["summary"],
                        "source_name": item["source_name"],
                        "importance": item.get("importance", 0),
                        "published_at": item["published_at"].isoformat() if isinstance(item["published_at"], datetime) else str(item["published_at"]),
                    }
                })

            logger.info(f"Cycle done: {len(raw_items)} items")
        except Exception as e:
            logger.error(f"Scrape cycle error: {e}")

    async def start(self, interval: int = 300):
        """启动定时爬取，默认每5分钟"""
        logger.info("NewsService started")
        # 首次立即执行
        await self.run_scrape_cycle()
        self._task = asyncio.create_task(self._loop(interval))

    async def _loop(self, interval: int):
        while True:
            await asyncio.sleep(interval)
            await self.run_scrape_cycle()

    async def stop(self):
        if self._task:
            self._task.cancel()

    @staticmethod
    def _to_dict(item: NewsItem) -> dict:
        return {
            "id": item.id,
            "title_cn": item.title_cn,
            "summary": item.summary,
            "source_name": item.source_name,
            "source_url": item.source_url,
            "language": item.language,
            "published_at": item.published_at.isoformat() if item.published_at else "",
            "importance": item.importance,
            "raw_content": item.raw_content,
            "status": item.status,
        }

news_service = NewsService()