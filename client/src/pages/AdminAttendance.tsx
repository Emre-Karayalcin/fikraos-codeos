import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-500/15 text-blue-400",
  PRESENT: "bg-green-500/15 text-green-400",
  ABSENT: "bg-red-500/15 text-red-400",
  LATE: "bg-yellow-500/15 text-yellow-400",
};

export default function AdminAttendance() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workspace");
      return res.json();
    },
  });
  const orgId = workspace?.id;

  const params = new URLSearchParams();
  if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
  if (filterDate) params.set("date", filterDate);

  const { data: records = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/attendance`, filterStatus, filterDate],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/attendance?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch records");
      return res.json();
    },
    enabled: !!orgId,
  });

  const updateRecord = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/attendance`] });
      toast.success("Record updated");
    },
    onError: () => toast.error("Failed to update record"),
  });

  const summary = {
    total: records.length,
    present: records.filter(r => r.status === "PRESENT").length,
    absent: records.filter(r => r.status === "ABSENT").length,
    scheduled: records.filter(r => r.status === "SCHEDULED").length,
    rate: records.length > 0 ? Math.round((records.filter(r => r.status === "PRESENT").length / records.length) * 100) : 0,
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Attendance</h1>
              <p className="text-muted-foreground">Track session check-in and attendance records</p>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total", value: summary.total, color: "border-l-blue-500" },
              { label: "Present", value: summary.present, color: "border-l-green-500" },
              { label: "Absent", value: summary.absent, color: "border-l-red-500" },
              { label: "Attendance Rate", value: `${summary.rate}%`, color: "border-l-purple-500" },
            ].map(({ label, value, color }) => (
              <Card key={label} className={`border-l-4 ${color}`}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-44"
              placeholder="Filter by date"
            />
            {(filterStatus !== "all" || filterDate) && (
              <Button variant="outline" size="sm" onClick={() => { setFilterStatus("all"); setFilterDate(""); }}>
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attendance Records</CardTitle>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                          No attendance records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.memberFirstName} {r.memberLastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{r.scheduledDate}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{r.scheduledTime || "—"}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || "bg-muted text-muted-foreground"}`}>
                              {r.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {r.checkedInAt ? new Date(r.checkedInAt).toLocaleTimeString() : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {r.checkedOutAt ? new Date(r.checkedOutAt).toLocaleTimeString() : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {r.status === "SCHEDULED" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs text-green-500 border-green-500/30 hover:bg-green-500/10"
                                    onClick={() => updateRecord.mutate({ id: r.id, data: { status: "PRESENT", checkedInAt: new Date().toISOString() } })}>
                                    Check In
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10"
                                    onClick={() => updateRecord.mutate({ id: r.id, data: { status: "ABSENT" } })}>
                                    Mark Absent
                                  </Button>
                                </>
                              )}
                              {r.status === "PRESENT" && !r.checkedOutAt && (
                                <Button size="sm" variant="outline" className="h-7 text-xs"
                                  onClick={() => updateRecord.mutate({ id: r.id, data: { checkedOutAt: new Date().toISOString() } })}>
                                  Check Out
                                </Button>
                              )}
                            </div>
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
