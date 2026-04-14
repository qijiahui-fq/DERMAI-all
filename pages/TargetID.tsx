import React, { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, ExternalLink, Dna, Info, ChevronRight, Grid, ChevronDown, ChevronUp, BookOpen, CheckCircle2, BarChart3, Layers, Cpu, Calculator, ShieldCheck, Microscope, Activity, Sparkles, FileText, Pill } from 'lucide-react';

// --- 接口定义 (彻底拆分 AI 与 OT 数据结构) ---
interface ScoreBreakdown { 
  genetics: number; expression: number; clinical: number; pathways: number; literature: number; animalModel: number; 
}

interface EvidenceLink { 
  title: string; url: string; source: string;
}

// 专门用于 OpenTargets 存量库的靶点结构
export interface OTTargetCandidate { 
  geneSymbol: string; 
  uniprotId: string; 
  score: number; 
  scoreBreakdown: ScoreBreakdown; 
  pathways: string[]; 
  associatedDrugs: string[]; 
  evidenceLinks: EvidenceLink[]; 
}

// 专门用于 AI 最新文献的结构 (以文献为主体)
export interface AIInsightCandidate {
  title: string;
  pubDate: string;
  targets: string[];
  mechanism: string;
  mentionCount: string;
  url: string;
}

export interface DiscoveryResponse { 
  disease: string; 
  summary: string; 
  otTargets: OTTargetCandidate[]; 
  aiInsights: AIInsightCandidate[];
}

const OPENTARGETS_API_URL = "http://127.0.0.1:3000/api/opentargets/graphql";

const DISEASE_MAPPING: Record<string, { efo: string; mesh: string }> = {
  "特应性皮炎": { efo: "EFO_0000274", mesh: "D003876" },
  "银屑病": { efo: "EFO_0000676", mesh: "D011506" },
  "湿疹": { efo: "EFO_0000274", mesh: "D004511" },
  "玫瑰痤疮": { efo: "EFO_1000760", mesh: "D014162" },
  "脂溢性皮炎": { efo: "EFO_1000764", mesh: "D012869" },
  "接触性皮炎": { efo: "EFO_0005319", mesh: "D003875" },
  "疹痒症": { efo: "HP_0000989", mesh: "D011415" },
  "红皮病": { efo: "EFO_0009456", mesh: "D004976" },
  "痤疮": { efo: "EFO_0003894", mesh: "D001124" },
  "斑秃": { efo: "EFO_0004192", mesh: "D001879" },
  "雄激素性脱发": { efo: "EFO_0004191", mesh: "D000186" },
  "酒渣鼻": { efo: "EFO_1000760", mesh: "D014162" },
  "多汗症": { efo: "HP_0000975", mesh: "D006904" },
  "化脓性汗腺炎": { efo: "EFO_1000710", mesh: "D006907" },
  "白癜风": { efo: "EFO_0004208", mesh: "D014809" },
  "黄褐斑": { efo: "EFO_0003963", mesh: "D008543" },
  "雀斑": { efo: "EFO_0003963", mesh: "D005666" },
  "白化病": { efo: "HP_0001022", mesh: "D000410" },
  "太田痣": { efo: "EFO_1000396", mesh: "D009405" },
  "咖啡斑": { efo: "HP_0000957", mesh: "D002143" },
  "带状疱疹": { efo: "EFO_0006510", mesh: "D006539" },
  "单纯疱疹": { efo: "EFO_1002022", mesh: "D006528" },
  "足癣": { efo: "EFO_0007512", mesh: "D014034" },
  "毛囊炎": { efo: "EFO_1000702", mesh: "D005418" },
  "脓疱疮": { efo: "EFO_1000714", mesh: "D007107" },
  "丹毒": { efo: "EFO_1001462", mesh: "D004903" },
  "黑色素瘤": { efo: "EFO_0000756", mesh: "D008544" },
  "基底细胞癌(BCC)": { efo: "EFO_0004193", mesh: "D001470" },
  "鳞状细胞癌(SCC)": { efo: "EFO_0000707", mesh: "D013041" },
  "脂溢性角化病": { efo: "EFO_0005584", mesh: "D012868" },
  "血管瘤": { efo: "EFO_1000635", mesh: "D006439" },
  "皮肤纤维肉瘤": { efo: "MONDO_0011934", mesh: "D018259" },
  "蕈样肉芽肿": { efo: "EFO_1001051", mesh: "D009103" },
  "系统性红斑狼疮": { efo: "HP_0002725", mesh: "D012148" },
  "天疱疮": { efo: "EFO_1000749", mesh: "D010422" },
  "类天疱疮": { efo: "EFO_0007187", mesh: "D010423" },
  "皮肌炎": { efo: "EFO_0000398", mesh: "D003908" },
  "硬皮病": { efo: "EFO_1001993", mesh: "D012559" },
  "白塞病": { efo: "EFO_0003780", mesh: "D001565" },
  "鱼鳞病": { efo: "MONDO_0019269", mesh: "D007115" },
  "毛周角化症": { efo: "MONDO_0021036", mesh: "D007620" },
  "大疱性表皮松解症(EB)": { efo: "EFO_1000690", mesh: "D004946" },
  "掌跖角化病": { efo: "EFO_1000745", mesh: "D010624" },
  "达里尔病": { efo: "EFO_1000703", mesh: "D005557" },
  "荨麻疹": { efo: "EFO_0005531", mesh: "D014422" },
  "血管性水肿": { efo: "EFO_0005532", mesh: "D000323" },
  "日光性皮炎": { efo: "EFO_1000752", mesh: "D010627" }
};

