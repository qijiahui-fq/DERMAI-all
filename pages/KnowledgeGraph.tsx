import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ForceGraph2D from 'react-force-graph-2d'; 
import { Search, Filter, Download, RefreshCw, Info, AlertCircle, BookOpen, Layers } from 'lucide-react';

// ========== 1. 类型定义 (全量保留) ==========
export enum NodeType { 
  Disease = 'disease', 
  Gene = 'gene', 
  Drug = 'drug', 
  Pathway = 'pathway', 
  Protein = 'protein', 
  Literature = 'literature' 
}

export enum RelationType { 
  ASSOCIATED_WITH = 'associated_with', 
  TARGETS = 'targets', 
  REGULATES = 'regulates', 
  INTERACTS_WITH = 'interacts_with', 
  SUPPORTED_BY = 'supported_by' 
}

export interface Node { 
  id: string; 
  name: string; 
  type: NodeType; 
  val: number; 
  repurposing?: boolean; 
  formulation?: string; 
  pmid?: string;
}

export interface Link { 
  source: string; 
  target: string; 
  type: RelationType; 
}

export interface KnowledgeGraphData { 
  nodes: Node[]; 
  links: Link[]; 
}

// ========== 2. 动态匹配函数 (完全保留，作为安全兜底) ==========
const getPathwayByTarget = (targetSymbol: string): string | null => {
  const pathwayRules = [
    { keywords: ['IL4', 'IL13'], pathway: 'IL-4/IL-13 信号通路' },
    { keywords: ['JAK1', 'JAK2', 'JAK3', 'TYK2', 'STAT6'], pathway: 'JAK-STAT 信号通路' },
    { keywords: ['CARD14'], pathway: 'NF-κB 信号通路' },
    { keywords: ['TNF'], pathway: 'TNF-α 信号通路' },
    { keywords: ['IL17A'], pathway: 'IL-17 信号通路' },
    { keywords: ['IL23A'], pathway: 'IL-23/IL-17 信号通路' },
    { keywords: ['FLG'], pathway: '表皮屏障通路' },
    { keywords: ['TLR4'], pathway: 'TLR 信号通路' }
  ];
  const matchedRule = pathwayRules.find(rule => rule.keywords.some(keyword => targetSymbol.toUpperCase().includes(keyword.toUpperCase())));
  return matchedRule ? matchedRule.pathway : null;
};

const getProteinByTarget = (targetSymbol: string): string | null => {
  const proteinRules = [
    { keywords: ['FLG'], protein: '丝聚蛋白（Filaggrin）' },
    { keywords: ['LOR'], protein: '兜甲蛋白（Loricrin）' },
    { keywords: ['INV'], protein: '内披蛋白（Involucrin）' },
    { keywords: ['KRT1'], protein: '角蛋白1（Keratin 1）' },
    { keywords: ['KRT10'], protein: '角蛋白10（Keratin 10）' },
    { keywords: ['DSP'], protein: '桥粒斑蛋白（Desmoplakin）' },
    { keywords: ['DSG1'], protein: '桥粒芯糖蛋白1（Desmoglein 1）' },
    { keywords: ['CLDN1'], protein: '紧密连接蛋白1（Claudin 1）' }
  ];
  const matchedRule = proteinRules.find(rule => rule.keywords.some(keyword => targetSymbol.toUpperCase().includes(keyword.toUpperCase())));
  return matchedRule ? matchedRule.protein : null;
};

