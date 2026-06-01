// components/WorkflowCanvas.tsx
"use client";

import React, { useCallback, useState } from 'react';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  Background, 
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  Connection, // Imported for onConnect typing
  addEdge     // Imported to stitch the source and target together
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import AgentNode from './AgentNode';
import Sidebar from './Sidebar';
import ConfigurationPanel from './ConfigurationPanel';
import ChatSimulator from './ChatSimulator';
import TelegramIntegration from './TelegramIntegration';

const nodeTypes = {
  agent: AgentNode,
};

const generateId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

// Unified selection state type
export type SelectedElement = {
  id: string;
  type: 'node' | 'edge';
};

const CanvasArea = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [deployedWorkflowId, setDeployedWorkflowId] = useState<string | null>(null);

  // Deployment UX States
  const [isDeploying, setIsDeploying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const { screenToFlowPosition } = useReactFlow();

  // The Wrapped API Call
  const handleDeploy = useCallback(async () => {
    // 1. Validation
    const entryNode = nodes.find(n => n.data.is_entry === true);
    if (!entryNode) {
      setToast({ message: "Error: Please set an Entry Point before deploying.", type: "error" });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // 2. Map Payload
    const graphConfig = {
      agents: nodes.map(node => ({
        id: node.id,
        type: "agent",
        name: node.data.name || "Unnamed Agent",
        role: node.data.role || "",
        system_prompt: node.data.system_prompt || "",
        model: node.data.model || "gpt-4o",
        tools: node.data.tools || [],
        is_entry: node.data.is_entry || false
      })),
      edges: edges.map(edge => ({
        from: edge.source,
        to: edge.target,
        condition: edge.label || "default"
      }))
    };

    // 3. API Call with Try/Catch and Loading State
    setIsDeploying(true);
    setToast(null); // Clear previous toasts

    try {
      const response = await fetch('http://localhost:8000/workflows/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workflowName.trim() || `Workflow - ${new Date().toLocaleDateString()}`, // Auto-generated name for now
          description: "Deployed from visual canvas",
          graph_config: graphConfig
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to deploy workflow");
      }

      // Success
      setToast({ message: "Workflow Deployed Successfully!", type: "success" });
    } catch (error: any) {
      // Error
      setToast({ message: `Deployment Failed: ${error.message}`, type: "error" });
    } finally {
      setIsDeploying(false);
      // Auto-hide toast after 4 seconds
      setTimeout(() => setToast(null), 4000);
    }
  }, [nodes, edges, workflowName]);


  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: generateId('agent'),
        type,
        position,
        data: { name: 'New Agent', role: 'Unassigned role', model: 'gpt-4o', tools: [] },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedElement({ id: newNode.id, type: 'node' });
    },
    [screenToFlowPosition, setNodes]
  );

  // The Connection Handler
  const onConnect = useCallback(
    (params: Connection) => {
      // Inject the default routing label and visual animation flag
      const edgeWithDefaults = { 
        ...params, 
        label: 'default',
        animated: true, // Visually indicates flow direction
      };
      setEdges((eds) => addEdge(edgeWithDefaults, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedElement({ id: node.id, type: 'node' });
  }, []);

  // Edge Click Handler
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedElement({ id: edge.id, type: 'edge' });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedElement(null);
  }, []);

  return (
    <div className="flex w-full h-screen bg-slate-50 overflow-hidden relative">
      <Sidebar />
      <div className="flex-grow h-full relative">

        {/* The Toast Notification UI */}
      {toast && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success' ? (
             <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
             <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      <div className="flex-grow h-full relative">
        
        
        
        {/* ACTION: Top Right Controls Container */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 min-w-[220px]">
          
          {/* Custom Name Input */}
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow Name"
            className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          />
          <button 
            onClick={handleDeploy}
            disabled={isDeploying}
            className={`w-full px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 ${
              isDeploying ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isDeploying ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            {isDeploying ? 'Deploying...' : 'Deploy Workflow'}
          </button>

          <button 
            onClick={() => setIsSimulatorOpen(true)}
            className="w-full px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Chat with Agents
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect} // Bind connection logic
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick} // Bind edge click
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls />
        </ReactFlow>

        {selectedElement && (
          <ConfigurationPanel
            selectedElement={selectedElement}
            nodes={nodes}
            setNodes={setNodes}
            edges={edges}
            setEdges={setEdges}
            onClose={() => setSelectedElement(null)}
          />
        )}
        {/* Mount the Chat Simulator */}
        <ChatSimulator 
          isOpen={isSimulatorOpen} 
          onClose={() => setIsSimulatorOpen(false)} 
        />
      </div>
      </div>
    </div>
  );
};

export default function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasArea />
    </ReactFlowProvider>
  );
}