const DISEASE_CATEGORIES = [
  {name: '原因性皮肤病',diseases: ['特应性皮炎', '银屑病', '湿疹', '玫瑰痤疮', '脂溢性皮炎', '接触性皮炎', '疹痒症', '红皮病']},
  {name: '皮肤附属器疾病',diseases: ['痤疮', '斑秃', '雄激素性脱发', '酒渣鼻', '多汗症', '化脓性汗腺炎']},
  {name: '色素性皮肤病',diseases: ['白癜风', '黄褐斑', '雀斑', '白化病', '太田痣', '咖啡斑']},
  {name: '感染性皮肤病',diseases: ['带状疱疹', '单纯疱疹', '足癣', '毛囊炎', '脓疱疮', '丹毒']},
  {name: '皮肤肿瘤',diseases: ['黑色素瘤', '基底细胞癌(BCC)', '鳞状细胞癌(SCC)', '脂溢性角化病', '血管瘤', '皮肤纤维肉瘤', '蕈样肉芽肿']},
  {name: '自身免疫性皮肤病',diseases: ['系统性红斑狼疮', '天疱疮', '类天疱疮', '皮肌炎', '硬皮病', '白塞病']},
  {name: '遗传性皮肤病',diseases: ['鱼鳞病', '毛周角化症', '大疱性表皮松解症(EB)', '掌跖角化病', '达里尔病']},
  {name: '过敏性皮肤病',diseases: ['荨麻疹', '血管性水肿', '日光性皮炎']}
];

const LOADING_STEPS = [
  "初始化分析模块...",
  "检索底层多维组学关联数据...",
  "启动智能体挖掘最新前沿文献...",
  "正在结构化提取文献中的靶点机制..."
];

