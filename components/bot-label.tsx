import React from "react"

interface BotLabelProps {
  className?: string
}

export function BotLabel({ className }: BotLabelProps) {
  return (
    <>
      <span className="text-gray-500">•</span>
      <span 
        className={`text-[#4e1cb3] text-xs cursor-help hover:text-[#5d2bc4] transition-colors ${className || ''}`}
        title="Bots are helping the platform stay active with relevant content and are ranked exactly the same as other posts. View our OSS repo to see their source code."
      >
        bot
      </span>
    </>
  )
}
