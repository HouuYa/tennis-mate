import React, { useState } from 'react';
import { Upload, FileText, Layers, Database, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { getStoredApiKey } from '../services/geminiService';
import { useToast } from '../context/ToastContext';

type ETLStep = 'idle' | 'extracting' | 'chunking' | 'uploading' | 'done' | 'error';

interface ChunkPreview {
  rule_id: string;
  section_type: string;
  original_len: number;
  content_preview: string;
}

interface FullChunk {
  rule_id: string;
  content: string;
  section_type: string;
  original_len: number;
}

export const AdminETLPage: React.FC = () => {
  const { showToast } = useToast();
  const [step, setStep] = useState<ETLStep>('idle');
  const [language, setLanguage] = useState<'ko' | 'en'>('en');
  const [fileName, setFileName] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [chunks, setChunks] = useState<ChunkPreview[]>([]);
  const [fullChunks, setFullChunks] = useState<FullChunk[]>([]);
  const [uploadResult, setUploadResult] = useState<{ inserted: number; errors: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const callETL = async (action: string, payload: Record<string, unknown>) => {
    const apiKey = getStoredApiKey();
    if (!apiKey) throw new Error('API key not set. Configure it in Settings.');
    if (!supabaseUrl) throw new Error('Supabase URL not configured');

    const res = await fetch(`${supabaseUrl}/functions/v1/etl-tennis-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, gemini_api_key: apiKey, ...payload }),
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.pdf')) {
      showToast('Please select a PDF file', 'error');
      return;
    }

    setFileName(file.name);
    setStep('extracting');
    setErrorMsg('');
    setChunks([]);
    setFullChunks([]);
    setUploadResult(null);

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Step 1: Extract text
      const extractResult = await callETL('extract_text', {
        pdf_base64: base64,
        language,
      });

      setExtractedText(extractResult.text);
      showToast(`Extracted ${extractResult.charCount.toLocaleString()} characters`, 'success');

      // Step 2: Chunk text
      setStep('chunking');
      const chunkResult = await callETL('chunk_text', {
        text: extractResult.text,
        language,
      });

      setChunks(chunkResult.chunks);
      setFullChunks(chunkResult.full_chunks);
      showToast(`Created ${chunkResult.total} chunks`, 'success');
      setStep('idle');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
      showToast('ETL failed. See error details.', 'error');
    }
  };

  const handleUpload = async () => {
    if (fullChunks.length === 0) return;

    setStep('uploading');
    setErrorMsg('');

    try {
      const result = await callETL('process_chunks', {
        chunks: fullChunks,
        source_file: fileName,
        language,
      });

      setUploadResult(result);
      setStep('done');
      showToast(`Uploaded ${result.inserted} rules to database`, 'success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
      showToast('Upload failed. See error details.', 'error');
    }
  };

  const stepIcon = (s: ETLStep) => {
    if (s === step && step !== 'idle' && step !== 'done' && step !== 'error') {
      return <Loader size={16} className="animate-spin text-indigo-400" />;
    }
    return null;
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-indigo-300">Tennis Rules ETL</h1>
      <p className="text-sm text-slate-400">
        Upload a tennis rules PDF to extract, chunk, and store in the RAG database.
      </p>

      {/* Language Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => setLanguage('en')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            language === 'en'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLanguage('ko')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            language === 'ko'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Korean
        </button>
      </div>

      {/* Step 1: File Upload */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload size={18} className="text-indigo-400" />
          <h2 className="font-semibold text-slate-200">Step 1: Select PDF</h2>
          {stepIcon('extracting')}
        </div>
        <label className="block">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            disabled={step === 'extracting' || step === 'chunking' || step === 'uploading'}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer disabled:opacity-50"
          />
        </label>
        {fileName && (
          <p className="text-xs text-slate-500 mt-2">Selected: {fileName}</p>
        )}
      </div>

      {/* Step 2: Extracted Text Preview */}
      {extractedText && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-indigo-400" />
            <h2 className="font-semibold text-slate-200">
              Step 2: Extracted Text ({extractedText.length.toLocaleString()} chars)
            </h2>
          </div>
          <pre className="text-xs text-slate-400 max-h-48 overflow-y-auto bg-slate-900 rounded p-3 whitespace-pre-wrap">
            {extractedText.slice(0, 2000)}
            {extractedText.length > 2000 && '\n\n... (truncated)'}
          </pre>
        </div>
      )}

      {/* Step 3: Chunks Preview */}
      {chunks.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={18} className="text-indigo-400" />
            <h2 className="font-semibold text-slate-200">
              Step 3: Chunks ({chunks.length} total)
            </h2>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {chunks.map((c, i) => (
              <div key={i} className="flex items-center text-xs gap-2 py-1 border-b border-slate-700/50">
                <span className="text-slate-500 w-8 text-right">{i + 1}.</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  c.section_type === 'rule' ? 'bg-indigo-900/50 text-indigo-300' :
                  c.section_type === 'appendix' ? 'bg-emerald-900/50 text-emerald-300' :
                  c.section_type === 'sub-section' ? 'bg-amber-900/50 text-amber-300' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {c.section_type}
                </span>
                <span className="text-slate-300 flex-1 truncate">{c.rule_id}</span>
                <span className="text-slate-500">{c.original_len.toLocaleString()} chars</span>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={step === 'uploading'}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {step === 'uploading' ? (
              <>
                <Loader size={18} className="animate-spin" />
                Uploading to Database...
              </>
            ) : (
              <>
                <Database size={18} />
                Upload {chunks.length} Chunks to Database
              </>
            )}
          </button>
        </div>
      )}

      {/* Result */}
      {step === 'done' && uploadResult && (
        <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-emerald-400" />
            <h2 className="font-semibold text-emerald-300">Upload Complete</h2>
          </div>
          <p className="text-sm text-slate-300">
            Inserted: <strong className="text-emerald-300">{uploadResult.inserted}</strong> |
            Errors: <strong className={uploadResult.errors > 0 ? 'text-red-400' : 'text-slate-500'}>{uploadResult.errors}</strong>
          </p>
        </div>
      )}

      {/* Error */}
      {step === 'error' && errorMsg && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-red-400" />
            <h2 className="font-semibold text-red-300">Error</h2>
          </div>
          <p className="text-sm text-red-300 whitespace-pre-wrap">{errorMsg}</p>
        </div>
      )}
    </div>
  );
};
