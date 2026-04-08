import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearch } from "wouter";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Send, Headphones, Hash, AlignLeft, Tag, CircleDot } from "lucide-react";
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
  memberFirstName?: string;
  memberLastName?: string;
  memberEmail?: string;
}

interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: string;
  senderFirstName?: string;
  senderLastName?: string;
}

function statusBadge(status: string) {
  if (status === "OPEN")
    return <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Waiting for answer</Badge>;
  if (status === "ANSWERED")
    return <Badge className="bg-green-100 text-green-700 border-0 text-xs">Answered</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Closed</Badge>;
}

function priorityColor(p: string) {
  if (p === "CRITICAL") return "text-red-600 font-semibold";
  if (p === "HIGH") return "text-orange-500 font-semibold";
  if (p === "MEDIUM") return "text-yellow-600";
  return "text-muted-foreground";
}

function formatDateTime(dt: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function ChatView({
  ticket,
  orgId,
  onBack,
}: {
  ticket: Ticket;
  orgId: string;
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
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/support/tickets`] });
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/workspaces/${orgId}/admin/support/tickets/${ticket.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/support/tickets/${ticket.id}/messages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/support/tickets`] });
      toast({ title: "Status updated" });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const currentTicket = data?.ticket ?? ticket;
  const messages = data?.messages ?? [];
  const memberName = `${ticket.memberFirstName || ""} ${ticket.memberLastName || ""}`.trim() || ticket.memberEmail || "Member";

  return (
    <div className="flex h-full">
      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border px-5 py-3.5 flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <h2 className="font-semibold text-sm truncate">
            Support Request #{ticket.id}
          </h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading && <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>}
          {messages.map((msg) => {
            const isPMO = msg.senderRole === "PMO";
            const senderLabel = isPMO
              ? "Support Team"
              : `${msg.senderFirstName || ""} ${msg.senderLastName || ""}`.trim() || memberName;
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${isPMO ? "items-start" : "items-end"}`}
              >
                {!isPMO && (
                  <span className="text-xs text-muted-foreground font-medium">{senderLabel}</span>
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
                {isPMO && (
                  <span className="text-xs text-muted-foreground font-medium">{senderLabel}</span>
                )}
                <span className="text-[10px] text-muted-foreground/70">
                  {formatDateTime(msg.createdAt)}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-5 py-3 flex items-end gap-2 shrink-0">
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
      </div>

      {/* Sidebar */}
      <div className="w-60 shrink-0 border-l border-border bg-muted/20 p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Hash className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-xs font-mono text-foreground">{ticket.id}</span>
          </div>
          <div className="flex items-start gap-2">
            <AlignLeft className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-xs text-foreground">{ticket.subject}</span>
          </div>
          <div className="flex items-start gap-2">
            <Tag className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-xs text-foreground">{ticket.category}</span>
          </div>
          <div className="flex items-start gap-2">
            <CircleDot className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1.5">
              {statusBadge(currentTicket.status)}
              <Select
                value={currentTicket.status}
                onValueChange={(v) => statusMutation.mutate(v)}
              >
                <SelectTrigger className="h-6 text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ANSWERED">Answered</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSupport() {
  const { slug } = useParams<{ slug: string }>();
  const search = useSearch();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Support ?ticket= in query string to deep-link from email
  useEffect(() => {
    const params = new URLSearchParams(search);
    const ticketParam = params.get("ticket");
    if (ticketParam && !selectedTicket) {
      setSelectedTicket({ id: ticketParam } as Ticket);
    }
  }, [search]);

  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!slug,
  });
  const orgId = workspace?.id;

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/support/tickets`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/support/tickets`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  // If we have an ID-only ticket from URL param, enrich it from the list
  useEffect(() => {
    if (selectedTicket && !selectedTicket.category && tickets.length > 0) {
      const found = tickets.find((t) => t.id === selectedTicket.id);
      if (found) setSelectedTicket(found);
    }
  }, [tickets, selectedTicket]);

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        workspaceSlug={slug}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedTicket && orgId ? (
          <ChatView
            ticket={selectedTicket}
            orgId={orgId}
            onBack={() => setSelectedTicket(null)}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Headphones className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Support Requests</h1>
                <p className="text-sm text-muted-foreground">Manage member support tickets</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Ticket ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Category</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Subject</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Priority</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Member</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Created At</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Last Updated</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                        Loading tickets…
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && tickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                        No support tickets yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">{ticket.id}</TableCell>
                      <TableCell>{statusBadge(ticket.status)}</TableCell>
                      <TableCell className="text-sm">{ticket.category}</TableCell>
                      <TableCell className="text-sm max-w-[220px] truncate">{ticket.subject}</TableCell>
                      <TableCell className={`text-sm ${priorityColor(ticket.priority)}`}>
                        {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {`${ticket.memberFirstName || ""} ${ticket.memberLastName || ""}`.trim() || ticket.memberEmail || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(ticket.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(ticket.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
