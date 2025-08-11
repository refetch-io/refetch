"use client"

import Image from "next/image"
import Link from "next/link"

interface SponsoredAdProps {
  logoUrl: string
  logoAlt: string
  title: string
  description: string
  linkUrl: string
  linkText?: string
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  accentColor?: string
}

export function SponsoredAd({
  logoUrl,
  logoAlt,
  title,
  description,
  linkUrl,
  linkText = "Learn more",
  backgroundColor = "bg-[#ededed]",
  borderColor = "",
  textColor = "text-gray-700",
  accentColor = "text-blue-500"
}: SponsoredAdProps) {
  return (
    <Link 
      href={`${linkUrl}${linkUrl.includes('?') ? '&' : '?'}ref=refetch.io`} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`block p-3 ${backgroundColor} ${borderColor} rounded-lg transition-all duration-200 group`}
    >
      <div className="flex items-start gap-3">
        {/* Logo */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Image
              src={logoUrl}
              alt={logoAlt}
              width={18}
              height={18}
              className="w-5 h-5"
            />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className={`font-medium ${textColor} text-sm group-hover:${accentColor} transition-colors`}>
              {title}
            </h4>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Ad</span>
          </div>
          
          <p className="text-xs text-gray-500 leading-tight mb-1.5">
            {description}
          </p>
          
          <div className="mt-1.5 flex items-center gap-1">
            <span className={`text-xs ${accentColor} font-medium`}>{linkText}</span>
            <svg className={`w-3 h-3 ${accentColor} group-hover:translate-x-0.5 transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
} 