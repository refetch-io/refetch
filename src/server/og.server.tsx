import type { ReactNode } from 'react'
import interMedium from '@fontsource/inter/files/inter-latin-500-normal.woff?inline'
import interBold from '@fontsource/inter/files/inter-latin-700-normal.woff?inline'
import poppinsBold from '@fontsource/poppins/files/poppins-latin-700-normal.woff?inline'
// Dev serves it from node_modules; builds publish it at /assets/resvg.wasm (see vite.config.ts).
import devResvgWasmUrl from '@resvg/resvg-wasm/index_bg.wasm?url'
import type { PostDetail } from '@/lib/types'
import { timeAgo } from '@/lib/utils'
import { getPublicConfig } from './env.server'

const WIDTH = 1200
const HEIGHT = 630

function fontData(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
}

const fonts = [
  { name: 'Inter', data: fontData(interMedium), weight: 500 as const, style: 'normal' as const },
  { name: 'Inter', data: fontData(interBold), weight: 700 as const, style: 'normal' as const },
  { name: 'Poppins', data: fontData(poppinsBold), weight: 700 as const, style: 'normal' as const },
]

/**
 * satori (JSX → SVG) and resvg (SVG → PNG) are loaded on first use, so a
 * problem with either can only ever affect social images, never the site.
 */
let renderer: Promise<{
  satori: typeof import('satori').default
  Resvg: typeof import('@resvg/resvg-wasm').Resvg
}> | null = null

/** `origin` is the current request's, where the build's static assets are served. */
function loadRenderer(origin: string) {
  renderer ??= (async () => {
    const [{ default: satori }, resvg] = await Promise.all([import('satori'), import('@resvg/resvg-wasm')])
    try {
      const wasm = await fetch(new URL(import.meta.env.DEV ? devResvgWasmUrl : '/assets/resvg.wasm', origin))
      if (!wasm.ok) throw new Error(`Couldn't load resvg wasm (${wasm.status})`)
      await resvg.initWasm(await wasm.arrayBuffer())
    } catch (error) {
      // The wasm module is process-wide; a hot reload may find it ready already.
      if (!(error instanceof Error && error.message.includes('Already initialized'))) throw error
    }
    return { satori, Resvg: resvg.Resvg }
  })().catch((error) => {
    renderer = null
    throw error
  })
  return renderer
}

async function renderPng(element: ReactNode, cacheControl: string, origin: string): Promise<Response> {
  const { satori, Resvg } = await loadRenderer(origin)
  const svg = await satori(element, { width: WIDTH, height: HEIGHT, fonts })
  // resvg's objects live in WASM memory, which the garbage collector can't reclaim. Free both,
  // or every image leaks ~3 MB and crawlers fetching share images run the server out of memory.
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } })
  let png: Uint8Array
  try {
    const image = resvg.render()
    try {
      png = image.asPng()
    } finally {
      image.free()
    }
  } finally {
    resvg.free()
  }
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': cacheControl },
  })
}

