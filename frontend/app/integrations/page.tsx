import React from 'react';
import Link from 'next/link';
import TelegramIntegration from '@/components/TelegramIntegration';

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* --- NEW: Back Navigation Button --- */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 border border-slate-200 rounded-md shadow-sm hover:shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Workspace
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8 border-b border-slate-200 pb-5">
          <h1 className="text-3xl font-bold text-slate-900">Integrations</h1>
          <p className="text-slate-500 mt-2">
            Connect your AI workflows to external platforms and messaging apps.
          </p>
        </div>

        {/* Integration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Our Telegram Component */}
          <TelegramIntegration />
          
          {/* Placeholder for future expansion */}
          <div className="p-5 bg-slate-100 border border-slate-200 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
            <div className="w-10 h-10 bg-slate-200 rounded-full mb-3"></div>
            <p className="font-medium">Slack Integration</p>
            <p className="text-xs">Coming soon...</p>
          </div>
        </div>

      </div>
    </div>
  );
}