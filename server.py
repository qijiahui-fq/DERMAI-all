from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import os
import time
import re

# 1. 动态获取端口（适配 Hugging Face）
PORT = int(os.environ.get('PORT', 7860))

# 2. 初始化 Flask
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

# 2. ChEMBL 药物数据中转
@app.route('/api/chembl/drug', methods=['GET'])
def chembl_proxy():
    try:
        params = request.args
        response = requests.get(CHEMBL_DRUG_URL, params=params, timeout=30)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. Coze 学术洞察 API (强力去重聚合版)
@app.route('/api/academic-insights', methods=['POST'])
def get_academic_insights():
    try:
        data = request.get_json()
        disease_name = data.get('disease', '银屑病')
        headers = {"Authorization": f"Bearer {COZE_TOKEN}", "Content-Type": "application/json"}
        
        # 触发词：引导智能体进入预设的双通道人设
        prompt_content = f"请检索关于【{disease_name}】的最新前沿与经典文献，提取核心靶点并按 JSON 数组输出。确保同一文献的多个靶点合并到一条记录中。"

        payload = {
            "bot_id": COZE_BOT_ID,
            "user_id": f"User_{int(time.time())}", # 动态ID防止缓存干扰
            "stream": False,
            "additional_messages": [{"role": "user", "content": prompt_content, "content_type": "text"}]
        }

        # 发起对话
        create_resp = requests.post(COZE_API_URL_CHAT, headers=headers, json=payload, timeout=30)
        create_data = create_resp.json()
        if create_data.get("code") != 0:
            return jsonify({"code": 200, "data": [], "msg": "Coze Start Failed"})

        chat_id = create_data["data"]["id"]
        conv_id = create_data["data"]["conversation_id"]
        
        # 轮询状态（最多等120秒）
        for _ in range(60):
            time.sleep(2)
            poll = requests.get(f"https://api.coze.cn/v3/chat/retrieve?chat_id={chat_id}&conversation_id={conv_id}", headers=headers).json()
            status = poll.get("data", {}).get("status")
            if status == "completed": 
                break
            if status == "failed":
                return jsonify({"code": 500, "message": "Coze Processing Failed"}), 500
        
        # 获取消息
        msg_resp = requests.get(f"https://api.coze.cn/v3/chat/message/list?chat_id={chat_id}&conversation_id={conv_id}", headers=headers).json()
        raw_content = "".join([m.get("content", "") for m in msg_resp.get("data", []) if m.get("type") == "answer"])

        # --- 核心：多文献聚合与去重逻辑 ---
        ai_results_map = {}
        # 寻找 JSON 数组边界
        start_idx = raw_content.find('[')
        end_idx = raw_content.rfind(']')
        
        if start_idx != -1 and end_idx != -1:
            try:
                json_str = raw_content[start_idx:end_idx+1]
                raw_json = json.loads(json_str)
                
                for item in raw_json:
                    # 提取 PMID 作为唯一键
                    pmid = str(item.get('pmid', '')).strip()
                    if not pmid: continue

                    # 提取并合并靶点 (处理 target 或 targets 字段)
                    raw_target = item.get('target') or item.get('targets') or []
                    new_targets = [str(t).upper().strip() for t in (raw_target if isinstance(raw_target, list) else [raw_target]) if t]

                    if pmid in ai_results_map:
                        # 如果 PMID 重复，合并其靶点列表并去重
                        ai_results_map[pmid]["targets"] = list(set(ai_results_map[pmid]["targets"] + new_targets))
                    else:
                        # 新文献记录
                        ai_results_map[pmid] = {
                            "title": item.get('title', '最新科研文献'),
                            "targets": list(set(new_targets)),
                            "pub_date": str(item.get('pub_date', '2024-2026')),
                            "mechanism": item.get('mechanism', '解析中...'),
                            "pmid": pmid,
                            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                        }
            except Exception as e:
                print(f"JSON Parse Error: {str(e)}")

        return jsonify({"code": 200, "data": list(ai_results_map.values())})

    except Exception as e:
        return jsonify({"code": 500, "message": str(e)}), 500

# 4. 靶点打分接口
@app.route('/api/score-target', methods=['POST'])
def score_target():
    try:
        data = request.get_json()
        raw_score = data.get('open_targets_score', 0.5)
        score = min(10, max(1, raw_score * 10))
        return jsonify({'code': 200, 'data': {'score': score}})
    except:
        return jsonify({'code': 200, 'data': {'score': 5.0}})

if __name__ == '__main__':
    print(f"🚀 DermAI Backend Engine Running on Port {PORT}")
    app.run(host='0.0.0.0', port=PORT)
