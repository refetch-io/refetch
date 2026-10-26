import { cn } from '@/lib/utils'

const SPOKES = 8

/** The classic Apple activity indicator: eight fading spokes. */
export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('relative inline-block size-4 text-current', className)}
    >
      {Array.from({ length: SPOKES }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute top-0 left-[46%] h-[30%] w-[8%] origin-[50%_166%] rounded-full bg-current"
          style={{
            transform: `rotate(${(360 / SPOKES) * i}deg)`,
            animation: `spinner-fade 0.8s linear infinite`,
            animationDelay: `${(-0.8 * (SPOKES - i)) / SPOKES}s`,
          }}
        />
      ))}
    </span>
  )
}
