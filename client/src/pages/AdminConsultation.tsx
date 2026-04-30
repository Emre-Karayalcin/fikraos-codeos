import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";
import { HandCoins, Trophy, Settings2, Trash2, Medal, CalendarCheck, Plus, Users, CheckCircle, XCircle, ChevronDown, ChevronUp, BarChart3, TrendingUp, AlertCircle, UserCheck } from "lucide-react";
import { format } from "date-fns";

export default function AdminConsultation() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // ── Workspace ────────────────────────────────────────────────────────────
  const { data: workspace } = useQuery<any>({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
  });
  const orgId = workspace?.id;

  // ── Challenges (for optional filter) ─────────────────────────────────────
  const { data: challengesRaw = [] } = useQuery<any[]>({
    queryKey: [`/api/challenges`, orgId],
    queryFn: async () => {
      const res = await fetch(`/api/challenges?orgId=${orgId}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.map((d: any) => d.challenge ?? d) : [];
    },
    enabled: !!orgId,
  });
  const challenges = challengesRaw;

  // ── Members ───────────────────────────────────────────────────────────────
  const { data: members = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/consultation/members`],
    enabled: !!orgId,
  });

  // ── Credit ledger ─────────────────────────────────────────────────────────
  const { data: credits = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/consultation/credits`],
    enabled: !!orgId,
  });

  // ── Rankings ──────────────────────────────────────────────────────────────
  const [rankingChallenge, setRankingChallenge] = useState<string>("__all__");
  const { data: rankingsData } = useQuery<any>({
    queryKey: [`/api/workspaces/${orgId}/admin/consultation/rankings`, rankingChallenge],
    queryFn: async () => {
      const url = rankingChallenge === "__all__"
        ? `/api/workspaces/${orgId}/admin/consultation/rankings`
        : `/api/workspaces/${orgId}/admin/consultation/rankings?challengeId=${rankingChallenge}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  // ── Config state ──────────────────────────────────────────────────────────
  const [consultationEnabled,    setConsultationEnabled]    = useState<boolean>(workspace?.consultationEnabled ?? false);
  const [consultationMinCredits, setConsultationMinCredits] = useState<number>(workspace?.consultationMinCredits ?? 10);
  const [consultationMaxEligible, setConsultationMaxEligible] = useState<number>(workspace?.consultationMaxEligible ?? 3);

  // Sync from workspace query
  const [synced, setSynced] = useState(false);
  if (workspace && !synced) {
    setConsultationEnabled(workspace.consultationEnabled ?? false);
    setConsultationMinCredits(workspace.consultationMinCredits ?? 10);
    setConsultationMaxEligible(workspace.consultationMaxEligible ?? 3);
    setSynced(true);
  }

  // ── Award form state ──────────────────────────────────────────────────────
  const [awardUserId,    setAwardUserId]    = useState("");
  const [awardCredits,   setAwardCredits]   = useState(1);
  const [awardChallenge, setAwardChallenge] = useState("__none__");
  const [awardReason,    setAwardReason]    = useState("");

  // ── Sessions state ────────────────────────────────────────────────────────
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [newSession, setNewSession] = useState({
    title: "", scheduledAt: "", capacity: 3, externalMeetingLink: "", notes: "", consultantUserId: "",
  });

  // ── Analytics query ───────────────────────────────────────────────────────
  const { data: analytics } = useQuery<any>({
    queryKey: [`/api/workspaces/${orgId}/admin/consultation/analytics`],
    enabled: !!orgId,
  });

  // ── Sessions query ────────────────────────────────────────────────────────
  const { data: sessions = [], refetch: refetchSessions } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/consultation/sessions`],
    enabled: !!orgId,
  });

  // ── Consultants query ─────────────────────────────────────────────────────
  const { data: consultants = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/consultation/consultants`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/consultation/consultants`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  // ── Bookings per session ──────────────────────────────────────────────────
  const { data: sessionBookings = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/consultation/sessions/${expandedSession}/bookings`],
    queryFn: async () => {
      if (!expandedSession || !orgId) return [];
      const res = await fetch(`/api/workspaces/${orgId}/admin/consultation/sessions/${expandedSession}/bookings`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId && !!expandedSession,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ consultationEnabled, consultationMinCredits, consultationMaxEligible }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Consultation settings saved");
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${slug}`] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const awardCreditMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/consultation/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId:      awardUserId,
          credits:     awardCredits,
          challengeId: awardChallenge === "__none__" ? undefined : awardChallenge,
          reason:      awardReason || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Credits awarded");
      setAwardUserId(""); setAwardCredits(1); setAwardChallenge("__none__"); setAwardReason("");
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/consultation/credits`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/consultation/rankings`, rankingChallenge] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCreditMutation = useMutation({
    mutationFn: async (creditId: string) => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/consultation/credits/${creditId}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Credit entry removed");
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/consultation/credits`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/consultation/rankings`, rankingChallenge] });
    },
    onError: () => toast.error("Failed to delete credit"),
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const body: any = { title: newSession.title, capacity: newSession.capacity };
      if (newSession.scheduledAt) body.scheduledAt = new Date(newSession.scheduledAt).toISOString();
      if (newSession.externalMeetingLink) body.externalMeetingLink = newSession.externalMeetingLink;
      if (newSession.notes) body.notes = newSession.notes;
      if (newSession.consultantUserId) body.consultantUserId = newSession.consultantUserId;
      const res = await fetch(`/api/workspaces/${orgId}/admin/consultation/sessions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Session created");
      setNewSession({ title: "", scheduledAt: "", capacity: 3, externalMeetingLink: "", notes: "", consultantUserId: "" });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/consultation/sessions`] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignConsultantMutation = useMutation({
    mutationFn: async ({ sessionId, consultantUserId }: { sessionId: string; consultantUserId: string | null }) => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/consultation/sessions/${sessionId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ consultantUserId: consultantUserId || null }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Consultant assigned");
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/consultation/sessions`] });
    },
    onError: () => toast.error("Failed to assign consultant"),
  });

  const updateSessionStatusMutation = useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: string }) => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/consultation/sessions/${sessionId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Session updated");
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/consultation/sessions`] });
    },
    onError: () => toast.error("Failed to update session"),
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/consultation/bookings/${bookingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Booking updated");
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/consultation/sessions/${expandedSession}/bookings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/consultation/sessions`] });
    },
    onError: () => toast.error("Failed to update booking"),
  });

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        workspaceSlug={slug!}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Consultation</h1>
              <p className="text-sm text-muted-foreground">
                Manage credits, eligibility rules, and participant rankings for consultation access.
              </p>
            </div>
          </div>

          <Tabs defaultValue="credits">
            <TabsList>
              <TabsTrigger value="credits"><HandCoins className="w-4 h-4 mr-1.5" />Award Credits</TabsTrigger>
              <TabsTrigger value="rankings"><Trophy className="w-4 h-4 mr-1.5" />Rankings</TabsTrigger>
              <TabsTrigger value="sessions"><CalendarCheck className="w-4 h-4 mr-1.5" />Sessions</TabsTrigger>
              <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1.5" />Analytics</TabsTrigger>
              <TabsTrigger value="settings"><Settings2 className="w-4 h-4 mr-1.5" />Settings</TabsTrigger>
            </TabsList>

            {/* ── Award Credits tab ─────────────────────────────────────── */}
            <TabsContent value="credits" className="space-y-6 mt-4">

              {/* Award form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Award Credits</CardTitle>
                  <CardDescription>Manually award consultation credits to a participant. All entries are logged for audit.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Participant</Label>
                      <Select value={awardUserId} onValueChange={setAwardUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select participant…" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m: any) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.firstName ? `${m.firstName} ${m.lastName ?? ""}`.trim() : m.username}
                              <span className="ml-1.5 text-xs text-muted-foreground">({m.role})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Credits</Label>
                      <Input
                        type="number" min={1} max={1000}
                        value={awardCredits}
                        onChange={e => setAwardCredits(Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Challenge (optional)</Label>
                      <Select value={awardChallenge} onValueChange={setAwardChallenge}>
                        <SelectTrigger>
                          <SelectValue placeholder="All competitions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No specific challenge</SelectItem>
                          {challenges.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Reason (optional)</Label>
                      <Input
                        placeholder="e.g. Strong pitch deck, community contribution"
                        value={awardReason}
                        onChange={e => setAwardReason(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => awardCreditMutation.mutate()}
                    disabled={!awardUserId || awardCredits < 1 || awardCreditMutation.isPending}
                  >
                    {awardCreditMutation.isPending ? "Awarding…" : "Award Credits"}
                  </Button>
                </CardContent>
              </Card>

              {/* Credit ledger */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Credit Ledger</CardTitle>
                  <CardDescription>Full audit log of all credits awarded in this workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                  {credits.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No credits awarded yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Participant</TableHead>
                          <TableHead>Credits</TableHead>
                          <TableHead>Challenge</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Awarded by</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {credits.map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.participantName}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">+{c.credits}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.challengeName ?? "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.reason ?? "—"}</TableCell>
                            <TableCell className="text-sm">{c.awardedByName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {c.createdAt ? format(new Date(c.createdAt), "MMM d, yyyy") : "—"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => deleteCreditMutation.mutate(c.id)}
                                disabled={deleteCreditMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Rankings tab ──────────────────────────────────────────── */}
            <TabsContent value="rankings" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
                  <div>
                    <CardTitle className="text-base">Participant Rankings</CardTitle>
                    <CardDescription>
                      Ranked by total awarded credits. Top {rankingsData?.config?.maxEligible ?? 3} with ≥{rankingsData?.config?.minCredits ?? 10} credits are eligible.
                    </CardDescription>
                  </div>
                  <div className="w-56">
                    <Select value={rankingChallenge} onValueChange={v => { setRankingChallenge(v); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All challenges" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All challenges</SelectItem>
                        {challenges.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {!rankingsData?.rankings?.length ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No credit data yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Rank</TableHead>
                          <TableHead>Participant</TableHead>
                          <TableHead>Total Credits</TableHead>
                          <TableHead>Eligibility</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankingsData.rankings.map((r: any) => (
                          <TableRow key={r.userId}>
                            <TableCell className="font-bold text-muted-foreground">
                              {r.rank <= 3 ? (
                                <Medal className={`w-4 h-4 inline-block mr-1 ${r.rank === 1 ? "text-yellow-500" : r.rank === 2 ? "text-slate-400" : "text-amber-600"}`} />
                              ) : null}
                              #{r.rank}
                            </TableCell>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{r.totalCredits} pts</Badge>
                            </TableCell>
                            <TableCell>
                              {r.isEligible ? (
                                <Badge className="bg-green-500/15 text-green-700 border-green-200">Eligible</Badge>
                              ) : (
                                <Badge variant="secondary">Not Eligible</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Sessions tab ──────────────────────────────────────────── */}
            <TabsContent value="sessions" className="space-y-6 mt-4">

              {/* Create session form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Create Session</CardTitle>
                  <CardDescription>Create a consultation session that eligible participants can book.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Session Title</Label>
                      <Input
                        placeholder="e.g. 1-on-1 Business Model Review"
                        value={newSession.title}
                        onChange={e => setNewSession(s => ({ ...s, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Scheduled Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={newSession.scheduledAt}
                        onChange={e => setNewSession(s => ({ ...s, scheduledAt: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Capacity (# of participants)</Label>
                      <Input
                        type="number" min={1} max={100}
                        value={newSession.capacity}
                        onChange={e => setNewSession(s => ({ ...s, capacity: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Assign Consultant (optional)</Label>
                      <Select
                        value={newSession.consultantUserId || "__none__"}
                        onValueChange={v => setNewSession(s => ({ ...s, consultantUserId: v === "__none__" ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select consultant…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No consultant assigned</SelectItem>
                          {consultants.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.firstName ? `${c.firstName} ${c.lastName ?? ""}`.trim() : c.username ?? c.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Meeting Link (optional)</Label>
                      <Input
                        placeholder="https://meet.google.com/…"
                        value={newSession.externalMeetingLink}
                        onChange={e => setNewSession(s => ({ ...s, externalMeetingLink: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        placeholder="Internal notes about this session…"
                        className="resize-none h-20"
                        value={newSession.notes}
                        onChange={e => setNewSession(s => ({ ...s, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => createSessionMutation.mutate()}
                    disabled={!newSession.title || createSessionMutation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    {createSessionMutation.isPending ? "Creating…" : "Create Session"}
                  </Button>
                </CardContent>
              </Card>

              {/* Sessions list */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sessions</CardTitle>
                  <CardDescription>All consultation sessions for this workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No sessions created yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((s: any) => (
                        <div key={s.id} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center gap-3 p-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm">{s.title}</p>
                                <Badge variant={s.status === "ACTIVE" ? "default" : s.status === "COMPLETED" ? "outline" : "destructive"} className="text-xs">
                                  {s.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {s.scheduledAt ? format(new Date(s.scheduledAt), "MMM d, yyyy · h:mm a") : "Time TBD"}
                                {" · "}
                                <Users className="w-3 h-3 inline" /> {s.filledSlots ?? s.activeBookings ?? 0}/{s.capacity} booked
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-xs text-muted-foreground">Consultant:</span>
                                <Select
                                  value={s.consultantUserId ?? "__none__"}
                                  onValueChange={v => assignConsultantMutation.mutate({ sessionId: s.id, consultantUserId: v === "__none__" ? null : v })}
                                  disabled={assignConsultantMutation.isPending}
                                >
                                  <SelectTrigger className="h-6 text-xs w-44 py-0">
                                    <SelectValue placeholder="Assign…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Unassigned</SelectItem>
                                    {consultants.map((c: any) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.firstName ? `${c.firstName} ${c.lastName ?? ""}`.trim() : c.username ?? c.email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {s.status === "ACTIVE" && (
                                <>
                                  <Button
                                    variant="outline" size="sm"
                                    onClick={() => updateSessionStatusMutation.mutate({ sessionId: s.id, status: "COMPLETED" })}
                                    disabled={updateSessionStatusMutation.isPending}
                                  >
                                    Complete
                                  </Button>
                                  <Button
                                    variant="ghost" size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => updateSessionStatusMutation.mutate({ sessionId: s.id, status: "CANCELLED" })}
                                    disabled={updateSessionStatusMutation.isPending}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8"
                                onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
                              >
                                {expandedSession === s.id
                                  ? <ChevronUp className="w-4 h-4" />
                                  : <ChevronDown className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>

                          {/* Expanded bookings */}
                          {expandedSession === s.id && (
                            <div className="border-t bg-muted/30 p-4">
                              {sessionBookings.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No bookings yet.</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Participant</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Booked At</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sessionBookings.map((b: any) => (
                                      <TableRow key={b.id}>
                                        <TableCell>
                                          <p className="text-sm font-medium">{b.participantName}</p>
                                          {b.participantEmail && <p className="text-xs text-muted-foreground">{b.participantEmail}</p>}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant={b.status === "CONFIRMED" ? "default" : b.status === "CANCELLED" ? "destructive" : "secondary"}>
                                            {b.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                          {b.bookedAt ? format(new Date(b.bookedAt), "MMM d, yyyy") : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            {b.status === "PENDING" && (
                                              <Button
                                                variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                                                title="Confirm booking"
                                                onClick={() => updateBookingMutation.mutate({ bookingId: b.id, status: "CONFIRMED" })}
                                                disabled={updateBookingMutation.isPending}
                                              >
                                                <CheckCircle className="w-4 h-4" />
                                              </Button>
                                            )}
                                            {b.status !== "CANCELLED" && (
                                              <Button
                                                variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                                title="Cancel booking"
                                                onClick={() => updateBookingMutation.mutate({ bookingId: b.id, status: "CANCELLED" })}
                                                disabled={updateBookingMutation.isPending}
                                              >
                                                <XCircle className="w-4 h-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Analytics tab ─────────────────────────────────────────── */}
            <TabsContent value="analytics" className="space-y-6 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Sessions", value: analytics?.totalSessions ?? "—", sub: `${analytics?.completedSessions ?? 0} completed`, icon: CalendarCheck, color: "text-violet-600", bg: "bg-violet-500/10" },
                  { label: "Credits Awarded", value: analytics?.totalCreditsAwarded ?? "—", sub: `${analytics?.uniqueParticipantsWithCredits ?? 0} participants`, icon: HandCoins, color: "text-amber-600", bg: "bg-amber-500/10" },
                  { label: "No-Shows", value: analytics?.noShows ?? "—", sub: "unconfirmed on completed sessions", icon: AlertCircle, color: "text-red-600", bg: "bg-red-500/10" },
                  { label: "Utilisation", value: analytics ? `${analytics.utilizationRate}%` : "—", sub: `${analytics?.uniqueParticipantsWithCredits ?? 0} of ${workspace?.consultationMaxEligible ?? "?"} eligible`, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                ].map(card => (
                  <div key={card.label} className="border rounded-xl p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${card.bg} shrink-0`}>
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold leading-tight">{analytics === undefined ? "…" : card.value}</p>
                      <p className="text-xs font-medium text-foreground">{card.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{card.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Session breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-500" />Session Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Active", value: analytics?.activeSessions ?? 0, color: "bg-blue-500" },
                      { label: "Completed", value: analytics?.completedSessions ?? 0, color: "bg-emerald-500" },
                      { label: "Total", value: analytics?.totalSessions ?? 0, color: "bg-gray-300" },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">{row.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${row.color} rounded-full transition-all`}
                            style={{ width: analytics?.totalSessions > 0 ? `${Math.round((row.value / analytics.totalSessions) * 100)}%` : "0%" }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-6 text-right">{row.value}</span>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">Completion rate: <span className="font-semibold text-foreground">{analytics?.completionRate ?? 0}%</span></p>
                  </CardContent>
                </Card>

                {/* Booking breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" />Booking Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Confirmed", value: analytics?.confirmedBookings ?? 0, color: "bg-emerald-500" },
                      { label: "Pending", value: analytics?.pendingBookings ?? 0, color: "bg-amber-500" },
                      { label: "Cancelled", value: analytics?.cancelledBookings ?? 0, color: "bg-red-400" },
                      { label: "No-shows", value: analytics?.noShows ?? 0, color: "bg-rose-600" },
                    ].map(row => {
                      const total = (analytics?.confirmedBookings ?? 0) + (analytics?.pendingBookings ?? 0) + (analytics?.cancelledBookings ?? 0);
                      return (
                        <div key={row.label} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-20 shrink-0">{row.label}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${row.color} rounded-full transition-all`}
                              style={{ width: total > 0 ? `${Math.round((row.value / total) * 100)}%` : "0%" }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-6 text-right">{row.value}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Settings tab ──────────────────────────────────────────── */}
            <TabsContent value="settings" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Consultation Settings</CardTitle>
                  <CardDescription>Configure eligibility rules for consultation access.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Enable Consultation</p>
                      <p className="text-xs text-muted-foreground">Show the consultation section to eligible participants.</p>
                    </div>
                    <Switch checked={consultationEnabled} onCheckedChange={setConsultationEnabled} />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label>Minimum Credits Required</Label>
                      <p className="text-xs text-muted-foreground">Participants need at least this many credits to be eligible.</p>
                      <Input
                        type="number" min={0}
                        value={consultationMinCredits}
                        onChange={e => setConsultationMinCredits(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max Eligible Participants (Top N)</Label>
                      <p className="text-xs text-muted-foreground">Only the top N participants by credits can access consultation.</p>
                      <Input
                        type="number" min={1}
                        value={consultationMaxEligible}
                        onChange={e => setConsultationMaxEligible(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => saveConfigMutation.mutate()}
                    disabled={saveConfigMutation.isPending}
                  >
                    {saveConfigMutation.isPending ? "Saving…" : "Save Settings"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
