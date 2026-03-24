import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Presentation, Download, ExternalLink } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-500/15 text-green-400",
  GENERATING: "bg-blue-500/15 text-blue-400",
  FAILED: "bg-red-500/15 text-red-400",
  PENDING: "bg-yellow-500/15 text-yellow-400",
};

export default function AdminPitchDecks() {
  const { slug } = useParams<{ slug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const orgId = workspace?.id;

  const { data: decks = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/pitch-decks`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/pitch-decks`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  const completed = decks.filter((d) => d.status === "COMPLETED").length;

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Presentation className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Pitch Decks</h1>
              <p className="text-muted-foreground">All generated pitch decks across workspace ideas</p>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Generated</p>
                <p className="text-2xl font-bold mt-1">{decks.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold mt-1">{completed}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Unique Ideas</p>
                <p className="text-2xl font-bold mt-1">{new Set(decks.map((d) => d.projectId)).size}</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Pitch Decks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Idea</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Download</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                          No pitch decks generated yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      decks.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.projectTitle || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {d.creatorFirstName} {d.creatorLastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{d.template || "—"}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status] || "bg-muted text-muted-foreground"}`}>
                              {d.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            {d.downloadUrl ? (
                              <Button variant="ghost" size="sm" className="h-7 gap-1.5" asChild>
                                <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-3.5 h-3.5" />
                                  Download
                                </a>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
