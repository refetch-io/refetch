import { ImageResponse } from '@vercel/og'

export const runtime = 'edge'

export async function GET() {
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
            src="https://refetch.io/logo-dark.png"
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
          {/* Show RF badge - positioned above title */}
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
                fontSize: '80px', // Reduced from 120px
                fontWeight: '900',
                color: '#111827',
                lineHeight: '1.3',
                margin: 0,
                flex: 1,
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                height: '320px', // Reduced height since Show RF tag is always present in test
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: '3',
                WebkitBoxOrient: 'vertical',
              }}
            >
              Test Thread Title - This is a sample thread for testing OG image generation
            </h1>
          </div>
          
          {/* Description */}
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
            This is a sample description for testing the OG image generation. It should be long enough to test text wrapping and truncation behavior.
          </p>

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
                src="https://cloud.appwrite.io/v1/avatars/favicon?url=https://example.com&fallback=1"
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
              <span>example.com</span>
              
              {/* Time */}
              <span>2 days ago</span>
              
              {/* Reading time */}
              <span>5 min read</span>
              
              {/* Comments */}
              <span style={{ color: '#4e1cb3' }}>
                42 comments
              </span>
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
                  marginTop: '4px', // Tiny margin top
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
                1
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
                  marginTop: '4px', // Tiny margin top
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
}