// 🚀 你保留的核心药物字典，下面会完美调用它！
const PATHWAY_DRUG_MAP: Record<string, { pathways: string[]; drugs: string[] }> = {
  "IL4": { pathways: ["IL4/IL13信号通路", "JAK/STAT6通路"], drugs: ["度普利尤单抗 (Dupilumab)", "莱博利珠单抗 (Lebrikizumab)"] },
  "IL13": { pathways: ["IL4/IL13通路", "皮肤屏障功能调控"], drugs: ["Dupilumab", "Lebrikizumab"] },
  "IL17A": { pathways: ["IL17/NF-κB通路", "中性粒细胞募集"], drugs: ["司库奇尤单抗 (Secukinumab)", "依奇珠单抗 (Ixekizumab)"] },
  "TNF": { pathways: ["TNF-α通路", "炎症小体激活"], drugs: ["阿达木单抗 (Adalimumab)", "英夫利昔单抗 (Infliximab)"] },
  "IL23A": { pathways: ["IL23/Th17轴", "慢性炎症维持"], drugs: ["古塞奇尤单抗 (Guselkumab)", "提得克珠单抗 (Tildrakizumab)"] },
  "JAK2": { pathways: ["JAK/STAT通路", "细胞因子信号传导"], drugs: ["托法替布 (Tofacitinib)", "乌帕替尼 (Upadacitinib)"] },
  "IL6": { pathways: ["IL6/JAK/STAT3通路", "急性期炎症反应"], drugs: ["托珠单抗 (Tocilizumab)", "司妥昔单抗 (Siltuximab)"] },
  "IFNG": { pathways: ["IFN-γ通路", "Th1型免疫应答"], drugs: ["干扰素γ-1b (Interferon gamma-1b)"] },
  "CSF2": { pathways: ["GM-CSF通路", "粒细胞巨噬细胞活化"], drugs: ["莫格利珠单抗 (Mogamulizumab)"] },
  "CCL17": { pathways: ["CCR4/CCL17通路", "T细胞趋化"], drugs: ["莫格利珠单抗 (Mogamulizumab)"] },
  "CXCL10": { pathways: ["CXCR3/CXCL10通路", "炎症细胞募集"], drugs: ["芬戈莫德 (Fingolimod)"] }
};

const formatScore = (val: number, isTotal = false) => {
  if (val === 0) return <span className="text-slate-300 font-normal">—</span>;
  if (val > 0 && val < 0.01) return <span className="text-slate-400 font-medium">&lt;0.01</span>;
  return <span className={isTotal ? "font-black" : "font-bold"}>{val.toFixed(2)}</span>;
};

const formatScoreText = (val: number) => {
  if (val === 0) return '0.00'; 
  if (val > 0 && val < 0.01) return '<0.01';
  return val.toFixed(2);
};

const SafeLoader = ({ isLoading }: { isLoading: boolean }) => {
  if (!isLoading) return null;
  return <Loader2 key="loader-icon" className="w-6 h-6 animate-spin text-white" />;
};

