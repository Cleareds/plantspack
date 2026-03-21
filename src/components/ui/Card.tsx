import { forwardRef } from 'react'

type CardVariant = 'surface' | 'elevated' | 'glass'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: string
  as?: React.ElementType
}

const variantStyles: Record<CardVariant, string> = {
  surface: 'bg-surface-container-lowest rounded-lg editorial-shadow',
  elevated: 'bg-surface-container-lowest rounded-lg shadow-ambient',
  glass: 'glass-float rounded-lg editorial-shadow',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'surface', padding = 'p-4', className = '', as: Component = 'div', children, ...props }, ref) => {
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
