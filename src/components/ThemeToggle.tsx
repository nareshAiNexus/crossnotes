import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    const handleToggle = () => {
        // Simple + effective: toggle theme and briefly enable smooth color transitions.
        // This avoids full-screen overlays (which can feel "creepy" and cause flicker).
        const root = document.documentElement;
        root.classList.add('theme-animating');
        toggleTheme();
        window.setTimeout(() => {
            root.classList.remove('theme-animating');
        }, 250);
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
