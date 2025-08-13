import { ImageResponse } from '@vercel/og'
import { fetchPostById } from '@/lib/data'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

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
              fontSize: 60,
              fontWeight: 600,
              color: '#6b7280',
            }}
          >
            Thread Not Found
          </div>
        ),
        {
          width: 2400,
          height: 1260,
        }
      )
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
            padding: '120px',
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
              top: '80px', // Reduced from 120px
              left: '120px',
              display: 'flex',
            }}
          >
            <img
              src="https://refetch.io/logo-purple.png"
              alt="Refetch"
              width="306"
              height="69"
              style={{
                width: '306px',
                height: '69px',
              }}
            />
          </div>

          {/* Main post card - matching the exact post-card.tsx styling */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '80px',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              width: '100%',
              minHeight: '800px', // Fixed height instead of calc()
              marginTop: '160px',
              marginBottom: '160px',
            }}
          >
            {/* Show RF badge if applicable - positioned above title */}
            {post.type === "show" && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  marginBottom: '24px',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 32px',
                    fontSize: '36px',
                    fontWeight: '600',
                    backgroundColor: '#faf5ff',
                    color: '#9333ea',
                    borderRadius: '20px',
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
                gap: '16px',
                marginBottom: '40px', // Reduced from 160px to eliminate excessive spacing
              }}
            >
              {/* Title */}
              <h1
                style={{
                  fontSize: '110px', // Reduced from 120px
                  fontWeight: '900',
                  color: '#111827',
                  lineHeight: '1.3',
                  margin: 0,
                  flex: 1,
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  height: post.type === "show" ? '320px' : '440px', // Reduced height when tag is present
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
                  fontSize: '40px',
                  color: '#374151',
                  lineHeight: '1.4',
                  margin: '40px 0 0 0',
                  maxWidth: '1800px',
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
                marginTop: '40px', // Reduced from 80px
                paddingTop: '40px', // Reduced from 80px
                borderTop: '2px solid #f3f4f6',
                marginLeft: '-80px',
                marginRight: '-80px',
                paddingLeft: '80px',
                paddingRight: '80px',
                fontSize: '48px',
                color: '#6b7280',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {/* Left side: All meta items with consistent spacing */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '40px',
                }}
              >
                {/* Domain favicon - using Appwrite avatars service with fallback */}
                <img
                  src={`https://cloud.appwrite.io/v1/avatars/favicon?url=${encodeURIComponent(`https://${cleanDomain}`)}&fallback=1`}
                  alt="Domain favicon"
                  width="48"
                  height="48"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    display: 'block',
                    objectFit: 'contain',
                    backgroundColor: '#f3f4f6', // Fallback background if image fails
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
                  gap: '24px',
                }}
              >
                {/* Upvote icon */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#dcfce7', // Light green background
                    borderRadius: '12px', // Rounded corners instead of circular
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '6px', // Tiny margin top
                  }}
                >
                  <svg
                    width="28"
                    height="28"
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
                    fontSize: '48px',
                    fontWeight: '700',
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '60px',
                    flexShrink: 0,
                  }}
                >
                  {post.count || 0}
                </span>
                
                {/* Downvote icon */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#fef2f2', // Light red background
                    borderRadius: '12px', // Rounded corners instead of circular
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '6px', // Tiny margin top
                  }}
                >
                  <svg
                    width="28"
                    height="28"
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
              bottom: '80px', // Reduced from 120px
              left: '120px',
              right: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '32px',
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
        width: 2400,
        height: 1260,
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
            fontSize: 60,
            fontWeight: 600,
            color: '#6b7280',
          }}
        >
          Error Generating Image
        </div>
      ),
      {
        width: 2400,
        height: 1260,
      }
    )
  }
}
