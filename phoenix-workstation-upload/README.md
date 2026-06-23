# Phoenix 实时初稿工作台

为凤凰卫视北京编辑中心打造的一站式新闻监测 + AI写稿 + 稿件派发工作台。

## 功能特性

- 📰 **实时新闻监测**：RSS+爬虫自动抓取免费公开源，AI生成中文标题和综述
- 🤖 **8个独立Agent**：选题Agent + 6种写稿Agent + 初审Agent，共用一个DeepSeek API Key
- ✍️ **支持6种稿件类型**：LVO/SOT/SBONLY/SBLVO/干稿/干+图
- 🔍 **初审溯源**：逐句核对稿件来源，评估稿件质量
- 🧠 **经验积累**：每个Agent独立学习，AI自动归纳精简记忆
- 📡 **一键提交WebOS**：对接凤凰卫视WebOS，提交初稿+参考原文给编译
- 🎨 **Claude风格UI**：简洁温暖，以人为本，支持深色模式
- 🌐 **Web应用**：多个座堂同时在内网使用

## 快速开始

### 1. 配置环境

后端：
```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 填入你的 DEEPSEEK_API_KEY
```

前端：
```bash
cd frontend
npm install
```

### 2. 启动

后端：
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

前端（另开终端）：
```bash
cd frontend
npm run dev
```

### 3. 访问

打开浏览器访问 `http://localhost:3000`

默认密码：请在 `.env` 中设置 `ADMIN_PASSWORD`

## 项目结构

```
phoenix-workstation/
├─ backend/
│  ├─ app/
│  │  ├─ routes/          # API路由
│  │  ├─ services/        # 业务逻辑
│  │  ├─ config.py        # 配置
│  │  ├─ database.py      # 数据库
│  │  ├─ models.py        # 数据模型
│  │  └─ main.py          # 入口
│  ├─ requirements.txt
│  └─ .env
└─ frontend/
   ├─ src/
   │  ├─ components/      # React组件
   │  ├─ hooks/           # 自定义钩子
   │  ├─ types/           # 类型定义
   │  ├─ App.tsx
   │  └─ main.tsx
   └─ package.json
```

## Agent 说明

| Agent | 职责 |
|-------|------|
| 选题Agent | 翻译新闻标题、生成综述、排序筛选 |
| LVO Agent | 写LVO格式稿件 |
| SOT Agent | 写SOT格式稿件 |
| SBONLY Agent | 写SBONLY格式稿件 |
| SBLVO Agent | 写SB+LVO格式稿件 |
| 干稿 Agent | 写干稿 |
| 干+图 Agent | 写干+图稿件 |
| 初审Agent | 逐句溯源+质量评估 |

## WebOS 提交规范

| Phoenix类型 | 标题前缀 | WebOS Level |
|------------|---------|------------|
| LVO | LVO | SOT |
| SOT | SOT | SOT |
| SBLVO | SB+LVO | SOT |
| SBONLY | SBonly | 干稿 |
| 干稿 | (干) | 干稿 |
| 干+图 | 干+圖 | 干稿 |

## 说明

- 只抓取免费公开新闻源
- 所有Agent共用同一个DeepSeek API Key，节省开支
- 经验库自动精简，控制token消耗
- 支持多座堂同时使用，简单登录，共享数据

## 作者

Phoenix 编译实时初稿工具项目 · 2026

## 开源协议

本项目采用 MIT 协议开源，欢迎学习和二次开发。

## 安全提示

⚠️ **部署前请务必修改以下配置**：
1. 在 `backend/.env` 中设置自己的 `ADMIN_PASSWORD`
2. 使用自己的 DeepSeek API Key
3. 不要将 `.env` 文件提交到公开仓库

## 贡献指南

欢迎提交 Issue 和 Pull Request！

---

**Star ⭐ 本项目，帮助更多人发现它！**
