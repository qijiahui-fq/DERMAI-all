import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Share2, ArrowRight, Activity, Database, Zap, ChevronRight, Info, Loader2, X, FileText, ExternalLink, Download, Milestone, Dna, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';

const data = [
  { name: '炎症性', count: 1120, color: '#3b82f6' },
  { name: '肿瘤性', count: 890, color: '#ec4899' },
  { name: '附属器', count: 760, color: '#6366f1' },
  { name: '色素性', count: 610, color: '#8b5cf6' },
  { name: '感染性', count: 480, color: '#f43f5e' },
  { name: '免疫/遗传', count: 420, color: '#f97316' },
];

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; description?: string }> = ({ title, value, icon, color, description }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-start justify-between hover:border-slate-300 transition-all group relative overflow-hidden">
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </div>
      <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
      {description && <p className="text-[9px] text-slate-400 mt-2 font-bold flex items-center gap-1"><Info className="w-3 h-3" /> {description}</p>}
    </div>
    <div className={`p-4 rounded-2xl ${color} relative z-10`}>
      {icon}
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          {/* “系统运行正常” */}
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full w-fit text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            <CheckCircle2 className="w-3 h-3" />
            系统运行正常
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">皮肤病药研智能中心</h1>
          <p className="text-slate-500 font-medium max-w-2xl">整合全球多组学数据与学术文献，加速皮肤科从靶点识别到先导化合物发现的临床前研究。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 基线描述 */}
        <StatCard title="皮肤病知识节点" value="2,150万+" description="基线版本: 2026.Q1" icon={<Database className="w-6 h-6 text-blue-600" />} color="bg-blue-50" />
        <StatCard title="皮肤候选靶点" value="3,412" description="系统定期自动校验" icon={<Activity className="w-6 h-6 text-emerald-600" />} color="bg-emerald-50" />
        <StatCard title="皮肤关联基因" value="15,800+" description="多组学数据整合" icon={<Dna className="w-6 h-6 text-amber-600" />} color="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative group">
          <h3 className="text-xl font-black text-slate-800 mb-8">各类别皮肤病靶点密度分析</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                  {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8">全球药研文献与专利指数</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{ day: '2020', val: 320 }, { day: '2021', val: 480 }, { day: '2022', val: 750 }, { day: '2023', val: 1100 }, { day: '2024', val: 1420 }, { day: '2025', val: 1850 }, { day: '2026', val: 2340 }]}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Tooltip />
                <Area type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={4} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link to="/target-id" className="group p-10 rounded-[2.5rem] bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-2xl transition-all flex flex-col justify-between h-72">
          <div className="space-y-4">
            <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl w-fit"><Search className="w-7 h-7" /></div>
            <h3 className="text-2xl font-black text-slate-800">靶点识别</h3>
            <p className="text-slate-500 text-sm font-medium">深度挖掘皮肤疾病核心靶点，采用 AI 多维打分引擎验证临床证据。</p>
          </div>
          <ArrowRight className="w-7 h-7 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-2 transition-all self-end" />
        </Link>
        <Link to="/knowledge-graph" className="group p-10 rounded-[2.5rem] bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-2xl transition-all flex flex-col justify-between h-72">
          <div className="space-y-4">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl w-fit"><Share2 className="w-7 h-7" /></div>
            <h3 className="text-2xl font-black text-slate-800">皮肤知识图谱</h3>
            <p className="text-slate-500 text-sm font-medium">可视化皮损微环境下的关键因子与蛋白信号通路</p>
          </div>
          <ArrowRight className="w-7 h-7 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all self-end" />
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;