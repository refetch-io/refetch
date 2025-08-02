import { Client, Avatars } from 'appwrite';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'your-project-id');

// Initialize Avatars service
export const avatars = new Avatars(client);

// Helper function to get favicon URL for a domain
export const getFaviconUrl = (domain: string): string => {
  try {
    // Remove protocol if present and construct full URL
    const cleanDomain = domain.replace(/^https?:\/\//, '');
    const url = `https://${cleanDomain}`;
    return avatars.getFavicon(url);
  } catch (error) {
    console.error('Error getting favicon for domain:', domain, error);
    // Return a fallback icon or empty string
    return '';
  }
}; 