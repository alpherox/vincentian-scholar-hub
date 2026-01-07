import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateResearch } from '@/hooks/useResearch';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromPDF, extractTextFromImage } from '@/lib/ocr';
import { Upload, FileText, X, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { ResearchLabel, ResearchStrand } from '@/types';

export default function UploadPage() {
  const { user, isAuthenticated } = useAuth();
  const createResearch = useCreateResearch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [abstract, setAbstract] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [strand, setStrand] = useState<ResearchStrand>('Other');
  const [label, setLabel] = useState<ResearchLabel>('other');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    } else if (user?.role !== 'researcher' && user?.role !== 'admin') {
      toast({ title: 'Access Denied', description: 'Only researchers can upload papers.', variant: 'destructive' });
      navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB.');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        return;
      }
      if (droppedFile.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB.');
        return;
      }
      setFile(droppedFile);
      setError('');
    }
  };

  const runOCR = async () => {
    if (!file) return;
    
    setIsScanning(true);
    setOcrProgress(0);
    
    try {
      const result = await extractTextFromPDF(file, setOcrProgress);
      setTitle(result.title);
      setKeywords(result.keywords.join(', '));
      setAbstract(result.abstract);
      
      toast({
        title: 'Scan Complete',
        description: 'Document content has been extracted. Please review and edit as needed.',
      });
    } catch (err) {
      console.error('OCR Error:', err);
      toast({
        title: 'OCR Failed',
        description: 'Could not extract text. Please enter details manually.',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Please enter a title.'); return; }
    if (!keywords.trim()) { setError('Please enter at least one keyword.'); return; }
    if (!abstract.trim()) { setError('Please enter an abstract.'); return; }

    try {
      await createResearch.mutateAsync({
        title,
        abstract,
        keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
        file: file || undefined,
        academic_year: academicYear || undefined,
        strand,
        label,
      });

      toast({ title: 'Research Uploaded!', description: 'Your paper has been successfully uploaded.' });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to upload research.');
    }
  };

  const keywordTags = keywords.split(',').map(k => k.trim()).filter(k => k);

  if (!user) return null;

  return (
    <Layout>
      <div className="container max-w-3xl py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl flex items-center gap-3">
            <Upload className="h-7 w-7 text-accent" />
            Upload Research
          </h1>
          <p className="mt-2 text-muted-foreground">Share your academic paper with the community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-6">
            <Label className="text-base font-semibold mb-4 block">Research File (PDF)</Label>
            
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={cn(
                "relative rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer",
                file ? "border-green-500 bg-green-500/5" : "border-border hover:border-primary hover:bg-primary/5"
              )}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" />
              
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <Check className="h-10 w-10 text-green-500" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                    <Button type="button" variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); runOCR(); }} disabled={isScanning}>
                      {isScanning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      {isScanning ? 'Scanning...' : 'Auto-Extract Text'}
                    </Button>
                  </div>
                  {isScanning && <Progress value={ocrProgress} className="w-full mt-2" />}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p>Drop your PDF here or <span className="text-primary">browse</span></p>
                  <p className="text-sm text-muted-foreground">Maximum file size: 50MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Research paper title" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="keywords">Keywords *</Label>
              <Input id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Comma-separated keywords" className="mt-1" />
              {keywordTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {keywordTags.map((tag, i) => <Badge key={i} variant="secondary" className="bg-accent/20">{tag}</Badge>)}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="abstract">Abstract *</Label>
              <Textarea id="abstract" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="Research abstract..." className="mt-1 min-h-[150px]" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="year">Academic Year</Label>
              <Input id="year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g., 2024-2025" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="strand">Strand</Label>
              <select id="strand" value={strand} onChange={(e) => setStrand(e.target.value as ResearchStrand)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3">
                <option value="Other">Other</option>
                <option value="STEM">STEM</option>
                <option value="HUMSS">HUMSS</option>
                <option value="ABM">ABM</option>
                <option value="ICT">ICT</option>
                <option value="GAS">GAS</option>
              </select>
            </div>
            <div>
              <Label htmlFor="label">Research Type</Label>
              <select id="label" value={label} onChange={(e) => setLabel(e.target.value as ResearchLabel)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3">
                <option value="other">Other</option>
                <option value="practical_research">Practical Research</option>
                <option value="capstone">Capstone</option>
                <option value="thesis">Thesis</option>
                <option value="dissertation">Dissertation</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={createResearch.isPending}>
              {createResearch.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Research
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
