import { cn } from "@/lib/utils"

type SiteLogoProps = {
  className?: string
  heightClass?: string
}

const LOGO_WIDTH = 735
const LOGO_HEIGHT = 164

export function SiteLogo({
  className,
  heightClass = "h-[24px] md:h-[27px]",
}: SiteLogoProps) {
  const imgClass = cn(
    "block w-auto shrink-0 select-none object-contain object-left",
    heightClass,
  )

  return (
    <span className={cn("inline-block leading-none", className)}>
      <img
        src="/logo-light.svg"
        alt="Refetch"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={cn(imgClass, "dark:hidden")}
        draggable={false}
      />
      <img
        src="/logo-dark.svg"
        alt="Refetch"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={cn(imgClass, "hidden dark:block")}
        draggable={false}
      />
    </span>
  )
}