/** Site icon as a data URL (PNG/JPEG only — what the renderer supports). */
async function faviconDataUrl(domain: string | null): Promise<string | null> {
  if (!domain) return null
  try {
    const { appwriteEndpoint, appwriteProjectId } = getPublicConfig()
    const response = await fetch(
      `${appwriteEndpoint}/avatars/favicon?url=${encodeURIComponent(`https://${domain}`)}&project=${appwriteProjectId}`,
      { signal: AbortSignal.timeout(3_000) },
    )
    const type = response.headers.get('content-type') ?? ''
    if (!response.ok || !/^image\/(png|jpe?g)/.test(type)) return null
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength < 100) return null
    return `data:${type};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

function LogoLockup() {
  return (
    <svg width="196" height="44" viewBox="0 0 913 203">
      <circle cx="110.3" cy="101.5" r="86" fill="#ffffff" />
      <path
        fill="#4e1cb3"
        d="M110.3,2.2C55.4,2.2,10.9,46.6,10.9,101.5s44.5,99.4,99.4,99.4,99.4-44.5,99.4-99.4S165.1,2.2,110.3,2.2ZM90.3,124.4l-36.3.6c-.6,0-1.1-.5-1.1-1.1v-36.6c0-.9,1.1-1.4,1.8-.8l11.9,11.9,36.4-36.4c1.1-1.1,2.8-1.1,3.9,0l8.1,8.1c1.1,1.1,1.1,2.8,0,3.9l-36.4,36.4,12.3,12.2c.7.7.2,1.8-.7,1.8h0ZM166.5,117.4l-12.8-10.9-36.6,36.2c-1.1,1.1-2.8,1.1-3.9,0l-8.1-8.2c-1.1-1.1-1.1-2.8,0-3.9l36.6-36.2-11.2-13.1c-.7-.7-.2-1.8.7-1.8l35.6.5c.6,0,1.1.5,1.1,1.1l.5,35.7c0,.9-1.1,1.4-1.8.7h0Z"
      />
      <g fill="#4e1cb3">
        <path d="M308.7,62.6c5.9-3.5,12.4-5.3,19.3-5.3v32.3h-8.6c-8,0-14.2,1.7-18.6,5.1s-6.6,9.2-6.6,17.3v44.8h-30.2V58.4h30.2v18.5c3.8-6,8.6-10.8,14.5-14.3h0Z" />
        <path d="M432.9,113h-68.3c.4,7.4,2.2,12.7,5.6,16,3.4,3.2,7.8,4.8,13.1,4.8s8.2-1.1,11.1-3.4c2.9-2.2,4.9-5.1,5.8-8.6h31.9c-1.3,6.9-4.1,13.1-8.5,18.6s-9.9,9.8-16.6,12.9c-6.7,3.1-14.2,4.7-22.4,4.7s-18.2-2-25.7-6.1-13.3-9.9-17.5-17.5c-4.2-7.6-6.3-16.6-6.3-26.8s2.1-19.3,6.3-26.9c4.2-7.6,10-13.4,17.5-17.5s16.1-6.1,25.7-6.1,18.3,2,25.7,6c7.4,4,13.1,9.6,17.2,16.8c4.1,7.2,6.1,15.6,6.1,25s-.3,5.2-.9,8.1h.2,0ZM398.1,85.8c-3.6-3.2-8-4.9-13.3-4.9s-10.1,1.6-13.8,4.9c-3.6,3.3-5.7,8.1-6.2,14.5h38.4c.1-6.5-1.6-11.3-5.2-14.5h.1Z" />
        <path d="M497.5,44.9c-4.9,0-8.5,1.1-10.8,3.2-2.2,2.1-3.5,5.5-3.7,10.2h17.8v25.4h-17.8v73h-30.2v-73h-11.8v-25.4h11.8v-1.1c0-12.2,3.6-21.7,10.7-28.3,7.1-6.6,17.4-10,31-10s4.9,0,6.3.2v25.9l-3.4-.2h.1Z" />
        <path d="M606.3,113h-68.3c.4,7.4,2.2,12.7,5.6,16,3.4,3.2,7.8,4.8,13.1,4.8s8.2-1.1,11.1-3.4c2.9-2.2,4.9-5.1,5.8-8.6h31.9c-1.3,6.9-4.1,13.1-8.5,18.6s-9.9,9.8-16.6,12.9c-6.7,3.1-14.2,4.7-22.4,4.7s-18.2-2-25.7-6.1-13.3-9.9-17.5-17.5c-4.2-7.6-6.3-16.6-6.3-26.8s2.1-19.3,6.3-26.9c4.2-7.6,10-13.4,17.5-17.5s16.1-6.1,25.7-6.1,18.3,2,25.7,6c7.4,4,13.1,9.6,17.2,16.8c4.1,7.2,6.1,15.6,6.1,25s-.3,5.2-.9,8.1h.2ZM571.5,85.8c-3.6-3.2-8-4.9-13.3-4.9s-10.1,1.6-13.8,4.9c-3.6,3.3-5.7,8.1-6.2,14.5h38.4c0-6.5-1.6-11.3-5.2-14.5h0Z" />
        <path d="M678.2,130.8v25.9h-13.6c-11.5,0-20.5-2.8-26.9-8.6-6.4-5.7-9.6-15.1-9.6-28.3v-36.2h-13.2v-25.4h13.2v-24.2h30.2v24.2h19.8v25.4h-19.8v36.7c0,3.9.8,6.6,2.4,8.1,1.6,1.5,4.3,2.3,8,2.3h9.5,0Z" />
        <path d="M771.2,67.6c8.6,7,14,16.6,16.2,28.8h-31.9c-.9-4.2-2.9-7.5-5.8-9.9-2.9-2.4-6.6-3.5-11.1-3.5s-9.6,2.1-13.1,6.3c-3.4,4.2-5.1,10.3-5.1,18.3s1.7,14.1,5.1,18.3c3.4,4.2,7.8,6.3,13.1,6.3s8.2-1.2,11.1-3.5c2.9-2.4,4.9-5.6,5.8-9.9h31.9c-2.2,12.2-7.6,21.8-16.2,28.8-8.6,7-19.2,10.5-31.9,10.5s-18.2-2-25.7-6.1-13.3-9.9-17.5-17.5c-4.2-7.6-6.3-16.6-6.3-26.8s2.1-19.3,6.3-26.9,10-13.4,17.5-17.5,16.1-6.1,25.7-6.1,23.3,3.5,31.9,10.5h0Z" />
        <path d="M892.1,68.6c6.6,7.5,10,17.9,10,31v57.1h-30.2v-53.6c0-6.6-1.7-11.7-5.2-15.4-3.5-3.7-8.1-5.6-13.8-5.6s-11,1.9-14.6,5.8-5.4,9.4-5.4,16.6v52.2h-30.2V26.3h30.2v50.1c2.8-5.9,7-10.5,12.6-13.9s12.1-5.1,19.7-5.1c11.3,0,20.3,3.8,26.9,11.3h0Z" />
      </g>
    </svg>
  )
}

const ICONS = {
  up: 'M12 5.5 19 16H5z',
  comment:
    'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.4 3.6A1 1 0 0 1 4 18.8z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm.9 4.5v4.1l3.3 2-.9 1.5-4.2-2.5V7.5z',
}

function Pill({ icon, children }: { icon: keyof typeof ICONS; children: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 50,
        padding: '0 22px 0 18px',
        borderRadius: 999,
        backgroundColor: '#f2f2f7',
        color: '#3a3a3c',
        fontSize: 24,
        fontWeight: 500,
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d={ICONS[icon]} fill={icon === 'up' ? '#4e1cb3' : '#8e8e93'} />
      </svg>
      {children}
    </div>
  )
}

/** 1200×630 social card for a thread. */
export async function renderThreadImage(post: PostDetail | null, origin: string): Promise<Response> {
  if (!post) {
    return renderPng(
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f7',
        }}
      >
        <LogoLockup />
      </div>,
      'public, max-age=300',
      origin,
    )
  }

  const favicon = await faviconDataUrl(post.domain)
  const title = post.title.length > 140 ? `${post.title.slice(0, 137).trimEnd()}…` : post.title
  const titleSize = title.length > 90 ? 50 : title.length > 55 ? 58 : 66

  return renderPng(
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        position: 'relative',
        fontFamily: 'Inter',
        backgroundColor: '#f5f5f7',
        backgroundImage:
          'radial-gradient(circle at 100% 0%, rgba(124,58,237,0.20) 0%, rgba(245,245,247,0) 46%), radial-gradient(circle at 0% 100%, rgba(78,28,179,0.10) 0%, rgba(245,245,247,0) 40%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 52,
          left: 64,
          right: 64,
          bottom: 56,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <LogoLockup />
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 500, color: '#6e6e73' }}>refetch.io</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            marginTop: 36,
            padding: '44px 52px',
            borderRadius: 40,
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04), 0 24px 60px rgba(30,7,82,0.10)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 26,
              color: '#6e6e73',
              fontWeight: 500,
            }}
          >
            {favicon ? (
              <img src={favicon} width={40} height={40} style={{ borderRadius: 10 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#ede7ff' }} />
            )}
            <span style={{ color: '#1d1d1f' }}>{post.domain ?? 'refetch.io'}</span>
            <span>·</span>
            <span>{timeAgo(post.createdAt)}</span>
            {post.type === 'show' && (
              <span
                style={{
                  marginLeft: 6,
                  padding: '6px 16px',
                  borderRadius: 999,
                  backgroundColor: '#f3eeff',
                  color: '#4e1cb3',
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                Show RF
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 26,
              fontFamily: 'Poppins',
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: '-0.02em',
              color: '#1d1d1f',
            }}
          >
            {title}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
            <Pill icon="up">{`${post.count} ${Math.abs(post.count) === 1 ? 'point' : 'points'}`}</Pill>
            <Pill icon="comment">{`${post.countComments} ${post.countComments === 1 ? 'comment' : 'comments'}`}</Pill>
            {post.readingTime ? <Pill icon="clock">{`${post.readingTime} min read`}</Pill> : null}
          </div>
        </div>
      </div>
    </div>,
    'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400',
    origin,
  )
}
