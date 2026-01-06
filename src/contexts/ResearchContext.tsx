import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Research, SearchFilters } from '@/types';
import { mockResearches } from '@/data/mockData';

interface ResearchContextType {
  researches: Research[];
  bookmarks: string[];
  searchResults: Research[];
  isSearching: boolean;
  search: (filters: SearchFilters) => void;
  addResearch: (research: Omit<Research, 'id' | 'views' | 'uploadDate' | 'updatedAt'>) => Research;
  updateResearch: (id: string, updates: Partial<Research>) => void;
  deleteResearch: (id: string) => void;
  getResearchById: (id: string) => Research | undefined;
  getResearchesByAuthor: (authorId: string) => Research[];
  toggleBookmark: (researchId: string) => void;
  isBookmarked: (researchId: string) => boolean;
  incrementViews: (id: string) => void;
  getBookmarkedResearches: () => Research[];
}

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [researches, setResearches] = useState<Research[]>(mockResearches);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Research[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback((filters: SearchFilters) => {
    setIsSearching(true);
    
    // Simulate search delay
    setTimeout(() => {
      let results = [...researches];
      
      // Filter by query (searches across all fields)
      if (filters.query) {
        const query = filters.query.toLowerCase();
        results = results.filter(r =>
          r.title.toLowerCase().includes(query) ||
          r.abstract.toLowerCase().includes(query) ||
          r.keywords.some(k => k.toLowerCase().includes(query)) ||
          r.authorName.toLowerCase().includes(query)
        );
      }
      
      // Filter by specific fields
      if (filters.title) {
        results = results.filter(r => 
          r.title.toLowerCase().includes(filters.title!.toLowerCase())
        );
      }
      
      if (filters.keywords) {
        const searchKeywords = filters.keywords.toLowerCase().split(',').map(k => k.trim());
        results = results.filter(r =>
          searchKeywords.some(sk => r.keywords.some(k => k.toLowerCase().includes(sk)))
        );
      }
      
      if (filters.author) {
        results = results.filter(r =>
          r.authorName.toLowerCase().includes(filters.author!.toLowerCase())
        );
      }
      
      if (filters.abstract) {
        results = results.filter(r =>
          r.abstract.toLowerCase().includes(filters.abstract!.toLowerCase())
        );
      }
      
      // Sort results
      switch (filters.sortBy) {
        case 'date':
          results.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
          break;
        case 'views':
          results.sort((a, b) => b.views - a.views);
          break;
        case 'relevance':
        default:
          // Keep original order for relevance (could be improved with actual relevance scoring)
          break;
      }
      
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  }, [researches]);

  const addResearch = useCallback((researchData: Omit<Research, 'id' | 'views' | 'uploadDate' | 'updatedAt'>) => {
    const newResearch: Research = {
      ...researchData,
      id: Date.now().toString(),
      views: 0,
      uploadDate: new Date(),
      updatedAt: new Date(),
    };
    
    setResearches(prev => [newResearch, ...prev]);
    return newResearch;
  }, []);

  const updateResearch = useCallback((id: string, updates: Partial<Research>) => {
    setResearches(prev => prev.map(r => 
      r.id === id ? { ...r, ...updates, updatedAt: new Date() } : r
    ));
  }, []);

  const deleteResearch = useCallback((id: string) => {
    setResearches(prev => prev.filter(r => r.id !== id));
  }, []);

  const getResearchById = useCallback((id: string) => {
    return researches.find(r => r.id === id);
  }, [researches]);

  const getResearchesByAuthor = useCallback((authorId: string) => {
    return researches.filter(r => r.authorId === authorId);
  }, [researches]);

  const toggleBookmark = useCallback((researchId: string) => {
    setBookmarks(prev =>
      prev.includes(researchId)
        ? prev.filter(id => id !== researchId)
        : [...prev, researchId]
    );
  }, []);

  const isBookmarked = useCallback((researchId: string) => {
    return bookmarks.includes(researchId);
  }, [bookmarks]);

  const incrementViews = useCallback((id: string) => {
    setResearches(prev => prev.map(r =>
      r.id === id ? { ...r, views: r.views + 1 } : r
    ));
  }, []);

  const getBookmarkedResearches = useCallback(() => {
    return researches.filter(r => bookmarks.includes(r.id));
  }, [researches, bookmarks]);

  return (
    <ResearchContext.Provider value={{
      researches,
      bookmarks,
      searchResults,
      isSearching,
      search,
      addResearch,
      updateResearch,
      deleteResearch,
      getResearchById,
      getResearchesByAuthor,
      toggleBookmark,
      isBookmarked,
      incrementViews,
      getBookmarkedResearches,
    }}>
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearch() {
  const context = useContext(ResearchContext);
  if (context === undefined) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
}
