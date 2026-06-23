import json
import logging
from typing import AsyncGenerator
import httpx
from app.config import settings
from app.skills.skills_loader import SKILLS_CACHE

logger = logging.getLogger(__name__)

SELECTION_AGENT_SYSTEM = """你是凤凰卫视北京编辑中心选题助理。

核心能力：
1. 翻译新闻标题为中文，生成简洁综述（≤60字），评估新闻重要性（0-100分）
2. 可根据座堂提问，调用联网搜索能力回答新闻最新进展、背景信息等
3. 对特定新闻进行深度挖掘，梳理时间线、多源对比、关键人物/事件脉络

输出规范：
- 翻译任务：输出 JSON 数组 [{"id":"","title_cn":"","summary":"","importance":90}]
- 对话任务：自然、专业、客观
- 追踪任务：按时间线组织，每条信息标注具体来源网址"""

SELECTION_CHAT_SYSTEM = """你是凤凰卫视北京编辑中心的选题Agent。

你可以：
1. 回答用户关于新闻的任何问题，包括最新进展、历史背景等
2. 当需要最新信息时，使用联网搜索获取实时内容
3. 对新闻进行深度分析，比较不同消息来源的报道差异
4. 追踪新闻事件的发展脉络，按时间线梳理

注意：回答要专业、客观、简洁。涉及来源时请尽量提供可查证的引用。"""

TRACKING_SYSTEM = """你是凤凰卫视北京编辑中心的新闻追踪Agent。

任务：对用户指定的新闻进行深度追踪分析。

输出格式：
1. 【新闻概述】一句话概括核心事件
2. 【时间线】按时间倒序列出关键节点，每一点标注来源网址
3. 【多源对比】不同消息来源的报道角度差异
4. 【最新进展】目前已知的最新情况，标注来源
5. 【待核实】需要进一步确认的信息

注意：所有信息必须标注具体来源网址，没有来源的信息要明确标注为"待核实"。"""

def get_article_agent_system(article_type: str) -> str:
    """获取写稿Agent的system prompt，包含对应的skill内容。"""
    skill_content = SKILLS_CACHE.get(article_type, "")
    if not skill_content:
        return SELECTION_CHAT_SYSTEM
    
    # 根据稿件类型生成system prompt
    type_labels = {
        "LVO": "LVO配音正文",
        "SOT": "SOT同期声稿件",
        "SBLVO": "SB+LVO剪辑脚本",
        "SBONLY": "SBONLY新闻稿",
        "干稿": "口播干稿",
        "干+图": "图文稿件",
    }
    
    label = type_labels.get(article_type, article_type)
    
    system_prompt = f"""你是凤凰卫视北京编辑中心的{label}写作Agent。

你的核心任务是：根据用户提供的新闻素材，按照以下Skill规范撰写符合电视新闻播出标准的稿件。

---

{skill_content}

---

重要提醒：
1. 严格按照上述Skill规范输出稿件格式
2. 所有事实必须源自用户提供的素材，不添加未确认信息
3. 数字、时间、人名、地名必须与素材严格一致
4. 语言客观中立，符合新华社风格
5. 如用户要求调整，按新要求重新生成

请根据用户提供的素材和具体要求，开始撰写稿件。"""
    
    return system_prompt

async def translate_and_summarize(news_items: list[dict]) -> list[dict]:
    if not news_items:
        return []
    items_text = json.dumps([{"id": item["id"], "title_raw": item.get("title_raw", ""), "source": item.get("source_name", "")} for item in news_items[:30]], ensure_ascii=False)
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(f"{settings.deepseek_base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.deepseek_api_key}", "Content-Type": "application/json"},
            json={"model": settings.deepseek_model, "messages": [{"role": "system", "content": SELECTION_AGENT_SYSTEM}, {"role": "user", "content": f"新闻列表：\n{items_text}"}], "temperature": 0.3, "stream": False})
        if resp.status_code != 200:
            logger.error(f"DeepSeek API error: {resp.text}")
            return []
        content = resp.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("\n", 1)[0] if content.endswith("```") else content.split("\n", 1)[1]
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse AI response: {content[:200]}")
            return []

