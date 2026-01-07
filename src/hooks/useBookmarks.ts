import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Research } from '@/types';

export function useBookmarks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('bookmarks')
        .select('research_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(b => b.research_id);
    },
    enabled: !!user,
  });

  const { data: bookmarkedResearches = [] } = useQuery({
    queryKey: ['bookmarked-researches', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          research_id,
          researches (
            *,
            profiles!researches_author_id_fkey (
              full_name,
              affiliation
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      return data
        .filter(b => b.researches)
        .map(b => ({
          ...(b.researches as any),
          author_name: (b.researches as any).profiles?.full_name,
          author_affiliation: (b.researches as any).profiles?.affiliation,
        })) as Research[];
    },
    enabled: !!user,
  });

  const toggleBookmark = useMutation({
    mutationFn: async (researchId: string) => {
      if (!user) throw new Error('Not authenticated');

      const isBookmarked = bookmarks.includes(researchId);

      if (isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('research_id', researchId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            research_id: researchId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarked-researches'] });
    },
  });

  const isBookmarked = (researchId: string) => bookmarks.includes(researchId);

  return {
    bookmarks,
    bookmarkedResearches,
    isLoading,
    toggleBookmark: toggleBookmark.mutate,
    isBookmarked,
  };
}
