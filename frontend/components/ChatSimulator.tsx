// components/ChatSimulator.tsx
import React, { useState, useRef, useEffect } from 'react';

interface ChatSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  deployedWorkflowId: string | null;
}

// 1. UPDATED TYPE: Added 'tool' and 'sender'
type Message = {
  id: string;
  role: 'user' | 'agent' | 'tool';
  sender?: string;
  content: string;
};

type Workflow = {
  id: string;
  name: string;
  created_at: string;
};

export default function ChatSimulator({ isOpen, onClose, deployedWorkflowId }: ChatSimulatorProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'logs'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [availableWorkflows, setAvailableWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [developerLogs, setDeveloperLogs] = useState<string[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchWorkflows = async () => {
      setIsLoadingWorkflows(true);
      try {
        const response = await fetch('http://localhost:8000/workflows/');
        if (response.ok) {
          const data = await response.json();
          const sortedData = data.sort((a: Workflow, b: Workflow) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setAvailableWorkflows(sortedData);
        }
      } catch (error) {
        console.error("Failed to fetch workflows:", error);
      } finally {
        setIsLoadingWorkflows(false);
      }
    };

    fetchWorkflows();
  }, [isOpen, deployedWorkflowId]);

  const handleWorkflowChange = (newId: string) => {
    setSelectedWorkflowId(newId);
    setMessages([]);
    setSessionId(null);
    setDeveloperLogs([]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedWorkflowId) return;

    const currentSessionId = sessionId || crypto.randomUUID();
    if (!sessionId) setSessionId(currentSessionId);

    const newUserMsg: Message = { id: crypto.randomUUID(), role: 'user', content: inputMessage };
    
    // NOTE: We no longer create a blank agent message here!
    // The stream loop will dynamically create them based on the backend data.
    setMessages((prev) => [...prev, newUserMsg]);
    setInputMessage('');
    setIsTyping(true);
    setDeveloperLogs(prev => [...prev, `\n--- [NEW INVOCATION: ${new Date().toLocaleTimeString()}] ---`]);

    try {
      const response = await fetch(`http://localhost:8000/sessions/${currentSessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: selectedWorkflowId,
          message: newUserMsg.content
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Backend Error ${response.status}: ${errorData}`);
      }
      if (!response.body) {
        throw new Error('No readable stream returned from backend.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              
              // 1. Instantly write to the Developer Logs
              setDeveloperLogs(prev => [...prev, `[${data.event}] -> ${data.name || data.sender || 'System'}`]);

              // 2. UPDATED UI STREAMING LOGIC: Handle multi-agent & tools dynamically
              if (data.event === 'on_chat_model_stream' || data.event === 'on_tool_end') {
                const chunkText = data.chunk || ''; // Fallback just in case chunk is empty
                
                setMessages((prev) => {
                  if (prev.length === 0) return prev; // Safety check
                  const lastMsg = prev[prev.length - 1];

                  // If the sender is the same, perfectly clone the last message and append text
                  if (lastMsg.role !== 'user' && lastMsg.sender === data.sender) {
                    return [
                      ...prev.slice(0, -1), // Keep all previous messages untouched
                      { ...lastMsg, content: lastMsg.content + chunkText } // Create a NEW object for the updated text
                    ];
                  } 
                  // If the sender changed, push a brand new bubble to the array
                  else {
                    return [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        role: data.type || 'agent',
                        sender: data.sender,
                        content: chunkText,
                      }
                    ];
                  }
                });
              }

              // Metrics
              if (data.event === 'on_chain_end' && data.metrics) {
                const { total_tokens, cost } = data.metrics;
                setTotalTokens(prev => prev + total_tokens);
                setTotalCost(prev => prev + cost);
              }
              
            } catch (e) {
              console.error("Stream parse error", e);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setDeveloperLogs(prev => [...prev, `[ERROR] Execution stream broken.`]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 w-[500px] h-full bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
      
      <div className="flex flex-col border-b border-slate-200 bg-slate-50">
        <div className="flex justify-between items-center p-4 pb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${selectedWorkflowId ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <h2 className="text-md font-bold text-slate-800">Workflow Simulator</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex px-4 gap-4">
          <button onClick={() => setActiveTab('chat')} className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'chat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Chat View</button>
          <button onClick={() => setActiveTab('logs')} className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Developer Logs</button>
        </div>
      </div>

      <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Active Engine</span>
        {isLoadingWorkflows ? (
          <span className="text-xs text-slate-500">Loading database...</span>
        ) : (
          <select
            value={selectedWorkflowId}
            onChange={(e) => handleWorkflowChange(e.target.value)}
            className="text-sm bg-white border border-slate-300 text-slate-800 rounded-md py-1 pl-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate max-w-[250px]"
          >
            <option value="" disabled>Select a workflow...</option>
            {availableWorkflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({new Date(w.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        )}
      </div>

      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
               <div className="flex justify-start">
                 <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-slate-200 shadow-sm text-sm text-slate-800">
                   {selectedWorkflowId 
                     ? "Engine connected and memory cleared. How can I assist you today?" 
                     : "Please select a workflow from the database to begin."}
                 </div>
               </div>
            )}
            
            {/* 3. UPDATED RENDERING LOGIC: Different styles based on role */}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                
                {msg.role === 'user' ? (
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm bg-blue-600 text-white">
                    {msg.content}
                  </div>
                ) : (
                  <div className={`w-full max-w-sm rounded-xl border shadow-sm p-4 ${
                    msg.role === 'tool' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'
                  }`}>
                    {/* Dynamic Sender Label */}
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        msg.role === 'tool' ? 'text-amber-600' : 'text-blue-600'
                      }`}>
                        {msg.role === 'tool' ? '⚙️ Tool Executed: ' : '🤖 '}
                        {msg.sender?.replace('agent_', 'Agent ') || 'System'}
                      </span>
                    </div>
                    {/* Text Content */}
                    <div className={`text-sm whitespace-pre-wrap ${
                      msg.role === 'tool' ? 'font-mono text-slate-600' : 'text-slate-800'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                )}

              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-slate-200 shadow-sm flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={!selectedWorkflowId || isTyping}
                placeholder={selectedWorkflowId ? "Type your message..." : "Select an engine to chat..."}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-full text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!selectedWorkflowId || isTyping || !inputMessage.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-full transition-colors flex items-center justify-center w-10 h-10 shrink-0"
              >
                <svg className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="flex-1 flex flex-col bg-slate-900 font-mono text-xs overflow-hidden">
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-slate-400 mb-2">SYSTEM: Engine [{selectedWorkflowId || 'NONE'}] mounted.</div>
            <div className="text-emerald-400 mb-2">[INFO] Ready for execution. Listening for payloads.</div>
            
            <div className="mt-4 border-t border-slate-800 pt-4 space-y-1">
              {developerLogs.map((log, index) => (
                <div key={index} className={`${
                  log.includes('on_chat_model_stream') ? 'text-slate-500' : 
                  log.includes('error') ? 'text-red-400' : 'text-emerald-300'
                }`}>
                  {log}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 bg-slate-950 p-3 flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Session Telemetry</span>
            </div>
            <div className="flex gap-3">
              <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-200 font-bold">
                {totalTokens.toLocaleString()} tokens
              </span>
              <span className="bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-800/50">
                ${totalCost.toFixed(5)}
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}