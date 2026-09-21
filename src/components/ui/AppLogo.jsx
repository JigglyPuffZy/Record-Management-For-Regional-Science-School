import { cn } from '../../lib/utils.js';

export default function AppLogo({ className, alt = 'SF10 & Class Record Management' }) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={cn('object-contain', className)}
      draggable={false}
    />
  );
}
