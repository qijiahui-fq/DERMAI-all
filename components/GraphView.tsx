import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Node, Link } from '../types';
import { Loader2, Info } from 'lucide-react';

interface GraphViewProps {
  data: { nodes: Node[]; links: Link[] };
  loading?: boolean; // 新增加载状态属性
}

const COLORS: Record<string, string> = {
  'disease': '#ef4444', // Red
  'gene': '#3b82f6',    // Blue
  'drug': '#10b981',    // Green
  'pathway': '#f59e0b', // Amber
  'protein': '#8b5cf6', // Purple
  'default': '#94a3b8'
};

const LABEL_MAP: Record<string, string> = {
  'disease': '皮肤疾病',
  'gene': '关键基因',
  'drug': '皮科药物',
  'pathway': '皮肤通路',
  'protein': '表皮蛋白',
};

const GraphView: React.FC<GraphViewProps> = ({ data, loading = false }) => {
  // 加载状态
  if (loading) {
    return (
      <div className="w-full h-[600px] border border-slate-200 rounded-[2rem] overflow-hidden bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium">正在重构皮肤生物网络...</p>
      </div>
    );
  }

  // 空数据状态
  if (!data.nodes.length) {
    return (
      <div className="w-full h-[600px] border border-slate-200 rounded-[2rem] overflow-hidden bg-white flex flex-col items-center justify-center text-center p-8">
        <Info className="w-8 h-8 text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium mb-2">暂无图谱数据</p>
        <p className="text-slate-400 text-sm">请先搜索靶点/疾病生成关联图谱</p>
      </div>
    );
  }

  // 正常渲染图谱
  return (
    <div className="w-full h-[600px] border border-slate-200 rounded-[2rem] overflow-hidden bg-white relative">
      <ForceGraph2D
        graphData={data}
        width={800}
        height={600}
        nodeRelSize={0}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const r = 16 / globalScale;
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.1)';
          ctx.shadowBlur = 4 / globalScale;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI, false);
          ctx.fillStyle = COLORS[String((node as Node).type).toLowerCase()] || COLORS['default'];
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3 / globalScale;
          ctx.stroke();
          ctx.restore();

          // text
          const label = (node as Node).name;
          const fontSize = 11 / globalScale;
          ctx.font = `600 ${fontSize}px Sans-Serif`;
          ctx.fillStyle = '#334155';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, node.x!, node.y! + r + 4 / globalScale);
        }}
        linkColor={() => '#cbd5e1'}
        linkWidth={2}
        linkDirectionalArrowLength={0}
        onNodeDragEnd={(node) => {
          (node as any).fx = (node as any).x;
          (node as any).fy = (node as any).y;
        }}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
      <div className="absolute top-6 right-6 flex flex-col gap-3 p-5 bg-white/90 backdrop-blur shadow-xl border border-slate-100 rounded-3xl">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">实体图例</h4>
        {Object.entries(LABEL_MAP).map(([key, label]) => (
          <div key={key} className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full shadow-inner" style={{ backgroundColor: COLORS[key] }} />
            <span className="text-xs font-bold text-slate-600">{label}</span>
          </div>
        ))}
      </div>
      {/* 图谱统计信息 */}
      <div className="absolute bottom-6 left-6 p-3 bg-white/90 backdrop-blur shadow-md border border-slate-100 rounded-xl">
        <span className="text-xs font-bold text-slate-600">
          节点数: {data.nodes.length} | 关系数: {data.links.length}
        </span>
      </div>
    </div>
  );
};

export default GraphView;