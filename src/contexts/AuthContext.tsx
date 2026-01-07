import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getUserRole, getProfile } from '@/integrations/supabase/helpers';
import type { UserRole, Profile } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  bio?: string;
  affiliation?: string;
  avatar?: string;
  createdAt: Date;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = useCallback(async (supabaseUser: SupabaseUser) => {
    try {
      const [role, profile] = await Promise.all([
        getUserRole(supabaseUser.id),
        getProfile(supabaseUser.id)
      ]);

      const authUser: AuthUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        fullName: profile?.full_name || supabaseUser.user_metadata?.full_name || 'User',
        role: role || 'student',
        bio: profile?.bio || undefined,
        affiliation: profile?.affiliation || undefined,
        avatar: profile?.avatar_url || undefined,
        createdAt: new Date(supabaseUser.created_at),
      };

      setUser(authUser);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        
        if (newSession?.user) {
          // Defer fetching additional data
          setTimeout(() => {
            loadUserData(newSession.user);
          }, 0);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      
      if (existingSession?.user) {
        loadUserData(existingSession.user);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string, role: UserRole) => {
    setIsLoading(true);

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        return { success: false, error: 'An account with this email already exists.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<AuthUser>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.fullName,
        bio: updates.bio,
        affiliation: updates.affiliation,
        avatar_url: updates.avatar,
      })
      .eq('user_id', user.id);

    if (!error) {
      setUser({ ...user, ...updates });
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (session?.user) {
      await loadUserData(session.user);
    }
  }, [session, loadUserData]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
