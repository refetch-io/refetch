"use client"

import { parseUrlsInText } from "@/lib/urlParser"

interface ParsedTextProps {
  text: string
  className?: string
}

/**
 * React component for rendering parsed text with links
 */
export function ParsedText({ text, className = "text-gray-700 text-sm whitespace-pre-wrap" }: ParsedTextProps) {
  const parsedHtml = parseUrlsInText(text)
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: parsedHtml }}
    />
  )
}
