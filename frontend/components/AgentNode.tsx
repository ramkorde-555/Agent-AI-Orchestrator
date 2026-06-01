import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

// Define the expected shape of the node's internal data payload
export type AgentNodeData = {
  name: string;
  role: string;
  model: string;
  is_entry?: boolean;
};

// UI Shell implementation leveraging standard Tailwind utility classes
export default function AgentNode({ data, selected }: NodeProps<AgentNodeData>) {
  return (
    <div 
      className={`
        min-w-[250px] bg-white rounded-xl shadow-sm border-2 transition-colors relative
        ${selected 
          ? 'border-blue-500 shadow-md' 
          : data.is_entry 
            ? 'border-emerald-500 shadow-md ring-4 ring-emerald-100' // green indicator
            : 'border-slate-200'}
      `}
    >
      {/* Absolute positioned Entry Badge */}
      {data.is_entry && (
        <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
          Entry Point
        </div>
      )}

      {/* Target Handle (Incoming connections) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-slate-400 border-2 border-white"
      />

      {/* Card Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b rounded-t-xl ${data.is_entry ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex items-center gap-2">
          {/* SVG Icon */}
          <div className={`p-1.5 rounded-lg ${data.is_entry ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-700 text-sm">{data.name || 'Unnamed Agent'}</span>
        </div>
      </div>

      {/* Card Body (Consuming Node Data) */}
      <div className="p-4 space-y-2">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Role</p>
          <p className="text-sm text-slate-600 truncate">{data.role || 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Model</p>
          <div className="inline-flex items-center px-2 py-1 mt-1 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
            {data.model || 'GPT-4o'}
          </div>
        </div>
      </div>

      {/* Source Handle (Outgoing connections) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
    </div>
  );
}