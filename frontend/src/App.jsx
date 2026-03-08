import { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, FileAudio, Loader2, FileText, ListChecks, MessageSquare, AlertCircle } from 'lucide-react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please upload a valid audio file.');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an audio file first.');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await axios.post('http://localhost:8000/upload-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResults(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to process audio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-2 border border-indigo-500/20">
            <MessageSquare className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            AI Meeting Notes <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Generator</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Upload your meeting recording and let AI instantly generate a transcript, summary, and actionable items.
          </p>
        </header>

        {/* Upload Section */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-slate-700">
          <div 
            className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-200 ${
              file ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              ref={fileInputRef}
            />
            
            {!file ? (
              <div className="text-center space-y-4 pointer-events-none">
                <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-white">Drop your audio file here</h3>
                <p className="text-sm text-slate-400">or click to browse (MP3, WAV, M4A)</p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/30">
                  <FileAudio className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-white truncate max-w-xs">{file.name}</h3>
                <p className="text-sm text-indigo-300">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <div className="pt-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
                  >
                    Choose a different file
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`
                relative group overflow-hidden flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300
                ${(!file || loading) 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_40px_-5px_theme(colors.indigo.500)] hover:-translate-y-1'
                }
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Audio...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 transition-transform group-hover:-translate-y-1" />
                  <span>Generate Notes</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Results Section */}
        {results && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Summary */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400"></div>
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">Summary</h2>
              </div>
              <p className="text-slate-300 leading-relaxed text-lg">
                {results.summary || "No summary available."}
              </p>
            </div>

            {/* Action Items */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
              <div className="flex items-center gap-3 mb-6">
                <ListChecks className="w-6 h-6 text-emerald-400" />
                <h2 className="text-2xl font-bold text-white">Action Items</h2>
              </div>
              
              {results.action_items && results.action_items.length > 0 ? (
                <ul className="space-y-4">
                  {results.action_items.map((item, index) => (
                    <li key={index} className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm mt-0.5 border border-emerald-500/30">
                        {index + 1}
                      </div>
                      <span className="text-slate-200 leading-relaxed font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic">No action items identified.</p>
              )}
            </div>

            {/* Transcript */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm relative flex flex-col max-h-[600px]">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                <MessageSquare className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-bold text-white">Full Transcript</h2>
              </div>
              
              <div className="overflow-y-auto pr-4 custom-scrollbar flex-1 text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {results.transcript || "No transcript available."}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
