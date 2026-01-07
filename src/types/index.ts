export type UserRole = 'admin' | 'researcher' | 'student';

export type ResearchLabel = 'practical_research' | 'capstone' | 'thesis' | 'dissertation' | 'other';

export type ResearchStrand = 'STEM' | 'HUMSS' | 'ABM' | 'ICT' | 'GAS' | 'Other';

export type AccessLevel = 'public' | 'authenticated' | 'restricted';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  bio?: string;
  affiliation?: string;
  avatar?: string;
  createdAt: Date;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  bio?: string;
  affiliation?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Research {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  author_id: string;
  file_url?: string;
  file_name?: string;
  views: number;
  academic_year?: string;
  strand: ResearchStrand;
  label: ResearchLabel;
  access_level: AccessLevel;
  abstract_visible: boolean;
  citation_apa?: string;
  citation_mla?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  author_name?: string;
  author_affiliation?: string;
}

export interface SearchFilters {
  query: string;
  title?: string;
  keywords?: string;
  author?: string;
  abstract?: string;
  strand?: ResearchStrand | '';
  label?: ResearchLabel | '';
  academic_year?: string;
  sortBy: 'relevance' | 'date' | 'views';
}

export interface Bookmark {
  id: string;
  user_id: string;
  research_id: string;
  created_at: string;
}

export interface QAQuestion {
  id: string;
  research_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  upvotes: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_name?: string;
  user_avatar?: string;
  user_has_upvoted?: boolean;
  answers?: QAAnswer[];
}

export interface QAAnswer {
  id: string;
  question_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  upvotes: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_name?: string;
  user_avatar?: string;
  user_has_upvoted?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  created_at: string;
}

// Citation format options
export type CitationFormat = 'apa' | 'mla';

// Admin stats
export interface AdminStats {
  totalUsers: number;
  totalResearchers: number;
  totalStudents: number;
  totalResearches: number;
  totalViews: number;
  recentUploads: number;
}
