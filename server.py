from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import os
import time
import re

# 强制禁用代理，确保容器内通信不受干扰
os.environ['NO_PROXY'] = 'localhost,127.0.0.1'

# 🚀 核心修复：指定静态文件夹为 'dist'，这是解决 HF 404 的物理前提
# static_url_path='/' 确保访问根目录时能映射到 dist 内部
app = Flask(__name__, static_folder='dist', static_url_path='/')

# 开启跨域支持
CORS(app, resources={r"/*": {"origins": "*"}})

# ================= 配置区 =================
OPENTARGETS_GRAPHQL_URL = "https://api.platform.opentargets.org/api/v4/graphql"
COZE_API_URL_CHAT = "https://api.coze.cn/v3/chat"

# ⚠️ 注意：COZE_TOKEN 建议在 HF Settings -> Secrets 中配置，代码中作为兜底
COZE_TOKEN = os.environ.get("COZE_TOKEN", "sat_8nOBUArKoa4TBX2NmUKyQHkFF3iOOdXtVdQnqyW3HTKUXBKIqCH693IIMrtAbX4y") 
COZE_BOT_ID = "7627011465744318479"
# ==========================================

# ----------------------------------------------------------------
# 0. 静态资源托管与前端路由兜底 (修复 404)
# ----------------------------------------------------------------
@app.route('/')
def index():
    # 访问根路径时，直接返回 dist 目录下的 index.html 
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # 逻辑：如果请求的文件在 dist 目录中存在（如 js, css, pdf），则直接返回 [cite: 165]
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    # 如果找不到文件（针对前端 HashRouter 路由刷新），统一返回 index.html
    return send_from_directory(app.static_folder, 'index.html')


# ----------------------------------------------------------------
# 1. OpenTargets 代理接口
# ----------------------------------------------------------------
@app.route('/api/opentargets/graphql', methods=['POST', 'OPTIONS'], strict_slashes=False)
def opentargets_proxy():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    try:
        data = request.get_json()
        response = requests.post(
            OPENTARGETS_GRAPHQL_URL,
            json=data,
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
            timeout=60
        )
        return jsonify(response.json()), response.status_code
    except Exception as e:
        print(f"❌ OpenTargets 接口异常: {str(e)}")
        return jsonify({"error": "数据链路繁忙"}), 500


# ----------------------------------------------------------------
# 2. 前沿科研情报雷达接口 (2024-2026 跨年截击版)
# ----------------------------------------------------------------
@app.route('/api/academic-insights', methods=['POST'])
def get_academic_insights():
    try:
        data = request.get_json()
        disease_name = data.get('disease', '银屑病')
        clean_token = str(COZE_TOKEN).strip()

        headers = {
            "Authorization": f"Bearer {clean_token}",
            "Content-Type": "application/json; charset=utf-8"
        }

        # 🚀 极致强化指令：执行分年检索与机制脱水 [cite: 161, 166]
        instructions = (
            f"请严格分三次检索【{disease_name}】的文献：\n"
            f"1. 检索 2026 年文献提取约 10 篇；\n"
            f"2. 检索 2025 年文献提取约 10 篇；\n"
            f"3. 检索 2024 年文献提取约 10 篇。\n"
            f"执行规则：\n"
            f"- 每个对象必须包含 mechanism 字段。如果无法获取，请根据 Title 推导研究机制，严禁留空 [cite: 166]。\n"
            f"- 每个对象必须包含 targets 数组，识别核心基因或分子 [cite: 167]。\n"
            f"- 严禁输出 abstract 字段。"
        )
        
        payload = {
            "bot_id": COZE_BOT_ID,
            "user_id": f"DermAI_User_{int(time.time())}",
            "stream": False,
            "auto_save_history": True, 
            "additional_messages": [{"role": "user", "content": instructions, "content_type": "text"}]
        }

        print(f"\n🚀 [科研雷达] 正在截击【{disease_name}】2024-2026 情报...")

        binary_payload = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        create_resp = requests.post(COZE_API_URL_CHAT, headers=headers, data=binary_payload, timeout=30)
        create_data = create_resp.json()

        if create_data.get("code") != 0:
            return jsonify({"code": 500, "message": "Coze 服务异常"})

        chat_id, conversation_id = create_data["data"]["id"], create_data["data"]["conversation_id"]

        # 轮询状态
        is_completed = False
        for i in range(80): 
            time.sleep(2)
            poll_resp = requests.get(
                f"https://api.coze.cn/v3/chat/retrieve?chat_id={chat_id}&conversation_id={conversation_id}",
                headers=headers, timeout=20
            )
            status = poll_resp.json().get("data", {}).get("status")
            if status == "completed":
                is_completed = True
                break
            if status in ["failed", "canceled"]: break

        if not is_completed:
            return jsonify({"code": 200, "data": [], "message": "执行超时"})

        # 获取消息列表
        msg_resp = requests.get(
            f"https://api.coze.cn/v3/chat/message/list?chat_id={chat_id}&conversation_id={conversation_id}",
            headers=headers, timeout=20
        )
        messages = msg_resp.json().get("data", [])
        content = "".join([m.get("content", "") for m in messages if m.get("type") == "answer"])

        ai_results = []
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            try:
                raw_ai_data = json.loads(match.group(0))
                seen_pmids = set()
                for item in raw_ai_data:
                    pmid = re.sub(r'\D', '', str(item.get('pmid', '')))
                    if not pmid or pmid in seen_pmids: continue
                    seen_pmids.add(pmid)
                    ai_results.append({
                        "title": item.get('title', '未知文献'),
                        "pub_date": item.get('pub_date', '2024'),
                        "pmid": pmid,
                        "mechanism": item.get('mechanism') or item.get('Mechanism') or "正在解析分子机理...", 
                        "targets": item.get('targets') or item.get('Targets') or [], 
                        "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                    })
            except: pass

        print(f"✅ 捕获成功: 成功截获 {len(ai_results)} 条情报")
        return jsonify({"code": 200, "data": ai_results})

    except Exception as e:
        return jsonify({"code": 500, "message": f"系统错误: {str(e)}"}), 500


# ----------------------------------------------------------------
# 3. 靶点评分接口 (保持原样)
# ----------------------------------------------------------------
@app.route('/api/score-target', methods=['POST'])
def score_target():
    data = request.get_json()
    score = min(10, max(1, data.get('open_targets_score', 0.5) * 10))
    return jsonify({'code': 200, 'data': {'score': score}})


if __name__ == "__main__":
    # 🚀 端口自适应逻辑：优先适配 HF 的端口需求，本地默认为 3000
    port = int(os.environ.get("PORT", 0))
    if port == 0:
        port = 7860 if os.environ.get("SPACE_ID") else 3000
            
    print(f"🚀 DermAI 后端引擎启动 | 监听端口: {port} | 托管目录: {app.static_folder}")
    app.run(host="0.0.0.0", port=port, debug=False)
