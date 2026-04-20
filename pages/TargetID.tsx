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
  targets: string[]; // 核心：支持多靶点
  mechanism: string;
  mentionCount: string;
  url: string;
  pmid: string;
}

export interface DiscoveryResponse { 
  disease: string; 
  summary: string; 
  otTargets: OTTargetCandidate[]; 
  aiInsights: AIInsightCandidate[];
}

// 根据你的部署环境修改此 URL (Hugging Face 请使用相对路径或完整 URL)
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:3000' : '';
const OPENTARGETS_API_URL = `${API_BASE_URL}/api/opentargets/graphql`;

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
  "CXCL10": { pathways: ["CXCR3/CXCL10通路", "炎症细胞募集"], drugs: ["芬戈莫德 (Fingolimod)"] },
  "OXGR1": { pathways: ["代谢门控血管收缩", "G蛋白偶联受体"], drugs: ["Agonist Therapy (研发中)"] },
  "MR": { pathways: ["盐皮质激素受体通路", "血管稳态"], drugs: ["Spironolactone (超说明书应用)"] }
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
  return <Loader2 className="w-6 h-6 animate-spin text-white" />;
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

    const response = await axios.post(OPENTARGETS_API_URL, { query }, { timeout: 60000 });
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

    const response = await axios.post(OPENTARGETS_API_URL, { query, variables: { ensemblId, efoId, size } }, { timeout: 30000 });
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
        <h4 className="text-xl font-bold text-slate-800 leading-snug flex items-start gap-3 pr-4">
          {insight.title}
          <a href={insight.url} target="_blank" rel="noopener noreferrer" className="mt-1 shrink-0 p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all text-slate-400">
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
            基于底层多维组学数据，该靶点的综合加权得分为 {finalScore > 0 ? finalScore.toFixed(2) : '<0.01'}。
          </p>
        </div>
        <div className="text-right shrink-0 px-4 hidden sm:block border-l border-slate-100 min-w-0">
          <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">核心加权得分</div>
          <div className="flex items-center justify-end gap-2 min-w-0">
            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${Math.min(finalScore || 0, 100)}%` }} />
            </div>
            <span className="text-sm text-slate-800">{formatScore(finalScore, true)}</span>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-300 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>
      {expanded && (
        <div className="px-6 pb-8 ml-16 animate-in slide-in-from-top-4 duration-300 w-full min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
            <div className="lg:col-span-2 space-y-6 w-full min-w-0">
              <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50 w-full min-w-0">
                <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4" /> 核心生物学多维模型 (3D Biological Model)
                </h5>
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">加权总分计算</span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-[11px] font-black text-slate-600 font-mono tracking-tighter">
                        ({formatScoreText(target.scoreBreakdown.genetics)}×0.4) + ({formatScoreText(target.scoreBreakdown.expression)}×0.4) + ({formatScoreText(target.scoreBreakdown.pathways)}×0.2)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-base text-indigo-600 font-mono">{formatScore(finalScore, true)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 w-full min-w-0">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b pb-3">
                  <BarChart3 className="w-4 h-4 text-indigo-500" /> 核心评估维度 (计入总分)
                </h5>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: 'Genetic Association', score: target.scoreBreakdown.genetics, weight: '40%', icon: <Dna className="w-5 h-5"/>, color: 'blue' },
                    { label: 'RNA Expression', score: target.scoreBreakdown.expression, weight: '40%', icon: <Layers className="w-5 h-5"/>, color: 'purple' },
                    { label: 'Affected Pathway', score: target.scoreBreakdown.pathways, weight: '20%', icon: <Activity className="w-5 h-5"/>, color: 'rose' }
                  ].map((item, idx) => (
                    <div key={idx} className={`p-5 bg-${item.color}-50/50 rounded-2xl border border-${item.color}-100/50 flex justify-between items-center`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-${item.color}-100 rounded-lg flex items-center justify-center text-${item.color}-600`}>{item.icon}</div>
                        <div className={`text-xs font-bold text-${item.color}-600 uppercase`}>{item.label} (权重: {item.weight})</div>
                      </div>
                      <div className={`text-xl text-${item.color}-600`}>{formatScore(item.score, true)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4 w-full min-w-0">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-500" /> 已有成药/在研药物
                </h5>
                <div className="flex flex-wrap gap-2">
                  {target.associatedDrugs?.length > 0 ? target.associatedDrugs.map((d, idx) => (
                    <span key={idx} className="text-[10px] px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-bold uppercase">
                      {d}
                    </span>
                  )) : <span className="text-xs text-slate-400 italic">暂未收录相关药物</span>}
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" /> 经典研究文献证据
                </h5>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {target.evidenceLinks?.map((link, idx) => (
                    <div key={idx} className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white transition-all group">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[11px] font-bold leading-snug text-slate-800 group-hover:text-indigo-700">{link.title}</span>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-500 opacity-40 group-hover:opacity-100" />
                        </a>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-slate-200 text-slate-500">{link.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
      const otData = await fetchRealTargets(term);
      const topTargets = otData.rows.slice(0, 25);

      setLoadingStep(2); 
      const aiPromise = axios.post(`${API_BASE_URL}/api/academic-insights`, { disease: term }).catch(() => ({ data: { data: [] } }));
      const [aiResponse] = await Promise.all([aiPromise]);

      setLoadingStep(3);
      const aiInsights: AIInsightCandidate[] = (aiResponse.data?.data || []).map((item: any) => ({
        title: item.title,
        pubDate: item.pub_date,
        targets: item.targets || [], // 修改点：直接适配数组
        mechanism: item.mechanism,
        mentionCount: item.mention_count || "最新",
        url: item.url,
        pmid: item.pmid || ""
      }));

      const otTargets: OTTargetCandidate[] = [];
      const conf = DISEASE_MAPPING[term] || { efo: "EFO_0000274" };

      for (const r of topTargets) {
        const sym = r.target?.approvedSymbol;
        if (!sym) continue;

        const getScore = (id: string) => r.datatypeScores?.find((s: any) => s.id === id)?.score || 0;
        const gen = Math.max(getScore('genetic_association'), getScore('somatic_mutation')) * 100;
        const exp = getScore('rna_expression') * 100;
        const pth = getScore('affected_pathway') * 100;
        
        // 核心加权计算
        const total = (gen * 0.4) + (exp * 0.4) + (pth * 0.2);
        const gwasLit = await fetchGWASLiterature(r.target.id, conf.efo);

        otTargets.push({
          geneSymbol: sym,
          uniprotId: r.target.id || "N/A",
          score: total,
          scoreBreakdown: { genetics: gen, expression: exp, clinical: getScore('known_drug')*100, pathways: pth, literature: getScore('literature')*100, animalModel: getScore('animal_model')*100 },
          pathways: r.target.pathways?.slice(0, 3).map((p: any) => p.pathway) || ["未知通路"],
          associatedDrugs: PATHWAY_DRUG_MAP[sym]?.drugs || [],
          evidenceLinks: gwasLit
        });
      }

      setResults({
        disease: term,
        summary: `✅ 分析完成。双轨情报中心：上方为 AI 实时提取的 2024-2026 前沿研究成果，下方为底层库已收录的经典组学矩阵。`,
        otTargets: otTargets.sort((a,b) => b.score - a.score),
        aiInsights: aiInsights
      });
    } catch (err: any) {
      setError(`❌ 分析失败：${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8 mt-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 tracking-tight">
          <Cpu className="w-8 h-8 text-indigo-600" />
          DermAI 靶点识别分析模块
        </h1>
        <p className="text-slate-500 font-medium">双通道检索：实时前沿文献挖掘 + 底层多维组学关联矩阵</p>
      </div>

      {/* 搜索框 */}
      <div className="bg-white p-3 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
            <input 
              type="text" 
              placeholder="请输入皮肤疾病名称 (例如: 玫瑰痤疮)..."
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-slate-50 rounded-[1.8rem] focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg text-slate-700 transition-all border border-transparent font-medium"
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading || !disease.trim()}
            className="bg-indigo-600 text-white px-12 py-5 rounded-[1.8rem] font-bold hover:bg-indigo-700 transition-all disabled:bg-slate-300 shadow-xl"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "开始智能挖掘"}
          </button>
        </form>
      </div>

      {/* 快捷检索 */}
      <div className="flex justify-between items-center px-4">
        <button onClick={() => setShowCategories(!showCategories)} className="flex items-center gap-3 text-sm font-black text-indigo-600 bg-indigo-50/50 px-6 py-2.5 rounded-2xl border border-indigo-100">
          <Grid className="w-5 h-5" /> 皮肤专科快捷库 {showCategories ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {showCategories && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DISEASE_CATEGORIES.map((cat) => (
            <div key={cat.name} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5 hover:border-indigo-300 transition-all group">
              <h3 className="text-[11px] font-black text-slate-400 group-hover:text-indigo-500 uppercase tracking-[0.2em] pb-3 border-b border-slate-50">{cat.name}</h3>
              <div className="flex flex-wrap gap-2">
                {cat.diseases.map((d) => (
                  <button key={d} onClick={() => handleSearch(d)} className="px-3 py-1.5 text-[11px] rounded-xl hover:bg-indigo-600 hover:text-white transition-all border font-bold bg-slate-50 text-slate-600 border-slate-100">
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="bg-white p-16 rounded-[3rem] border border-slate-100 shadow-2xl flex flex-col items-center justify-center gap-10">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
          <div className="space-y-4 text-center">
            {LOADING_STEPS.map((s, i) => (
              <div key={i} className={`text-lg font-medium ${i === loadingStep ? "text-indigo-600 font-bold" : "text-slate-400"}`}>{s}</div>
            ))}
          </div>
        </div>
      )}

      {/* 结果显示 */}
      {results && !isLoading && (
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl">
            <h2 className="text-3xl font-bold mb-4">分析目标：{results.disease}</h2>
            <p className="text-slate-300 text-lg leading-relaxed">{results.summary}</p>
          </div>

          {/* AI 分区 */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pl-4 border-l-4 border-amber-500">
              <h3 className="font-black text-2xl text-slate-800">AI 前沿文献动态提取 (2024-2026)</h3>
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            {results.aiInsights.map((insight, i) => (
              <AIInsightCard key={i} insight={insight} />
            ))}
          </div>

          {/* OT 分区 */}
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-2xl text-slate-800">底层组学已知靶点矩阵 (Open Targets)</h3>
              <p className="text-slate-500 text-sm mt-1">基于经典生物学关联性加权模型：Genetic(40%) + Expression(40%) + Pathway(20%)</p>
            </div>
            {results.otTargets.map((t, i) => (
              <TargetRow key={i} target={t} disease={results.disease} />
            ))}
          </div>
        </div>
      )}

      {error && <div className="p-8 bg-red-50 text-red-600 rounded-3xl border border-red-100 text-center font-bold">{error}</div>}
    </div>
  );
};

export default TargetID;
