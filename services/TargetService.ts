import { GoogleGenAI } from "@google/genai";
import { DiscoveryResponse } from "../types";

export const getTargetDiscovery = async (diseaseName: string, retryCount = 0): Promise<DiscoveryResponse> => {
  const apiKey = (typeof process !== 'undefined' && process.env ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : '') || '';
  
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey === '') {
    throw new Error("未检测到有效的 API 密钥。请点击‘更换 API 密钥’按钮并选择一个已开启结算的项目密钥。");
  }

  const ai = new GoogleGenAI({ apiKey });
  // Switch back to gemini-3-flash-preview for better stability and speed
  const modelName = 'gemini-3-flash-preview';
  
  try {
    const prompt = `你是一个极其严谨的皮肤科药物研发科学家。
请深度分析 “${diseaseName}” 的核心药物靶点。

执行要求：
1. 靶点识别：识别 5-8 个具有强学术支撑的靶点。
2. 真实文献检索：你必须使用 Google Search 工具检索真实的学术文献。
3. 文献匹配：每篇文献必须明确包含该靶点（Gene Symbol）和疾病（${diseaseName}）。
4. 真实性校验：严禁编造文献题目或 URL。所有 URL 必须是真实的 PubMed、Nature、Science 或权威医学期刊链接。
5. 必须包含 PMID：在 evidenceLinks 中包含 PubMed ID (PMID)。
6. 输出格式：你必须【仅】返回一个合法的 JSON 字符串，直接以 { 开头。

JSON 结构：
{
  "disease": "${diseaseName}",
  "summary": "摘要",
  "targets": [
    {
      "geneSymbol": "基因",
      "uniprotId": "ID",
      "score": 0.85,
      "scoreBreakdown": { "genetics": 0.9, "expression": 0.8, "clinical": 0.8 },
      "scoreBasis": { "genetics": "描述", "expression": "描述", "clinical": "描述" },
      "rationale": "理由",
      "evidenceLinks": [ 
        { 
          "title": "真实论文全名（必须包含靶点和${diseaseName}）", 
          "source": "PubMed/Journal Name", 
          "url": "https://pubmed.ncbi.nlm.nih.gov/PMID/" 
        } 
      ],
      "associatedDrugs": ["药物"],
      "pathways": ["通路"]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.1,
        tools: [{ googleSearch: {} }],
      }
    });

    if (!response || !response.text) {
      throw new Error("AI 引擎返回了空结果。这可能是由于搜索过程被安全过滤器拦截。");
    }

    const text = response.text.trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("AI 返回的数据格式不正确（找不到 JSON 对象）。");
    }
    
    const jsonStr = text.substring(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonStr);
  } catch (e: any) {
    console.error(`Gemini API Error (Attempt ${retryCount + 1}):`, e);
    
    const errorMsg = e?.message || String(e);
    const isAuthError = errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("401");
    const isQuotaError = errorMsg.includes("quota") || errorMsg.includes("429");
    const isRpcError = errorMsg.includes("Rpc failed") || errorMsg.includes("500") || errorMsg.includes("xhr error");

    // Retry for transient errors (RPC, 500, etc.)
    if (retryCount < 2 && !isAuthError && !isQuotaError) {
      const delay = isRpcError ? 2000 : 500; // Longer delay for RPC errors
      console.log(`Retrying discovery in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getTargetDiscovery(diseaseName, retryCount + 1);
    }
    
    if (isAuthError) {
      throw new Error("API 密钥无效或已过期。请重新选择一个有效的密钥。");
    }
    if (isQuotaError) {
      throw new Error("API 调用频率达到上限。请稍后再试，或更换一个配额充足的密钥。");
    }
    if (isRpcError) {
      throw new Error("服务器响应异常 (RPC 500)。这通常是由于搜索插件暂时不可用或请求超时。请稍后重试。");
    }
    
    throw new Error(`AI 引擎调用失败: ${errorMsg}`);
  }
};

export const getKGVisualizationData = async (query: string): Promise<any> => {
  const apiKey = (typeof process !== 'undefined' && process.env ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : '') || '';
  if (!apiKey || apiKey === 'undefined' || apiKey === '') return { nodes: [], links: [] };

  const ai = new GoogleGenAI({ apiKey });
  try {
    const prompt = `生成关于 "${query}" 的皮肤科知识图谱 JSON。
要求：
1. 包含疾病、基因、药物、通路、蛋白质等实体。
2. 节点类型必须是：Disease, Gene, Drug, Pathway, Protein 之一。
3. 仅返回 JSON。

JSON 结构示例：
{
  "nodes": [
    { "id": "1", "name": "特应性皮炎", "type": "Disease" },
    { "id": "2", "name": "IL-4", "type": "Gene" }
  ],
  "links": [
    { "source": "1", "target": "2", "type": "ASSOCIATED_WITH" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        temperature: 0.1,
        tools: [{ googleSearch: {} }] 
      }
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text;

    return JSON.parse(cleanJson || '{"nodes":[], "links":[]}');
  } catch (e) {
    return { nodes: [], links: [] };
  }
};
