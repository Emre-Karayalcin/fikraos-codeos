import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MentorAssignments } from "@/components/admin/MentorAssignments";
import { GraduationCap, AlertTriangle, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  no_sessions: { label: "No Sessions", color: "bg-red-500/15 text-red-400" },
  low_rating: { label: "Low Rating", color: "bg-orange-500/15 text-orange-400" },
  low_attendance: { label: "Low Attendance", color: "bg-yellow-500/15 text-yellow-400" },
};

export default function AdminMentors() {
  const { slug } = useParams<{ slug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: workspace } = useQuery<any>({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
  });

  const orgId = workspace?.id;

  const { data: insights = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/mentor-insights`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/mentor-insights`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  const mentorsWithRisks = insights.filter((m) => m.riskFlags?.length > 0);

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        workspaceSlug={slug!}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Mentors</h1>
              <p className="text-sm text-muted-foreground">
                Mentor performance, assignments, and risk flags.
              </p>
            </div>
          </div>

          {/* Mentor Insights Table */}
          {insights.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  Mentor Performance
                  {mentorsWithRisks.length > 0 && (
                    <span className="flex items-center gap-1 text-xs font-normal text-orange-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {mentorsWithRisks.length} at risk
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Avg Rating</TableHead>
                      <TableHead>Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insights.map((m: any) => (
                      <TableRow key={m.mentorId}>
                        <TableCell className="font-medium">{m.mentorName || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.totalSessions ?? 0}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.totalHours ?? 0}h</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {m.attendanceRate != null ? `${m.attendanceRate}%` : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.uniqueParticipants ?? 0}</TableCell>
                        <TableCell>
                          {m.avgRating != null ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                              {Number(m.avgRating).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(m.riskFlags ?? []).length === 0 ? (
                              <span className="text-xs text-green-400">✓ OK</span>
                            ) : (
                              (m.riskFlags as string[]).map((flag) => {
                                const info = RISK_LABELS[flag] ?? { label: flag, color: "bg-muted text-muted-foreground" };
                                return (
                                  <span key={flag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>
                                    {info.label}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Assignments */}
          {orgId && <MentorAssignments orgId={orgId} />}
        </div>
      </div>
    </div>
  );
}
