<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DermAI - 皮肤药研平台 
# Run and deploy your AI Studio app
DermAI 是一个专为皮肤科转化医学与新药研发设计的工业级智能辅助平台。本项目深度整合了 Open Targets、ChEMBL和 Europe PMC 全球多组学与药理数据库，并创新性地引入了 Minimax AI 大模型作为“医学专家”引擎。通过 RAG（检索增强生成）架构，实现了从疾病靶点精准识别、多维价值评分到微观机制交互网络可视化的全链路科研闭环。

![System Status](https://img.shields.io/badge/System-Active-success)
![React](https://img.shields.io/badge/React-18.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)
![Python](https://img.shields.io/badge/Python-Backend-yellow)


This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e79b1b4d-8604-4c79-9cf9-d12738f0d719

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## 核心功能特性

1. 智能数据大屏 (Dashboard)*：实时呈现宏观皮肤病靶点密度分布及全球药研文献、专利增长指数。
2. AI 靶点识别引擎 (Target ID)
   - 突破性引入双轨制评分系统（客观数据 + AI 专家评估）。
   - 从遗传证据 (Genetics)、组织表达 (Expression)、临床进展 (Clinical)三大核心维度对靶点进行动态补权与综合评分。
   - 自动匹配真实靶向药物（INN通用名提取）与支持文献（一键穿透至 PubMed）。
3. 多维皮肤知识图谱 (Knowledge Graph)：
   - 构建高精度 2D 力导向图，呈现 `疾病 - 基因 - 蛋白 - 通路 - 药物 - 文献` 6大维度的空间拓扑结构。
   - 支持图谱层级动态过滤与无损高清图片导出，可直接用于学术发表。

## 核心文件目录与说明

text
├── .venv/                # Python 虚拟环境
├── components/           # 全局复用组件 
├── pages/                # 核心业务页面
│   ├── Dashboard.tsx        # 智能数据大屏模块
│   ├── KnowledgeGraph.tsx   # 皮肤知识图谱可视化模块
│   ├── TargetID.tsx         # AI 靶点多维识别与评分引擎
│   └── index.css            # Tailwind 全局样式
├── services/             # API 服务调用层
│   └── TargetService.ts
├── utils/                # 平台工具函数
├── App.tsx               # 核心路由与状态配置
├── index.tsx             # React 入口文件
├── server.py             # Python 本地后端服务 (处理 Minimax AI 评分与 OpenTargets 接口代理)
└── package.json          # 前端依赖配置