import json
import hashlib
import logging
from datetime import datetime
import httpx
import feedparser
from bs4 import BeautifulSoup
from sqlalchemy import select
from app.database import async_session
from app.models import CustomSource

logger = logging.getLogger(__name__)

DEFAULT_SOURCES = [
    {"name": "卫星通讯社", "url": "https://sputniknews.cn/export/rss2/archive/index.xml", "type": "rss", "lang": "zh"},
    {"name": "韩联社", "url": "https://cn.yna.co.kr/RSS/news.xml", "type": "rss", "lang": "zh"},
    {"name": "澎湃新闻", "url": "https://www.thepaper.cn/fe_api/bg_news_list?pageidx=1", "type": "json", "lang": "zh"},
    {"name": "NHK", "url": "https://www3.nhk.or.jp/news/easy/news-list.json", "type": "json", "lang": "ja"},
    {"name": "朝中社", "url": "http://www.kcna.kp/cn", "type": "html", "lang": "zh"},
    {"name": "劳动新闻", "url": "http://www.rodong.rep.kp/cn/", "type": "html", "lang": "zh"},
]

PRESET_SOURCES = [
    {"name": "新华社-时政", "url": "http://www.xinhuanet.com/politics/news_politics.xml", "type": "rss", "lang": "zh", "category": "国内"},
    {"name": "新华社-国际", "url": "http://www.xinhuanet.com/world/news_world.xml", "type": "rss", "lang": "zh", "category": "国际"},
    {"name": "人民网-时政", "url": "http://www.people.com.cn/rss/politics.xml", "type": "rss", "lang": "zh", "category": "国内"},
    {"name": "人民网-国际", "url": "http://www.people.com.cn/rss/world.xml", "type": "rss", "lang": "zh", "category": "国际"},
    {"name": "中新网", "url": "https://www.chinanews.com/rss/scroll-news.xml", "type": "rss", "lang": "zh", "category": "综合"},
    {"name": "央视网-新闻", "url": "https://news.cctv.com/rss/data.xml", "type": "rss", "lang": "zh", "category": "国内"},
    {"name": "环球时报", "url": "https://www.huanqiu.com/rss/world.xml", "type": "rss", "lang": "zh", "category": "国际"},
    {"name": "参考消息", "url": "https://www.cankaoxiaoxi.com/rss/rss.xml", "type": "rss", "lang": "zh", "category": "国际"},
    {"name": "光明网", "url": "https://www.gmw.cn/rss/rss.xml", "type": "rss", "lang": "zh", "category": "国内"},
    {"name": "中国日报", "url": "https://www.chinadaily.com.cn/rss/china_rss.xml", "type": "rss", "lang": "zh", "category": "国内"},
    {"name": "BBC中文", "url": "https://feeds.bbci.co.uk/zhongwen/simp/rss.xml", "type": "rss", "lang": "zh", "category": "国际"},
    {"name": "DW中文", "url": "https://rss.dw.com/rdf/rss-chi-all", "type": "rss", "lang": "zh", "category": "国际"},
    {"name": "RFI中文", "url": "https://www.rfi.fr/cn/%E4%B8%AD%E5%9B%BD/RSS", "type": "rss", "lang": "zh", "category": "国际"},
    {"name": "路透社", "url": "https://www.reutersagency.com/feed/", "type": "rss", "lang": "en", "category": "国际"},
    {"name": "联合早报", "url": "https://rsshub.app/zaobao/realtime/china", "type": "rss", "lang": "zh", "category": "国际"},
    {"name": "香港01", "url": "https://rsshub.app/hk01", "type": "rss", "lang": "zh", "category": "港澳"},
    {"name": "文汇网", "url": "https://www.wenweipo.com/", "type": "html", "lang": "zh", "category": "港澳"},
]

def make_id(url: str, title: str) -> str:
    return hashlib.md5(f"{url}|{title}".encode()).hexdigest()

def clean_html(html: str) -> str:
    return BeautifulSoup(html, "html.parser").get_text(separator="\n", strip=True)

def extract_summary(text: str, max_len: int = 80) -> str:
    t = text.strip()
    return t if len(t) <= max_len else t[:max_len] + "..."

async def get_all_sources() -> list[dict]:
    """获取所有源（默认 + 自定义）"""
    sources = list(DEFAULT_SOURCES)
    try:
        async with async_session() as db:
            result = await db.execute(select(CustomSource).where(CustomSource.enabled == True))
            for row in result.scalars().all():
                sources.append({"name": row.name, "url": row.url, "type": row.source_type, "lang": row.lang, "custom": True})
    except Exception:
        pass
    return sources

async def fetch_feed(client: httpx.AsyncClient, source: dict) -> list[dict]:
    items = []
    try:
        resp = await client.get(source["url"], timeout=15.0, follow_redirects=True)
        if resp.status_code != 200:
            return items
        st = source["type"]
        if st == "rss":
            feed = feedparser.parse(resp.text)
            for entry in feed.entries[:20]:
                title = entry.get("title", "")
                link = entry.get("link", "")
                summary = clean_html(entry.get("summary", "") or entry.get("description", ""))
                published = entry.get("published_parsed")
                pub_time = datetime(*published[:6]) if published else datetime.utcnow()
                items.append({"id": make_id(link, title), "title_raw": title, "title_cn": title,
                    "summary": extract_summary(summary), "source_name": source["name"],
                    "source_url": link, "language": source.get("lang", "zh"), "published_at": pub_time, "raw_content": summary})
        elif st == "json":
            data = resp.json()
            for entry in (data[:15] if isinstance(data, list) else data.get("list", data.get("items", []))[:15]):
                title = entry.get("title", "无标题")
                items.append({"id": make_id(source["url"], title), "title_raw": title, "title_cn": title,
                    "summary": "", "source_name": source["name"], "source_url": source["url"],
                    "language": source.get("lang", "zh"), "published_at": datetime.utcnow(), "raw_content": ""})
        elif st == "html":
            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.find_all("a", href=True)[:15]:
                title = a.get_text(strip=True)
                if len(title) < 4:
                    continue
                href = a["href"]
                if not href.startswith("http"):
                    from urllib.parse import urljoin
                    href = urljoin(source["url"], href)
                items.append({"id": make_id(href, title), "title_raw": title, "title_cn": title,
                    "summary": "", "source_name": source["name"], "source_url": href,
                    "language": source.get("lang", "zh"), "published_at": datetime.utcnow(), "raw_content": ""})
    except Exception as e:
        logger.error(f"Error fetching {source['name']}: {e}")
    return items

async def scrape_all() -> list[dict]:
    all_items = []
    sources = await get_all_sources()
    async with httpx.AsyncClient(timeout=15.0) as client:
        for source in sources:
            items = await fetch_feed(client, source)
            all_items.extend(items)
    return all_items

async def scrape_source(source: dict) -> list[dict]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        return await fetch_feed(client, source)
