import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MessageSquare } from "lucide-react";

interface ClientIdea {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  status: string;
  createdAt: string;
  ownerName: string;
}

const STATUS_LABELS: Record<string, string> = {
  ALL: "All Statuses",
  BACKLOG: "Backlog",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  IN_INCUBATION: "In Incubation",
  ARCHIVED: "Results Published",
};

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-gray-500/15 text-gray-500",
  UNDER_REVIEW: "bg-blue-500/15 text-blue-500",
  SHORTLISTED: "bg-yellow-500/15 text-yellow-600",
  IN_INCUBATION: "bg-orange-500/15 text-orange-600",
  ARCHIVED: "bg-green-500/15 text-green-600",
};

export default function ClientIdeas() {
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: orgs } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const orgId = Array.isArray(orgs) ? orgs[0]?.id : undefined;

  const { data: ideas = [], isLoading } = useQuery<ClientIdea[]>({
    queryKey: ["/api/client/ideas", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/client/ideas`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  const filtered = statusFilter === "ALL" ? ideas : ideas.filter((i) => i.status === statusFilter);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <UnifiedSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Ideas</h1>
                <p className="text-sm text-muted-foreground">{filtered.length} idea{filtered.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border border-border rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-10 text-center">No ideas found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Idea</th>
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Status</th>
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Owner</th>
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((idea) => (
                    <tr key={idea.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-5 py-3">
                        <p className="font-medium">{idea.title}</p>
                        {idea.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{idea.description}</p>
                        )}
                        {idea.tags && idea.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {idea.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{tag}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[idea.status] ?? ""}`} variant="secondary">
                          {STATUS_LABELS[idea.status] ?? idea.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{idea.ownerName}</td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(idea.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
