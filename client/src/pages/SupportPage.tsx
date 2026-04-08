import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Send, Plus, ArrowLeft, Headphones } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface Ticket {
  id: string;
  category: string;
  priority: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportMessage {
  id: string;
  senderRole: string;
  content: string;
  createdAt: string;
  senderFirstName?: string;
  senderLastName?: string;
}

const CATEGORIES = ["General Inquiry", "Technical Issue", "Feedback", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function statusBadge(status: string) {
  if (status === "OPEN")
    return <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Waiting for answer</Badge>;
  if (status === "ANSWERED")
    return <Badge className="bg-green-100 text-green-700 border-0 text-xs">Answered</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Closed</Badge>;
}

function formatDateTime(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function NewTicketForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("General Inquiry");
  const [priority, setPriority] = useState("Low");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/support/tickets", {
        category,
        priority: priority.toUpperCase(),
        subject,
        message,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets/mine"] });
      toast({ title: "Ticket submitted", description: "We'll get back to you soon." });
      onSuccess();
    },
    onError: () => toast({ title: "Failed to submit ticket", variant: "destructive" }),
  });

  const canSubmit = subject.trim() && message.trim();

  return (
    <div className="max-w-xl mx-auto space-y-5 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Support Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Support Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Subject</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Please enter subject of the support request"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Message</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please enter your message"
          rows={5}
          className="resize-none"
        />
      </div>

      <Button
        className="w-full rounded-full"
        disabled={!canSubmit || createMutation.isPending}
        onClick={() => createMutation.mutate()}
      >
        {createMutation.isPending ? "Sending…" : "Send"}
      </Button>
    </div>
  );
}

function ChatView({
  ticket,
  onBack,
}: {
  ticket: Ticket;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth() as any;
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ ticket: Ticket; messages: SupportMessage[] }>({
    queryKey: [`/api/support/tickets/${ticket.id}/messages`],
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 8000,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/support/tickets/${ticket.id}/messages`, { content }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: [`/api/support/tickets/${ticket.id}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets/mine"] });
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const messages = data?.messages ?? [];

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="h-4 w-px bg-border" />
        <div>
          <p className="text-sm font-semibold">Support Request #{ticket.id}</p>
          <p className="text-xs text-muted-foreground">{ticket.subject}</p>
        </div>
        <div className="ml-auto">{statusBadge(ticket.status)}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {isLoading && <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>}
        {messages.map((msg) => {
          const isPMO = msg.senderRole === "PMO";
          const senderLabel = isPMO
            ? "Support Team"
            : `${msg.senderFirstName || ""} ${msg.senderLastName || ""}`.trim() || "You";
          return (
            <div key={msg.id} className={`flex flex-col gap-1 ${isPMO ? "items-start" : "items-end"}`}>
              {isPMO && (
                <span className="text-xs text-muted-foreground font-medium ml-1">{senderLabel}</span>
              )}
              {!isPMO && (
                <span className="text-xs text-muted-foreground font-medium mr-1">{senderLabel}</span>
              )}
              <div
                className={`max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isPMO
                    ? "bg-muted text-foreground rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-muted-foreground/70">
                {formatDateTime(msg.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {ticket.status !== "CLOSED" && (
        <div className="border-t border-border pt-3 flex items-end gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Your Message"
            rows={2}
            className="resize-none flex-1 min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (content.trim()) sendMutation.mutate();
              }
            }}
          />
          <Button
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            disabled={!content.trim() || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
      {ticket.status === "CLOSED" && (
        <p className="text-xs text-muted-foreground text-center pt-3 border-t border-border">
          This ticket has been closed.
        </p>
      )}
    </div>
  );
}

export default function SupportPage() {
  const [view, setView] = useState<"list" | "new" | "chat">("list");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/support/tickets/mine"],
  });

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setView("chat");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 h-screen flex flex-col">
        {/* Header */}
        {view !== "chat" && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Headphones className="w-7 h-7 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Support</h1>
                <p className="text-xs text-muted-foreground">Submit a request or view your tickets</p>
              </div>
            </div>
            {view === "list" && (
              <Button className="gap-1.5 rounded-full" size="sm" onClick={() => setView("new")}>
                <Plus className="w-3.5 h-3.5" /> New Ticket
              </Button>
            )}
            {view === "new" && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setView("list")}
              >
                <ArrowLeft className="w-4 h-4" /> Back to tickets
              </Button>
            )}
          </div>
        )}

        {/* New ticket form */}
        {view === "new" && (
          <div className="flex-1 overflow-y-auto">
            <NewTicketForm onSuccess={() => setView("list")} />
          </div>
        )}

        {/* Chat view */}
        {view === "chat" && selectedTicket && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ChatView
              ticket={selectedTicket}
              onBack={() => { setView("list"); setSelectedTicket(null); }}
            />
          </div>
        )}

        {/* Tickets list */}
        {view === "list" && (
          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
            )}
            {!isLoading && tickets.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <Headphones className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">No support tickets yet.</p>
                <Button size="sm" className="rounded-full gap-1.5" onClick={() => setView("new")}>
                  <Plus className="w-3.5 h-3.5" /> Submit your first request
                </Button>
              </div>
            )}
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      #{ticket.id}
                    </span>
                    <span className="text-sm font-medium truncate">{ticket.subject}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{ticket.category}</span>
                    <span>·</span>
                    <span>{ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}</span>
                    <span>·</span>
                    <span>{formatDateTime(ticket.updatedAt)}</span>
                  </div>
                </div>
                <div className="shrink-0">{statusBadge(ticket.status)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
