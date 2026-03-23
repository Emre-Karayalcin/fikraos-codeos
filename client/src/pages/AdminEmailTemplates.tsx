import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Eye, EyeOff, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
  name: string;
  filename: string;
  content: string;
}

const formatName = (name: string) =>
  name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const extractVars = (html: string): string[] =>
  [...new Set([...html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];

export default function AdminEmailTemplates() {
  const { slug } = useParams<{ slug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['/api/super-admin/email-templates'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/email-templates', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load templates');
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      const res = await fetch(`/api/super-admin/email-templates/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed to save');
    },
    onSuccess: () => {
      toast.success('Template saved');
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/email-templates'] });
    },
    onError: () => toast.error('Failed to save template'),
  });

  const handleSelect = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setEditContent(tpl.content);
    setShowPreview(false);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    saveMutation.mutate({ name: selectedTemplate.name, content: editContent });
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        workspaceSlug={slug}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Left: template list */}
        <div className="w-72 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email Templates
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? 'Loading...' : `${templates.length} templates`}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {templates.map(tpl => (
              <button
                key={tpl.name}
                onClick={() => handleSelect(tpl)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selectedTemplate?.name === tpl.name
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                <div className="font-medium">{formatName(tpl.name)}</div>
                <div
                  className={`text-xs mt-0.5 ${
                    selectedTemplate?.name === tpl.name
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}
                >
                  {tpl.filename}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: editor + preview */}
        {selectedTemplate ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{formatName(selectedTemplate.name)}</h3>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {extractVars(editContent).map(v => (
                    <Badge key={v} variant="outline" className="text-[10px] font-mono">
                      {'{{' + v + '}}'}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <EyeOff className="w-4 h-4 mr-1" />
                  ) : (
                    <Eye className="w-4 h-4 mr-1" />
                  )}
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
                  <Save className="w-4 h-4 mr-1" />
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            {/* Editor + preview split */}
            <div className={`flex-1 flex overflow-hidden ${showPreview ? 'flex-row' : 'flex-col'}`}>
              <textarea
                className="flex-1 p-4 font-mono text-xs resize-none bg-muted/30 focus:outline-none border-r border-border"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                spellCheck={false}
              />
              {showPreview && (
                <div className="flex-1 overflow-hidden border-l border-border">
                  <iframe
                    srcDoc={editContent}
                    className="w-full h-full border-0"
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Mail className="w-12 h-12 mx-auto opacity-20" />
              <p className="font-medium">Select a template</p>
              <p className="text-sm">Choose a template from the left panel to edit it</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
