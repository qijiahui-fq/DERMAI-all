import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Search, Share2, Info, Activity, 
  Beaker, Radio, FileDown, BookOpen, ShieldCheck, X 
} from 'lucide-react';

// 页面组件导入
import Dashboard from './pages/Dashboard';
import TargetID from './pages/TargetID';
import KnowledgeGraph from './pages/KnowledgeGraph';
import InsightRadar from './pages/InsightRadar';

// --- 🚀 帮助文档模态框组件 ---
const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl relative border border-slate-200 flex flex-col">
        
        {/* 关闭按钮 */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-8 p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-all z-[1001] shadow-sm group"
        >
          <X className="w-6 h-6 text-slate-600 group-hover:scale-110 transition-transform" />
        </button>

        <div className="flex-1 overflow-y-auto p-8 md:p-12">
          <div className="space-y-10">
            {/* 顶部横幅 */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-4xl font-black mb-4 flex items-center gap-4">
                  <BookOpen className="w-10 h-10 text-amber-400" /> DermAI 操作手册
                </h2>
                <p className="text-indigo-100 text-lg mb-8 max-w-2xl leading-relaxed">
                  本手册由数字化研发部发布， 涵盖2024—至今 的情报截击逻辑、靶点评分标准及图谱交互指南。
                </p>
                
                {/* 下载按钮 */}
                <a 
                  href="/DermAI_Manual.pdf" 
                  download="DermAI_操作手册_v2.pdf"
                  className="inline-flex items-center gap-3 bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-1"
                >
                  <FileDown className="w-6 h-6" /> 立即下载 PDF 完整版
                </a>
              </div>
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            </div>

            {/* 实时预览区：增加 Object + Iframe 双重保险以绕过 Edge 拦截 */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">在线预览文档</h3>
              <div className="rounded-[2.5rem] overflow-hidden border border-slate-200 h-[600px] bg-slate-50 shadow-inner relative">
                <object 
                  data="/DermAI_Manual.pdf#toolbar=0" 
                  type="application/pdf" 
                  className="w-full h-full"
                >
                  <iframe 
                    src="/DermAI_Manual.pdf#toolbar=0" 
                    className="w-full h-full border-none"
                    title="DermAI Manual Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                  {/* 最终兜底方案 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50 p-10 text-center">
                    <div className="space-y-4">
                      <p className="text-slate-500 font-medium">预览受限，建议直接下载查阅</p>
                      <a href="/DermAI_Manual.pdf" className="text-indigo-600 font-bold underline">点击此处预览文件</a>
                    </div>
                  </div>
                </object>
              </div>
            </div>

            {/* 快速解答 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <h4 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" /> 无法导出数据？
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  请检查浏览器是否拦截了弹出窗口。情报雷达导出 CSV 需要在扫描完全结束后方可触发。
                </p>
              </div>
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <h4 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" /> 数据更新频率
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  雷达情报实时调用 PubMed 最新数据， 支持2024——至今 动态年份截击。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 导航链接组件 ---
const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span className="font-bold">{label}</span>
    </Link>
  );
};

// --- App 核心组件 ---
const App: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans relative">
        
        {/* 全局模态框渲染 */}
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

        {/* Header */}
        <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 text-indigo-600 font-black text-2xl tracking-tighter">
            <Beaker className="w-8 h-8 animate-pulse" />
            <span>DermAI <span className="text-slate-300 font-light">|</span> 皮肤药研平台</span>
          </div>
          <div className="flex items-center gap-4">
            {/* 移动端帮助图标 */}
            <button 
              onClick={() => setIsHelpOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Info className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black border border-indigo-100 uppercase tracking-widest">
              <Activity className="w-4 h-4" />
              2024—至今 情报动态截击中
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-72 border-r border-slate-200 bg-white p-6 hidden md:flex flex-col gap-2 shadow-sm">
            <div className="mb-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">数字化药研菜单</div>
            <SidebarLink to="/" icon={<LayoutDashboard className="w-5 h-5" />} label="控制面板" />
            <SidebarLink to="/target-id" icon={<Search className="w-5 h-5" />} label="靶点识别" />
            <SidebarLink to="/insight-radar" icon={<Radio className="w-5 h-5" />} label="前沿情报雷达" />
            <SidebarLink to="/knowledge-graph" icon={<Share2 className="w-5 h-5" />} label="皮肤知识图谱" />
            
            <div className="mt-auto border-t border-slate-100 pt-6">
              <button 
                onClick={() => setIsHelpOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-slate-600 hover:bg-slate-100 group"
              >
                <Info className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold">帮助文档</span>
              </button>
            </div>
          </aside>
          
          <main className="flex-1 overflow-y-auto p-10 bg-[#F8FAFC]">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/target-id" element={<TargetID />} />
              <Route path="/insight-radar" element={<InsightRadar />} />
              <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
