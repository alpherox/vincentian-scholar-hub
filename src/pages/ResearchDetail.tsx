import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useResearchById, useIncrementViews } from '@/hooks/useResearch';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Calendar, Eye, Star, Download, FileText, ExternalLink, Building, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function ResearchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: research, isLoading } = useResearchById(id);
  const incrementViews = useIncrementViews();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isAuthenticated } = useAuth();
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null);

  const bookmarked = research ? isBookmarked(research.id) : false;

  useEffect(() => {
    if (research) {
      incrementViews.mutate(research.id);
    }
  }, [research?.id]);

  const copyCitation = (citation: string, format: string) => {
    navigator.clipboard.writeText(citation);
    setCopiedCitation(format);
    setTimeout(() => setCopiedCitation(null), 2000);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!research) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground/50" />
          <h1 className="mt-4 text-2xl font-bold">Research Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The research paper you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/search')} className="mt-6">
            Back to Search
          </Button>
        </div>
      </Layout>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <article className="animate-fade-in">
          <header className="mb-8">
            <div className="mb-4 flex flex-wrap gap-1.5">
              {research.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="bg-accent/20 text-accent-foreground">
                  {keyword}
                </Badge>
              ))}
            </div>

            <h1 className="text-2xl font-bold leading-tight text-primary sm:text-3xl lg:text-4xl">
              {research.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link 
                to={`/author/${research.author_id}`}
                className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-2 transition-colors hover:bg-secondary"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  {research.author_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-medium">{research.author_name}</p>
                  {research.author_affiliation && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building className="h-3 w-3" />
                      {research.author_affiliation}
                    </p>
                  )}
                </div>
              </Link>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(research.created_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {research.views.toLocaleString()} views
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {research.file_url && (
                <a href={research.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="default" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </a>
              )}
              
              {isAuthenticated && (
                <Button
                  variant={bookmarked ? "accent" : "outline"}
                  onClick={() => toggleBookmark(research.id)}
                  className="gap-2"
                >
                  <Star className={cn("h-4 w-4", bookmarked && "fill-current")} />
                  {bookmarked ? 'Bookmarked' : 'Bookmark'}
                </Button>
              )}
            </div>
          </header>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Abstract</h2>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                {research.abstract}
              </p>
            </div>
          </section>

          {/* Citations Section */}
          {(research.citation_apa || research.citation_mla) && (
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">Cite this Research</h2>
              <div className="space-y-4">
                {research.citation_apa && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary">APA</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCitation(research.citation_apa!, 'apa')}
                        className="gap-1"
                      >
                        {copiedCitation === 'apa' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedCitation === 'apa' ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{research.citation_apa}</p>
                  </div>
                )}
                {research.citation_mla && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary">MLA</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCitation(research.citation_mla!, 'mla')}
                        className="gap-1"
                      >
                        {copiedCitation === 'mla' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedCitation === 'mla' ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{research.citation_mla}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {research.file_url && (
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">Full Paper</h2>
              <div className="rounded-xl border border-border bg-secondary/30 p-12 text-center">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground/50" />
                <h3 className="mt-4 font-medium">PDF Viewer</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  View the full research paper using PDF.js
                </p>
                <a href={research.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="mt-4 gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                </a>
              </div>
            </section>
          )}
        </article>
      </div>
    </Layout>
  );
}
