import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ClipboardCheck, Search } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminAttendance() {
  const { slug } = useParams<{ slug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [search, setSearch] = useState("");

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const orgId = workspace?.id;

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/login-logs`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/login-logs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  const filtered = logs.filter((m) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (m.firstName || "").toLowerCase().includes(q) ||
      (m.lastName || "").toLowerCase().includes(q) ||
      (m.username || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q)
    );
  });

  const totalLogins = logs.reduce((sum, m) => sum + (m.loginCount ?? 0), 0);
  const activeUsers = logs.filter((m) => (m.loginCount ?? 0) > 0).length;

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Attendance</h1>
              <p className="text-muted-foreground">Platform sign-in logs per member</p>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Total Members", value: logs.length, color: "border-l-blue-500" },
              { label: "Active (signed in)", value: activeUsers, color: "border-l-green-500" },
              { label: "Total Sign-ins", value: totalLogins, color: "border-l-purple-500" },
            ].map(({ label, value, color }) => (
              <Card key={label} className={`border-l-4 ${color}`}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Member Sign-in Log</CardTitle>
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
                      <TableHead>Member</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Total Sign-ins</TableHead>
                      <TableHead className="text-right">Last Sign-in</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                          No members found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((m: any) => (
                        <TableRow key={m.userId}>
                          <TableCell className="font-medium">
                            {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{m.username || "—"}</TableCell>
                          <TableCell>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {m.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${(m.loginCount ?? 0) > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                              {m.loginCount ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : "Never"}
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
