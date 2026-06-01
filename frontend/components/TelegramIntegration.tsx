"use client";
import React, { useState, useEffect } from 'react';

// We no longer require the prop, it fetches its own data
export default function TelegramIntegration() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [botToken, setBotToken] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ 
    type: null, 
    message: '' 
  });

  // Fetch deployed workflows on load
  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        // Adjust this endpoint if your FastAPI route for fetching all workflows is different
        const response = await fetch('http://localhost:8000/workflows');
        if (response.ok) {
          const data = await response.json();
          setWorkflows(data);
        }
      } catch (error) {
        console.error("Failed to fetch workflows", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchWorkflows();
  }, []);

  const handleConnect = async () => {
    if (!selectedWorkflowId) {
      setStatus({ type: 'error', message: 'Please select a workflow from the list.' });
      return;
    }
    if (!botToken.trim()) {
      setStatus({ type: 'error', message: 'Please enter a valid Telegram Bot Token.' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await fetch(`http://localhost:8000/workflows/${selectedWorkflowId}/activate-telegram?bot_token=${encodeURIComponent(botToken.trim())}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to connect Telegram bot.');
      }

      setStatus({ type: 'success', message: data.message || 'Telegram linked successfully!' });
      setBotToken(''); 
      
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Network error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-sm max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-inner">
          <svg className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Telegram Bot Setup</h3>
          <p className="text-xs text-slate-500">Route mobile messages to your AI graph</p>
        </div>
      </div>

      <div className="space-y-4 mt-6">
        {/* Step 1: Workflow Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">1. Select Target Workflow</label>
          <select 
            value={selectedWorkflowId}
            onChange={(e) => setSelectedWorkflowId(e.target.value)}
            disabled={isFetching || workflows.length === 0}
            // ACTION: Added text-slate-900 for dark, crisp text
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          >
            <option value="">{isFetching ? 'Loading workflows...' : 'Choose a deployed workflow...'}</option>
            {workflows.map(wf => (
              <option key={wf.id} value={wf.id}>
                {wf.name || 'Unnamed Workflow'} ({wf.id.substring(0, 8)})
              </option>
            ))}
          </select>
          {workflows.length === 0 && !isFetching && (
            <p className="text-xs text-amber-600 mt-1">No deployed workflows found. Build one first!</p>
          )}
        </div>

        {/* Step 2: Bot Token Input */}
        <div>
          {/* ACTION: Updated Label */}
          <label className="block text-xs font-semibold text-slate-700 mb-1">2. Telegram Bot Token</label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="123456789:ABCdefGhI..."
            // ACTION: Added text-slate-900 and placeholder-slate-400
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-slate-50"
          />
        </div>
        
        {/* Submit Action */}
        <button
          onClick={handleConnect}
          disabled={isLoading || !botToken.trim() || !selectedWorkflowId}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-bold py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
          ) : (
            'Activate Webhook Bridge'
          )}
        </button>

        {status.type && (
          <div className={`p-3 rounded-md text-sm font-medium border ${
            status.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}