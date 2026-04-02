import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { MessageSquare, Star } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function AdminMentorFeedback() {
  const { slug } = useParams<{ slug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterMentorId, setFilterMentorId] = useState("all");
  const [filterMinRating, setFilterMinRating] = useState("all");

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const orgId = workspace?.id;

  const params = new URLSearchParams();
  if (filterMentorId && filterMentorId !== "all") params.set("mentorId", filterMentorId);
  if (filterMinRating && filterMinRating !== "all") params.set("minRating", filterMinRating);

  const { data: feedback = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/mentor-feedback`, filterMentorId, filterMinRating],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/mentor-feedback?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  // Collect unique mentor names from results
  const mentors = Array.from(new Map(feedback.map(f => [f.mentorProfileId, f.mentorName])).entries());

  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
    : "—";

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Mentor Feedback</h1>
              <p className="text-muted-foreground">Session ratings and feedback from participants</p>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold mt-1">{feedback.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold">{avgRating}</p>
                  {avgRating !== "—" && <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />}
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">5-Star Reviews</p>
                <p className="text-2xl font-bold mt-1">{feedback.filter(f => f.rating === 5).length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={filterMentorId} onValueChange={setFilterMentorId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All mentors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All mentors</SelectItem>
                {mentors.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name || id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMinRating} onValueChange={setFilterMinRating}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Min rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                <SelectItem value="5">5 stars only</SelectItem>
                <SelectItem value="4">4+ stars</SelectItem>
                <SelectItem value="3">3+ stars</SelectItem>
                <SelectItem value="2">2+ stars</SelectItem>
              </SelectContent>
            </Select>
            {(filterMentorId !== "all" || filterMinRating !== "all") && (
              <Button variant="outline" size="sm" onClick={() => { setFilterMentorId("all"); setFilterMinRating("all"); }}>
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Feedback Records</CardTitle>
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
                      <TableHead>Mentor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Member Rating</TableHead>
                      <TableHead>Goal Met</TableHead>
                      <TableHead>Recommend</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Areas Coached</TableHead>
                      <TableHead>Member Feedback</TableHead>
                      <TableHead>Mentor Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedback.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                          No feedback records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      feedback.map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {f.memberFirstName} {f.memberLastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{f.mentorName || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{f.bookedDate}</TableCell>
                          <TableCell>
                            {f.rating ? <StarRating rating={f.rating} /> : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {f.sessionGoalMet === true ? (
                              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">Yes</span>
                            ) : f.sessionGoalMet === false ? (
                              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs">No</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {f.wouldRecommend === true ? (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">Yes</span>
                            ) : f.wouldRecommend === false ? (
                              <span className="text-xs text-muted-foreground">No</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {f.participantEngagement ? (
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map((s) => (
                                  <Star key={s} className={`w-3 h-3 ${s <= f.participantEngagement ? "fill-primary text-primary" : "text-muted-foreground/20"}`} />
                                ))}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm max-w-[160px]">
                            {f.areasCoached?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {f.areasCoached.map((a: string) => (
                                  <span key={a} className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{a}</span>
                                ))}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs">
                            <p className="truncate text-muted-foreground" title={f.feedback}>{f.feedback || "—"}</p>
                          </TableCell>
                          <TableCell className="text-sm max-w-xs">
                            <p className="truncate text-muted-foreground" title={f.mentorFeedback}>{f.mentorFeedback || "—"}</p>
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
