<div align="center">
  <h1>📺 Phoenix 实时初稿工作台</h1>
  <p><strong>AI 驱动的电视新闻智能生产系统</strong></p>
  <p>
    <em>为凤凰卫视北京编辑中心打造的一站式新闻监测 + AI 写稿 + 稿件派发平台</em>
  </p>
  <p>
    <img alt="Python" src="https://img.shields.io/badge/Python-3.12+-blue?logo=python&logoColor=white">
    <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi">
    <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white">
    <img alt="DeepSeek" src="https://img.shields.io/badge/DeepSeek-API-4F46E5?logo=deepseek&logoColor=white">
    <img alt="License" src="https://img.shields.io/badge/License-MIT-green">
  </p>
  <br>
</div>

---

## 📋 项目背景

**Phoenix 实时初稿工作台** 是凤凰卫视北京编辑中心内部使用的 AI 新闻生产系统。它将 **DeepSeek 大模型** 与电视新闻生产流程深度融合，用 AI 辅助编辑完成从「新闻监测」到「稿件生成」再到「派发提交」的全链路工作。

> **适用场景**：电视台新闻中心、通讯社编辑部、新媒体运营团队等需要实时追踪新闻并快速产出标准化稿件的机构。

---

## 🏗️ 产品架构

```
┌──────────────────────────────────────────────────────┐
│                    用户界面（React + Ant Design）       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │ 新闻看板 │  │ 选题对话 │  │ 写稿Agent│  │ 稿件追踪 ││
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘│
└───────┼─────────────┼────────────┼────────────┼─────┘
        │             │            │            │
┌───────┴─────────────┴────────────┴────────────┴─────┐
│                API 层（FastAPI + SSE Streaming）       │
│            ┌───────────┐  ┌───────────┐              │
│            │ 新闻服务   │  │ AI 服务    │              │
│            └─────┬─────┘  └─────┬─────┘              │
└──────────────────┼──────────────┼────────────────────┘
                   │              │
┌──────────────────┴──────────────┴────────────────────┐
│              数据与 AI 层                              │
│  ┌───────────┐  ┌───────────┐  ┌──────────────────┐ │
│  │ RSS/爬虫  │  │  SQLite   │  │ DeepSeek Chat API │ │
│  │ 新闻源    │  │  数据库   │  │ + Skill 指令集    │ │
│  └───────────┘  └───────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## ✨ 核心功能

### 📡 实时新闻监测
- RSS + 网页爬虫自动抓取 **17+ 预设中文新闻源**（新华社、央视、路透中文、联合早报等）
- AI 自动翻译英文标题为中文，生成一句话综述和重要性评分
- 支持自定义添加新闻来源
- 按来源分类筛选，一目了然

### 🤖 多智能体（Agent）写稿系统
基于 DeepSeek API 构建的 8 个独立 AI Agent，各司其职：

| Agent 类型 | 能力 | 适用场景 |
|-----------|------|---------|
| **选题Agent** | 新闻翻译、综述生成、联网搜索问答 | 快速了解新闻全貌 |
| **LVO Agent** | 配音正文写作（新华社风格） | 主播配音稿件 |
| **SOT Agent** | 同期声稿件写作 | 含采访内容的新闻稿 |
| **SBONLY Agent** | 口播导语写作 | 新闻提要、快讯 |
| **SBLVO Agent** | 剪辑脚本 + 配音正文 | 编导剪辑指令 |
| **干稿 Agent** | 精炼口播干稿 | 快速成稿 |
| **干+图 Agent** | 图文稿件 | 配有说明的稿件 |
| **初审Agent** | 逐句溯源、质量评估 | 稿件质检 |

### 📝 Skill 指令集驱动
每个写稿 Agent 都配有 **标准化的写作规范（Skill）**，确保 AI 输出符合电视新闻播出标准：

- **时长控制**：30秒/40秒/45秒/50秒/55秒/60秒 对应不同字数
- **格式规范**：口播 → LVO → 剪辑脚本 → 字幕 → 全文文稿
- **语言规范**：时态、数字、人名、引语等均有严格约定
- **新华社风格**：客观中立、固定政治表述、标点规范

### 🔍 新闻追踪（联网搜索增强）
- 对特定新闻进行深度追踪，AI 自动联网搜索
- 按时间线梳理事件脉络
- 多源对比分析
- 每条信息标注具体来源网址

### 🎨 用户体验
- 实时流式输出（SSE），打字机效果即时呈现
- 完整 Markdown 渲染，代码、表格、引用完美支持
- 深色/浅色主题自由切换
- 多 Tab 管理，同时处理多条稿件

---

## 🧠 AI 产品设计思路

本项目的核心设计理念是 **「AI + 专业工作流 = 生产力倍增」**，这也是我作为 AI 产品经理的核心思考框架：

### 1. 角色化 Agent 设计
> 不是用一个通用 AI 做所有事，而是为每个专业角色设计独立的 Agent。

电视新闻生产涉及选题、写稿、初审等多个环节，每个环节对 AI 的要求截然不同。我们将 DeepSeek 大模型「分角色」配置，每个 Agent 拥有独立的 system prompt 和技能指令集，输出格式、语言风格、专业标准都高度定制化。

### 2. Skill 即指令集（Prompt as Code）
> 将专业规范「结构化」为 AI 可执行的指令。

电视新闻写作有严格的格式和规范（字数控制、时间码标注、字幕格式等）。我们将这些规范整理为 **Skill 文件（Markdown 格式）**，作为 prompt 的一部分注入 Agent。这意味着：
- **可复用**：一份 Skill 可被多个 Agent 共享
- **可维护**：修改 Skill 文件即修改 Agent 行为，无需改代码
- **可扩展**：新增稿件类型只需新增一个 Skill 文件

### 3. 人机协作的闭环
> AI 是副驾驶，不是自动驾驶。

- **AI 初稿 + 人工精修**：AI 生成符合格式的初稿，编辑在此基础上修改
- **联网搜索增强**：选题 Agent 可调用搜索验证信息，降低 AI 幻觉风险
- **初审溯源**：初审 Agent 逐句检查稿件来源，确保每句话都有据可查

### 4. 流式体验（Streaming UX）
> 用打字机效果消除等待焦虑，提升交互感知。

所有 AI 输出均采用 SSE（Server-Sent Events）流式传输，用户无需等待完整内容生成，即可逐字看到 AI 的思考过程，体验流畅自然。

---

## 🚀 快速开始

### 环境要求

- **Python** 3.12+
- **Node.js** 18+
- **DeepSeek API Key**（[立即获取](https://platform.deepseek.com)）

### 安装与配置

```bash
# 1. 克隆仓库
git clone https://github.com/ZhaoParkerStudio/phoenix-workstation.git
cd phoenix-workstation