// ========== 3. 全量 47 种疾病映射表 (一字不差) ==========
const DISEASE_MAP: Record<string, { efo: string; mesh: string }> = {
  "特应性皮炎": { efo: "EFO_0000274", mesh: "D003876" }, "银屑病": { efo: "EFO_0000676", mesh: "D011506" }, "湿疹": { efo: "EFO_0000274", mesh: "D004511" }, "玫瑰痤疮": { efo: "EFO_1000760", mesh: "D014162" }, "脂溢性皮炎": { efo: "EFO_1000764", mesh: "D012869" }, "接触性皮炎": { efo: "EFO_0005319", mesh: "D003875" }, "疹痒症": { efo: "HP_0000989", mesh: "D011415" }, "红皮病": { efo: "EFO_0009456", mesh: "D004976" }, "痤疮": { efo: "EFO_0003894", mesh: "D001124" }, "斑秃": { efo: "EFO_0004192", mesh: "D001879" }, "雄激素性脱发": { efo: "EFO_0004191", mesh: "D000186" }, "酒渣鼻": { efo: "EFO_1000760", mesh: "D014162" }, "多汗症": { efo: "HP_0000975", mesh: "D006904" }, "化脓性汗腺炎": { efo: "EFO_1000710", mesh: "D006907" }, "白癜风": { efo: "EFO_0004208", mesh: "D014809" }, "黄褐斑": { efo: "EFO_0003963", mesh: "D008543" }, "雀斑": { efo: "EFO_0003963", mesh: "D005666" }, "白化病": { efo: "HP_0001022", mesh: "D000410" }, "太田痣": { efo: "EFO_1000396", mesh: "D009405" }, "咖啡斑": { efo: "HP_0000957", mesh: "D002143" }, "带状疱疹": { efo: "EFO_0006510", mesh: "D006539" }, "单纯疱疹": { efo: "EFO_1002022", mesh: "D006528" }, "足癣": { efo: "EFO_0007512", mesh: "D014034" }, "毛囊炎": { efo: "EFO_1000702", mesh: "D005418" }, "脓疱疮": { efo: "EFO_1000714", mesh: "D007107" }, "丹毒": { efo: "EFO_1001462", mesh: "D004903" }, "黑色素瘤": { efo: "EFO_0000756", mesh: "D008544" }, "基底细胞癌(BCC)": { efo: "EFO_0004193", mesh: "D001470" }, "鳞状细胞癌(SCC)": { efo: "EFO_0000707", mesh: "D013041" }, "脂溢性角化病": { efo: "EFO_0005584", mesh: "D012868" }, "血管瘤": { efo: "EFO_1000635", mesh: "D006439" }, "皮肤纤维肉瘤": { efo: "MONDO_0011934", mesh: "D018259" }, "蕈样肉芽肿": { efo: "EFO_1001051", mesh: "D009103" }, "系统性红斑狼疮": { efo: "HP_0002725", mesh: "D012148" }, "天疱疮": { efo: "EFO_1000749", mesh: "D010422" }, "类天疱疮": { efo: "EFO_0007187", mesh: "D010423" }, "皮肌炎": { efo: "EFO_0000398", mesh: "D003908" }, "硬皮病": { efo: "EFO_1001993", mesh: "D012559" }, "白塞病": { efo: "EFO_0003780", mesh: "D001565" }, "鱼鳞病": { efo: "MONDO_0019269", mesh: "D007115" }, "毛周角化症": { efo: "MONDO_0021036", mesh: "D007620" }, "大疱性表皮松解症(EB)": { efo: "EFO_1000690", mesh: "D004946" }, "掌跖角化病": { efo: "EFO_1000745", mesh: "D010624" }, "达里尔病": { efo: "EFO_1000703", mesh: "D005557" }, "荨麻疹": { efo: "EFO_0005531", mesh: "D014422" }, "血管性水肿": { efo: "EFO_0005532", mesh: "D000323" }, "日光性皮炎": { efo: "EFO_1000752", mesh: "D010627" }
};

const OPENTARGETS_API_URL = 'http://127.0.0.1:3000/api/opentargets/graphql';

