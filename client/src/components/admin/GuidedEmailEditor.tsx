import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Code2, FormInput, Eye, EyeOff } from "lucide-react";

// Known variable labels for friendly display
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
};

function extractVars(html: string): string[] {
  return [...new Set([...html.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

// Try to extract guided fields from HTML
function parseFields(html: string) {
  const greetingMatch = html.match(/<!-- GREETING -->([\s\S]*?)<!-- \/GREETING -->/);
  const bodyMatch = html.match(/<!-- BODY -->([\s\S]*?)<!-- \/BODY -->/);
  const ctaMatch = html.match(/<!-- CTA -->([\s\S]*?)<!-- \/CTA -->/);
  const footerMatch = html.match(/<!-- FOOTER -->([\s\S]*?)<!-- \/FOOTER -->/);
  const subjectMatch = html.match(/<title[^>]*>(.*?)<\/title>/s);

  return {
    subject: subjectMatch ? subjectMatch[1].trim() : "",
    greeting: greetingMatch ? stripTags(greetingMatch[1].trim()) : "",
    body: bodyMatch ? stripTags(bodyMatch[1].trim()) : "",
    ctaLabel: ctaMatch ? stripTags(ctaMatch[1]).match(/href="([^"]+)"[^>]*>([^<]+)/)?.[2]?.trim() ?? "" : "",
    ctaUrl: ctaMatch ? ctaMatch[1].match(/href="([^"]+)"/)?.[1]?.trim() ?? "" : "",
    footer: footerMatch ? stripTags(footerMatch[1].trim()) : "",
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Replace a known section marker in HTML with new content
function replaceSection(html: string, marker: string, newContent: string): string {
  const re = new RegExp(`<!-- ${marker} -->[\\s\\S]*?<!-- /${marker} -->`, "g");
  if (re.test(html)) {
    return html.replace(
      new RegExp(`<!-- ${marker} -->[\\s\\S]*?<!-- /${marker} -->`),
      `<!-- ${marker} -->${newContent}<!-- /${marker} -->`
    );
  }
  return html;
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
  const parsed = parseFields(html);
  const hasMarkers =
    html.includes("<!-- GREETING -->") ||
    html.includes("<!-- BODY -->") ||
    html.includes("<!-- CTA -->") ||
    html.includes("<!-- FOOTER -->");

  const insertVar = useCallback(
    (varName: string) => {
      const token = `{{${varName}}}`;
      if (mode === "raw" && rawRef.current) {
        const el = rawRef.current;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const newVal = el.value.slice(0, start) + token + el.value.slice(end);
        onChange(newVal);
        // Restore cursor after React re-render
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

  const applyField = (marker: string, value: string) => {
    onChange(replaceSection(html, marker, value));
  };

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
            {!hasMarkers && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-600 dark:text-yellow-400">
                This template does not have guided section markers. Use the variable picker to insert tokens, or switch to Raw HTML for full editing.
              </div>
            )}

            {hasMarkers && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Greeting</Label>
                  <Input
                    value={parsed.greeting}
                    placeholder="e.g. Hi {{firstName}},"
                    onChange={(e) => applyField("GREETING", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Body</Label>
                  <Textarea
                    value={parsed.body}
                    placeholder="Main email content…"
                    rows={4}
                    onChange={(e) => applyField("BODY", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">CTA Button Label</Label>
                    <Input
                      value={parsed.ctaLabel}
                      placeholder="e.g. Get Started"
                      onChange={(e) => {
                        const newCta = `<a href="${parsed.ctaUrl}" style="display:inline-block;padding:10px 24px;background:#f97316;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">${e.target.value}</a>`;
                        applyField("CTA", newCta);
                      }}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">CTA Button URL</Label>
                    <Input
                      value={parsed.ctaUrl}
                      placeholder="https://…"
                      type="url"
                      onChange={(e) => {
                        const newCta = `<a href="${e.target.value}" style="display:inline-block;padding:10px 24px;background:#f97316;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">${parsed.ctaLabel || "Get Started"}</a>`;
                        applyField("CTA", newCta);
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Footer</Label>
                  <Input
                    value={parsed.footer}
                    placeholder="e.g. © 2025 FikraHub. All rights reserved."
                    onChange={(e) => applyField("FOOTER", e.target.value)}
                    className="text-sm"
                  />
                </div>
              </>
            )}

            {/* Subject line (always shown — edits <title> tag) */}
            <div className="space-y-1.5">
              <Label className="text-xs">Subject / Title Tag</Label>
              <Input
                value={parsed.subject}
                placeholder="Email subject line"
                onChange={(e) => {
                  const newHtml = html.replace(
                    /<title[^>]*>.*?<\/title>/s,
                    `<title>${e.target.value}</title>`
                  );
                  onChange(newHtml);
                }}
                className="text-sm"
              />
            </div>
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
                className="w-full text-left px-2.5 py-2 rounded hover:bg-accent transition-colors group"
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

      {/* Live preview (when enabled) */}
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
