// components/ConfigurationPanel.tsx
import React, { useEffect, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { AgentNodeData } from './AgentNode';
import { SelectedElement } from './WorkflowCanvas';

interface ConfigurationPanelProps {
  selectedElement: SelectedElement;
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onClose: () => void;
}

interface Tool {
  id: string;
  name: string;
  description: string;
}

export default function ConfigurationPanel({ 
  selectedElement, 
  nodes, 
  setNodes,
  edges,
  setEdges,
  onClose 
}: ConfigurationPanelProps) {
  
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [loadingTools, setLoadingTools] = useState<boolean>(true);

  useEffect(() => {
    if (selectedElement.type !== 'node') return; // Skip fetch if editing an edge
    
    const fetchTools = async () => {
      try {
        const response = await fetch('http://localhost:8000/tools');
        if (response.ok) {
          const data = await response.json();
          setAvailableTools(data);
        }
      } catch (error) {
        console.error("Failed to fetch tool registry:", error);
      } finally {
        setLoadingTools(false);
      }
    };
    fetchTools();
  }, [selectedElement.type]);


  // NODE MUTATION LOGIC
  const updateNodeData = (key: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedElement.id) {
          return { ...node, data: { ...node.data, [key]: value } };
        }
        return node;
      })
    );
  };

  const handleEntryToggle = (isChecked: boolean) => {
    setNodes((nds) =>
      nds.map((node) => {
        // Update the currently selected node
        if (node.id === selectedElement.id) {
          return { ...node, data: { ...node.data, is_entry: isChecked } };
        }
        // If we are turning THIS node ON, we must forcefully turn ALL OTHERS OFF
        if (isChecked) {
          return { ...node, data: { ...node.data, is_entry: false } };
        }
        return node;
      })
    );
  };

  const handleToolToggle = (toolId: string, currentTools: string[]) => {
    const newTools = currentTools.includes(toolId)
      ? currentTools.filter((t) => t !== toolId)
      : [...currentTools, toolId];
    updateNodeData('tools', newTools);
  };

  // EDGE MUTATION LOGIC
  const updateEdgeLabel = (newLabel: string) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === selectedElement.id) {
          return { ...edge, label: newLabel };
        }
        return edge;
      })
    );
  };

  // RENDER ROUTING
  if (selectedElement.type === 'edge') {
    const activeEdge = edges.find((e) => e.id === selectedElement.id);
    if (!activeEdge) return null;

    return (
      <div className="absolute top-0 right-0 w-96 h-full bg-white shadow-2xl border-l border-slate-200 z-10 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Configure Edge Route</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-md transition-colors">✕</button>
        </div>
        <div className="flex-1 p-6 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Routing Condition</label>
            <p className="text-xs text-slate-400 mb-3">
              Define the condition that triggers this path (e.g., "default", "error", "research_complete").
            </p>
            <input
              type="text"
              value={activeEdge.label as string || ''}
              onChange={(e) => updateEdgeLabel(e.target.value)}
              className="w-full px-3 py-2 text-slate-900 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., default"
            />
          </div>
        </div>
      </div>
    );
  }

  // NODE FORM RENDER
  const activeNode = nodes.find((n) => n.id === selectedElement.id);
  if (!activeNode || activeNode.type !== 'agent') return null;

  const data = activeNode.data as unknown as AgentNodeData & { system_prompt?: string; tools?: string[] };

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-white shadow-2xl border-l border-slate-200 z-10 flex flex-col animate-in slide-in-from-right duration-200">
      <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Configure Agent</h2>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-md transition-colors">✕</button>
      </div>

      {/* ENTRY POINT TOGGLE */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!data.is_entry}
              onChange={(e) => handleEntryToggle(e.target.checked)}
              className="w-4 h-4 text-emerald-600 bg-white border-emerald-300 rounded focus:ring-emerald-500"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-emerald-900">Set as Entry Point</span>
              <span className="text-xs text-emerald-700 mt-0.5">Execution will begin at this agent.</span>
            </div>
          </label>
        </div>

        

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Agent Name</label>
          <input
            type="text"
            value={data.name || ''}
            onChange={(e) => updateNodeData('name', e.target.value)}
            className="w-full px-3 py-2 text-slate-900 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Role Description</label>
          <input
            type="text"
            value={data.role || ''}
            onChange={(e) => updateNodeData('role', e.target.value)}
            className="w-full px-3 py-2 text-slate-900 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">System Prompt</label>
          <textarea
            value={data.system_prompt || ''}
            onChange={(e) => updateNodeData('system_prompt', e.target.value)}
            rows={6}
            className="w-full px-3 py-2 text-slate-900 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">LLM Engine</label>
          <select
            value={data.model || 'gpt-4o'}
            onChange={(e) => updateNodeData('model', e.target.value)}
            className="w-full px-3 py-2 text-slate-900 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
          >
            <option value="gpt-4o">OpenAI GPT-4o</option>
            <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
            <option value="gemini-2.5-flash">Google Gemini 2.5 Flash</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Assigned Tools</label>
          <div className="space-y-3 border border-slate-200 rounded-md p-4 bg-slate-50 max-h-48 overflow-y-auto">
            {loadingTools ? (
              <div className="text-sm text-slate-500 text-center py-2">Fetching registry...</div>
            ) : availableTools.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-2">No tools found.</div>
            ) : (
              availableTools.map((tool) => (
                <label key={tool.id} className="flex items-start space-x-3 cursor-pointer group">
                  <div className="flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={(data.tools || []).includes(tool.id)}
                      onChange={() => handleToolToggle(tool.id, data.tools || [])}
                      className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{tool.name}</span>
                    <span className="text-xs text-slate-500">{tool.description}</span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}