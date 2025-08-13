# OG Images for Refetch

This document describes the new dynamic OG image generation system for Refetch threads.

## Overview

Refetch now generates dynamic Open Graph (OG) images for each thread page, optimized for 16:9 resolution (1200x630px). These images are automatically generated and include:

- Thread title
- Domain information
- Time since posting
- Reading time (if available)
- Description (truncated to 200 characters)
- Author name
- Comment count
- Upvote count
- Refetch branding

## API Endpoints

### 1. Thread OG Image
```
GET /api/og/thread/[id]
```

Generates a dynamic OG image for a specific thread based on its ID.

**Example:**
```
https://refetch.io/api/og/thread/64a1b2c3d4e5f6g7h8i9j0
```

### 2. Test OG Image
```
GET /api/og/test
```

Generates a test OG image with sample data for development and testing purposes.

**Example:**
```
https://refetch.io/api/og/test
```

## Implementation Details

### Dependencies
- `@vercel/og` - For server-side image generation
- Edge runtime for optimal performance

### Image Specifications
- **Resolution:** 1200x630px (16:9 aspect ratio)
- **Format:** PNG (default)
- **Font:** Inter (system fallback)
- **Colors:** Refetch brand colors (#4e1cb3 for primary)

### Data Source
Images are generated using data from the `fetchPostById` function, which returns a `NewsItem` object containing:
- `title` - Thread title
- `domain` - Source domain
- `daysAgo` - Time since posting
- `description` - Thread description
- `readingTime` - Estimated reading time
- `author` - Author name
- `countComments` - Number of comments
- `count` - Total upvotes

## Usage

### 1. Automatic Generation
OG images are automatically generated when visiting any thread page. The metadata is dynamically generated in the `generateMetadata` function.

### 2. Manual Testing
You can test the OG image generation by visiting:
- `/api/og/test` - Test image with sample data
- `/api/og/thread/[actual-thread-id]` - Real thread image

### 3. Social Media
When sharing Refetch threads on social media platforms, the dynamic OG images will automatically be displayed, showing:
- Twitter: Large image cards
- Facebook: Rich link previews
- LinkedIn: Professional link previews
- Other platforms: Standard OG image support

## Environment Variables

Add the following to your `.env.local` file:

```bash
NEXT_PUBLIC_BASE_URL=https://refetch.io
```

This ensures the correct base URL is used for OG image URLs in production.

## Customization

### Modifying the Design
The OG image design can be customized by editing `app/api/og/thread/[id]/route.tsx`. The design uses inline styles and follows the same visual language as the post cards.

### Adding New Fields
To include additional thread information in the OG image:
1. Ensure the data is available in the `NewsItem` interface
2. Add the field to the image layout in the API route
3. Update the metadata generation if needed

### Changing Dimensions
To modify the image dimensions, update the `width` and `height` properties in the `ImageResponse` constructor. Maintain the 16:9 aspect ratio for optimal social media display.

## Performance Considerations

- **Edge Runtime:** Uses Vercel's edge runtime for fast global delivery
- **Caching:** Images are generated on-demand and can be cached by CDNs
- **Fallbacks:** Graceful error handling with fallback images for missing threads

## Troubleshooting

### Common Issues

1. **Image Not Loading**
   - Check that `@vercel/og` is properly installed
   - Verify the edge runtime is supported in your deployment environment
   - Check browser console for any JavaScript errors

2. **Incorrect Data**
   - Verify the thread ID is valid
   - Check that `fetchPostById` returns the expected data structure
   - Ensure all required fields are present in the `NewsItem` interface

3. **Styling Issues**
   - Verify font availability (Inter fallback to system fonts)
   - Check color values are valid hex codes
   - Ensure dimensions are positive integers

### Debug Mode
Enable debug logging by checking the browser console and server logs for detailed error information.

## Future Enhancements

Potential improvements for the OG image system:
- Custom themes based on thread categories
- Dynamic color schemes
- Animated elements (GIF support)
- Multiple layout options
- A/B testing for different designs
- Analytics tracking for image generation performance

## Support

For issues or questions about the OG image system, please refer to:
- The main Refetch documentation
- GitHub issues for bug reports
- Community discussions for feature requests
