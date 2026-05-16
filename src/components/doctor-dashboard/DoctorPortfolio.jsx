import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Trash2, Play, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

export default function DoctorPortfolio({ doctorId, portfolio = [] }) {
  const [portfolioItems, setPortfolioItems] = useState(portfolio || []);
  const [uploading, setUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const saveToDatabase = async (items) => {
    try {
      await base44.entities.Doctor.update(doctorId, { portfolio: items });
    } catch (err) {
      console.error('Failed to save portfolio:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const newItems = [...portfolioItems];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const isVideo = file.type.startsWith('video/');
        
        const newItem = {
          id: Date.now() + Math.random(),
          url: file_url,
          type: isVideo ? 'video' : 'image',
          title: file.name.replace(/\.[^/.]+$/, ''),
          uploadedAt: new Date().toISOString(),
        };
        
        newItems.push(newItem);
      }
      setPortfolioItems(newItems);
      await saveToDatabase(newItems);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (itemId) => {
    const updated = portfolioItems.filter(item => item.id !== itemId);
    setPortfolioItems(updated);
    await saveToDatabase(updated);
  };

  const handleTitleUpdate = async (itemId, newTitle) => {
    const updated = portfolioItems.map(item =>
      item.id === itemId ? { ...item, title: newTitle } : item
    );
    setPortfolioItems(updated);
    await saveToDatabase(updated);
  };

  const handleSaveAll = async () => {
    setSaveStatus(null);
    await saveToDatabase(portfolioItems);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Showcase Your Work</h3>
          </div>
          {portfolioItems.length > 0 && (
            <div className="flex items-center gap-2">
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </div>
              )}
              <button
                onClick={handleSaveAll}
                disabled={uploading || saveStatus === 'saved'}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                Save Portfolio
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">Upload before/after photos, procedure videos, and testimonials to build client trust.</p>
        
        <label className="block w-full">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium text-foreground mb-1">
              {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG, MP4, WebM up to 100MB</p>
          </div>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Portfolio Grid */}
      {portfolioItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolioItems.map(item => (
            <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="relative w-full h-48 bg-secondary/50 flex items-center justify-center overflow-hidden group">
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video src={item.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </>
                )}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full flex items-center gap-1">
                  {item.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {item.type === 'image' ? 'Photo' : 'Video'}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleTitleUpdate(item.id, e.target.value)}
                  className="w-full px-2 py-1 border border-border rounded text-sm font-medium text-foreground bg-background"
                  placeholder="Add a title (e.g., Before & After)"
                />
                <p className="text-xs text-muted-foreground">
                  {new Date(item.uploadedAt).toLocaleDateString()}
                </p>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="w-full px-3 py-2 border border-destructive/50 text-destructive text-sm font-medium rounded hover:bg-destructive/10 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-lg">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No portfolio items yet. Start uploading to showcase your work!</p>
        </div>
      )}
    </div>
  );
}