async def chat_with_agent(messages: list[dict], agent_type: str = None) -> AsyncGenerator[str, None]:
    """与Agent对话，支持不同类型的Agent（选题/写稿）。"""
    # 根据agent_type选择system prompt
    if agent_type and agent_type in ["LVO", "SOT", "SBLVO", "SBONLY", "干稿", "干+图"]:
        system_content = get_article_agent_system(agent_type)
    else:
        system_content = SELECTION_CHAT_SYSTEM
    
    full_messages = [{"role": "system", "content": system_content}] + [{"role": m["role"], "content": m["content"]} for m in messages[-20:]]
    if not settings.deepseek_api_key:
        logger.error("DeepSeek API Key未配置")
        yield "[错误] DeepSeek API Key未配置，请在 backend/.env 中设置 DEEPSEEK_API_KEY"
        return
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{settings.deepseek_base_url}/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}", "Content-Type": "application/json"},
                json={"model": settings.deepseek_model, "messages": full_messages, "temperature": 0.7, "stream": True}) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    error_msg = error_body.decode("utf-8", errors="replace")[:500]
                    logger.error(f"DeepSeek API返回错误 {resp.status_code}: {error_msg}")
                    yield f"[错误] DeepSeek API返回 {resp.status_code}，请检查API Key和网络连接"
                    return
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            content = chunk["choices"][0].get("delta", {}).get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
    except httpx.ConnectError:
        logger.error("无法连接DeepSeek API")
        yield "[错误] 无法连接DeepSeek API，请检查网络"
    except httpx.TimeoutException:
        logger.error("DeepSeek API请求超时")
        yield "[错误] DeepSeek API请求超时，请稍后重试"
    except Exception as e:
        logger.error(f"chat_with_agent异常: {type(e).__name__}: {e}")
        yield f"[错误] AI服务异常: {type(e).__name__}"

async def track_news(title: str, summary: str, source_names: list[str], source_urls: list[str]) -> AsyncGenerator[str, None]:
    """新闻追踪：AI梳理时间线和最新情况"""
    refs = "\n".join([f"- {name}: {url}" for name, url in zip(source_names, source_urls) if url.startswith("http")]) or "暂无具体来源网址"
    prompt = f"新闻标题：{title}\n新闻综述：{summary}\n已有消息来源：\n{refs}\n\n请对这条新闻进行深度追踪分析，包括时间线梳理、多源对比和最新进展。"
    full_messages = [{"role": "system", "content": TRACKING_SYSTEM}, {"role": "user", "content": prompt}]
    if not settings.deepseek_api_key:
        logger.error("DeepSeek API Key未配置")
        yield "[错误] DeepSeek API Key未配置，请在 backend/.env 中设置 DEEPSEEK_API_KEY"
        return
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{settings.deepseek_base_url}/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}", "Content-Type": "application/json"},
                json={"model": settings.deepseek_model, "messages": full_messages, "temperature": 0.5, "stream": True}) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    error_msg = error_body.decode("utf-8", errors="replace")[:500]
                    logger.error(f"DeepSeek API返回错误 {resp.status_code}: {error_msg}")
                    yield f"[错误] DeepSeek API返回 {resp.status_code}，请检查API Key和网络连接"
                    return
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            content = chunk["choices"][0].get("delta", {}).get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
    except httpx.ConnectError:
        logger.error("无法连接DeepSeek API")
        yield "[错误] 无法连接DeepSeek API，请检查网络"
    except httpx.TimeoutException:
        logger.error("DeepSeek API请求超时")
        yield "[错误] DeepSeek API请求超时，请稍后重试"
    except Exception as e:
        logger.error(f"track_news异常: {type(e).__name__}: {e}")
        yield f"[错误] AI服务异常: {type(e).__name__}"
