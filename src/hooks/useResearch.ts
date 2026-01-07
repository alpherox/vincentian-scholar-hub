import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generateAPACitation, generateMLACitation, uploadResearchFile, createNotification } from '@/integrations/supabase/helpers';
import type { Research, SearchFilters, ResearchLabel, ResearchStrand, AccessLevel } from '@/types';

export function useResearches() {
  const queryClient = useQueryClient();
  
  const { data: researches = [], isLoading, error } = useQuery({
    queryKey: ['researches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('researches')
        .select(`
          *,
          profiles!researches_author_id_fkey (
            full_name,
            affiliation
          )
        `)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(r => ({
        ...r,
        author_name: r.profiles?.full_name,
        author_affiliation: r.profiles?.affiliation,
      })) as Research[];
    },
  });

  return { researches, isLoading, error };
}

export function useResearchById(id: string | undefined) {
  return useQuery({
    queryKey: ['research', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('researches')
        .select(`
          *,
          profiles!researches_author_id_fkey (
            full_name,
            affiliation
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        author_name: data.profiles?.full_name,
        author_affiliation: data.profiles?.affiliation,
      } as Research;
    },
    enabled: !!id,
  });
}

export function useResearchesByAuthor(authorId: string | undefined) {
  return useQuery({
    queryKey: ['researches', 'author', authorId],
    queryFn: async () => {
      if (!authorId) return [];

      const { data, error } = await supabase
        .from('researches')
        .select(`
          *,
          profiles!researches_author_id_fkey (
            full_name,
            affiliation
          )
        `)
        .eq('author_id', authorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(r => ({
        ...r,
        author_name: r.profiles?.full_name,
        author_affiliation: r.profiles?.affiliation,
      })) as Research[];
    },
    enabled: !!authorId,
  });
}

export function useSearchResearches() {
  const [searchResults, setSearchResults] = useState<Research[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { user } = useAuth();

  const search = useCallback(async (filters: SearchFilters) => {
    setIsSearching(true);

    try {
      let query = supabase
        .from('researches')
        .select(`
          *,
          profiles!researches_author_id_fkey (
            full_name,
            affiliation
          )
        `)
        .eq('is_archived', false);

      // Apply filters
      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%,abstract.ilike.%${filters.query}%`);
      }

      if (filters.title) {
        query = query.ilike('title', `%${filters.title}%`);
      }

      if (filters.abstract) {
        query = query.ilike('abstract', `%${filters.abstract}%`);
      }

      if (filters.strand) {
        query = query.eq('strand', filters.strand);
      }

      if (filters.label) {
        query = query.eq('label', filters.label);
      }

      if (filters.academic_year) {
        query = query.eq('academic_year', filters.academic_year);
      }

      // Sort
      if (filters.sortBy === 'date') {
        query = query.order('created_at', { ascending: false });
      } else if (filters.sortBy === 'views') {
        query = query.order('views', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      let results = (data || []).map(r => ({
        ...r,
        author_name: r.profiles?.full_name,
        author_affiliation: r.profiles?.affiliation,
      })) as Research[];

      // Filter by author name (client-side since it's a joined field)
      if (filters.author) {
        const authorQuery = filters.author.toLowerCase();
        results = results.filter(r => 
          r.author_name?.toLowerCase().includes(authorQuery)
        );
      }

      // Filter by keywords (client-side for array field)
      if (filters.keywords) {
        const keywords = filters.keywords.toLowerCase().split(',').map(k => k.trim());
        results = results.filter(r =>
          keywords.some(kw => r.keywords.some(rk => rk.toLowerCase().includes(kw)))
        );
      }

      setSearchResults(results);

      // Save search history
      if (user && filters.query) {
        await supabase.from('search_history').insert({
          user_id: user.id,
          query: filters.query,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  return { searchResults, isSearching, search };
}

export function useCreateResearch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      abstract: string;
      keywords: string[];
      file?: File;
      academic_year?: string;
      strand: ResearchStrand;
      label: ResearchLabel;
    }) => {
      if (!user) throw new Error('Not authenticated');

      let file_url: string | undefined;
      let file_name: string | undefined;

      if (data.file) {
        file_url = await uploadResearchFile(data.file, user.id) || undefined;
        file_name = data.file.name;
      }

      const citation_apa = generateAPACitation({
        title: data.title,
        author_name: user.fullName,
        created_at: new Date().toISOString(),
        academic_year: data.academic_year,
      });

      const citation_mla = generateMLACitation({
        title: data.title,
        author_name: user.fullName,
        created_at: new Date().toISOString(),
      });

      const { data: research, error } = await supabase
        .from('researches')
        .insert({
          title: data.title,
          abstract: data.abstract,
          keywords: data.keywords,
          author_id: user.id,
          file_url,
          file_name,
          academic_year: data.academic_year,
          strand: data.strand,
          label: data.label,
          citation_apa,
          citation_mla,
        })
        .select()
        .single();

      if (error) throw error;
      return research;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researches'] });
    },
  });
}

export function useUpdateResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Research> & { id: string }) => {
      const { data, error } = await supabase
        .from('researches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['researches'] });
      queryClient.invalidateQueries({ queryKey: ['research', variables.id] });
    },
  });
}

export function useDeleteResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('researches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researches'] });
    },
  });
}

export function useIncrementViews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: current } = await supabase
        .from('researches')
        .select('views')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('researches')
        .update({ views: (current?.views || 0) + 1 })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['research', id] });
    },
  });
}
