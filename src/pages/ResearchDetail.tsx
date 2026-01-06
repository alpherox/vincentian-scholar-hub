import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useResearch } from '@/contexts/ResearchContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, Calendar, Eye, Star, User, 
  Download, FileText, ExternalLink, Building 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResearchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getResearchById, isBookmarked, toggleBookmark, incrementViews } = useResearch();
  const { isAuthenticated } = useAuth();

  const research = getResearchById(id || '');
  const bookmarked = research ? isBookmarked(research.id) : false;

  // Increment views on mount
  useEffect(() => {
    if (research) {
      incrementViews(research.id);
    }
  }, [research?.id]);

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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Header */}
        <article className="animate-fade-in">
          <header className="mb-8">
            {/* Keywords */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {research.keywords.map((keyword, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="bg-accent/20 text-accent-foreground"
                >
                  {keyword}
                </Badge>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold leading-tight text-primary sm:text-3xl lg:text-4xl">
              {research.title}
            </h1>

            {/* Author Info */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link 
                to={`/author/${research.authorId}`}
                className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-2 transition-colors hover:bg-secondary"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  {research.authorName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{research.authorName}</p>
                  {research.authorAffiliation && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building className="h-3 w-3" />
                      {research.authorAffiliation}
                    </p>
                  )}
                </div>
              </Link>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(research.uploadDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {research.views.toLocaleString()} views
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              {research.fileName && (
                <Button variant="default" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
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

          {/* Abstract Section */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Abstract</h2>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                {research.abstract}
              </p>
            </div>
          </section>

          {/* PDF Viewer Placeholder */}
          {research.fileName && (
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">Full Paper</h2>
              <div className="rounded-xl border border-border bg-secondary/30 p-12 text-center">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground/50" />
                <h3 className="mt-4 font-medium">PDF Viewer</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  In production, this would embed a PDF viewer using PDF.js to display the full research paper inline.
                </p>
                <Button variant="outline" className="mt-4 gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
            </section>
          )}

          {/* Related Research Placeholder */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">Related Research</h2>
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Related papers based on keywords and content similarity would appear here.
              </p>
              <Link to="/search">
                <Button variant="outline" className="mt-4">
                  Explore More Research
                </Button>
              </Link>
            </div>
          </section>
        </article>
      </div>
    </Layout>
  );
}
