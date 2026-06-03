import { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, FileText, Image as ImageIcon, AlertCircle, CheckCircle, Trophy, Landmark, Briefcase, Film, ExternalLink, BrainCircuit, Newspaper } from 'lucide-react';
import { toast } from 'sonner';
import { recognize } from 'tesseract.js';

const categories = [
  { id: 'sports', name: 'Sports', Icon: Trophy, color: '#3b82f6' },
  { id: 'politics', name: 'Politics', Icon: Landmark, color: '#ef4444' },
  { id: 'business', name: 'Business', Icon: Briefcase, color: '#10b981' },
  { id: 'entertainment', name: 'Entertainment', Icon: Film, color: '#f59e0b' },
  { id: 'general', name: 'General News', Icon: Newspaper, color: '#94a3b8' }
];

type EvidenceItem = {
  source: 'google_news' | 'reddit' | 'indian_express' | 'hindustan_times';
  title: string;
  url: string;
  snippet: string;
  published?: string | null;
  similarity: number;
  stance: 'supports' | 'contradicts' | 'neutral';
  stance_score: number;
};

type AnalysisResult = {
  verdict: 'true' | 'false' | 'uncertain';
  confidence: number;
  accuracy: number;
  genre: {
    id: string;
    name: string;
    confidence: number;
    matched_terms: string[];
    alternatives: string[];
  };
  summary: string;
  evidence: EvidenceItem[];
  contribution_references: {
    id: string;
    text: string;
    category: string;
    label: 'fake' | 'true';
    created_at: string;
    similarity: number;
  }[];
  model_signals: {
    name: string;
    verdict: 'true' | 'false' | 'uncertain' | 'risk';
    score: number;
    weight: number;
    explanation: string;
  }[];
  model_notes: string[];
};

