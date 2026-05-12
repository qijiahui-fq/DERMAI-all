import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, Loader2, ExternalLink, Dna, 
  BarChart3, Activity, Calendar, 
  TrendingUp, Filter, Clock, Zap, Radio
} from 'lucide-react';

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:3000' : '';

const InsightRadar: React.FC = () => {
  const [disease, setDisease] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rawInsights, setRawInsights] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'relevance'>('date');

  // --- 1. 排序逻辑 (保持原样) ---
  const sortedInsights = useMemo(() => {
    return [...rawInsights].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime();
      }
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });
  }, [rawInsights, sortBy]);

  // --- 2. 🚀 核心修改：靶点提及频次统计 (从 targets 字段获取) ---
  const targetStats = useMemo(() => {
    const stats: Record<string, number> = {};
    rawInsights.forEach(item => {
      const tArray = Array.isArray(item.targets) ? item.targets : [];
      tArray.forEach((t: any) => {
        const name = String(t || '').trim().toUpperCase();
        if (name && name !== "UNDEFINED" && name !== "N/A" && name.length > 1) {
          stats[name] = (stats[name] || 0) + 1;
        }
      });
    });
    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [rawInsights]);

  // --- 3. 年份科研态势分布 (2024 - PRESENT) ---
  const yearStats = useMemo(() => {
    const stats: Record<string, number> = {};
    const currentYear = new Date().getFullYear();
    for (let y = 2024; y <= currentYear; y++) {
      stats[y.toString()] = 0;
    }

    rawInsights.forEach(item => {
      const dateStr = String(item?.pubDate || "");
      const match = dateStr.match(/\d{4}/);
      const y = match ? match[0] : null;
      if (y && stats.hasOwnProperty(y)) {
        stats[y]++;
      }
    });
    return Object.entries(stats).map(([year, count]) => ({ year, count }));
  }, [rawInsights]);

  // --- 4. 🚀 关键修复：数据归一化映射 ---
  const handleSearch = async () => {
    if (!disease.trim()) return;
    setIsLoading(true);
    setRawInsights([]);
    try {
      const resp = await axios.post(`${API_BASE_URL}/api/academic-insights`, { disease });
      const data = resp.data?.data || [];
      
      const processed = data.map((item: any) => ({
        ...item,
        pubDate: String(item.pub_date || item.pubDate || "2024"),
        // 接住后端提取的靶点数组
        targets: Array.isArray(item.targets) ? item.targets : [],
        // 接住后端生成的机制解析，填补原本的 abstract
        mechanism: item.mechanism || "正在深度解析该文献的核心研究机制...",
        relevanceScore: Number(item.relevanceScore || 7)
      }));
      
      setRawInsights(processed);
    } catch (err) {
      console.error("雷达探测异常", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10 font-sans text-slate-900">
      {/* 状态顶栏 (样式完全保留) */}
      <div className="bg-[#0f172a] rounded-[3rem] p-10 relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 text-white">
            <Radio className="w-8 h-8 text-amber-500 animate-pulse" />
            <h1 className="text-3xl font-black tracking-tight">前沿科研情报雷达 (2024-PRESENT)</h1>
          </div>
          <div className="pt-4">
            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
              <span>2024 存量库</span>
              <span className="text-indigo-400">持续活跃</span>
              <span className="text-amber-500">2026 动态焦点</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full flex overflow-hidden">
              <div className="h-full bg-slate-600 w-1/4" />
              <div className="h-full bg-indigo-600 w-2/4" />
              <div className="h-full bg-amber-500 w-1/4 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左侧：统计面板 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl min-h-[300px]">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" /> 核心靶点提及频次
            </h3>
            <div className="space-y-4">
              {targetStats.length > 0 ? targetStats.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group cursor-default">
                  <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">{item.name}</span>
                  <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded-lg">{item.count} 篇</span>
                </div>
              )) : <p className="text-xs text-slate-400 italic py-10 text-center">待命状态...</p>}
            </div>
          </div>

          {/* 年份态势图 (样式完全保留) */}
          <div className="bg-[#0f172a] rounded-[2.5rem] p-8 text-white shadow-xl min-h-[320px] border border-slate-800">
            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-10 flex items-center gap-2">
              <Activity className="w-4 h-4" /> 文献年份科研态势
            </h3>
            <div className="flex items-end justify-between h-40 px-2 border-b border-slate-700 pb-2 gap-2">
              {yearStats.map((d, i) => {
                const maxCount = Math.max(...yearStats.map(y => y.count), 0);
                const displayMax = maxCount === 0 ? 1 : maxCount;
                const calculatedHeight = (d.count / displayMax) * 120;
                const finalHeight = d.count > 0 ? Math.max(calculatedHeight, 20) : 0;
                
                const isCurrentYear = d.year === "2026";
                const barColor = isCurrentYear ? '#fbbf24' : '#818cf8';

                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-3" style={{ height: '100%' }}>
                    <div className="text-[11px] font-black" style={{ color: barColor }}>{d.count}</div>
                    <div 
                      className="transition-all duration-700 ease-out"
                      style={{ 
                        width: '100%',
                        maxWidth: '28px',
                        height: `${finalHeight}px`,
                        backgroundColor: barColor,
                        borderRadius: '6px 6px 0 0',
                        boxShadow: d.count > 0 ? `0 0 15px ${barColor}44` : 'none'
                      }}
                    />
                    <span className={`text-[10px] font-bold mt-1 ${d.count > 0 ? 'text-slate-300' : 'text-slate-600'}`}>{d.year}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧：搜索与情报流 */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-xl flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
              <input 
                value={disease}
                onChange={e => setDisease(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="截击前沿情报 (2024 - 2026)..."
                className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl focus:outline-none font-medium text-slate-900"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSearch} disabled={isLoading} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "启动雷达"}
              </button>
            </div>
          </div>

          {/* 文献卡片列表 */}
          <div className="space-y-6">
            {sortedInsights.map((item, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 hover:shadow-xl transition-all group shadow-sm border-l-4 border-l-transparent hover:border-l-indigo-500">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md flex items-center gap-1 border border-indigo-100">
                      <Calendar className="w-3 h-3" /> {item.pubDate}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">PMID: {item.pmid}</span>
                  </div>
                  <h4 className="text-xl font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{item.title}</h4>
                  
                  {/* 🚀 修改：显示核心机制解析内容 */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-indigo-50/50">
                    <div className="flex items-center gap-2 mb-3 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> 核心机制解析
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed font-bold italic">
                      {item.mechanism}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex flex-wrap gap-2">
                      {/* 🚀 修改：这里改为显示核心靶点标签，不再是文章类型 */}
                      {(item.targets || []).map((t: string, i: number) => (
                        <div key={i} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] flex items-center gap-2 shadow-sm">
                          <Dna className="w-3 h-3 text-indigo-400" /> {t}
                        </div>
                      ))}
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-3 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightRadar;