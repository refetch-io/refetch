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
    // Clean the domain - remove protocol, www, and any paths
    let cleanDomain = domain.replace(/^https?:\/\//, ''); // Remove protocol
    cleanDomain = cleanDomain.replace(/^www\./, ''); // Remove www
    cleanDomain = cleanDomain.split('/')[0]; // Remove any paths
    cleanDomain = cleanDomain.split('?')[0]; // Remove query strings
    cleanDomain = cleanDomain.split('#')[0]; // Remove fragments
    
    // Construct full URL with protocol for Appwrite avatars service
    const fullUrl = `https://${cleanDomain}`;
    
    // Return the favicon URL using the full URL
    return avatars.getFavicon(fullUrl);
  } catch (error) {
    console.error('Error getting favicon for domain:', domain, error);
    // Return a fallback icon or empty string
    return '';
  }
}; 