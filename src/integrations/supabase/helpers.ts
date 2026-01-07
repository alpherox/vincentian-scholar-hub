import { supabase } from './client';
import type { UserRole } from '@/types';

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .rpc('get_user_role', { _user_id: userId });
  
  if (error) {
    console.error('Error getting user role:', error);
    return null;
  }
  
  return data as UserRole | null;
}

export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('has_role', { _user_id: userId, _role: role });
  
  if (error) {
    console.error('Error checking role:', error);
    return false;
  }
  
  return data === true;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('Error getting profile:', error);
    return null;
  }
  
  return data;
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  bio?: string;
  affiliation?: string;
  avatar_url?: string;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }
  
  return data;
}

// Generate citations
export function generateAPACitation(research: {
  title: string;
  author_name?: string;
  created_at: string;
  academic_year?: string;
}): string {
  const date = new Date(research.created_at);
  const year = research.academic_year?.split('-')[0] || date.getFullYear();
  const authorParts = (research.author_name || 'Unknown Author').split(' ');
  const lastName = authorParts[authorParts.length - 1];
  const initials = authorParts.slice(0, -1).map(n => n[0] + '.').join(' ');
  
  return `${lastName}, ${initials} (${year}). ${research.title}. VincentiansFile Repository.`;
}

export function generateMLACitation(research: {
  title: string;
  author_name?: string;
  created_at: string;
}): string {
  const date = new Date(research.created_at);
  const authorName = research.author_name || 'Unknown Author';
  
  return `${authorName}. "${research.title}." VincentiansFile Repository, ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
}

// File upload helper
export async function uploadResearchFile(file: File, userId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('research-files')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) {
    console.error('Error uploading file:', error);
    return null;
  }
  
  const { data: urlData } = supabase.storage
    .from('research-files')
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

// Create notification
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  link?: string
) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link
    });
  
  if (error) {
    console.error('Error creating notification:', error);
  }
}
