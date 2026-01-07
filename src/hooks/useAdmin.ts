import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Research, Profile, AdminStats, UserRole, AccessLevel } from '@/types';

export function useAdminStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Get total users by role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role');

      const totalResearchers = roles?.filter(r => r.role === 'researcher').length || 0;
      const totalStudents = roles?.filter(r => r.role === 'student').length || 0;
      const totalAdmins = roles?.filter(r => r.role === 'admin').length || 0;
      const totalUsers = roles?.length || 0;

      // Get total researches and views
      const { data: researches } = await supabase
        .from('researches')
        .select('views, created_at');

      const totalResearches = researches?.length || 0;
      const totalViews = researches?.reduce((sum, r) => sum + r.views, 0) || 0;

      // Get recent uploads (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentUploads = researches?.filter(r => 
        new Date(r.created_at) > weekAgo
      ).length || 0;

      return {
        totalUsers,
        totalResearchers,
        totalStudents,
        totalResearches,
        totalViews,
        recentUploads,
      } as AdminStats;
    },
    enabled: user?.role === 'admin',
  });
}

export function useAdminResearches() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-researches'],
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(r => ({
        ...r,
        author_name: r.profiles?.full_name,
        author_affiliation: r.profiles?.affiliation,
      })) as Research[];
    },
    enabled: user?.role === 'admin',
  });
}

export function useAdminUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      return (profiles || []).map(p => ({
        ...p,
        role: roles?.find(r => r.user_id === p.user_id)?.role || 'student',
      })) as (Profile & { role: UserRole })[];
    },
    enabled: user?.role === 'admin',
  });
}

export function useUpdateResearchAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      access_level, 
      abstract_visible 
    }: { 
      id: string; 
      access_level?: AccessLevel;
      abstract_visible?: boolean;
    }) => {
      const updates: any = {};
      if (access_level !== undefined) updates.access_level = access_level;
      if (abstract_visible !== undefined) updates.abstract_visible = abstract_visible;

      const { error } = await supabase
        .from('researches')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-researches'] });
      queryClient.invalidateQueries({ queryKey: ['researches'] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      // Update existing role
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useArchiveResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('researches')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-researches'] });
      queryClient.invalidateQueries({ queryKey: ['researches'] });
    },
  });
}
