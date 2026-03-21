import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default'
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'textarea'
}

type Props = InputProps | TextareaProps

const baseStyles = 'w-full bg-surface-container-low border-0 rounded-lg px-3 py-2.5 text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40 ghost-border transition-all'

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
  ({ variant, className = '', ...props }, ref) => {
    if (variant === 'textarea') {
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={`${baseStyles} resize-none ${className}`}
          {...(props as TextareaProps)}
        />
      )
    }

    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        className={`${baseStyles} ${className}`}
        {...(props as InputProps)}
      />
    )
  }
)

Input.displayName = 'Input'

export default Input