const fetchRealTargets = async (diseaseName: string): Promise<{ rows: any[], totalCount: number }> => {
  try {
    const conf = DISEASE_MAPPING[diseaseName] || { efo: "EFO_0000274", mesh: "D003876" };
    const efoId = conf.efo;

    const query = `query associatedTargets {
      disease(efoId: "${efoId}") {
        id
        name
        associatedTargets(page: {size: 25, index: 0}) {
          count
          rows {
            target { id approvedSymbol approvedName pathways { pathway } }
            datatypeScores { id score }
          }
        }
      }
    }`;

    const requestData = { query };
    const response = await axios.post(
      OPENTARGETS_API_URL,
      requestData,
      { timeout: 60000, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
    );
    const rows = response.data?.data?.disease?.associatedTargets?.rows || [];
    const totalCount = response.data?.data?.disease?.associatedTargets?.count || 0;
    return { rows, totalCount };
  } catch (err: any) {
    throw new Error(`底层接口请求失败：${err.message}`);
  }
};

const fetchGWASLiterature = async (ensemblId: string, efoId: string, size: number = 5): Promise<any[]> => {
  try {
    const query = `query GwasCredibleSetsQuery($ensemblId: String!, $efoId: String!, $size: Int!) {
      disease(efoId: $efoId) {
        gwasCredibleSets: evidences(
          ensemblIds: [$ensemblId]
          enableIndirect: true
          datasourceIds: ["gwas_credible_sets"]
          size: $size
        ) {
          rows { credibleSet { study { traitFromSource publicationFirstAuthor publicationDate pubmedId } } }
        }
      }
    }`;

    const response = await axios.post(
      OPENTARGETS_API_URL,
      { query, variables: { ensemblId, efoId, size } },
      { timeout: 30000, headers: { 'Content-Type': 'application/json' } }
    );

    const rows = response.data?.data?.disease?.gwasCredibleSets?.rows || [];
    return rows.map((row: any) => {
      const study = row.credibleSet?.study || {};
      const year = study.publicationDate ? study.publicationDate.split('-')[0] : "未知年份";
      const title = study.publicationFirstAuthor 
        ? `${study.publicationFirstAuthor} et al. (${year}): GWAS Catalog`
        : `GWAS Catalog (${year})`;
      const url = study.pubmedId 
        ? `https://pubmed.ncbi.nlm.nih.gov/${study.pubmedId}/` 
        : `https://pubmed.ncbi.nlm.nih.gov/?term=${ensemblId}`;
      
      return { title, url, source: "GWAS Catalog" };
    });
  } catch (err) {
    return [];
  }
};

// ==========================================
// 🚀 AI 专区：独立大卡片，以文献为中心展示
// 完美的 UI 逻辑：标题带链接、核心靶点醒目展示
// ==========================================
const AIInsightCard: React.FC<{ insight: AIInsightCandidate }> = ({ insight }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 mb-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col gap-6 group">
      
      <div className="absolute top-[-20px] right-[-20px] opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <BookOpen className="w-64 h-64 text-amber-600" />
      </div>

      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md uppercase tracking-wide flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> 文献挖掘洞察
          </span>
          <span className="text-slate-600 font-medium text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1">
            <Activity className="w-3 h-3" /> 近期活跃度: {insight.mentionCount}
          </span>
          <span className="text-slate-500 font-medium text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
            发表年份: {insight.pubDate}
          </span>
        </div>
        
        {/* 外链紧贴文献标题 */}
        <h4 className="text-xl font-bold text-slate-800 leading-snug flex items-start gap-3 pr-4">
          {insight.title}
          <a href={insight.url} target="_blank" rel="noopener noreferrer" className="mt-1 shrink-0 p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all text-slate-400 group-hover:border-indigo-200">
            <ExternalLink className="w-4 h-4" />
          </a>
        </h4>
      </div>

      <div className="w-full h-px bg-slate-100 relative z-10" />

      <div className="flex flex-col lg:flex-row gap-8 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Microscope className="w-4 h-4 text-indigo-500" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">机制与情报摘要 (Mechanism & Insights)</span>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed p-5 bg-slate-50 rounded-2xl border border-slate-100">
            {insight.mechanism}
          </p>
        </div>

        <div className="lg:w-80 shrink-0">
          <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100 h-full">
            <h5 className="text-[11px] font-bold text-indigo-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Dna className="w-4 h-4" /> 文献关联核心靶点
            </h5>
            <div className="flex flex-wrap gap-2">
              {insight.targets && insight.targets.length > 0 ? (
                insight.targets.map((t, i) => (
                  <div key={i} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-sm hover:scale-105 transition-transform cursor-default">
                    {t}
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-500 bg-white px-3 py-3 rounded-lg border border-slate-200 leading-relaxed shadow-sm block w-full italic">
                  此文献偏向宏观临床观察或综述，未明确指定具体核心分子靶点。
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 🛡️ OT 专区：底层组学已知靶点矩阵 (保持原汁原味)
// ==========================================
const TargetRow: React.FC<{ target: OTTargetCandidate; disease: string }> = ({ target, disease }) => {
  const [expanded, setExpanded] = useState(false);
  const finalScore = target.score; 

  return (
    <div className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors w-full min-w-0">
      <div className="flex items-center gap-4 p-5 cursor-pointer w-full min-w-0" onClick={() => setExpanded(!expanded)}>
        <div className="w-12 h-12 bg-indigo-50 border-indigo-100/50 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-sm border">
           <Dna className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="font-bold text-slate-800 text-lg tracking-tight">{target.geneSymbol}</h4>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold uppercase border border-slate-200">{target.uniprotId || 'N/A'}</span>
          </div>
          <p className="text-xs text-slate-500 truncate mt-1 leading-relaxed">
            基于底层多维组学数据，该靶点的综合加权得分为 {finalScore > 0 ? finalScore.toFixed(2) : '<0.01'}，点击查看各维度推演明细。
          </p>
        </div>
        
        <div className="text-right shrink-0 px-4 hidden sm:block border-l border-slate-100 min-w-0">
          <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">核心加权得分</div>
          <div className="flex items-center justify-end gap-2 min-w-0">
            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden flex justify-start">
              <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.max(finalScore || 0, 0.5)}%` }} />
            </div>
            <span className="text-sm text-slate-800">{formatScore(finalScore, true)}</span>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-300 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>
      
      {expanded && (
        <div className="px-6 pb-8 ml-16 animate-in slide-in-from-top-4 duration-300 w-full min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
            
            {/* 左侧打分区域 */}
            <div className="lg:col-span-2 space-y-6 w-full min-w-0">
              <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50 w-full min-w-0">
                <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-3 min-w-0">
                  <ShieldCheck className="w-4 h-4" /> 核心生物学多维模型 (3D Biological Model)
                </h5>
                <p className="text-sm text-slate-700 leading-relaxed font-medium mb-5">
                  为确保靶点评估的严谨性与针对性，系统总分仅由反映疾病本质的 Genetic Association、RNA Expression 与 Affected Pathway 三大生物学核心维度加权构成。
                </p>
                
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col gap-2 border-b border-indigo-50 pb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Calculator className="w-3 h-3" /> 加权计算公式
                    </span>
                    <span className="text-[11px] font-black text-indigo-700 font-mono tracking-tight leading-relaxed">
                      总分 = Genetic(40%) + Expression(40%) + Pathway(20%)
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Calculator className="w-3 h-3" /> 各维度得分计算推导
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 overflow-x-auto custom-scrollbar">
                      <span className="text-[11px] font-black text-slate-600 font-mono tracking-tighter whitespace-nowrap">
                        ({formatScoreText(target.scoreBreakdown.genetics)}×0.4) + ({formatScoreText(target.scoreBreakdown.expression)}×0.4) + ({formatScoreText(target.scoreBreakdown.pathways)}×0.2)
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-sm">=</span>
                        <span className="text-base text-indigo-600 font-mono">{formatScore(finalScore, true)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 w-full min-w-0">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3 min-w-0">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" /> 核心评估维度 (计入总分)
                  </h5>
                  <div className="text-[9px] font-bold text-slate-400 uppercase">源自底层组学特征数据</div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 w-full min-w-0">
                  <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 w-full min-w-0 flex justify-between items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0"><Dna className="w-5 h-5" /></div>
                        <div className="text-xs font-bold text-blue-600 uppercase">Genetic Association (权重: 40%)</div>
                      </div>
                      <div className="text-xl text-blue-600">{formatScore(target.scoreBreakdown.genetics, true)}</div>
                  </div>

                  <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-100/50 w-full min-w-0 flex justify-between items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shrink-0"><Layers className="w-5 h-5" /></div>
                        <div className="text-xs font-bold text-purple-600 uppercase">RNA Expression (权重: 40%)</div>
                      </div>
                      <div className="text-xl text-purple-600">{formatScore(target.scoreBreakdown.expression, true)}</div>
                  </div>

                  <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100/50 w-full min-w-0 flex justify-between items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0"><Activity className="w-5 h-5" /></div>
                        <div className="text-xs font-bold text-rose-600 uppercase">Affected Pathway (权重: 20%)</div>
                      </div>
                      <div className="text-xl text-rose-600">{formatScore(target.scoreBreakdown.pathways, true)}</div>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6 min-w-0 space-y-4">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 衍生辅助观测指标 (不计入总分)
                  </h5>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 w-full min-w-0">
                    <div className="text-xs font-bold text-slate-700 uppercase">Known Drug</div>
                    <div className="text-lg text-emerald-600 shrink-0 ml-4">{formatScore(target.scoreBreakdown.clinical)}</div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 w-full min-w-0">
                    <div className="text-xs font-bold text-slate-700 uppercase">Literature</div>
                    <div className="text-lg text-amber-600 shrink-0 ml-4">{formatScore(target.scoreBreakdown.literature)}</div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 w-full min-w-0">
                    <div className="text-xs font-bold text-slate-700 uppercase">Animal Models</div>
                    <div className="text-lg text-slate-500 shrink-0 ml-4">{formatScore(target.scoreBreakdown.animalModel)}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 右侧老文献与药物区域 */}
            <div className="space-y-4 w-full min-w-0">
              
              {/* 🚀 药物展示区（你的字典终于发力了！） */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm w-full min-w-0">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-500" /> 已有成药/在研药物
                </h5>
                <div className="flex flex-wrap gap-2 min-w-0">
                  {target.associatedDrugs?.length > 0 ? target.associatedDrugs.map((d, idx) => (
                    <span key={`drug-${target.geneSymbol}-${idx}`} className="text-[10px] px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-bold uppercase">
                      {d}
                    </span>
                  )) : <span className="text-xs text-slate-400 italic">系统字典暂未收录成药信息</span>}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col w-full min-w-0">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" /> 核心相关通路
                </h5>
                <div className="flex flex-wrap gap-2 mb-8 min-w-0">
                  {target.pathways?.length > 0 ? target.pathways.map((p, idx) => (
                    <span key={`path-${target.geneSymbol}-${idx}`} className="text-[10px] px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-bold uppercase">
                      {p}
                    </span>
                  )) : <span className="text-xs text-slate-400 italic">No pathway data</span>}
                </div>
                
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 mt-auto border-t pt-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" /> 经典研究文献记录
                </h5>
                <div className="space-y-4 min-w-0 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  
                  {target.evidenceLinks?.map((link, idx) => (
                    <div key={`link-${target.geneSymbol}-${idx}`} className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white transition-all group min-w-0">
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <span className="text-[11px] font-bold leading-snug text-slate-800 group-hover:text-indigo-700">
                          {link.title}
                        </span>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-500 opacity-40 group-hover:opacity-100" />
                        </a>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-slate-200 text-slate-500">
                          {link.source}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {(!target.evidenceLinks || target.evidenceLinks.length === 0) && (
                     <div className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed mt-4">
                        <Info className="w-6 h-6 text-slate-400" />
                        <p className="text-xs text-slate-500 text-center font-medium">底层库暂未收录直接文献证据</p>
                        <a 
                          href={`https://pubmed.ncbi.nlm.nih.gov/?term=${target.geneSymbol}+${disease}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 bg-white border border-indigo-100 text-indigo-600 text-[11px] font-black rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Search className="w-3 h-3" />
                          前往 PubMed 手动检索
                        </a>
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 主页面组件
// ==========================================
const TargetID: React.FC = () => {
  const [disease, setDisease] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [results, setResults] = useState<DiscoveryResponse | null>(null);
  const [showCategories, setShowCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (diseaseToSearch?: string) => {
    if (isLoading) return;
    const term = (diseaseToSearch || disease).trim();
    if (!term) return;

    setDisease(term);
    setIsLoading(true);
    setLoadingStep(0); 
    setResults(null);
    setError(null);

    try {
      setLoadingStep(1); 
      const otResponse = await fetchRealTargets(term);
      const topTargets = otResponse.rows.slice(0, 25);

      setLoadingStep(2); 
      const aiPromise = axios.post('http://127.0.0.1:3000/api/academic-insights', { disease: term }).catch(() => ({ data: { data: [] } }));
      const conf = DISEASE_MAPPING[term] || { efo: "EFO_0000274", mesh: "D003876" };
      
      const litPromises = topTargets.map((r: any) =>
        axios.post(OPENTARGETS_API_URL, {
          query: `query { disease(efoId: "${conf.efo}") { evidences(datasourceIds: ["europepmc"], ensemblIds: ["${r.target.id}"], size: 5) { rows { literature textMiningSentences { text } } } } }`
        }).catch(() => ({ data: null }))
      );
      
      const [aiResponse, litRes] = await Promise.all([aiPromise, Promise.all(litPromises)]);

      const aiInsights: AIInsightCandidate[] = [];
      const otTargets: OTTargetCandidate[] = [];

      // 1. AI 阵营解析
      const rawAiData = aiResponse.data?.data || [];
      if (Array.isArray(rawAiData)) {
        rawAiData.forEach((item: any) => {
          aiInsights.push({
            title: item.title,
            pubDate: item.pub_date,
            targets: item.targets || [], // 支持多靶点数组
            mechanism: item.mechanism,
            mentionCount: item.mention_count,
            url: item.url
          });
        });
      }
      
      // 2. OT 阵营解析
      for (let idx = 0; idx < topTargets.length; idx++) {
        const r = topTargets[idx];
        const sym = r.target?.approvedSymbol;
        if (!sym) continue;

        const rawScores = r.datatypeScores || [];
        const getOtScore = (idName: string) => rawScores.find((x: any) => x.id === idName)?.score || 0;

        let genScore = Math.max(getOtScore('genetic_association'), getOtScore('somatic_mutation')) * 100;
        let expScore = getOtScore('rna_expression') * 100;
        let pathwayScore = getOtScore('affected_pathway') * 100;
        let clinScore = getOtScore('known_drug') * 100;
        let litScore = getOtScore('literature') * 100;
        let animalScore = getOtScore('animal_model') * 100;

        const weightedScore = (genScore * 0.40) + (expScore * 0.40) + (pathwayScore * 0.20);
        const gwasLit = await fetchGWASLiterature(r.target.id, conf.efo);
        const realLitLinks: EvidenceLink[] = [];

        (litRes[idx]?.data?.data?.disease?.evidences?.rows || []).forEach((l: any) => {
          const pmid = l.literature?.[0];
          const text = l.textMiningSentences?.[0]?.text || `Literature Evidence`;
          if (pmid) {
            realLitLinks.push({
              title: text.length > 120 ? text.substring(0, 120) + '...' : text,
              url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
              source: "OpenTargets"
            });
          }
        });

        // 🚀 核心修复：把你本地映射的药物匹配回来
        const matchedDrugs = PATHWAY_DRUG_MAP[sym]?.drugs || [];

        otTargets.push({
          geneSymbol: sym,
          uniprotId: r.target.id || "N/A",
          score: weightedScore, 
          scoreBreakdown: { genetics: genScore, expression: expScore, clinical: clinScore, pathways: pathwayScore, literature: litScore, animalModel: animalScore },
          pathways: r.target.pathways?.slice(0, 3).map((p: any) => p.pathway) || ["-"],
          associatedDrugs: matchedDrugs, // 🚀 药物终于被渲染进去了！
          evidenceLinks: [...realLitLinks, ...gwasLit],
        });
      }

      setLoadingStep(3); 
      setResults({
        disease: term,
        summary: `✅ 分析完成。双轨情报中心：上方为 AI 从 2024-2026 前沿文献中挖掘的核心成果，下方为底层数据库收录的已知靶点多维组学矩阵。`,
        otTargets: otTargets.sort((a,b) => b.score - a.score),
        aiInsights: aiInsights
      });
    } catch (err) {
      setError(`❌ 分析失败：${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 w-full min-w-0 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 w-full min-w-0 mt-12">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 tracking-tight min-w-0">
          <Cpu className="w-8 h-8 text-indigo-600" />
          靶点识别分析模块
        </h1>
        <p className="text-slate-500 font-medium min-w-0">
          通过多维组学数据提取，构建透明、可计算的靶点优先级评估矩阵
        </p>
      </div>

      <div className="bg-white p-3 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 w-full min-w-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex flex-col sm:flex-row gap-2 min-w-0">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
            <input 
              type="text" 
              placeholder="请输入疾病名称 (例如: 银屑病)..."
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-slate-50 rounded-[1.8rem] focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg text-slate-700 transition-all border border-transparent font-medium"
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading || !disease.trim()}
            className="bg-indigo-600 text-white px-12 py-5 rounded-[1.8rem] font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:bg-slate-300 shadow-xl shadow-indigo-200 active:scale-95 min-w-0 sm:min-w-[150px]"
          >
            {isLoading ? ( <><SafeLoader isLoading={isLoading} /><span>分析中</span></> ) : ( "开始分析" )}
          </button>
        </form>
      </div>

      <div className="flex justify-between items-center px-4 w-full min-w-0">
        <button 
          onClick={() => setShowCategories(!showCategories)}
          disabled={isLoading}
          className="flex items-center gap-3 text-sm font-black text-indigo-600 hover:text-indigo-800 transition-all bg-indigo-50/50 px-6 py-2.5 rounded-2xl border border-indigo-100 shadow-sm disabled:opacity-50 min-w-0"
        >
          <Grid className="w-5 h-5" />
          皮肤专科疾病库快捷检索
          {showCategories ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        <div className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Weighted Scoring Model</div>
      </div>

      {showCategories && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full min-w-0">
          {DISEASE_CATEGORIES.map((cat) => (
            <div key={cat.name} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50/30 transition-all group w-full min-w-0">
              <h3 className="text-[11px] font-black text-slate-400 group-hover:text-indigo-500 uppercase tracking-[0.2em] pb-3 border-b border-slate-50 transition-colors">{cat.name}</h3>
              <div className="flex flex-wrap gap-2 min-w-0">
                {cat.diseases.map((d) => (
                  <button key={d} onClick={() => handleSearch(d)} disabled={isLoading} className="px-3 py-1.5 text-[11px] rounded-xl hover:bg-indigo-600 hover:text-white transition-all border font-bold bg-slate-50 text-slate-600 border-slate-100 cursor-pointer disabled:opacity-50 min-w-0">
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="w-full min-w-0">
          <div className="bg-red-50 p-12 rounded-[3rem] border border-red-100 shadow-xl flex flex-col items-center justify-center gap-6 text-center w-full min-w-0">
            <Info className="w-16 h-16 text-red-600" />
            <h3 className="text-2xl font-black text-red-900">数据获取失败</h3>
            <p className="text-red-700 text-lg leading-relaxed whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="w-full min-w-0">
          <div className="bg-white p-16 rounded-[3rem] border border-slate-100 shadow-2xl flex flex-col items-center justify-center gap-10 w-full min-w-0">
            <div className="w-16 h-16 flex items-center justify-center">
              <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
            </div>
            <div className="space-y-4 text-center w-full max-w-md">
              {LOADING_STEPS.map((s, i) => (
                <div key={i} className={`text-lg font-medium ${i === loadingStep ? "text-indigo-600 font-bold" : "text-slate-400"} transition-all`}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {results && !isLoading && (
        <div className="space-y-12 w-full min-w-0 animate-in fade-in duration-500">
          <div className="bg-indigo-950 text-white p-12 rounded-[3.5rem] shadow-2xl border border-white/10 w-full min-w-0">
            <h2 className="text-3xl font-bold mb-4">分析结果：{results.disease}</h2>
            <p className="mt-2 text-indigo-200 text-lg leading-relaxed">{results.summary}</p>
          </div>

          {/* 🚀 独立分区 1：AI 挖掘前沿文献区 */}
          <div className="space-y-6 w-full min-w-0">
            <div className="flex items-center gap-3 pl-4 border-l-4 border-amber-500">
               <h3 className="font-black text-2xl text-slate-800">AI 前沿文献提取 (2024-2026)</h3>
               <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Latest Insights</span>
            </div>
            <p className="text-slate-500 font-medium pl-4 text-sm">基于大模型对 PubMed 最新文献的扫描，反向提取核心靶点（无底层组学打分）。</p>
            
            {results.aiInsights.map((insight, i) => (
              <AIInsightCard key={i} insight={insight} />
            ))}
            
            {results.aiInsights.length === 0 && (
              <div className="p-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 w-full min-w-0">
                 <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                 <p className="text-slate-500 font-bold">智能体暂未在 2024-2026 的近期文献中获取到高频关联信息。</p>
              </div>
            )}
          </div>

          {/* 🚀 独立分区 2：OT 底层组学打分矩阵 */}
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden w-full min-w-0">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-2xl text-slate-800">底层组学已知靶点矩阵</h3>
                <p className="text-slate-500 font-medium mt-1 text-sm">自上而下：基于 Open Targets 的经典多维组学加权打分模型</p>
              </div>
            </div>
            {results.otTargets.map((t, i) => (
              <TargetRow key={i} target={t} disease={results.disease} />
            ))}
            {results.otTargets.length === 0 && (
              <div className="p-12 text-center text-slate-500 font-bold">
                 暂无对应的底层组学数据记录。
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default TargetID;