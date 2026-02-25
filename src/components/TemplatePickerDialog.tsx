import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { NOTE_TEMPLATES, type NoteTemplate, formatTemplateContent, formatTemplateTitle } from '@/lib/templates';
import { ChevronRight, Sparkles } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (title: string, content: string) => void;
}

export default function TemplatePickerDialog({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplatePickerDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Group templates by category
  const categories = Array.from(new Set(NOTE_TEMPLATES.map((t) => t.category)));
  const templatesByCategory = categories.map((category) => ({
    category,
    templates: NOTE_TEMPLATES.filter((t) => t.category === category),
  }));

  const handleSelectTemplate = (template: NoteTemplate) => {
    setSelectedTemplate(template);
    setCustomTitle(formatTemplateTitle(template.defaultTitle));
    setShowPreview(false);
  };

  const handleCreateNote = () => {
    if (!selectedTemplate) return;
    
    const title = customTitle.trim() || formatTemplateTitle(selectedTemplate.defaultTitle);
    const content = formatTemplateContent(selectedTemplate.content);
    
    onSelectTemplate(title, content);
    onOpenChange(false);
    
    // Reset state
    setSelectedTemplate(null);
    setCustomTitle('');
    setShowPreview(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedTemplate(null);
    setCustomTitle('');
    setShowPreview(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Choose a Template
          </DialogTitle>
          <DialogDescription>
            Start your note with a pre-designed template
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Template List */}
          <div className={cn(
            "border-r transition-all",
            showPreview ? "w-[40%]" : "w-full"
          )}>
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6">
                {templatesByCategory.map(({ category, templates }) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {templates.map((template) => {
                        const Icon = template.icon;
                        const isSelected = selectedTemplate?.id === template.id;
                        return (
                          <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className={cn(
                              'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all',
                              'hover:bg-accent hover:text-accent-foreground',
                              isSelected && 'bg-accent text-accent-foreground ring-2 ring-primary'
                            )}
                          >
                            <div className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{template.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {template.description}
                              </div>
                            </div>
                            {isSelected && (
                              <ChevronRight className="h-5 w-5 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Preview Panel */}
          {showPreview && selectedTemplate && (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-sm">Preview</h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <article className="prose dark:prose-invert max-w-none prose-sm">
                    <MDEditor.Markdown
                      source={formatTemplateContent(selectedTemplate.content) || '*Empty template*'}
                      style={{ fontVariantLigatures: 'normal' }}
                    />
                  </article>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="border-t px-6 py-4 space-y-3 shrink-0 bg-muted/30">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Note Title</label>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={formatTemplateTitle(selectedTemplate.defaultTitle)}
                className="bg-background"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNote}>
                  Create Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {!selectedTemplate && (
          <div className="border-t px-6 py-4 shrink-0 bg-muted/30">
            <p className="text-sm text-muted-foreground text-center">
              Select a template to continue
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