const KnowledgeGraph: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [graphData, setGraphData] = useState<KnowledgeGraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [filteredTypes, setFilteredTypes] = useState<Record<NodeType, boolean>>({
    [NodeType.Disease]: true, [NodeType.Gene]: true, [NodeType.Drug]: true, 
    [NodeType.Pathway]: true, [NodeType.Protein]: true, [NodeType.Literature]: true
  });

  const fetchData = async (query: string) => {
    if (!query.trim()) return;
    let matched = null;
    for (const [name, config] of Object.entries(DISEASE_MAP)) {
      if (query.includes(name)) { matched = { name, ...config }; break; }
    }
    if (!matched) { setError("未匹配到疾病"); return; }

    setLoading(true);
    setError('');

    try {
      const otRes = await axios.post(OPENTARGETS_API_URL, { 
        query: `query { disease(efoId: "${matched.efo}") { associatedTargets(page: {size: 15, index: 0}) { rows { target { id approvedSymbol approvedName pathways { pathway } } score } } } }`
      });
      const topTargets = otRes.data.data?.disease?.associatedTargets?.rows || [];

      const drugPromises = topTargets.map((t: any) => 
        axios.get(`https://www.ebi.ac.uk/chembl/api/data/drug?target_components__target_component_synonyms__component_synonym__icontains=${t.target.approvedSymbol}&format=json`)
      );
      const litPromises = topTargets.map((t: any) => 
        axios.post(OPENTARGETS_API_URL, { 
          query: `query { disease(efoId: "${matched!.efo}") { evidences(datasourceIds: ["europepmc"], ensemblIds: ["${t.target.id}"], size: 3) { rows { literature textMiningSentences { text } } } } }` 
        })
      );

      const [drugRes, litRes] = await Promise.all([Promise.all(drugPromises), Promise.all(litPromises)]);

      const nodes: Node[] = [];
      const links: Link[] = [];
      const nodeSet = new Set();

      const diseaseNode: Node = { id: matched.efo, name: matched.name, type: NodeType.Disease, val: 30 };
      nodes.push(diseaseNode); nodeSet.add(matched.efo);

      topTargets.forEach((t: any, idx: number) => {
        const targetId = t.target.id;
        const symbol = t.target.approvedSymbol;
        const fullProteinName = t.target.approvedName; 
        const apiPathways = t.target.pathways || []; 
        
        if (!nodeSet.has(targetId)) {
            nodes.push({ id: targetId, name: symbol, type: NodeType.Gene, val: 20 });
            nodeSet.add(targetId);
        }
        links.push({ source: diseaseNode.id, target: targetId, type: RelationType.ASSOCIATED_WITH });

        // ================= 修复 1：深度挖掘真实的药物名称 =================
        const drugs = drugRes[idx].data?.drugs || [];
        drugs.slice(0, 3).forEach((d: any) => {
          const dId = `drug-${d.molecule_chembl_id}`;
          if (!nodeSet.has(dId)) {
            let finalDrugName = d.pref_name;
            
            // 如果首选名为空，深层遍历提取真正的学术名或商品名
            if (!finalDrugName && d.molecule_synonyms && d.molecule_synonyms.length > 0) {
                // 优先找 INN (国际非专利名称) 或 TRADE_NAME
                const goodSynonym = d.molecule_synonyms.find((s: any) => s.syn_type === 'INN' || s.syn_type === 'TRADE_NAME');
                finalDrugName = goodSynonym ? goodSynonym.molecule_synonym : d.molecule_synonyms[0].molecule_synonym;
            }
            
            // 只有当同义词都没有时，才使用 CHEMBL ID，并全部转大写
            finalDrugName = finalDrugName ? finalDrugName.toUpperCase() : d.molecule_chembl_id;

            nodes.push({ id: dId, name: finalDrugName, type: NodeType.Drug, val: 15, formulation: d.atc_classification?.[0]?.description });
            nodeSet.add(dId);
          }
          links.push({ source: dId, target: targetId, type: RelationType.TARGETS });
        });

        const lits = litRes[idx].data.data?.disease?.evidences?.rows || [];
        lits.forEach((lit: any) => {
            const pmid = lit.literature?.[0];
            if (pmid && !nodeSet.has(`lit-${pmid}`)) {
                nodes.push({ id: `lit-${pmid}`, name: `PMID:${pmid}`, type: NodeType.Literature, val: 8, pmid });
                nodeSet.add(`lit-${pmid}`);
                links.push({ source: `lit-${pmid}`, target: targetId, type: RelationType.SUPPORTED_BY });
            }
        });

        // ================= 修复 2：彻底移除截断，展示通路全称 =================
        if (apiPathways.length > 0) {
            const pName = apiPathways[0].pathway; // 完全不截断
            const pId = `p-${pName.replace(/\s+/g, '-')}`;
            if (!nodeSet.has(pId)) { 
                nodes.push({ id: pId, name: pName, type: NodeType.Pathway, val: 15 }); 
                nodeSet.add(pId); 
            }
            links.push({ source: targetId, target: pId, type: RelationType.REGULATES });
        } else {
            const pway = getPathwayByTarget(symbol);
            if (pway) {
              const pId = `p-${pway}`;
              if (!nodeSet.has(pId)) { nodes.push({ id: pId, name: pway, type: NodeType.Pathway, val: 15 }); nodeSet.add(pId); }
              links.push({ source: targetId, target: pId, type: RelationType.REGULATES });
            }
        }
        
        // ================= 修复 2：彻底移除截断，展示蛋白全称 =================
        if (fullProteinName) {
            const prId = `pr-${targetId}`;
            if (!nodeSet.has(prId)) { 
                nodes.push({ id: prId, name: fullProteinName, type: NodeType.Protein, val: 12 }); // 完全不截断
                nodeSet.add(prId); 
            }
            links.push({ source: targetId, target: prId, type: RelationType.INTERACTS_WITH });
        } else {
            const protein = getProteinByTarget(symbol);
            if (protein) {
              const prId = `pr-${protein}`;
              if (!nodeSet.has(prId)) { nodes.push({ id: prId, name: protein, type: NodeType.Protein, val: 12 }); nodeSet.add(prId); }
              links.push({ source: targetId, target: prId, type: RelationType.INTERACTS_WITH });
            }
        }
      });

      setGraphData({ nodes, links });
    } catch (err) { setError("数据链路异常，请确认后端运行"); } finally { setLoading(false); }
  };

  // ================= 修复 3：高清无损的带背景下载引擎 =================
  const handleExport = () => {
    if (graphData.nodes.length === 0) {
      setError("当前没有可导出的图谱，请先搜索疾病。");
      return;
    }
    try {
      const originalCanvas = containerRef.current?.querySelector('canvas');
      if (originalCanvas) {
        // 创建一个全新的虚拟画布
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalCanvas.width;
        tempCanvas.height = originalCanvas.height;
        const ctx = tempCanvas.getContext('2d');
        
        if (ctx) {
          // 第一步：用深空蓝背景填满画布 (解决背景透明导致的黑字看不清问题)
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          // 第二步：将原有的图谱层叠画上去
          ctx.drawImage(originalCanvas, 0, 0);
          
          // 第三步：导出高精度 PNG
          const url = tempCanvas.toDataURL('image/png'); 
          const a = document.createElement('a');
          a.href = url;
          a.download = `${searchQuery || '皮科'}_AI知识图谱.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } else {
        setError("无法获取图谱画布，请确保图谱已完全加载。");
      }
    } catch (err) {
      setError("导出失败，请检查浏览器权限。");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10 p-4 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col gap-2 border-b pb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Layers className="text-indigo-600 w-8 h-8" /> AI 知识图谱
        </h1>
        <p className="text-slate-500 font-medium italic">集成 Open Targets, ChEMBL 与 PubMed 实时全维度证据</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-400" />
            <input type="text" placeholder="搜索 47 种疾病..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchData(searchQuery)} className="flex-1 border-none focus:outline-none font-medium" />
            <button onClick={() => fetchData(searchQuery)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700">搜索</button>
        </div>
        <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">层级筛选已激活</div>
            <div className="flex flex-wrap gap-2">
                {Object.entries(filteredTypes).map(([type, checked]) => (
                    <div key={type} className="flex items-center gap-1">
                        <input type="checkbox" checked={checked} onChange={() => setFilteredTypes(p => ({...p, [type]: !p[type as NodeType]}))} className="w-3 h-3" />
                        <span className="text-[10px] font-bold text-slate-600">
                          {type === 'disease' ? '疾病' : type === 'gene' ? '基因' : type === 'drug' ? '药物' : type === 'pathway' ? '通路' : type === 'protein' ? '蛋白' : '文献'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
        <div className="lg:col-span-1 flex items-center justify-center">
          <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 transition-colors">
            <Download className="w-4 h-4" /> 导出数据
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-700 text-sm flex items-center gap-2 shadow-sm"><AlertCircle className="w-5 h-5" /> {error}</div>}

      <div className="bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-800 relative overflow-hidden" style={{ height: '1000px' }}>
        {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400"><RefreshCw className="animate-spin w-12 h-12 mb-4 text-indigo-500" /><p className="font-bold">深度挖掘全量关联数据中...</p></div>
        ) : graphData.nodes.length > 0 ? (
            <ForceGraph2D
                ref={fgRef}
                graphData={{ nodes: graphData.nodes.filter(n => filteredTypes[n.type]), links: graphData.links }}
                width={containerRef.current?.clientWidth || 1100}
                height={1000}
                nodeRelSize={7}
                linkColor={() => 'rgba(200, 200, 200, 0.2)'} 
                linkDirectionalParticles={4}
                linkDirectionalParticleSpeed={0.005}
                d3VelocityDecay={0.3} 
                onNodeClick={(node: any) => {
                    if (node.type === NodeType.Literature && node.pmid) {
                        window.open(`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}/`, '_blank');
                    }
                }}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = 12/globalScale; // 字体稍微调小一点，确保全称不突兀
                    ctx.font = `${fontSize}px Inter, sans-serif`;
                    const colors: any = { disease: '#ef4444', gene: '#3b82f6', drug: '#10b981', pathway: '#f59e0b', protein: '#ec4899', literature: '#8b5cf6' };
                    
                    ctx.beginPath(); ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
                    ctx.fillStyle = colors[node.type] || '#fff'; ctx.fill();

                    // 文字描边
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3/globalScale; ctx.strokeText(label, node.x, node.y + 12);
                    ctx.fillStyle = '#f8fafc'; ctx.fillText(label, node.x, node.y + 12);
                }}
            />
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <Info className="w-16 h-16 opacity-20 mb-4" />
                <p className="text-lg">请输入疾病并构建图谱以展示关联</p>
            </div>
        )}
        
        <div className="absolute top-6 right-6 bg-slate-100/90 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-200 z-10 w-36 pointer-events-none">
            <p className="font-extrabold text-slate-800 mb-3 text-xs border-b border-slate-300 pb-1 text-center">图谱实例</p>
            <div className="space-y-2.5">
                <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-[#ef4444]"></div><span className="text-[11px] font-bold text-slate-700">皮肤疾病</span></div>
                <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-[#3b82f6]"></div><span className="text-[11px] font-bold text-slate-700">关键基因</span></div>
                <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-[#10b981]"></div><span className="text-[11px] font-bold text-slate-700">皮科药物</span></div>
                <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-[#f59e0b]"></div><span className="text-[11px] font-bold text-slate-700">皮肤通路</span></div>
                <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-[#ec4899]"></div><span className="text-[11px] font-bold text-slate-700">表皮蛋白</span></div>
                <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-[#8b5cf6]"></div><span className="text-[11px] font-bold text-slate-700">科学文献</span></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;