# 2. 配置后端
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
# 编辑 .env，填入你的 DEEPSEEK_API_KEY
```

```bash
# 3. 配置前端
cd frontend
npm install
```

### 启动服务

```bash
# 终端1 - 启动后端
cd backend
python -m uvicorn app.main:app --reload --port 8000

# 终端2 - 启动前端
cd frontend
npm run dev
```

打开浏览器访问 **http://localhost:3000** 即可开始使用。

> 管理员密码在 `.env` 的 `ADMIN_PASSWORD` 中设置。

---

## 📁 项目结构

```
phoenix-workstation/
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── routes/              # API 路由（/api/chat, /api/track, /api/news）
│   │   ├── services/
│   │   │   ├── deepseek.py      # DeepSeek API 交互（流式输出）
│   │   │   ├── scraper.py       # RSS/网页爬虫 + 预设新闻源
│   │   │   └── news_service.py  # 新闻数据服务
│   │   ├── skills/              # AI 写作规范指令集
│   │   │   ├── lvo_skill.md     # LVO 配音正文规范
│   │   │   ├── sblvo_skill.md   # SB+LVO 剪辑脚本规范
│   │   │   ├── sbonly_skill.md  # SBONLY 口播规范
│   │   │   ├── sot_skill.md     # SOT 同期声规范
│   │   │   ├── draft_skill.md   # 干稿规范
│   │   │   └── skills_loader.py # Skill 自动加载器
│   │   ├── config.py            # 配置管理（pydantic-settings）
│   │   ├── database.py          # SQLite 异步数据库
│   │   └── models.py            # 数据模型
│   ├── requirements.txt
│   └── .env.example
├── frontend/                    # React + Vite 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── NewsBoard.tsx    # 新闻监测面板
│   │   │   ├── MainWorkArea.tsx # 主工作区（Agent聊天）
│   │   │   └── LoginPage.tsx    # 登录页
│   │   ├── hooks/
│   │   │   ├── useAuth.ts       # 登录状态管理
│   │   │   └── useNewsFeed.ts   # 新闻数据订阅
│   │   ├── types/               # TypeScript 类型定义
│   │   ├── App.tsx              # 应用主入口
│   │   └── main.tsx             # 渲染入口
│   └── package.json
├── README.md
├── LICENSE
└── .gitignore
```

---

## 🛠️ 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **AI 引擎** | DeepSeek Chat API | 核心大模型推理，多 Agent 对话 |
| **后端框架** | FastAPI + Uvicorn | RESTful API + SSE 流式响应 |
| **数据库** | SQLite + SQLAlchemy (异步) | 新闻源管理、稿件存储 |
| **爬虫** | feedparser + BeautifulSoup | RSS 解析、网页抓取 |
| **前端框架** | React 18 + TypeScript | 用户界面 |
| **UI 组件** | Ant Design 5 | 企业级 UI 组件库 |
| **构建工具** | Vite 6 | 前端构建与热更新 |
| **流式传输** | Server-Sent Events | 实时打字机效果 |

---

## 🎯 为什么用 DeepSeek？

选择 DeepSeek 作为 AI 引擎的核心考量：

1. **高性价比**：API 定价极具竞争力，适合新闻生产这种高频调用场景
2. **中文能力**：中文新闻写作对语言质量要求极高，DeepSeek 的中文文本生成能力出色
3. **长上下文**：支持处理大量新闻素材和长稿件
4. **响应速度**：流式输出的首字延迟低，用户体验流畅

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源，欢迎学习、使用和二次开发。

---

## 🔗 相关链接

- [DeepSeek 开放平台](https://platform.deepseek.com)
- [FastAPI 文档](https://fastapi.tiangolo.com)
- [React 文档](https://react.dev)
- [Ant Design 文档](https://ant.design)

---

<div align="center">
  <sub>用 AI 重新定义新闻生产 · Phoenix 实时初稿工作台 © 2026</sub>
  <br>
  <sub>如果这个项目对你有帮助，欢迎 ⭐ Star 支持！</sub>
</div>
