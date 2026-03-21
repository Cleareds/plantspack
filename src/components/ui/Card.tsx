import { forwardRef } from 'react'

type CardVariant = 'surface' | 'elevated' | 'glass' | 'editorial'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: string
  as?: React.ElementType
}

const variantStyles: Record<CardVariant, string> = {
  surface: 'bg-surface-container-lowest rounded-2xl editorial-shadow',
  elevated: 'bg-surface-container-lowest rounded-3xl shadow-ambient',
  glass: 'glass-float rounded-2xl editorial-shadow',
  editorial: 'bg-surface-container-lowest rounded-[2.5rem] shadow-editorial ghost-border',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'surface', padding = 'p-6', className = '', as: Component = 'div', children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={`${variantStyles[variant]} ${padding} ${className}`}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Card.displayName = 'Card'

export default Card