export function AnalysisPanel() {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageText, setImageText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageText('');
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setOcrProgress(0);
    setResult(null);

    try {
      let textToAnalyze = textInput.trim();

      if (activeTab === 'image') {
        if (!imageFile) {
          throw new Error('Please upload a news image first.');
        }

        const ocrResult = await recognize(imageFile, 'eng', {
          logger: (message) => {
            if (message.status === 'recognizing text') {
              setOcrProgress(Math.round(message.progress * 100));
            }
          },
        });

        textToAnalyze = ocrResult.data.text.replace(/\s+/g, ' ').trim();
        if (textToAnalyze.length < 8) {
          throw new Error('Could not read enough text from this image. Try a clearer screenshot or paste the text.');
        }

        setTextInput(textToAnalyze);
        setImageText(textToAnalyze);
      }

      const response = await fetch('https://rohansuryawanshi-3d-ai-news-backend.hf.space/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToAnalyze
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail || 'Analysis request failed');
      }

      const data = await response.json() as AnalysisResult;
      setResult(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to analyze news right now');
    } finally {
      setAnalyzing(false);
      setOcrProgress(0);
    }
  };

  const isFalse = result?.verdict === 'false';
  const isTrue = result?.verdict === 'true';
  const resultTone = isFalse ? 'red' : isTrue ? 'green' : 'amber';
  const verdictCopy = isFalse
    ? 'the claim seems likely false.'
    : isTrue
      ? 'the claim seems likely true.'
      : 'the claim needs more evidence before calling it true or false.';
  const visibleModelSignals = result?.model_signals.filter((signal) =>
    [
      'SBERT semantic match model',
      'NLI stance model',
      'Fake-news BERT classifier',
      'Sentiment risk model',
    ].includes(signal.name)
  ) ?? [];
  const localDatasetSignal = result?.model_signals.find((signal) => signal.name === 'Local submitted dataset');

  const getSourceLabel = (source: EvidenceItem['source']) => {
    if (source === 'google_news') return 'Google News';
    if (source === 'indian_express') return 'Indian Express';
    if (source === 'hindustan_times') return 'Hindustan Times';
    return 'Reddit';
  };

  const formatContributionDate = (date: string) => {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return 'Saved contribution';
    return parsedDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative"
    >
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'text'
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'image'
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Image
          </button>
        </div>

        {/* AI Genre Detection */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-white font-semibold mb-3">
            <BrainCircuit className="w-4 h-4 text-cyan-300" />
            AI News Genre Detection
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.map((category) => {
              const IconComponent = category.Icon;
              const isDetected = result?.genre.id === category.id;
              return (
                <div
                  key={category.id}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    isDetected
                      ? 'bg-cyan-400/15 border-cyan-300/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <IconComponent className="w-4 h-4" style={{ color: category.color }} />
                  <span className="text-white text-sm font-medium">{category.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5">
          {activeTab === 'text' ? (
            <div>
              <label className="block">
                <span className="text-white font-semibold mb-2 block">
                  Enter News Text
                </span>
                <textarea
                  value={textInput}
                  onChange={(e) => {
                    setTextInput(e.target.value);
                    setResult(null);
                  }}
                  placeholder="Paste news article or headline here..."
                  className="w-full h-32 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </label>
            </div>
          ) : (
            <div>
              <label className="block cursor-pointer">
                <span className="text-white font-semibold mb-2 block">
                  Upload News Image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/40 hover:bg-white/5 transition-all duration-300">
                  {imageFile ? (
                    <div className="space-y-3">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                      <p className="text-white font-semibold">{imageFile.name}</p>
                      <p className="text-slate-300 text-sm">Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                      <div>
                        <p className="text-white font-semibold">Upload Image</p>
                        <p className="text-slate-300 text-sm">Click or drag and drop</p>
                      </div>
                    </div>
                  )}
                </div>
              </label>
              {imageText && (
                <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-slate-300 text-xs uppercase tracking-wide mb-2">Extracted text</p>
                  <p className="text-white text-sm line-clamp-4">{imageText}</p>
                </div>
              )}
            </div>
          )}

          {/* Analyze Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleAnalyze}
            disabled={
              analyzing ||
              (activeTab === 'text' && !textInput.trim()) ||
              (activeTab === 'image' && !imageFile)
            }
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all duration-300"
          >
            {analyzing ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                {activeTab === 'image' && ocrProgress > 0 ? `Reading image ${ocrProgress}%...` : 'Analyzing...'}
              </span>
            ) : (
              'Analyze News'
            )}
          </motion.button>

          {/* Results */}
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-5 rounded-lg border space-y-5 ${
                resultTone === 'red'
                  ? 'bg-red-500/10 border-red-500/50'
                  : resultTone === 'green'
                    ? 'bg-green-500/10 border-green-500/50'
                    : 'bg-amber-500/10 border-amber-500/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {isFalse ? (
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${isTrue ? 'text-green-400' : 'text-amber-400'}`} />
                )}
                <div className="flex-1">
                  <h3
                    className={`font-bold mb-1 ${
                      resultTone === 'red'
                        ? 'text-red-400'
                        : resultTone === 'green'
                          ? 'text-green-400'
                          : 'text-amber-400'
                    }`}
                  >
                    {isFalse ? 'Likely False' : isTrue ? 'Likely True' : 'Needs More Evidence'}
                  </h3>
                  <p className="text-white text-sm mb-2">
                    {result.summary}
                  </p>
                  <p className="text-slate-300 text-sm mb-3">
                    Based on the references and models we have, {verdictCopy}
                  </p>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full ${
                        resultTone === 'red'
                          ? 'bg-gradient-to-r from-red-500 to-orange-500'
                          : resultTone === 'green'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : 'bg-gradient-to-r from-amber-500 to-yellow-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-cyan-300" />
                    <div>
                      <h4 className="text-white font-semibold">Detected genre: {result.genre.name}</h4>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-3">Model ensemble</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleModelSignals.map((signal) => (
                    <div key={signal.name} className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h5 className="text-white font-semibold text-sm">{signal.name}</h5>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            signal.verdict === 'true'
                              ? 'bg-green-500/20 text-green-300'
                              : signal.verdict === 'false'
                                ? 'bg-red-500/20 text-red-300'
                                : signal.verdict === 'risk'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-500/20 text-slate-300'
                          }`}
                        >
                          {signal.verdict}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:col-span-2">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h5 className="text-white font-semibold text-sm">Local submitted dataset</h5>
                        <p className="text-slate-300 text-sm mt-1">
                          Checks this claim against saved user contributions in the local dataset.
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          localDatasetSignal?.verdict === 'true'
                            ? 'bg-green-500/20 text-green-300'
                            : localDatasetSignal?.verdict === 'false'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-slate-500/20 text-slate-300'
                        }`}
                      >
                        {localDatasetSignal ? localDatasetSignal.verdict : 'checked'}
                      </span>
                    </div>
                    {localDatasetSignal && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <span>score {Math.round(localDatasetSignal.score * 100)}%</span>
                        <span>weight {localDatasetSignal.weight}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      {result.contribution_references?.length ? (
                        result.contribution_references.map((item) => (
                          <div key={item.id} className="rounded-lg border border-white/10 bg-black/10 p-3">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  item.label === 'true'
                                    ? 'bg-green-500/20 text-green-300'
                                    : 'bg-red-500/20 text-red-300'
                                }`}
                              >
                                marked {item.label}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200">
                                {item.category}
                              </span>
                              <span className="text-xs text-slate-400">
                                match {Math.round(item.similarity * 100)}%
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatContributionDate(item.created_at)}
                              </span>
                            </div>
                            <p className="text-slate-300 text-sm line-clamp-2">{item.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-lg border border-white/10 bg-black/10 p-3 text-slate-300 text-sm">
                          We do not have any matching saved contribution for this claim. Reason: no local submission
                          matched the claim text closely enough.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-3">References used</h4>
                <div className="space-y-3">
                  {result.evidence.length ? (
                    result.evidence.map((item) => (
                      <a
                        key={`${item.source}-${item.url}`}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs uppercase tracking-wide text-slate-400">
                                {getSourceLabel(item.source)}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  item.stance === 'supports'
                                    ? 'bg-green-500/20 text-green-300'
                                    : item.stance === 'contradicts'
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-slate-500/20 text-slate-300'
                                }`}
                              >
                                {item.stance}
                              </span>
                              <span className="text-xs text-slate-400">
                                match {Math.round(item.similarity * 100)}%
                              </span>
                            </div>
                            <h5 className="text-white font-semibold text-sm">{item.title}</h5>
                            <p className="text-slate-300 text-sm mt-1 line-clamp-2">{item.snippet}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="text-slate-300 text-sm">No references were found for this claim.</p>
                  )}
                </div>
              </div>

            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
