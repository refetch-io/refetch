"use client"
import { useState, useEffect } from 'react';
import { getFaviconUrl } from '@/lib/appwrite';
import { Globe } from 'lucide-react';

interface FaviconProps {
  domain: string;
  className?: string;
  size?: number;
}

export function Favicon({ domain, className = "", size = 16 }: FaviconProps) {
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchFavicon = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const url = getFaviconUrl(domain);
        // Check if the URL is valid and not empty
        if (url && url.trim() !== '') {
          setFaviconUrl(url);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error('Error fetching favicon for domain:', domain, error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (domain) {
      fetchFavicon();
    }
  }, [domain]);

  if (isLoading) {
    return (
      <div 
        className={`animate-pulse bg-gray-200 rounded ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (hasError || !faviconUrl) {
    return (
      <Globe 
        className={`text-gray-400 ${className}`}
        size={size}
      />
    );
  }

  return (
    <img
      src={faviconUrl}
      alt={`${domain} favicon`}
      className={`${className}`}
      style={{ width: size, height: size }}
      onError={() => setHasError(true)}
    />
  );
} 