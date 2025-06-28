import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-ring",
  {
    variants: {
      variant: {
        default:
          'bg-primary-sunrise text-neutral-800 shadow-md hover:bg-primary-daylight hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-semibold',
        primary:
          'bg-primary-sunrise text-neutral-800 shadow-md hover:bg-primary-daylight hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-semibold',
        dawn: 'bg-primary-dawn text-white shadow-md hover:bg-primary-sunrise hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-semibold',
        daylight:
          'bg-primary-daylight text-neutral-800 shadow-md hover:bg-primary-sky hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-semibold',
        glass:
          'bg-white/90 backdrop-blur-sm border border-neutral-200 text-neutral-800 hover:bg-white hover:border-neutral-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0',
        destructive:
          'bg-red-600 text-white shadow-md hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-semibold',
        outline:
          'border-2 border-primary-sunrise bg-transparent text-primary-sunrise hover:bg-primary-sunrise hover:text-neutral-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 font-semibold',
        secondary:
          'bg-neutral-200 text-neutral-800 shadow-md hover:bg-neutral-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0',
        ghost:
          'hover:bg-primary-sunrise/10 hover:text-primary-sunrise hover:-translate-y-0.5 active:translate-y-0',
        link: 'text-primary-sunrise underline-offset-4 hover:underline hover:text-primary-daylight',
      },
      size: {
        default: 'h-11 px-6 py-3 text-sm has-[>svg]:px-5',
        sm: 'h-9 rounded-lg gap-1.5 px-4 text-xs has-[>svg]:px-3',
        lg: 'h-14 rounded-xl px-8 text-base has-[>svg]:px-6',
        icon: 'size-11 rounded-lg',
        touch: 'h-12 px-6 py-3 text-base min-w-[44px]', // Mobile optimized
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
