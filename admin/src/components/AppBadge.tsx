import { cn } from '@/libs/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: 'success' | 'error' | 'warning';
}

export const AppBadge = ({
  variant,
  className,
  children,
  ...props
}: BadgeProps) => {
  return (
    <div
      className={cn(
        'flex w-fit items-center gap-1',
        'rounded-[2px] border-[0.6px] px-1 py-0.5 text-xs font-medium',
        variant === 'success'
          ? 'border-[#05C16833] bg-[#05C16833] text-[#14CA74]'
          : variant === 'error'
            ? 'border-[#FF5A6533] bg-[#FF5A6533] text-[#FF5A65]'
            : 'border-[#FF980033] bg-[#FF980033] text-[#FF9800]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
