from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import os
import time
import re

os.environ['NO_PROXY'] = 'localhost,127.0.0.1'

app = Flask(__name__)

# 允许跨域
CORS(app, resources={r"/*": {"origins": "*"}})

OPENTARGETS_GRAPHQL_URL = "https://api.platform.opentargets.org/api/v4/graphql"
COZE_API_URL_CHAT = "https://api.coze.cn/v3/chat"
COZE_TOKEN = "pat_M169XpSGkBLlrL5AdPaQpEx1lrknpK7DhizMAbNCMtJq4cMjmA3jqyELpSpXdBA0"
COZE_BOT_ID = "7627011465744318479"

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


@app.route('/api/academic-insights', methods=['POST'])
def get_academic_insights():
    try:
        data = request.get_json()
        disease_name = data.get('disease', '银屑病')
        
        headers = {
            "Authorization": f"Bearer {COZE_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # 🚀 优化指令：年份口径2024-2026，严禁神翻译，强化情报提取
        instructions = (
            f"任务：检索关于【{disease_name}】的2024-2026年最新前沿文献，提取核心靶点。\n"
            f"要求：\n"
            f"1. 必须调用 PubMed 检索真实文献。\n"
            f"2. ⚠️ 必须严格遵守以下插件调用参数：term=\"{disease_name}\", max_paper_num=5, min_year=2024, max_year=2026。绝对禁止单次检索超过5篇文献！\n"
            f"3. ⚠️ 【靶点绝对校验】：提取的 targets 必须是确切的【核心生物分子靶点】（如 IL-17A, PDE4, TYR 等纯英文大写缩写）。严禁提取疾病名、药物名，绝对禁止输出任何中文直译（如绝对禁止把PDE翻译为'偏微分方程'）！若无具体分子靶点请留空 []。\n"
            f"4. ⚠️ 【情报提取】：在 mechanism 字段中，不仅要写基础机制，还要精炼提取该文献的【最新发现与核心结论】。\n"
            f"5. 必须输出纯 JSON 数组格式，严禁包含 Markdown 标记、问候语或任何自然语言。\n"
            f"6. JSON 格式必须如下：\n"
            f"[{{\"title\": \"真实文献标题\", \"pub_date\": \"年份\", \"targets\": [\"靶点A\", \"靶点B\"], \"mechanism\": \"最新发现及详细作用机制解析\", \"pmid\": \"数字ID\", \"mention_count\": \"近期高频\"}}]"
        )

        payload = {
            "bot_id": COZE_BOT_ID,
            "user_id": "DermAI_Researcher",
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

        print(f"\n[1] 正在唤醒 Coze V3 接口，下发【{disease_name}】检索任务...")
        create_resp = requests.post(COZE_API_URL_CHAT, headers=headers, json=payload, timeout=30)
        create_data = create_resp.json()

        if create_data.get("code") != 0:
            print("❌ 唤醒失败:", create_data)
            return jsonify({"code": 200, "data": []})

        chat_id = create_data["data"]["id"]
        conversation_id = create_data["data"]["conversation_id"]

        print(f"[2] 智能体任务已建立 (Chat ID: {chat_id})，进入轮询等待...")

        is_completed = False
        # 🚀 改为 90 次防止大模型思考超时
        for i in range(90):
            time.sleep(2)
            poll_resp = requests.get(
                f"https://api.coze.cn/v3/chat/retrieve?chat_id={chat_id}&conversation_id={conversation_id}",
                headers=headers, timeout=10
            )
            poll_data = poll_resp.json()
            status = poll_data.get("data", {}).get("status")
            
            if status == "completed":
                is_completed = True
                break
            elif status in ["failed", "canceled", "requires_action"]:
                print(f"❌ 智能体执行异常，最终状态: {status}")
                break
            
            print(f"   ... 智能体文献分析中 (耗时 {i*2 + 2} 秒) ...")

        if not is_completed:
            print("⚠️ 智能体处理超时，终止等待。")
            return jsonify({"code": 200, "data": []})

        print("[3] 检索完成！正在拉取最终的消息内容...")
        msg_resp = requests.get(
            f"https://api.coze.cn/v3/chat/message/list?chat_id={chat_id}&conversation_id={conversation_id}",
            headers=headers, timeout=20
        )
        
        messages = msg_resp.json().get("data", [])
        content = ""
        for msg in messages:
            if msg.get("type") == "answer":
                content += msg.get("content", "")

        print("\n====== COZE 返回真实数据 ======")
        print(content)
        print("===============================\n")

        ai_results = []
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            json_str = match.group(0)
            try:
                raw_ai_data = json.loads(json_str)
                for item in raw_ai_data:
                    # 🚀 处理单个和多个靶点的情况
                    target_list = item.get('targets', [])
                    if not target_list and item.get('target'):
                        target_list = [item.get('target')]
                    
                    if not target_list and not item.get('title'):
                        continue
                        
                    ai_results.append({
                        "title": item.get('title', '最新科研文献'),
                        "targets": [str(t).upper().strip() for t in target_list if t], 
                        "pub_date": str(item.get('pub_date', '2024-2026')),
                        "mechanism": item.get('mechanism', '系统正在解析作用机制...'),
                        "mention_count": str(item.get('mention_count', '近期高频')),
                        "url": f"https://pubmed.ncbi.nlm.nih.gov/{item.get('pmid', '')}/" if item.get('pmid') else "#"
                    })
            except json.JSONDecodeError as e:
                print(f"❌ JSON 解析失败: {e}")
        else:
            print("❌ 未能在回答中正则匹配到 JSON 数组结构。")
        
        print(f"✅ 成功移交 {len(ai_results)} 篇最新前沿文献给前端！")
        return jsonify({"code": 200, "data": ai_results})

    except Exception as e:
        print(f"后端异常: {str(e)}")
        return jsonify({"code": 500, "message": str(e)}), 500

@app.route('/api/score-target', methods=['POST'])
def score_target():
    data = request.get_json()
    score = min(10, max(1, data.get('open_targets_score', 0.5) * 10))
    return jsonify({'code': 200, 'data': {'score': score}})

@app.route('/api/target-literature', methods=['GET'])
def target_literature():
    target = request.args.get('target', '')
    return jsonify({'code': 200, 'data': [{'title': f'{target} 研究', 'source': 'PubMed'}]})

if __name__ == '__main__':
    print("🚀 DermAI 皮肤药研后端已就绪: http://127.0.0.1:3000")
    app.run(host='0.0.0.0', port=3000, debug=True)