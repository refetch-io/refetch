import { Client, Avatars, Account } from 'appwrite';

// Initialize Appwrite client
export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'your-project-id');

// Initialize services
export const avatars = new Avatars(client);
export const account = new Account(client);

// Helper function to get favicon URL for a domain
export const getFaviconUrl = (domain: string): string => {
  try {
    // Keep domain as is, just add protocol if missing
    const fullUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    
    // Return the favicon URL using the full URL
    return avatars.getFavicon(fullUrl);
  } catch (error) {
    console.error('Error getting favicon for domain:', domain, error);
    // Return a fallback icon or empty string
    return '';
  }
}; 