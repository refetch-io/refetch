import { ImageResponse } from '@vercel/og'
import { fetchPostById } from '@/lib/data'
import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

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

    // Fetch favicon from Appwrite avatars service
    let faviconData = null
    let faviconFormat = null
    
    // List of domains known to have problematic favicons with @vercel/og
    const problematicDomains = ['github.com', 'github.io', 'gitlab.com', 'bitbucket.org']
    
    try {
      const cleanDomain = post.domain.replace(/^www\./, '')
      
      // Skip favicon fetching for known problematic domains
      if (!problematicDomains.includes(cleanDomain)) {
        // Force PNG format for better compatibility with @vercel/og
        const faviconResponse = await fetch(`https://cloud.appwrite.io/v1/avatars/favicon?url=${encodeURIComponent(`https://${cleanDomain}`)}&fallback=1&format=png`)
        if (faviconResponse.ok) {
          const faviconBuffer = await faviconResponse.arrayBuffer()
          
          // Check if the favicon data is valid (not empty or corrupted)
          if (faviconBuffer.byteLength > 100) { // Basic validation
            faviconData = faviconBuffer
            faviconFormat = 'image/png'
          }
        }
      }
    } catch (error) {
      console.error('Error fetching favicon:', error)
      // Will use fallback icon
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
            {/* SVG Logo - embedded directly with inline styles */}
            <svg
              width="180"
              height="40"
              viewBox="0 0 913 203"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                width: '180px',
                height: '40px',
              }}
            >
              <path fill="#fcfcfc" d="M1744.8-494c.3.6.6,1.2.9,1.7h-1.7v-3.5c.8.4.6,1.2.9,1.7h-.1Z"/>
              <g>
                <path fill="#4e1cb3" d="M110.3,2.2C55.4,2.2,10.9,46.6,10.9,101.5s44.5,99.4,99.4,99.4,99.4-44.5,99.4-99.4S165.1,2.2,110.3,2.2ZM90.3,124.4l-36.3.6c-.6,0-1.1-.5-1.1-1.1v-36.6c0-.9,1.1-1.4,1.8-.8l11.9,11.9,36.4-36.4c1.1-1.1,2.8-1.1,3.9,0l8.1,8.1c1.1,1.1,1.1,2.8,0,3.9l-36.4,36.4,12.3,12.2c.7.7.2,1.8-.7,1.8h0ZM166.5,117.4l-12.8-10.9-36.6,36.2c-1.1,1.1-2.8,1.1-3.9,0l-8.1-8.2c-1.1-1.1-1.1-2.8,0-3.9l36.6-36.2-11.2-13.1c-.7-.7-.2-1.8.7-1.8l35.6.5c.6,0,1.1.5,1.1,1.1l.5,35.7c0,.9-1.1,1.4-1.8.7h0Z"/>
                <g>
                  <path fill="#4e1cb3" d="M308.7,62.6c5.9-3.5,12.4-5.3,19.3-5.3v32.3h-8.6c-8,0-14.2,1.7-18.6,5.1s-6.6,9.2-6.6,17.3v44.8h-30.2V58.4h30.2v18.5c3.8-6,8.6-10.8,14.5-14.3h0Z"/>
                  <path fill="#4e1cb3" d="M432.9,113h-68.3c.4,7.4,2.2,12.7,5.6,16,3.4,3.2,7.8,4.8,13.1,4.8s8.2-1.1,11.1-3.4c2.9-2.2,4.9-5.1,5.8-8.6h31.9c-1.3,6.9-4.1,13.1-8.5,18.6s-9.9,9.8-16.6,12.9c-6.7,3.1-14.2,4.7-22.4,4.7s-18.2-2-25.7-6.1-13.3-9.9-17.5-17.5c-4.2-7.6-6.3-16.6-6.3-26.8s2.1-19.3,6.3-26.9c4.2-7.6,10-13.4,17.5-17.5s16.1-6.1,25.7-6.1,18.3,2,25.7,6c7.4,4,13.1,9.6,17.2,16.8c4.1,7.2,6.1,15.6,6.1,25s-.3,5.2-.9,8.1h.2,0ZM398.1,85.8c-3.6-3.2-8-4.9-13.3-4.9s-10.1,1.6-13.8,4.9c-3.6,3.3-5.7,8.1-6.2,14.5h38.4c.1-6.5-1.6-11.3-5.2-14.5h.1Z"/>
                  <path fill="#4e1cb3" d="M497.5,44.9c-4.9,0-8.5,1.1-10.8,3.2-2.2,2.1-3.5,5.5-3.7,10.2h17.8v25.4h-17.8v73h-30.2v-73h-11.8v-25.4h11.8v-1.1c0-12.2,3.6-21.7,10.7-28.3,7.1-6.6,17.4-10,31-10s4.9,0,6.3.2v25.9l-3.4-.2h.1Z"/>
                  <path fill="#4e1cb3" d="M606.3,113h-68.3c.4,7.4,2.2,12.7,5.6,16,3.4,3.2,7.8,4.8,13.1,4.8s8.2-1.1,11.1-3.4c2.9-2.2,4.9-5.1,5.8-8.6h31.9c-1.3,6.9-4.1,13.1-8.5,18.6s-9.9,9.8-16.6,12.9c-6.7,3.1-14.2,4.7-22.4,4.7s-18.2-2-25.7-6.1-13.3-9.9-17.5-17.5c-4.2-7.6-6.3-16.6-6.3-26.8s2.1-19.3,6.3-26.9c4.2-7.6,10-13.4,17.5-17.5s16.1-6.1,25.7-6.1,18.3,2,25.7,6c7.4,4,13.1,9.6,17.2,16.8c4.1,7.2,6.1,15.6,6.1,25s-.3,5.2-.9,8.1h.2ZM571.5,85.8c-3.6-3.2-8-4.9-13.3-4.9s-10.1,1.6-13.8,4.9c-3.6,3.3-5.7,8.1-6.2,14.5h38.4c0-6.5-1.6-11.3-5.2-14.5h0Z"/>
                  <path fill="#4e1cb3" d="M678.2,130.8v25.9h-13.6c-11.5,0-20.5-2.8-26.9-8.6-6.4-5.7-9.6-15.1-9.6-28.3v-36.2h-13.2v-25.4h13.2v-24.2h30.2v24.2h19.8v25.4h-19.8v36.7c0,3.9.8,6.6,2.4,8.1,1.6,1.5,4.3,2.3,8,2.3h9.5,0Z"/>
                  <path fill="#4e1cb3" d="M771.2,67.6c8.6,7,14,16.6,16.2,28.8h-31.9c-.9-4.2-2.9-7.5-5.8-9.9-2.9-2.4-6.6-3.5-11.1-3.5s-9.6,2.1-13.1,6.3c-3.4,4.2-5.1,10.3-5.1,18.3s1.7,14.1,5.1,18.3c3.4,4.2,7.8,6.3,13.1,6.3s8.2-1.2,11.1-3.5c2.9-2.4,4.9-5.6,5.8-9.9h31.9c-2.2,12.2-7.6,21.8-16.2,28.8-8.6,7-19.2,10.5-31.9,10.5s-18.2-2-25.7-6.1-13.3-9.9-17.5-17.5c-4.2-7.6-6.3-16.6-6.3-26.8s2.1-19.3,6.3-26.9,10-13.4,17.5-17.5,16.1-6.1,25.7-6.1,23.3,3.5,31.9,10.5h0Z"/>
                  <path fill="#4e1cb3" d="M892.1,68.6c6.6,7.5,10,17.9,10,31v57.1h-30.2v-53.6c0-6.6-1.7-11.7-5.2-15.4-3.5-3.7-8.1-5.6-13.8-5.6s-11,1.9-14.6,5.8-5.4,9.4-5.4,16.6v52.2h-30.2V26.3h30.2v50.1c2.8-5.9,7-10.5,12.6-13.9s12.1-5.1,19.7-5.1c11.3,0,20.3,3.8,26.9,11.3h0Z"/>
                </g>
              </g>
            </svg>
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
                {/* Domain favicon - only show when favicon data is available */}
                {faviconData && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      backgroundColor: '#f3f4f6',
                    }}
                  >
                    <img
                      src={`data:image/png;base64,${Buffer.from(faviconData).toString('base64')}`}
                      alt="Domain favicon"
                      width="32"
                      height="32"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                )}
                
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
                    {post.countComments} {post.countComments === 1 ? 'comment' : 'comments'}
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
