
import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Share2, Info, Activity, Beaker, Image as ImageIcon, Milestone } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import TargetID from './pages/TargetID';
import KnowledgeGraph from './pages/KnowledgeGraph';

const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const Header = () => (
  <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-30">
    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
      <Beaker className="w-6 h-6" />
      <span>DermAI 皮肤药研平台</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100">
        <Activity className="w-4 h-4" />
        系统运行正常
      </div>
    </div>
  </header>
);

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-64 border-r border-slate-200 bg-white p-4 hidden md:flex flex-col gap-2">
            <div className="mb-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">导航菜单</div>
            <SidebarLink to="/" icon={<LayoutDashboard className="w-5 h-5" />} label="控制面板" />
            <SidebarLink to="/target-id" icon={<Search className="w-5 h-5" />} label="靶点识别" />
            <SidebarLink to="/knowledge-graph" icon={<Share2 className="w-5 h-5" />} label="皮肤知识图谱" />
            <div className="mt-auto border-t border-slate-100 pt-4">
              <SidebarLink to="/help" icon={<Info className="w-5 h-5" />} label="帮助文档" />
            </div>
          </aside>
          
          <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/target-id" element={<TargetID />} />
              <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
