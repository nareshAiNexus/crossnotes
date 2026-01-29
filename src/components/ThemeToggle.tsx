import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRef } from 'react';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const overlayRef = useRef<HTMLDivElement | null>(null);

    const handleToggle = () => {
        // Get the NEW theme color (opposite of current)
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        const newBgColor = newTheme === 'light' ? '#ffffff' : 'hsl(220, 20%, 10%)';

        // Create overlay element with NEW theme color
        const overlay = document.createElement('div');
        overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${newBgColor};
      z-index: 9999;
      pointer-events: none;
      clip-path: circle(0% at 100% 100%);
      animation: theme-sweep-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    `;
        document.body.appendChild(overlay);

        // Change theme after animation is mostly complete
        setTimeout(() => {
            toggleTheme();
        }, 400);

        // Remove overlay after animation completes
        setTimeout(() => {
            overlay.remove();
        }, 650);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className={cn(
                "relative overflow-hidden transition-colors",
                "hover:bg-sidebar-accent"
            )}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <Sun className={cn(
                "h-5 w-5 transition-all duration-300",
                theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
            )} />
            <Moon className={cn(
                "absolute h-5 w-5 transition-all duration-300",
                theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
            )} />
        </Button>
    );
}
