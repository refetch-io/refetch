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
