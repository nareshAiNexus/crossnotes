import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '@/hooks/useTheme';
import { getTextContent } from '@/lib/utils';

interface MermaidProps {
    chart: any;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const { theme } = useTheme();

    // Fix for [object Object] error: extract text content reliably
    const chartContent = React.useMemo(() => {
        let content = getTextContent(chart);

        // Robust sanitization:
        // 1. Remove any accidental markdown backticks or language labels that might have leaked in
        content = content.replace(/^```mermaid\s*/i, '').replace(/```$/i, '');

        // 2. EXPLICIT FIX: Strip any unintentional "[object Object]" strings that might leak into the chart
        content = content.replace(/\[object Object\]/g, '');

        // 3. Remove any leading/trailing whitespace
        content = content.trim();

        // 4. Ensure it starts with a valid directive if missing
        const lowerContent = content.toLowerCase();
        const validDirectives = [
            'graph', 'sequence', 'class', 'state', 'erdiagram',
            'journey', 'gantt', 'pie', 'mindmap', 'timeline',
            'gitgraph', 'block', 'zenuml', 'c4context', 'architecture'
        ];

        const hasDirective = validDirectives.some(d => lowerContent.startsWith(d));

        if (content && !hasDirective) {
            content = `graph TD\n${content}`;
        }
        return content;
    }, [chart]);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'Inter, sans-serif',
        });
    }, [theme]);

    useEffect(() => {
        const renderChart = async () => {
            if (!chartContent || !ref.current) return;

            try {
                // Pre-validate syntax to avoid Mermaid's internal error UI
                await mermaid.parse(chartContent);

                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                // Clear previous content
                if (ref.current) ref.current.innerHTML = '';

                setSvg('<div class="flex items-center justify-center p-8 opacity-20"><div class="animate-pulse text-xs">Rendering diagram...</div></div>');

                const { svg } = await mermaid.render(id, chartContent);
                setSvg(svg);
            } catch (error) {
                console.error('Mermaid parsing or rendering failed:', error);

                // Use a very subtle, minimal error message as requested by the user
                setSvg(`
                    <div class="px-4 py-2 bg-muted/20 border border-border/30 rounded-md flex items-center gap-2 text-[11px] text-muted-foreground/60 w-fit mx-auto transition-all hover:bg-muted/40 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-40 group-hover:opacity-100 transition-opacity"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                        <span>Preview unavailable (Syntax)</span>
                    </div>
                `);
            }
        };

        renderChart();
    }, [chartContent, theme]);

    return (
        <div
            className="mermaid-wrapper my-6 flex justify-center overflow-auto bg-card/50 p-4 rounded-xl border border-border/50 shadow-inner"
            ref={ref}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};

export default Mermaid;
