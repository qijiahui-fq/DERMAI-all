---
title: DermAI - 皮肤药研平台
emoji: 🧪
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DermAI - 皮肤药研平台 
DermAI 是一个专为皮肤科转化医学与新药研发设计的工业级智能辅助平台。本项目深度整合了 Open Targets、ChEMBL 和 Europe PMC 全球多组学与药理数据库，并创新性地引入了大模型作为“医学专家”引擎。通过 RAG（检索增强生成）架构，实现了从疾病靶点精准识别、多维价值评分到微观机制交互网络可视化的全链路科研闭环。

![System Status](https://img.shields.io/badge/System-Active-success)
![React](https://img.shields.io/badge/React-18.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)
![Python](https://img.shields.io/badge/Python-Backend-yellow)

## 🚀 部署说明 (Hugging Face Spaces)

本项目已配置 GitHub Actions 自动同步。
- **环境**: Docker
- **端口**: 7860
- **入口**: `server.py` (通过 Dockerfile 启动)

## 核心功能特性

1. **智能数据大屏 (Dashboard)**：实时呈现宏观皮肤病靶点密度分布及全球药研文献、专利增长指数。
2. **AI 靶点识别引擎 (Target ID)**
   - 突破性引入双轨制评分系统（客观数据 + AI 专家评估）。
   - 从遗传证据 (Genetics)、组织表达 (Expression)、临床进展 (Clinical) 三大核心维度对靶点进行动态补权与综合评分。
   - 自动匹配真实靶向药物（INN 通用名提取）与支持文献（一键穿透至 PubMed）。
3. **多维皮肤知识图谱 (Knowledge Graph)**：
   - 构建高精度 2D 力导向图，呈现 `疾病 - 基因 - 蛋白 - 通路 - 药物 - 文献` 6 大维度的空间拓扑结构。
   - 支持图谱层级动态过滤与无损高清图片导出。

## 核心文件目录与说明

```text
├── .github/workflows/    # 自动化同步脚本 (Sync to HF)
├── components/           # 全局复用组件 
├── pages/                # 核心业务页面
│   ├── Dashboard.tsx        # 智能数据大屏模块
│   ├── KnowledgeGraph.tsx   # 皮肤知识图谱可视化模块
│   └── TargetID.tsx         # AI 靶点识别与评分引擎
├── dist/                 # 前端编译产物 (静态文件)
├── server.py             # Python 后端服务 (处理 AI 评分与接口代理)
├── Dockerfile            # 容器化部署配置文件
└── requirements.txt      # 后端依赖配置
