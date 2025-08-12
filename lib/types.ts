export interface PostMetadata {
  language: string;
  category: 'main' | 'show';
  spellingScore: number;
  spellingIssues: string[];
  optimizedTitle: string;
  optimizedDescription: string;
  originalTitle: string;
  originalDescription: string;
  topics: string[];
  spamScore: number;
  spamIssues: string[];
  safetyScore: number;
  safetyIssues: string[];
  // New enhanced fields
  readingLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  readingTime: number; // in minutes
  titleTranslations: {
    [localeCode: string]: string;
  };
  descriptionTranslations: {
    [localeCode: string]: string;
  };
  qualityScore: number; // 0-100
  qualityIssues: string[];
}

export interface PostSubmissionData {
  title: string;
  url?: string;
  description?: string;
  company?: string;
  location?: string;
  salary?: string;
  type: 'link' | 'show' | 'job';
}

export interface EnhancedPostData extends PostSubmissionData {
  metadata: PostMetadata;
}

export interface PostDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  description: string;
  link?: string;
  userId: string;
  userName: string;
  count: number;
  countUp: number;
  countDown: number;
  type: 'link' | 'show' | 'job';
  enhanced: boolean;
  company?: string;
  location?: string;
  salary?: string;
  // Metadata fields (populated when enhanced = true)
  language?: string;
  category?: 'main' | 'show';
  spellingScore?: number;
  spellingIssues?: string[];
  optimizedTitle?: string;
  optimizedDescription?: string;
  originalTitle?: string;
  originalDescription?: string;
  topics?: string[];
  spamScore?: number;
  spamIssues?: string[];
  safetyScore?: number;
  safetyIssues?: string[];
  readingLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  readingTime?: number;
  tldr?: string;
  titleTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  qualityScore?: number;
  qualityIssues?: string[];
}

export interface VoteDocument {
  $id: string
  $createdAt: string
  $updatedAt: string
  userId: string
  resourceId: string
  resourceType: 'post' | 'comment'
  count: number
}

export interface VoteRequest {
  resourceId: string
  resourceType: 'post' | 'comment'
  voteType: 'up' | 'down'
}

export interface VoteState {
  currentVote: 'up' | 'down' | null
  score: number
  countUp?: number
  countDown?: number
}
