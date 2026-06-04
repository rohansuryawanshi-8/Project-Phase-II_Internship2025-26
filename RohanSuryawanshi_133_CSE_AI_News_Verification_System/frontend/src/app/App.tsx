import { useState, useEffect } from 'react';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ContributionPanel } from './components/ContributionPanel';
import { FloatingNewspapers } from './components/FloatingNewspapers';
import { Newspaper, Search, Database } from 'lucide-react';
import { Toaster } from 'sonner';

export default function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'analyze' | 'contribute'>('analyze');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <Toaster position="top-right" theme="dark" />

      {/* Cursor Follower Light Effect */}
      <div
        className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.08), transparent 40%)`
        }}
      />

      {/* Floating Newspapers Background */}
      <FloatingNewspapers />

      {/* Main Content */}
      <div className="relative z-20">
        {/* Header */}
        <header className="pt-8 pb-6 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <Newspaper className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  AI Fake News Detector
                </h1>
                <p className="text-slate-300 mt-1 text-sm">
                  Analyze and contribute to our fake news detection database
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('analyze')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                  activeTab === 'analyze'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Search className="w-4 h-4" />
                Analyze News
              </button>
              <button
                onClick={() => setActiveTab('contribute')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                  activeTab === 'contribute'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Database className="w-4 h-4" />
                Contribute to Dataset
              </button>
            </div>
          </div>
        </header>

        {/* Content Panels */}
        <div className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'analyze' ? (
              <AnalysisPanel />
            ) : (
              <ContributionPanel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
