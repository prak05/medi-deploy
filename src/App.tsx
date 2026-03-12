import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Stethoscope, 
  BookOpen, 
  Calendar as CalendarIcon, 
  Plus, 
  Mic, 
  PenTool, 
  FileText, 
  History, 
  Upload, 
  MessageSquare, 
  X, 
  Maximize2, 
  Minimize2,
  ChevronRight,
  User,
  FileUp,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './types';
import type { Patient, Journal, Appointment, Document } from './types';
import { 
  generateRAGResponse, 
  transcribeImage, 
  generateDiagnosis, 
  handleGeneralCommand 
} from './services/geminiService';
import { Stage, Layer, Line } from 'react-konva';
import Markdown from 'react-markdown';

// --- Components ---

const Button = ({ className, variant = 'primary', ...props }: any) => {
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
    secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50',
    ghost: 'hover:bg-zinc-100 text-zinc-600',
    accent: 'bg-emerald-600 text-white hover:bg-emerald-700'
  };
  return (
    <button 
      className={cn('px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50', variants[variant as keyof typeof variants], className)} 
      {...props} 
    />
  );
};

const Card = ({ children, className, onClick }: any) => (
  <motion.div 
    layout
    onClick={onClick}
    className={cn('bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden', className)}
  >
    {children}
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [mode, setMode] = useState<'journal' | 'patient'>('journal');
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Assistant State
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [pRes, jRes, aRes, dRes] = await Promise.all([
      fetch('/api/patients'),
      fetch('/api/journals'),
      fetch('/api/appointments'),
      fetch('/api/documents')
    ]);
    setPatients(await pRes.json());
    setJournals(await jRes.json());
    setAppointments(await aRes.json());
    setDocuments(await dRes.json());
  };

  const handleAssistantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim()) return;
    
    const userMsg = assistantInput;
    setAssistantMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAssistantInput('');
    setIsAssistantLoading(true);

    try {
      const response = await handleGeneralCommand(userMsg);
      setAssistantMessages(prev => [...prev, { role: 'ai', text: response }]);
      
      // Simple feature routing
      const lower = userMsg.toLowerCase();
      if (lower.includes('drishti')) setActiveFeature('dr-drishti');
      if (lower.includes('doodle')) setActiveFeature('dr-doodle');
      if (lower.includes('dhvani')) setActiveFeature('dhvani-sanchar');
      if (lower.includes('calendar')) setActiveFeature('calendar');
      if (lower.includes('patient')) setMode('patient');
      if (lower.includes('journal')) setMode('journal');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAssistantLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-bottom border-zinc-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white">
            <Stethoscope size={24} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Searchy Gooper <span className="text-zinc-400 font-normal">MD</span></h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-zinc-100 p-1 rounded-xl flex gap-1">
            <button 
              onClick={() => setMode('journal')}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", mode === 'journal' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700")}
            >
              Journal Mode
            </button>
            <button 
              onClick={() => setMode('patient')}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", mode === 'patient' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700")}
            >
              Patient Mode
            </button>
          </div>
          <Button variant="secondary" className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <User size={20} />
          </Button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {mode === 'journal' ? (
            <JournalDashboard 
              key="journal" 
              setActiveFeature={setActiveFeature} 
              journals={journals}
              documents={documents}
            />
          ) : (
            <PatientDashboard 
              key="patient" 
              setActiveFeature={setActiveFeature} 
              patients={patients}
              setSelectedPatient={setSelectedPatient}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Global Widgets */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 items-end z-50">
        <AnimatePresence>
          {isAssistantOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-80 h-[450px] bg-white border border-zinc-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="font-semibold text-sm">Searchy Gooper</span>
                </div>
                <button onClick={() => setIsAssistantOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {assistantMessages.map((msg, i) => (
                  <div key={i} className={cn("max-w-[85%] p-3 rounded-2xl text-sm", msg.role === 'user' ? "bg-zinc-100 ml-auto rounded-tr-none" : "bg-emerald-50 text-emerald-900 mr-auto rounded-tl-none")}>
                    {msg.text}
                  </div>
                ))}
                {isAssistantLoading && (
                  <div className="bg-emerald-50 text-emerald-900 mr-auto p-3 rounded-2xl rounded-tl-none text-sm animate-pulse">
                    Thinking...
                  </div>
                )}
              </div>
              <form onSubmit={handleAssistantSubmit} className="p-4 border-t border-zinc-100">
                <input 
                  type="text" 
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder="Ask Searchy Gooper..."
                  className="w-full bg-zinc-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveFeature('calendar')}
            className="w-14 h-14 bg-white border border-zinc-200 rounded-2xl shadow-lg flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-all hover:-translate-y-1"
          >
            <CalendarIcon size={24} />
          </button>
          <button 
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            className="w-14 h-14 bg-zinc-900 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-zinc-800 transition-all hover:-translate-y-1"
          >
            <MessageSquare size={24} />
          </button>
        </div>
      </div>

      {/* Feature Modals */}
      <AnimatePresence>
        {activeFeature && (
          <FeatureModal 
            id={activeFeature} 
            onClose={() => setActiveFeature(null)} 
            selectedPatient={selectedPatient}
            journals={journals}
            documents={documents}
            fetchData={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Dashboard Views ---

function JournalDashboard({ setActiveFeature, journals, documents }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      <Card 
        className="md:col-span-2 h-64 bg-zinc-900 text-white border-none relative group overflow-hidden"
        onClick={() => setActiveFeature('dr-drishti')}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4">
              <Search size={24} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold">Dr. Drishti</h2>
            <p className="text-zinc-400 mt-2 max-w-md">AI-powered RAG search for all your medical documents, charts, and handwritten notes.</p>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            Launch Analysis <ChevronRight size={18} />
          </div>
        </div>
      </Card>

      <Card className="h-64 flex flex-col justify-between" onClick={() => setActiveFeature('dr-doodle')}>
        <div>
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
            <PenTool size={24} className="text-zinc-600" />
          </div>
          <h2 className="text-xl font-bold">Dr. Doodle</h2>
          <p className="text-zinc-500 mt-1 text-sm">Interactive whiteboard and digital notes for quick sketching.</p>
        </div>
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <Clock size={14} /> Last used 2h ago
        </div>
      </Card>

      <Card className="flex flex-col justify-between" onClick={() => setActiveFeature('dhvani-sanchar')}>
        <div>
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
            <Mic size={24} className="text-zinc-600" />
          </div>
          <h2 className="text-xl font-bold">Dhvani Sanchar</h2>
          <p className="text-zinc-500 mt-1 text-sm">Advanced Speech-to-Text for effortless clinical documentation.</p>
        </div>
      </Card>

      <Card className="flex flex-col justify-between" onClick={() => setActiveFeature('archive')}>
        <div>
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
            <History size={24} className="text-zinc-600" />
          </div>
          <h2 className="text-xl font-bold">Archive</h2>
          <p className="text-zinc-500 mt-1 text-sm">Manage all uploaded content, grouped and searchable.</p>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-500">{documents.length} Files</div>
        </div>
      </Card>

      <Card className="flex flex-col justify-between" onClick={() => setActiveFeature('text-gen')}>
        <div>
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
            <FileText size={24} className="text-zinc-600" />
          </div>
          <h2 className="text-xl font-bold">Text Gen</h2>
          <p className="text-zinc-500 mt-1 text-sm">Generate structured reports and graphs from typed content.</p>
        </div>
      </Card>
    </motion.div>
  );
}

function PatientDashboard({ setActiveFeature, patients, setSelectedPatient }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Patient Directory</h2>
        <Button onClick={() => setActiveFeature('new-patient')} className="flex items-center gap-2">
          <Plus size={18} /> New Patient
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map((p: Patient) => (
          <Card 
            key={p.id} 
            onClick={() => {
              setSelectedPatient(p);
              setActiveFeature('patient-details');
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{p.name}</h3>
                <p className="text-sm text-zinc-500">{p.age}y • {p.gender}</p>
              </div>
            </div>
            <div className="text-sm text-zinc-600 line-clamp-2 bg-zinc-50 p-3 rounded-xl">
              {p.history || "No history recorded."}
            </div>
            <div className="flex justify-end">
              <ChevronRight size={18} className="text-zinc-300" />
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// --- Feature Modal ---

function FeatureModal({ id, onClose, selectedPatient, journals, documents, fetchData }: any) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const renderContent = () => {
    switch (id) {
      case 'dr-drishti': return <DrDrishti documents={documents} fetchData={fetchData} />;
      case 'dr-doodle': return <DrDoodle />;
      case 'dhvani-sanchar': return <DhvaniSanchar />;
      case 'archive': return <Archive documents={documents} />;
      case 'calendar': return <CalendarWidget />;
      case 'patient-details': return <PatientDetails patient={selectedPatient} fetchData={fetchData} />;
      case 'new-patient': return <NewPatientForm onClose={onClose} fetchData={fetchData} />;
      default: return <div className="p-8 text-center text-zinc-400">Feature coming soon...</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
      />
      <motion.div 
        layoutId={`feature-${id}`}
        className={cn(
          "bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10 transition-all duration-500",
          isFullScreen ? "w-full h-full" : "w-full max-w-4xl max-h-[85vh]"
        )}
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold capitalize">{id.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </motion.div>
    </div>
  );
}

// --- Specific Features ---

function DrDrishti({ documents, fetchData }: any) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const transcription = await transcribeImage(base64);
      
      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          type: file.type,
          content: transcription
        })
      });
      fetchData();
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    const context = documents.map((d: any) => d.content).join('\n\n');
    try {
      const res = await generateRAGResponse(query, context);
      setAnswer(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-emerald-900 font-bold text-lg">Knowledge Base</h3>
          <p className="text-emerald-700 text-sm">{documents.length} documents indexed for RAG search.</p>
        </div>
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
          <div className={cn("bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-emerald-700 transition-colors", isUploading && "opacity-50")}>
            <Upload size={18} /> {isUploading ? "Processing..." : "Upload New"}
          </div>
        </label>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your documents..."
            className="w-full bg-zinc-100 border-none rounded-2xl px-6 py-4 pr-16 text-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button 
            onClick={handleSearch}
            disabled={isLoading}
            className="absolute right-3 top-3 bottom-3 bg-zinc-900 text-white px-4 rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={20} />}
          </button>
        </div>

        {answer && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-200 rounded-2xl p-6 prose prose-zinc max-w-none"
          >
            <Markdown>{answer}</Markdown>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DrDoodle() {
  const [lines, setLines] = useState<any[]>([]);
  const isDrawing = useRef(false);

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-zinc-100 flex gap-2 bg-zinc-50">
        <Button variant="secondary" onClick={() => setLines([])}>Clear Canvas</Button>
        <Button variant="secondary">Save to PDF</Button>
      </div>
      <div className="flex-1 bg-zinc-50 cursor-crosshair overflow-hidden">
        <Stage
          width={window.innerWidth}
          height={window.innerHeight}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke="#18181b"
                strokeWidth={3}
                tension={0.5}
                lineCap="round"
                globalCompositeOperation="source-over"
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

function DhvaniSanchar() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const toggleListening = () => {
    if (!isListening) {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);
        };
        recognition.start();
        setIsListening(true);
        // @ts-ignore
        window._recognition = recognition;
      }
    } else {
      // @ts-ignore
      window._recognition?.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="p-8 flex flex-col items-center justify-center h-full space-y-8">
      <div className="relative">
        <motion.div 
          animate={isListening ? { scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-emerald-500 rounded-full"
        />
        <button 
          onClick={toggleListening}
          className={cn("relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all", isListening ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200")}
        >
          <Mic size={40} />
        </button>
      </div>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold">{isListening ? "Listening..." : "Tap to start recording"}</h3>
          <p className="text-zinc-500">Your speech will be converted to text in real-time.</p>
        </div>
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 min-h-[200px] text-lg leading-relaxed">
          {transcript || <span className="text-zinc-300 italic">Transcript will appear here...</span>}
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <Button variant="secondary" onClick={() => setTranscript('')}>Reset</Button>
          <Button disabled={!transcript}>Save to Patient File</Button>
        </div>
      </div>
    </div>
  );
}

function Archive({ documents }: any) {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Document Archive</h3>
        <div className="flex gap-2">
          <Button variant="secondary" className="text-xs py-1">All</Button>
          <Button variant="ghost" className="text-xs py-1">Recent</Button>
          <Button variant="ghost" className="text-xs py-1">Patients</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc: any) => (
          <div key={doc.id} className="border border-zinc-200 rounded-2xl p-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors">
            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500">
              <FileUp size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold truncate">{doc.name}</h4>
              <p className="text-xs text-zinc-400">{new Date(doc.timestamp).toLocaleDateString()}</p>
            </div>
            <Button variant="ghost" className="p-2"><ChevronRight size={18} /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarWidget() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold">March 2026</h3>
        <div className="flex gap-2">
          <Button variant="secondary" className="p-2"><ChevronRight size={18} className="rotate-180" /></Button>
          <Button variant="secondary" className="p-2"><ChevronRight size={18} /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs font-bold text-zinc-400 uppercase">{d}</div>
        ))}
        {Array.from({ length: 31 }).map((_, i) => (
          <div key={i} className={cn("h-24 border border-zinc-100 rounded-xl p-2 hover:bg-zinc-50 transition-colors", i + 1 === 12 ? "bg-emerald-50 border-emerald-200" : "")}>
            <span className={cn("text-sm font-medium", i + 1 === 12 ? "text-emerald-600" : "text-zinc-400")}>{i + 1}</span>
            {i + 1 === 12 && (
              <div className="mt-2 space-y-1">
                <div className="text-[10px] bg-emerald-600 text-white p-1 rounded">9:00 AM - Surgery</div>
                <div className="text-[10px] bg-zinc-900 text-white p-1 rounded">2:00 PM - Patient Review</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PatientDetails({ patient, fetchData }: any) {
  const [diagnosis, setDiagnosis] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateDiagnosis = async () => {
    setIsGenerating(true);
    try {
      const res = await generateDiagnosis(patient.history);
      setDiagnosis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!patient) return null;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center text-zinc-400">
          <User size={40} />
        </div>
        <div>
          <h2 className="text-3xl font-bold">{patient.name}</h2>
          <p className="text-zinc-500">{patient.age} years old • {patient.gender}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-50 rounded-2xl p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <History size={18} /> Clinical History
            </h3>
            <p className="text-zinc-600 leading-relaxed">{patient.history || "No history available."}</p>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleGenerateDiagnosis} disabled={isGenerating} className="flex-1">
              {isGenerating ? "Generating..." : "Generate AI Diagnosis"}
            </Button>
            <Button variant="secondary" className="flex-1">Add Prescription</Button>
          </div>

          {diagnosis && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 prose prose-emerald max-w-none"
            >
              <Markdown>{diagnosis}</Markdown>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <div className="border border-zinc-200 rounded-2xl p-6">
            <h3 className="font-bold mb-4">Quick Tools</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors text-sm font-medium">
                <PenTool size={18} className="text-zinc-400" /> Dr. Doodle
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors text-sm font-medium">
                <Mic size={18} className="text-zinc-400" /> Dhvani Sanchar
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors text-sm font-medium">
                <FileUp size={18} className="text-zinc-400" /> Upload Report
              </button>
            </div>
          </div>

          <div className="border border-zinc-200 rounded-2xl p-6">
            <h3 className="font-bold mb-4">Recent Reports</h3>
            <div className="text-center py-8 text-zinc-400 text-sm italic">
              No reports uploaded yet.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewPatientForm({ onClose, fetchData }: any) {
  const [formData, setFormData] = useState({ name: '', age: '', gender: 'Male', history: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    fetchData();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
          <input 
            required
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full bg-zinc-100 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-zinc-900 outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Age</label>
          <input 
            required
            type="number" 
            value={formData.age}
            onChange={(e) => setFormData({...formData, age: e.target.value})}
            className="w-full bg-zinc-100 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-zinc-900 outline-none"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Gender</label>
        <select 
          value={formData.gender}
          onChange={(e) => setFormData({...formData, gender: e.target.value})}
          className="w-full bg-zinc-100 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-zinc-900 outline-none"
        >
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Initial History / Notes</label>
        <textarea 
          rows={4}
          value={formData.history}
          onChange={(e) => setFormData({...formData, history: e.target.value})}
          className="w-full bg-zinc-100 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-zinc-900 outline-none resize-none"
        />
      </div>
      <div className="flex gap-4 pt-4">
        <Button variant="secondary" type="button" onClick={onClose} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Create Patient Profile</Button>
      </div>
    </form>
  );
}
