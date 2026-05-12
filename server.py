from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import os
import time
import re

# 强制禁用代理，确保本地通信不受干扰
os.environ['NO_PROXY'] = 'localhost,127.0.0.1'

app = Flask(__name__)

# 开启跨域支持
CORS(app, resources={r"/*": {"origins": "*"}})

# ================= 配置区 =================
OPENTARGETS_GRAPHQL_URL = "https://api.platform.opentargets.org/api/v4/graphql"
COZE_API_URL_CHAT = "https://api.coze.cn/v3/chat"

# ⚠️ 提示：请确保这里的 TOKEN 是最新的 Personal Access Token
COZE_TOKEN = "sat_8nOBUArKoa4TBX2NmUKyQHkFF3iOOdXtVdQnqyW3HTKUXBKIqCH693IIMrtAbX4y" 
COZE_BOT_ID = "7627011465744318479"
# ==========================================

# ----------------------------------------------------------------
# 1. OpenTargets 代理接口 (保留原有样式逻辑)
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

        # 🚀 极致强化指令：分年检索、靶点强制提取、机制强制总结
        # 即使插件没返回摘要，也要求 LLM 根据标题推导机制，严禁留空。
        instructions = (
            f"请严格分三次检索【{disease_name}】的文献：\n"
            f"1. 检索 2026 年文献提取约 10 篇；\n"
            f"2. 检索 2025 年文献提取约 10 篇；\n"
            f"3. 检索 2024 年文献提取约 10 篇。\n"
            f"执行规则：\n"
            f"- 每个对象必须包含 mechanism 字段。如果插件未提供摘要，请根据标题(Title)中涉及的药物或靶点推导其研究机制，严禁留空！\n"
            f"- 每个对象必须包含 targets 数组，识别标题中的核心基因或分子。\n"
            f"- 严禁输出 abstract 字段，以防 JSON 截断。"
        )
        
        payload = {
            "bot_id": COZE_BOT_ID,
            "user_id": f"DermAI_User_{int(time.time())}",
            "stream": False,
            "auto_save_history": True, 
            "additional_messages": [
                {
                    "role": "user",
                    "type": "question",
                    "content": instructions,
                    "content_type": "text"
                }
            ]
        }

        print(f"\n🚀 [科研雷达] 任务启动：正在截击【{disease_name}】2024-至今的情报...")

        # 核心：使用字节流发送，规避编码报错
        binary_payload = json.dumps(payload, ensure_ascii=False).encode('utf-8')

        # --- A. 创建 Chat ---
        create_resp = requests.post(
            COZE_API_URL_CHAT, 
            headers=headers, 
            data=binary_payload,
            timeout=30
        )
        
        create_data = create_resp.json()
        if create_data.get("code") != 0:
            print(f"❌ Coze 返回错误: {create_data.get('msg')}")
            return jsonify({"code": 500, "message": "Coze 服务异常", "detail": create_data.get('msg')})

        chat_id = create_data["data"]["id"]
        conversation_id = create_data["data"]["conversation_id"]

        # --- B. 轮询状态 ---
        is_completed = False
        for i in range(80): 
            time.sleep(2)
            poll_resp = requests.get(
                f"https://api.coze.cn/v3/chat/retrieve?chat_id={chat_id}&conversation_id={conversation_id}",
                headers=headers, 
                timeout=20
            )
            poll_data = poll_resp.json()
            status = poll_data.get("data", {}).get("status")

            if status == "completed":
                is_completed = True
                break
            elif status in ["failed", "canceled"]:
                print(f"❌ 任务中断: {status}")
                break
            if i % 5 == 0: print(f"⏳ 正在扫描 2024-2026 全年份文献库...")

        if not is_completed:
            return jsonify({"code": 200, "data": [], "message": "执行超时"})

        # --- C. 提取结果 ---
        msg_resp = requests.get(
            f"https://api.coze.cn/v3/chat/message/list?chat_id={chat_id}&conversation_id={conversation_id}",
            headers=headers, 
            timeout=20
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

                    # 🚀 防御性解析：确保 mechanism 和 targets 即使 AI 报错也能被接住
                    ai_results.append({
                        "title": item.get('title', '未知文献'),
                        "pub_date": item.get('pub_date', '2024'),
                        "pmid": pmid,
                        # 兜底字段，防止前端显示“暂无解析”
                        "mechanism": item.get('mechanism') or item.get('Mechanism') or "正在调取底层分子机理...", 
                        "targets": item.get('targets') or item.get('Targets') or [], 
                        "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                    })
            except Exception as e:
                print(f"❌ 解析异常: {e}")

        print(f"✅ 捕获成功: 成功截获 {len(ai_results)} 条情报")
        return jsonify({"code": 200, "data": ai_results})

    except Exception as e:
        print(f"❌ 系统崩溃: {str(e)}")
        return jsonify({"code": 500, "message": f"后端引擎错误: {str(e)}"}), 500


# ----------------------------------------------------------------
# 3. 靶点评分接口 (保持原样)
# ----------------------------------------------------------------
@app.route('/api/score-target', methods=['POST'])
def score_target():
    data = request.get_json()
    score = min(10, max(1, data.get('open_targets_score', 0.5) * 10))
    return jsonify({'code': 200, 'data': {'score': score}})

@app.route('/api/target-literature', methods=['GET'])
def target_literature():
    target = request.args.get('target', '')
    return jsonify({
        'code': 200, 
        'data': [{'title': f'{target} 关联研究证据', 'source': 'PubMed'}]
    })

if __name__ == "__main__":
    # 逻辑：优先读取系统分配的端口（HF会自动给7860），如果没有设置（比如本地），则默认使用 3000
    port = int(os.environ.get("PORT", 3000)) 
    
    print(f"🚀 DermAI 后端引擎启动中...")
    print(f"📍 监听地址: http://0.0.0.0:{port}")
    
    # host 必须为 "0.0.0.0"，这是云端部署的硬性要求
    app.run(host="0.0.0.0", port=port, debug=False)
