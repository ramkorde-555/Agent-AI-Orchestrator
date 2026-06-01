// components/Sidebar.tsx
import React from 'react';
import Link from 'next/link';

export default function Sidebar() {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    // Attach the hidden string payload to the drag event
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-200 flex flex-col">
      
      {/* --- TOP SECTION: Drag & Drop Node Library --- */}
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Node Library
        </h2>
      </div>
      
      <div className="p-4 flex flex-col gap-3">
        {/* The Draggable Agent Node UI */}
        <div
          className="p-3 border-2 border-slate-200 rounded-lg cursor-grab hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center gap-3"
          onDragStart={(event) => onDragStart(event, 'agent')}
          draggable // Enables native HTML5 dragging
        >
          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-700">AI Agent</span>
        </div>
        
        <p className="text-xs text-slate-400 mt-2">
          Drag and drop nodes onto the canvas to build your workflow.
        </p>
      </div>

      {/* --- BOTTOM SECTION: Global Navigation --- */}
      <div className="mt-auto p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex flex-col gap-2">
          
          {/* Back to Canvas/Home (Optional, if you need a way back!) */}
          <Link 
            href="/" 
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Canvas
          </Link>

          {/* New Integrations Link */}
          <Link 
            href="/integrations" 
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Integrations
          </Link>
          
        </div>
      </div>

    </aside>
  );
}