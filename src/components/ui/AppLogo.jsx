import { cn } from '../../lib/utils.js';

export default function AppLogo({ className, alt = 'Regional Science High School for Region II seal' }) {
  return (
    <img
      src="/school-logo.png"
      alt={alt}
      className={cn('object-contain', className)}
      draggable={false}
    />
  );
}
