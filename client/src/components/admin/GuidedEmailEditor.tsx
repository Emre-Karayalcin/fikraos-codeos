import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Code2, FormInput, Eye, EyeOff } from "lucide-react";

const VAR_LABELS: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email Address",
  workspaceName: "Workspace Name",
  workspaceSlug: "Workspace Slug",
  ideaTitle: "Idea Title",
  ideaDescription: "Idea Description",
  inviteUrl: "Invite URL",
  loginUrl: "Login URL",
  resetUrl: "Reset Password URL",
  onboardUrl: "Onboarding URL",
  dashboardUrl: "Dashboard URL",
  mentorName: "Mentor Name",
  mentorDate: "Session Date",
  mentorTime: "Session Time",
  bookingId: "Booking ID",
  status: "Status",
  message: "Message",
  year: "Year",
  companyName: "Company Name",
  orgName: "Organization Name",
  userName: "User Name",
};

function extractVars(html: string): string[] {
  return [...new Set([...html.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Replace content of the Nth <p> tag
function replaceParagraph(html: string, index: number, newText: string): string {
  let i = 0;
  return html.replace(/(<p[^>]*>)([\s\S]*?)(<\/p>)/g, (match, open, content, close) => {
    if (i === index) {
      i++;
      return `${open}${newText}${close}`;
    }
    i++;
    return match;
  });
}

// Parse all <p> tags from the HTML
function parseParagraphs(html: string): Array<{ index: number; text: string; attrs: string }> {
  const results: Array<{ index: number; text: string; attrs: string }> = [];
  let i = 0;
  for (const m of html.matchAll(/(<p([^>]*)>)([\s\S]*?)(<\/p>)/g)) {
    const attrs = m[2];
    const inner = m[3];
    const text = stripTags(inner);
    // Include if it has meaningful text content (not just a link button)
    results.push({ index: i, text, attrs });
    i++;
  }
  return results;
}

function parseSubject(html: string): string {
  return html.match(/<title[^>]*>(.*?)<\/title>/s)?.[1]?.trim() ?? "";
}

function parseGreeting(html: string): { found: boolean; text: string } {
  const m = html.match(/<p[^>]*class="[^"]*\bgreeting\b[^"]*"[^>]*>(.*?)<\/p>/s);
  return { found: !!m, text: m ? stripTags(m[1]) : "" };
}

function parseCta(html: string): { found: boolean; label: string; url: string } {
  // Try class="cta" first, then inline style with background color (button)
  const m = html.match(/<a[^>]*class="[^"]*\bcta\b[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/s)
    || html.match(/<a[^>]*href="([^"]*)"[^>]*style="[^"]*background[^"]*"[^>]*>([\s\S]*?)<\/a>/s);
  if (!m) return { found: false, label: "", url: "" };
  return { found: true, label: stripTags(m[2]), url: m[1] };
}

function parseFooter(html: string): { found: boolean; text: string } {
  const m = html.match(/<div[^>]*class="[^"]*\bfooter\b[^"]*"[^>]*>([\s\S]*?)<\/div>/s);
  return { found: !!m, text: m ? stripTags(m[1]) : "" };
}

function applySubject(html: string, value: string): string {
  return html.replace(/<title[^>]*>.*?<\/title>/s, `<title>${value}</title>`);
}

function applyGreeting(html: string, value: string): string {
  return html.replace(
    /(<p[^>]*class="[^"]*\bgreeting\b[^"]*"[^>]*>)(.*?)(<\/p>)/s,
    `$1${value}$3`
  );
}

function applyCta(html: string, label: string, url: string): string {
  // Replace class="cta" or inline-style button anchor
  const newTag = `<a class="cta" href="${url}">${label}</a>`;
  if (/<a[^>]*class="[^"]*\bcta\b[^"]*"/.test(html)) {
    return html.replace(/<a[^>]*class="[^"]*\bcta\b[^"]*"[^>]*href="[^"]*"[^>]*>[\s\S]*?<\/a>/s, newTag);
  }
  return html.replace(/<a[^>]*href="[^"]*"[^>]*style="[^"]*background[^"]*"[^>]*>[\s\S]*?<\/a>/s, newTag);
}

function applyFooter(html: string, value: string): string {
  return html.replace(
    /(<div[^>]*class="[^"]*\bfooter\b[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/s,
    `$1${value}$3`
  );
}

interface GuidedEmailEditorProps {
  html: string;
  onChange: (html: string) => void;
  showPreview?: boolean;
  onTogglePreview?: () => void;
}

export function GuidedEmailEditor({ html, onChange, showPreview, onTogglePreview }: GuidedEmailEditorProps) {
  const [mode, setMode] = useState<"guided" | "raw">("guided");
  const rawRef = useRef<HTMLTextAreaElement>(null);
  const vars = extractVars(html);

  const paragraphs = parseParagraphs(html);
  const subject = parseSubject(html);
  const greeting = parseGreeting(html);
  const cta = parseCta(html);
  const footer = parseFooter(html);

  const insertVar = useCallback(
    (varName: string) => {
      const token = `{{${varName}}}`;
      if (mode === "raw" && rawRef.current) {
        const el = rawRef.current;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const newVal = el.value.slice(0, start) + token + el.value.slice(end);
        onChange(newVal);
        requestAnimationFrame(() => {
          el.selectionStart = start + token.length;
          el.selectionEnd = start + token.length;
          el.focus();
        });
      } else {
        onChange(html + " " + token);
      }
    },
    [mode, html, onChange]
  );

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Editor panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mode toggle bar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/20">
          <button
            onClick={() => setMode("guided")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === "guided" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
            }`}
          >
            <FormInput className="w-3.5 h-3.5" />
            Guided
          </button>
          <button
            onClick={() => setMode("raw")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === "raw" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Raw HTML
          </button>
          {onTogglePreview && (
            <button
              onClick={onTogglePreview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium hover:bg-accent text-muted-foreground transition-colors ml-auto"
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
          )}
        </div>

        {mode === "raw" ? (
          <textarea
            ref={rawRef}
            className="flex-1 p-4 font-mono text-xs resize-none bg-muted/30 focus:outline-none"
            value={html}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subject / Title</Label>
              <Input
                value={subject}
                placeholder="Email subject line"
                onChange={(e) => onChange(applySubject(html, e.target.value))}
                className="text-sm"
              />
            </div>

            {/* Greeting */}
            {greeting.found && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Greeting</Label>
                <Input
                  value={greeting.text}
                  placeholder="e.g. Hi {{userName}},"
                  onChange={(e) => onChange(applyGreeting(html, e.target.value))}
                  className="text-sm"
                />
              </div>
            )}

            {/* Body paragraphs */}
            {paragraphs.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Body Content</Label>
                {paragraphs.map((p) => (
                  <div key={p.index} className="space-y-1">
                    <Textarea
                      value={p.text}
                      rows={p.text.length > 80 ? 3 : 2}
                      onChange={(e) => onChange(replaceParagraph(html, p.index, e.target.value))}
                      className="text-sm resize-none"
                      placeholder="Paragraph text…"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* CTA */}
            {cta.found && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">CTA Button</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Label</Label>
                    <Input
                      value={cta.label}
                      placeholder="Button text"
                      onChange={(e) => onChange(applyCta(html, e.target.value, cta.url))}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">URL</Label>
                    <Input
                      value={cta.url}
                      placeholder="https://…"
                      type="url"
                      onChange={(e) => onChange(applyCta(html, cta.label, e.target.value))}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            {footer.found && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Footer</Label>
                <Input
                  value={footer.text}
                  placeholder="Footer text"
                  onChange={(e) => onChange(applyFooter(html, e.target.value))}
                  className="text-sm"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Variable picker sidebar */}
      <div className="w-52 border-l border-border flex flex-col bg-muted/10">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Variables</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Click to insert at cursor</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {vars.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No variables detected</p>
          ) : (
            vars.map((v) => (
              <button
                key={v}
                onClick={() => insertVar(v)}
                className="w-full text-left px-2.5 py-2 rounded hover:bg-accent transition-colors"
              >
                <span className="font-mono text-[10px] text-primary block">{`{{${v}}}`}</span>
                {VAR_LABELS[v] && (
                  <span className="text-[10px] text-muted-foreground">{VAR_LABELS[v]}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Live preview */}
      {showPreview && (
        <div className="flex-1 overflow-hidden border-l border-border">
          <iframe
            srcDoc={html}
            className="w-full h-full border-0"
            title="Email Preview"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
