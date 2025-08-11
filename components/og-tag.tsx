

interface OGTagProps {
  className?: string
}

export function OGTag({ className = "" }: OGTagProps) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[0.65rem] font-medium bg-[#4e1cb3] text-white rounded-lg whitespace-nowrap ${className}`}>
      OG
    </span>
  )
}
