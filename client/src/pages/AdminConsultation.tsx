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
import { toast } from "sonner";
import { HandCoins, Trophy, Settings2, Trash2, Medal } from "lucide-react";
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
