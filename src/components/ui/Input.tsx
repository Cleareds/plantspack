import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default'
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'textarea'
}

type Props = InputProps | TextareaProps

const baseStyles = 'w-full h-14 bg-surface-container-low border border-outline-variant/10 rounded-2xl px-6 text-on-surface placeholder:text-outline/60 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300'

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
  ({ variant, className = '', ...props }, ref) => {
    if (variant === 'textarea') {
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={`${baseStyles} h-auto resize-none py-4 ${className}`}
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
