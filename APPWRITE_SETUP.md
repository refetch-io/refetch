# Appwrite Setup for Favicon Functionality

This project uses Appwrite's Avatars service to fetch favicons for domains. Follow these steps to configure it:

## 1. Create an Appwrite Project

1. Go to [Appwrite Console](https://console.appwrite.io/)
2. Create a new project or use an existing one
3. Note down your Project ID

## 2. Configure Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-actual-project-id
```

Replace `your-actual-project-id` with your actual Appwrite Project ID.

## 3. How It Works

The favicon functionality works as follows:

- Each news item has a `domain` property (e.g., "bbc.com", "techcrunch.com")
- The `Favicon` component uses Appwrite's `avatars.getFavicon()` method to fetch the favicon for each domain
- If the favicon cannot be fetched, it falls back to a Globe icon
- The favicon is displayed next to the domain name in the news list

## 4. Files Modified

- `lib/appwrite.ts` - Appwrite client configuration
- `components/favicon.tsx` - Favicon component
- `app/page.tsx` - Updated to use Favicon component instead of random icons

## 5. Testing

After setting up the environment variables, restart your development server:

```bash
pnpm dev
```

The favicons should now appear next to each domain in the news list. If you see Globe icons, it means the favicon couldn't be fetched for that domain. 