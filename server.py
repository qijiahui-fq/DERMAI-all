from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import os
import time
import re

# 1. 动态获取端口：Hugging Face 必须读取 PORT 环境变量，默认 7860
PORT = int(os.environ.get('PORT', 7860))

# 2. 初始化 Flask：明确静态文件路径
app = Flask(__name__, static_folder='dist', static_url_path='/')

# 3. 强力跨域配置
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# 配置信息
OPENTARGETS_GRAPHQL_URL = "https://api.platform.opentargets.org/api/v4/graphql"
CHEMBL_DRUG_URL = "https://www.ebi.ac.uk/chembl/api/data/drug"
COZE_API_URL_CHAT = "https://api.coze.cn/v3/chat"
COZE_TOKEN = "pat_M169XpSGkBLlrL5AdPaQpEx1lrknpK7DhizMAbNCMtJq4cMjmA3jqyELpSpXdBA0"
COZE_BOT_ID = "7627011465744318479"

# --- 静态文件托管 ---

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')

# --- 业务 API 路由 ---

# 1. OpenTargets 中转
@app.route('/api/opentargets/graphql', methods=['POST', 'OPTIONS'], strict_slashes=False)
def opentargets_proxy():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    try:
        data = request.get_json()
        response = requests.post(OPENTARGETS_GRAPHQL_URL, json=data, headers={"Content-Type": "application/json"}, timeout=60)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. ChEMBL 药物数据中转 (解决知识图谱 CORS 报错)
@app.route('/api/chembl/drug', methods=['GET'])
def chembl_proxy():
    try:
        # 将前端传来的所有参数原封不动转发给 ChEMBL
        params = request.args
        response = requests.get(CHEMBL_DRUG_URL, params=params, timeout=30)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        print(f"❌ ChEMBL Proxy Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# 3. Coze 学术洞察 API
@app.route('/api/academic-insights', methods=['POST'])
def get_academic_insights():
    try:
        data = request.get_json()
        disease_name = data.get('disease', '银屑病')
        headers = {"Authorization": f"Bearer {COZE_TOKEN}", "Content-Type": "application/json"}
        
        instructions = (
            f"任务：检索关于【{disease_name}】的2024-2026年最新前沿文献，提取核心靶点。\n"
            f"要求：1. 调用 PubMed 检索；2. 提取 targets 必须是大写英文；3. 输出纯 JSON 数组。"
        )

        payload = {
            "bot_id": COZE_BOT_ID,
            "user_id": "DermAI_Researcher",
            "stream": False,
            "additional_messages": [{"role": "user", "content": instructions, "content_type": "text"}]
        }

        create_resp = requests.post(COZE_API_URL_CHAT, headers=headers, json=payload, timeout=30)
        create_data = create_resp.json()
        if create_data.get("code") != 0: return jsonify({"code": 200, "data": []})

        chat_id, conv_id = create_data["data"]["id"], create_data["data"]["conversation_id"]
        
        for _ in range(60): # 轮询
            time.sleep(2)
            poll = requests.get(f"https://api.coze.cn/v3/chat/retrieve?chat_id={chat_id}&conversation_id={conv_id}", headers=headers).json()
            if poll.get("data", {}).get("status") == "completed": break
        
        msg_resp = requests.get(f"https://api.coze.cn/v3/chat/message/list?chat_id={chat_id}&conversation_id={conv_id}", headers=headers).json()
        content = "".join([m.get("content", "") for m in msg_resp.get("data", []) if m.get("type") == "answer"])

        ai_results = []
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            try:
                for item in json.loads(match.group(0)):
                    target_list = item.get('targets', []) or ([item.get('target')] if item.get('target') else [])
                    ai_results.append({
                        "title": item.get('title', '最新科研文献'),
                        "targets": [str(t).upper().strip() for t in target_list if t],
                        "pub_date": str(item.get('pub_date', '2024-2026')),
                        "mechanism": item.get('mechanism', '解析中...'),
                        "url": f"https://pubmed.ncbi.nlm.nih.gov/{item.get('pmid', '')}/" if item.get('pmid') else "#"
                    })
            except: pass
        return jsonify({"code": 200, "data": ai_results})
    except Exception as e:
        return jsonify({"code": 500, "message": str(e)}), 500

# 4. 靶点打分接口
@app.route('/api/score-target', methods=['POST'])
def score_target():
    data = request.get_json()
    raw_score = data.get('open_targets_score', 0.5)
    score = min(10, max(1, raw_score * 10))
    return jsonify({'code': 200, 'data': {'score': score}})

if __name__ == '__main__':
    print(f"🚀 DermAI Platform Starting on Port {PORT}...")
    app.run(host='0.0.0.0', port=PORT)
