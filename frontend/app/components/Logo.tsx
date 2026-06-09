import Image from 'next/image'

/** Full Orchestra logo (mark + wordmark) — use on light/neutral surfaces. */
export function Logo({
  height = 36,
  className = '',
}: {
  height?: number
  className?: string
}) {
  const width = Math.round(height * 2.8)
  return (
    <Image
      src="/Logo.png"
      alt="Orchestra"
      width={width}
      height={height}
      priority
      className={className}
      style={{ height, width: 'auto' }}
    />
  )
}

/** Compact gradient mark — used when the sidebar is collapsed. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="brand-gradient flex items-center justify-center rounded-xl font-extrabold text-white shadow-md"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      O
    </div>
  )
}

export default Logo
