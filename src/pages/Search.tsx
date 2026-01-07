import { useState, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ResearchCard } from '@/components/research/ResearchCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResearches, useSearchResearches } from '@/hooks/useResearch';
import { SearchFilters } from '@/types';
import { Search, Filter, ChevronDown, ChevronUp, SortAsc, FileSearch, Loader2, X } from 'lucide-react';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { researches } = useResearches();
  const { searchResults, isSearching, search } = useSearchResearches();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    title: '',
    keywords: '',
    author: '',
    abstract: '',
    strand: '',
    label: '',
    academic_year: '',
    sortBy: 'relevance',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (filters.query.trim() || filters.title || filters.keywords || filters.author || filters.abstract) {
      await search(filters);
      setHasSearched(true);
      if (filters.query) {
        setSearchParams({ q: filters.query });
      }
    }
  };

  const handleReset = () => {
    setFilters({
      query: '',
      title: '',
      keywords: '',
      author: '',
      abstract: '',
      strand: '',
      label: '',
      academic_year: '',
      sortBy: 'relevance',
    });
    setSearchParams({});
    setHasSearched(false);
  };

  const resultsToShow = hasSearched ? searchResults : researches;

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl flex items-center gap-3">
            <Search className="h-7 w-7 text-primary" />
            Search Research
          </h1>
          <p className="mt-2 text-muted-foreground">
            Find academic papers by title, keywords, author, or abstract
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={filters.query}
                  onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                  placeholder="Search by title, keywords, author, or abstract..."
                  className="h-12 pl-12 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-8" disabled={isSearching}>
                {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="h-4 w-4" />
              Advanced Filters
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={filters.title}
                    onChange={(e) => setFilters(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Search in title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords</Label>
                  <Input
                    id="keywords"
                    value={filters.keywords}
                    onChange={(e) => setFilters(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="e.g., AI, healthcare..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={filters.author}
                    onChange={(e) => setFilters(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Author name..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strand">Strand</Label>
                  <select
                    id="strand"
                    value={filters.strand}
                    onChange={(e) => setFilters(prev => ({ ...prev, strand: e.target.value as any }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3"
                  >
                    <option value="">All Strands</option>
                    <option value="STEM">STEM</option>
                    <option value="HUMSS">HUMSS</option>
                    <option value="ABM">ABM</option>
                    <option value="ICT">ICT</option>
                    <option value="GAS">GAS</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-muted-foreground">
              {hasSearched ? (
                <>Found <span className="font-medium text-foreground">{searchResults.length}</span> result{searchResults.length !== 1 ? 's' : ''}</>
              ) : (
                <>Showing all <span className="font-medium text-foreground">{researches.length}</span> research papers</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasSearched && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
            
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4 text-muted-foreground" />
              <select
                value={filters.sortBy}
                onChange={(e) => {
                  const newFilters = { ...filters, sortBy: e.target.value as SearchFilters['sortBy'] };
                  setFilters(newFilters);
                  if (hasSearched) search(newFilters);
                }}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date (Newest)</option>
                <option value="views">Popularity</option>
              </select>
            </div>
          </div>
        </div>

        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Searching...</p>
          </div>
        ) : resultsToShow.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {resultsToShow.map((research) => (
              <ResearchCard key={research.id} research={research} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/30 bg-destructive/5 py-16">
            <FileSearch className="h-16 w-16 text-destructive/50" />
            <h3 className="mt-4 text-lg font-medium text-destructive">No results found</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground max-w-md">
              Try adjusting your filters or using different keywords.
            </p>
            <Button variant="outline" className="mt-6" onClick={handleReset}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
