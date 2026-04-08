import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2, CalendarCheck, Phone, Trophy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface EligibilityData {
  consultationEnabled: boolean;
  status: "NOT_ELIGIBLE" | "ELIGIBLE" | "BOOKED";
  totalCredits: number;
  minCredits: number;
  maxEligible: number;
  rank: number | null;
  booking: {
    id: string;
    status: "PENDING" | "CONFIRMED" | "CANCELLED";
    bookedAt: string;
    sessionId: string;
  } | null;
  sessionDetails: {
    title: string;
    scheduledAt: string | null;
    externalMeetingLink: string | null;
  } | null;
}

export default function ConsultationPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orgData } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const orgId = orgData?.id;

  const { data: eligibility, isLoading } = useQuery<EligibilityData>({
    queryKey: [`/api/workspaces/${orgId}/consultation/eligibility`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/consultation/eligibility`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: availableSessions = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/consultation/sessions`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/consultation/sessions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId && eligibility?.status === "ELIGIBLE",
  });

  const bookMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/workspaces/${orgId}/consultation/sessions/${sessionId}/book`, {
        method: "POST", credentials: "include",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Booking confirmed! You will receive a confirmation email.");
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/consultation/eligibility`] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !eligibility) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!eligibility.consultationEnabled) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center gap-4">
            <Lock className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">Consultation is not available in this workspace yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { status, totalCredits, minCredits, maxEligible, rank, booking, sessionDetails } = eligibility;
  const creditProgress = Math.min((totalCredits / minCredits) * 100, 100);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consultation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          One-on-one expert consultation sessions for eligible participants.
        </p>
      </div>

      {/* Status Card */}
      {status === "NOT_ELIGIBLE" && (
        <Card className="border-dashed border-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Not Eligible Yet</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Meet the credit requirements to unlock consultation access.
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">Locked</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Your credits</span>
                <span className="font-medium">{totalCredits} / {minCredits} required</span>
              </div>
              <Progress value={creditProgress} className="h-2" />
            </div>

            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
              <p className="font-medium">Eligibility requirements:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className={`flex items-center gap-2 ${totalCredits >= minCredits ? "text-green-600" : ""}`}>
                  {totalCredits >= minCredits
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                    : <Lock className="w-4 h-4 shrink-0" />}
                  Earn at least {minCredits} consultation credits
                </li>
                <li className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 shrink-0" />
                  Rank in the top {maxEligible} participants by credits
                  {rank !== null && <span className="text-xs ml-1">(your rank: #{rank})</span>}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "ELIGIBLE" && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base text-green-800">You Are Eligible!</CardTitle>
                <p className="text-sm text-green-700 mt-0.5">
                  You qualify for a consultation session.
                </p>
              </div>
              <Badge className="ml-auto bg-green-600">Eligible</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-white border border-green-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your credits</span>
                <span className="font-semibold text-green-700">{totalCredits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your rank</span>
                <span className="font-semibold">#{rank}</span>
              </div>
            </div>

            {availableSessions.length === 0 ? (
              <div className="rounded-lg bg-white border border-green-200 p-4 flex items-start gap-3 text-sm">
                <Phone className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
                <p className="text-muted-foreground">
                  No sessions are available at the moment. A PMO team member will reach out to schedule your consultation session.
                  Please ensure your contact details are up to date in your profile.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Available Sessions</p>
                {availableSessions.map((s: any) => (
                  <div key={s.id} className="rounded-lg bg-white border border-green-200 p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.scheduledAt ? format(new Date(s.scheduledAt), "EEEE, MMM d · h:mm a") : "Time TBD"}
                        {" · "}
                        {s.capacity - (s.filledSlots ?? 0)} spot{s.capacity - (s.filledSlots ?? 0) !== 1 ? "s" : ""} left
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => bookMutation.mutate(s.id)}
                      disabled={bookMutation.isPending}
                    >
                      {bookMutation.isPending ? "Booking…" : "Book"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {status === "BOOKED" && booking && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Consultation Booked</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your consultation session is confirmed.
                </p>
              </div>
              <Badge className="ml-auto">
                {booking.status === "CONFIRMED" ? "Confirmed" : "Pending"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-white border p-4 space-y-2 text-sm">
              {sessionDetails?.title && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session</span>
                  <span className="font-medium">{sessionDetails.title}</span>
                </div>
              )}
              {sessionDetails?.scheduledAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span className="font-medium">{format(new Date(sessionDetails.scheduledAt), "EEEE, MMM d · h:mm a")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booked on</span>
                <span className="font-medium">{format(new Date(booking.bookedAt), "MMM d, yyyy · h:mm a")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{booking.status.toLowerCase()}</span>
              </div>
            </div>
            {booking.status === "CONFIRMED" && sessionDetails?.externalMeetingLink && (
              <a
                href={sessionDetails.externalMeetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Join Meeting
              </a>
            )}
            {booking.status !== "CONFIRMED" && (
              <p className="text-xs text-muted-foreground">
                You will receive a confirmation email once your booking is approved. Contact the PMO team for any changes.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
