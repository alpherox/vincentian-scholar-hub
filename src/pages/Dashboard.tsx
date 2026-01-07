import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ResearchCard } from '@/components/research/ResearchCard';
import { SearchBar } from '@/components/search/SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import { useResearchesByAuthor } from '@/hooks/useResearch';
import { useBookmarks } from '@/hooks/useBookmarks';
import { 
  Upload, Search, FileText, Eye, Star, User, 
  Plus, BookOpen, Loader2
} from 'lucide-react';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const { data: myResearches = [], isLoading: loadingResearches } = useResearchesByAuthor(
    user?.role === 'researcher' ? user?.id : undefined
  );
  const { bookmarkedResearches, isLoading: loadingBookmarks } = useBookmarks();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const isResearcher = user.role === 'researcher';
  const totalViews = myResearches.reduce((sum, r) => sum + r.views, 0);

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Welcome back, {user.fullName.split(' ')[0]}!
              </h1>
              <p className="mt-1 text-muted-foreground">
                {isResearcher 
                  ? 'Manage your research papers and track their performance'
                  : 'Discover and bookmark research papers'
                }
              </p>
            </div>
            
            {isResearcher && (
              <Link to="/upload">
                <Button variant="accent" size="lg" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Upload New Research
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="mb-8">
          <SearchBar autoNavigate />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {isResearcher && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    My Uploads
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {myResearches.length} paper{myResearches.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {loadingResearches ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : myResearches.length > 0 ? (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-secondary/50 text-sm">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Title</th>
                          <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Date</th>
                          <th className="px-4 py-3 text-left font-medium">Views</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {myResearches.map((research) => (
                          <tr key={research.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3">
                              <Link 
                                to={`/research/${research.id}`}
                                className="font-medium text-primary hover:underline line-clamp-1"
                              >
                                {research.title}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                              {new Date(research.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 text-sm">
                                <Eye className="h-3.5 w-3.5" />
                                {research.views}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 font-medium">No uploads yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start sharing your research with the community
                    </p>
                    <Link to="/upload" className="mt-4 inline-block">
                      <Button variant="accent" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Your First Paper
                      </Button>
                    </Link>
                  </div>
                )}
              </section>
            )}

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-accent" />
                  Saved Research
                </h2>
                <span className="text-sm text-muted-foreground">
                  {bookmarkedResearches.length} saved
                </span>
              </div>

              {loadingBookmarks ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : bookmarkedResearches.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {bookmarkedResearches.map((research) => (
                    <ResearchCard key={research.id} research={research} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Star className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 font-medium">No bookmarks yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Save interesting research papers for later
                  </p>
                  <Link to="/search" className="mt-4 inline-block">
                    <Button variant="outline" className="gap-2">
                      <Search className="h-4 w-4" />
                      Explore Research
                    </Button>
                  </Link>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">
                  {user.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{user.fullName}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p className="text-muted-foreground">{user.email}</p>
                {user.affiliation && (
                  <p className="text-muted-foreground">{user.affiliation}</p>
                )}
              </div>

              <Button variant="outline" className="mt-4 w-full gap-2">
                <User className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>

            {isResearcher && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4">Your Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-secondary p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{myResearches.length}</div>
                    <div className="text-xs text-muted-foreground">Papers</div>
                  </div>
                  <div className="rounded-lg bg-secondary p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{totalViews}</div>
                    <div className="text-xs text-muted-foreground">Total Views</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
