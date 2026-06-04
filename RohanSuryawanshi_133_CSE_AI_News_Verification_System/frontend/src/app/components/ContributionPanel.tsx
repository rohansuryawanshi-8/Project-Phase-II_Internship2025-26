import { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, FileText, Image as ImageIcon, CheckCircle, Save, Trophy, Landmark, Briefcase, Film } from 'lucide-react';
import { toast } from 'sonner';

const categories = [
  { id: 'sports', name: 'Sports', Icon: Trophy, color: '#3b82f6' },
  { id: 'politics', name: 'Politics', Icon: Landmark, color: '#ef4444' },
  { id: 'business', name: 'Business', Icon: Briefcase, color: '#10b981' },
  { id: 'entertainment', name: 'Entertainment', Icon: Film, color: '#f59e0b' }
];

export function ContributionPanel() {
  const [contentType, setContentType] = useState<'text' | 'image'>('text');
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newsStatus, setNewsStatus] = useState<'fake' | 'true' | ''>('');
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !newsStatus) {
      toast.error('Please select category and mark news as fake or true');
      return;
    }

    if (contentType === 'text' && !textInput.trim()) {
      toast.error('Please enter news text');
      return;
    }

    if (contentType === 'image' && !imageFile) {
      toast.error('Please upload an image');
      return;
    }

    if (contentType === 'image') {
      toast.error('Image dataset saving is not wired yet. Please submit news text.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('https://rohansuryawanshi-3d-ai-news-backend.hf.space/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: contentType,
          text: textInput,
          category: selectedCategory,
          label: newsStatus
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail || 'Unable to save contribution');
      }

      const data = await response.json() as { message: string };
      toast.success(data.message || `News saved to dataset as ${newsStatus === 'fake' ? 'Fake' : 'True'}!`);

      // Reset form
      setTextInput('');
      setImageFile(null);
      setImagePreview(null);
      setSelectedCategory('');
      setNewsStatus('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save contribution');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative"
    >
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-white font-bold text-xl mb-1">Contribute to Dataset</h2>
          <p className="text-slate-300 text-sm">
            Help improve our AI by adding verified news examples
          </p>
        </div>

        {/* Content Type Selection */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setContentType('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
              contentType === 'text'
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={() => setContentType('image')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
              contentType === 'image'
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Image
          </button>
        </div>

        <div className="space-y-5">
          {/* Category Selection */}
          <div>
            <label className="block text-white font-semibold mb-2">
              News Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((category) => {
                const IconComponent = category.Icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                      selectedCategory === category.id
                        ? 'bg-blue-500/20 border-blue-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" style={{ color: category.color }} />
                    <span className="text-sm font-medium">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Input */}
          {contentType === 'text' ? (
            <div>
              <label className="block">
                <span className="text-white font-semibold mb-2 block">
                  News Content *
                </span>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter the news article or headline..."
                  className="w-full h-32 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </label>
            </div>
          ) : (
            <div>
              <label className="block cursor-pointer">
                <span className="text-white font-semibold mb-2 block">
                  Upload News Image *
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/40 hover:bg-white/5 transition-all duration-300">
                  {imagePreview ? (
                    <div className="space-y-3">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-40 mx-auto rounded-lg"
                      />
                      <p className="text-white font-semibold">{imageFile?.name}</p>
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
            </div>
          )}

          {/* News Status Selection */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Mark this news as *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNewsStatus('fake')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                  newsStatus === 'fake'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  newsStatus === 'fake' ? 'border-red-400' : 'border-slate-400'
                }`}>
                  {newsStatus === 'fake' && (
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                  )}
                </div>
                <span className="font-semibold">Fake News</span>
              </button>
              <button
                onClick={() => setNewsStatus('true')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                  newsStatus === 'true'
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  newsStatus === 'true' ? 'border-green-400' : 'border-slate-400'
                }`}>
                  {newsStatus === 'true' && (
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  )}
                </div>
                <span className="font-semibold">True News</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Saving to Dataset...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save to Dataset
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
