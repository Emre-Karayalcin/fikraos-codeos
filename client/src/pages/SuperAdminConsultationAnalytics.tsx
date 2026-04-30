import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HandCoins, CalendarCheck, AlertCircle, UserCheck, BarChart3, Search, TrendingUp } from "lucide-react";

interface OrgAnalytics {
  orgId: string;
  orgName: string;
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  totalCreditsAwarded: number;
  uniqueParticipantsWithCredits: number;
  confirmedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  noShows: number;
  totalActiveBookings: number;
  utilizationRate: number;
  completionRate: number;
}

export default function SuperAdminConsultationAnalytics() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery<OrgAnalytics[]>({
    queryKey: ["/api/admin/consultation/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/consultation/analytics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filtered = rows.filter(r =>
    r.orgName.toLowerCase().includes(search.toLowerCase())
  );

  // Aggregates
  const totals = rows.reduce(
    (acc, r) => ({
      totalSessions:     acc.totalSessions + r.totalSessions,
      completedSessions: acc.completedSessions + r.completedSessions,
      totalCredits:      acc.totalCredits + r.totalCreditsAwarded,
      noShows:           acc.noShows + r.noShows,
      confirmedBookings: acc.confirmedBookings + r.confirmedBookings,
    }),
    { totalSessions: 0, completedSessions: 0, totalCredits: 0, noShows: 0, confirmedBookings: 0 }
  );

  const avgUtilisation = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.utilizationRate, 0) / rows.length)
    : 0;

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Consultation Analytics</h1>
              <p className="text-sm text-muted-foreground">Cross-competition consultation metrics</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Sessions", value: totals.totalSessions, sub: `${totals.completedSessions} completed`, icon: CalendarCheck, color: "text-violet-600", bg: "bg-violet-500/10" },
              { label: "Credits Awarded", value: totals.totalCredits, sub: `across ${rows.length} competitions`, icon: HandCoins, color: "text-amber-600", bg: "bg-amber-500/10" },
              { label: "Total No-Shows", value: totals.noShows, sub: "unconfirmed on completed sessions", icon: AlertCircle, color: "text-red-600", bg: "bg-red-500/10" },
              { label: "Avg Utilisation", value: `${avgUtilisation}%`, sub: "participants with credits vs eligible", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            ].map(card => (
              <div key={card.label} className="border rounded-xl p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${card.bg} shrink-0`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-tight">{isLoading ? "…" : card.value}</p>
                  <p className="text-xs font-medium text-foreground">{card.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Per-competition table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base">Per-Competition Breakdown</CardTitle>
                <CardDescription>Consultation metrics for each competition workspace</CardDescription>
              </div>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search competition…"
                  className="pl-8 h-8 text-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competition</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">No-Shows</TableHead>
                      <TableHead className="text-right">Utilisation</TableHead>
                      <TableHead className="text-right">Completion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => (
                      <TableRow key={r.orgId}>
                        <TableCell className="font-medium">{r.orgName}</TableCell>
                        <TableCell className="text-right">{r.totalSessions}</TableCell>
                        <TableCell className="text-right">{r.completedSessions}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{r.totalCreditsAwarded}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{r.confirmedBookings}</TableCell>
                        <TableCell className="text-right">
                          {r.noShows > 0
                            ? <Badge className="bg-red-500/15 text-red-700 border-red-200">{r.noShows}</Badge>
                            : <span className="text-muted-foreground">0</span>
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${r.utilizationRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-mono">{r.utilizationRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-violet-500 rounded-full"
                                style={{ width: `${r.completionRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-mono">{r.completionRate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
