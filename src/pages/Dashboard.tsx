import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ResearchCard } from '@/components/research/ResearchCard';
import { SearchBar } from '@/components/search/SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import { useResearch } from '@/contexts/ResearchContext';
import { 
  Upload, Search, FileText, Eye, Star, User, 
  Edit, Trash2, Plus, BookOpen 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { researches, getResearchesByAuthor, getBookmarkedResearches, deleteResearch } = useResearch();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const isResearcher = user.role === 'researcher';
  const myResearches = isResearcher ? getResearchesByAuthor(user.id) : [];
  const bookmarkedResearches = getBookmarkedResearches();

  // Stats for researcher
  const totalViews = myResearches.reduce((sum, r) => sum + r.views, 0);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this research?')) {
      deleteResearch(id);
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
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

        {/* Quick Search */}
        <div className="mb-8">
          <SearchBar autoNavigate />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Researcher: My Uploads */}
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

                {myResearches.length > 0 ? (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-secondary/50 text-sm">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Title</th>
                          <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Date</th>
                          <th className="px-4 py-3 text-left font-medium">Views</th>
                          <th className="px-4 py-3 text-right font-medium">Actions</th>
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
                              {new Date(research.uploadDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 text-sm">
                                <Eye className="h-3.5 w-3.5" />
                                {research.views}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Link to={`/upload?edit=${research.id}`}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(research.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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

            {/* Bookmarked Research */}
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

              {bookmarkedResearches.length > 0 ? (
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
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

            {/* Stats (Researcher only) */}
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

            {/* Quick Links */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link 
                  to="/search" 
                  className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Search className="h-4 w-4 text-primary" />
                  Search Research
                </Link>
                {isResearcher && (
                  <Link 
                    to="/upload" 
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-secondary transition-colors"
                  >
                    <Upload className="h-4 w-4 text-accent" />
                    Upload Paper
                  </Link>
                )}
                <Link 
                  to={`/author/${user.id}`} 
                  className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-secondary transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  View Public Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
