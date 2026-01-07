export type UserRole = 'researcher' | 'student';

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

export interface Research {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  authorId: string;
  authorName: string;
  authorAffiliation?: string;
  fileUrl?: string;
  fileName?: string;
  views: number;
  uploadDate: Date;
  updatedAt: Date;
}

export interface SearchFilters {
  query: string;
  title?: string;
  keywords?: string;
  author?: string;
  abstract?: string;
  sortBy: 'relevance' | 'date' | 'views';
}

export interface Bookmark {
  id: string;
  userId: string;
  researchId: string;
  createdAt: Date;
}
