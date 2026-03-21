type BadgeVariant = 'surface' | 'primary' | 'secondary' | 'tertiary'

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  surface: 'bg-surface-container-high text-on-surface-variant',
  primary: 'silk-gradient text-on-primary',
  secondary: 'bg-secondary-container text-on-secondary',
  tertiary: 'bg-tertiary-container text-white',
}

export default function Badge({ variant = 'surface', className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
