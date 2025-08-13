import { ImageResponse } from '@vercel/og'
import { fetchPostById } from '@/lib/data'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const post = await fetchPostById(id)
    
    if (!post) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              fontSize: 30,
              fontWeight: 600,
              color: '#6b7280',
            }}
          >
            Thread Not Found
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )
    }

    // Fetch logo and favicon on server side
    let logoBase64 = ''
    let faviconBase64 = ''
    
    try {
      // Fetch purple logo from Appwrite
      const logoResponse = await fetch('https://refetch.appwrite.network/logo-purple.png')
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer()
        logoBase64 = `data:image/png;base64,${Buffer.from(logoBuffer).toString('base64')}`
      }
    } catch (error) {
      console.error('Error fetching logo:', error)
      // Fallback to base64 SVG if fetch fails
      logoBase64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzA2IiBoZWlnaHQ9IjY5IiB2aWV3Qm94PSIwIDAgMzA2IDY5IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMzA2IiBoZWlnaHQ9IjY5IiByeD0iMTIiIGZpbGw9IiM0ZTFjYjMiLz4KPHRleHQgeD0iMTUzIiB5PSI0MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+cmVmZXRjaDwvdGV4dD4KPC9zdmc+"
    }
    
    try {
      // Fetch favicon from Appwrite avatars service
      const cleanDomain = post.domain.replace(/^www\./, '')
      const faviconResponse = await fetch(`https://cloud.appwrite.io/v1/avatars/favicon?url=${encodeURIComponent(`https://${cleanDomain}`)}&fallback=1`)
      if (faviconResponse.ok) {
        const faviconBuffer = await faviconResponse.arrayBuffer()
        faviconBase64 = `data:image/png;base64,${Buffer.from(faviconBuffer).toString('base64')}`
      }
    } catch (error) {
      console.error('Error fetching favicon:', error)
      // Fallback to base64 SVG if fetch fails
      faviconBase64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9IiM0ZTFjYjMiLz4KPHRleHQgeD0iMjQiIHk9IjMwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCIgZm9udC13ZWlnaHQ9IjYwMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5mPC90ZXh0Pgo8L3N2Zz4="
    }

    // Clean domain for display (remove www prefix)
    const cleanDomain = post.domain.replace(/^www\./, '')
    
    // Use the daysAgo field from NewsItem
    const timeAgo = post.daysAgo || 'Recently'

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f3f4f6',
            padding: '60px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Header with logo - positioned in top left corner */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '60px',
              display: 'flex',
            }}
          >
            <img
              src={logoBase64}
              alt="Refetch"
              width="153"
              height="34.5"
              style={{
                width: '153px',
                height: '34.5px',
              }}
            />
          </div>

          {/* Main post card - matching the exact post-card.tsx styling */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '40px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              minHeight: '400px',
              marginTop: '80px',
              marginBottom: '80px',
            }}
          >
            {/* Show RF badge if applicable - positioned above title */}
            {post.type === "show" && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 16px',
                    fontSize: '18px',
                    fontWeight: '600',
                    backgroundColor: '#faf5ff',
                    color: '#9333ea',
                    borderRadius: '10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Show RF
                </span>
              </div>
            )}

            {/* Title section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              {/* Title */}
              <h1
                style={{
                  fontSize: '55px',
                  fontWeight: '900',
                  color: '#111827',
                  lineHeight: '1.3',
                  margin: 0,
                  flex: 1,
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  height: post.type === "show" ? '160px' : '220px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {post.title.length > 100 
                  ? `${post.title.substring(0, 100)}...` 
                  : post.title
                }
              </h1>
            </div>

            {/* Description if available */}
            {post.description && (
              <p
                style={{
                  fontSize: '20px',
                  color: '#374151',
                  lineHeight: '1.4',
                  margin: '20px 0 0 0',
                  maxWidth: '900px',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {post.description.length > 150 
                  ? `${post.description.substring(0, 150)}...` 
                  : post.description
                }
              </p>
            )}

            {/* Meta information moved below separator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #f3f4f6',
                marginLeft: '-40px',
                marginRight: '-40px',
                paddingLeft: '40px',
                paddingRight: '40px',
                fontSize: '24px',
                color: '#6b7280',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {/* Left side: All meta items with consistent spacing */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                }}
              >
                {/* Domain favicon - using base64-encoded inline SVG */}
                <img
                  src={faviconBase64}
                  alt="Domain favicon"
                  width="24"
                  height="24"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    display: 'block',
                  }}
                />
                
                {/* Domain */}
                <span>{cleanDomain}</span>
                
                {/* Time */}
                {timeAgo && (
                  <span>{timeAgo}</span>
                )}
                
                {/* Reading time */}
                {post.readingTime && (
                  <span>{post.readingTime} min read</span>
                )}
                
                {/* Comments */}
                {post.countComments !== undefined && (
                  <span style={{ color: '#4e1cb3' }}>
                    {post.countComments} comments
                  </span>
                )}
              </div>

              {/* Right side: Vote score */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
              >
                {/* Upvote icon */}
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: '#dcfce7',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '3px',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7 14L12 9L17 14"
                      stroke="#16a34a"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                
                {/* Vote count */}
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '30px',
                    flexShrink: 0,
                  }}
                >
                  {post.count || 0}
                </span>
                
                {/* Downvote icon */}
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: '#fef2f2',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '3px',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7 10L12 15L17 10"
                      stroke="#dc2626"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - positioned at bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '60px',
              right: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '16px',
              color: '#9ca3af',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <span>refetch.io</span>
            <span>Open-source alternative to YC-controlled HN</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            fontSize: 30,
            fontWeight: 600,
            color: '#6b7280',
          }}
        >
          Error Generating Image
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  }
}
