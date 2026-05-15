export interface PostMetadata {
  language: string;
  type: 'link' | 'show';
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
  type: 'link' | 'show';
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
  type: 'link' | 'show';
  enhanced: boolean;
  /** Algorithm ranking score (0–100 scale in functions/algorithm). */
  score?: number;
  timeScore?: number; // Time-based score for ranking algorithm
  countComments?: number;
  // Metadata fields (populated when enhanced = true)
  language?: string;
  spellingScore?: number;
  spellingIssues?: string[];
  optimizedTitle?: string;
  optimizedDescription?: string;
  originalTitle?: string;
  originalDescription?: string;
  /** Enhancement labels; each string must fit Appwrite attribute size (256). */
  topics?: string[];
  spamScore?: number;
  spamIssues?: string[];
  safetyScore?: number;
  safetyIssues?: string[];
  readingLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  readingTime?: number;
  tldr?: string;
  /** Stored as JSON string in Appwrite; parse when needed. */
  titleTranslations?: Record<string, string> | string;
  /** Stored as JSON string in Appwrite; parse when needed. */
  descriptionTranslations?: Record<string, string> | string;
  qualityScore?: number;
  qualityIssues?: string[];
  sensationScore?: number;
  diversityScore?: number;
  relevancyScore?: number;
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
  count: number
  countUp?: number
  countDown?: number
}
