import { useState, useEffect, FormEvent, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useResearch } from '@/contexts/ResearchContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, FileText, X, Check, Loader2, 
  Sparkles, AlertCircle, File 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export default function UploadPage() {
  const { user, isAuthenticated } = useAuth();
  const { addResearch } = useResearch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [abstract, setAbstract] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated or not a researcher
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    } else if (user?.role !== 'researcher') {
      toast({
        title: 'Access Denied',
        description: 'Only researchers can upload papers.',
        variant: 'destructive',
      });
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

  const simulateOCR = async () => {
    if (!file) return;
    
    setIsScanning(true);
    
    // Simulate OCR processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fill in demo data as if scanned
    setTitle('Extracted Research Title from Scanned Document');
    setKeywords('OCR, document processing, text extraction, machine learning');
    setAbstract('This abstract was automatically extracted from the uploaded document using OCR technology. The actual implementation would use a library like Tesseract.js to process the PDF and extract text content, which would then be parsed to identify the title, keywords, and abstract sections.');
    
    setIsScanning(false);
    toast({
      title: 'Scan Complete',
      description: 'Document content has been extracted. Please review and edit as needed.',
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (!keywords.trim()) {
      setError('Please enter at least one keyword.');
      return;
    }
    if (!abstract.trim()) {
      setError('Please enter an abstract.');
      return;
    }

    setIsUploading(true);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadProgress(i);
    }

    // Add the research
    const keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k);
    
    addResearch({
      title,
      abstract,
      keywords: keywordsArray,
      authorId: user!.id,
      authorName: user!.fullName,
      authorAffiliation: user!.affiliation,
      fileName: file?.name,
    });

    setIsUploading(false);
    
    toast({
      title: 'Research Uploaded!',
      description: 'Your paper has been successfully uploaded and is now searchable.',
    });

    navigate('/dashboard');
  };

  const keywordTags = keywords.split(',').map(k => k.trim()).filter(k => k);

  if (!user) return null;

  return (
    <Layout>
      <div className="container max-w-3xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl flex items-center gap-3">
            <Upload className="h-7 w-7 text-accent" />
            Upload Research
          </h1>
          <p className="mt-2 text-muted-foreground">
            Share your academic paper with the Vincentian research community
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* File Upload */}
          <div className="rounded-xl border border-border bg-card p-6">
            <Label className="text-base font-semibold mb-4 block">Research File (PDF)</Label>
            
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={cn(
                "relative rounded-xl border-2 border-dashed p-8 text-center transition-all",
                file 
                  ? "border-success bg-success/5" 
                  : "border-border hover:border-primary hover:bg-primary/5 cursor-pointer"
              )}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
                    <Check className="h-7 w-7 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="gap-1"
                    >
                      <X className="h-3 w-3" />
                      Remove
                    </Button>
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        simulateOCR();
                      }}
                      disabled={isScanning}
                      className="gap-1"
                    >
                      {isScanning ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {isScanning ? 'Scanning...' : 'Auto-Extract Text'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                    <FileText className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">
                      Drop your PDF here or <span className="text-primary">browse</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Maximum file size: 50MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-semibold">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter the title of your research paper"
                className="h-12 text-base"
                required
              />
            </div>
          </div>

          {/* Keywords */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="keywords" className="text-base font-semibold">
                Keywords <span className="text-destructive">*</span>
              </Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Enter keywords separated by commas (e.g., AI, healthcare, diagnostics)"
                required
              />
              {keywordTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {keywordTags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="bg-accent/20 text-accent-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Abstract */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="abstract" className="text-base font-semibold">
                Abstract <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="abstract"
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                placeholder="Enter the abstract of your research paper..."
                className="min-h-[200px] resize-y"
                required
              />
              <p className="text-xs text-muted-foreground">
                {abstract.length} characters
              </p>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Uploading your research...</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <p className="mt-2 text-sm text-muted-foreground">{uploadProgress}% complete</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex-1"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isUploading || isScanning}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Research
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
