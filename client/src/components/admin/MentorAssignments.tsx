import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, X, Users, GraduationCap } from "lucide-react";
import toast from "react-hot-toast";

interface MemberInfo {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  profileImageUrl?: string;
}

interface AssignmentRow {
  id: string;
  mentorUserId: string;
  memberUserId: string;
  mentorFirstName?: string;
  mentorLastName?: string;
  mentorEmail: string;
  mentorProfileImageUrl?: string;
  memberInfo: MemberInfo | null;
  createdAt: string;
}

interface OrgMember {
  user: MemberInfo;
  role: string;
}

function initials(first?: string, last?: string, email?: string) {
  if (first || last) return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
  return email?.[0]?.toUpperCase() ?? "?";
}

function fullName(first?: string, last?: string, email?: string) {
  const n = `${first ?? ""} ${last ?? ""}`.trim();
  return n || email || "Unknown";
}

export function MentorAssignments({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // All assignments
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<AssignmentRow[]>({
    queryKey: ["/api/organizations", orgId, "mentor-assignments"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/mentor-assignments`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  // All org members
  const { data: members = [], isLoading: loadingMembers } = useQuery<OrgMember[]>({
    queryKey: ["/api/organizations", orgId, "admin/members"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/admin/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  const mentors = members.filter((m) => m.role === "MENTOR");
  const participants = members.filter((m) => m.role === "MEMBER");

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/mentor-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mentorUserId: selectedMentorId, memberUserId: selectedMemberId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to assign");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/organizations", orgId, "mentor-assignments"] });
      setSelectedMemberId("");
      toast.success("Member assigned to mentor");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/organizations/${orgId}/mentor-assignments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/organizations", orgId, "mentor-assignments"] });
      toast.success("Assignment removed");
    },
    onError: () => toast.error("Failed to remove assignment"),
  });

  // Group assignments by mentor
  const byMentor: Record<string, AssignmentRow[]> = {};
  for (const a of assignments) {
    if (!byMentor[a.mentorUserId]) byMentor[a.mentorUserId] = [];
    byMentor[a.mentorUserId].push(a);
  }

  // Check which members are already assigned to the selected mentor
  const alreadyAssigned = new Set(
    selectedMentorId ? (byMentor[selectedMentorId] ?? []).map((a) => a.memberUserId) : []
  );

  if (loadingAssignments || loadingMembers) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assign form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Assign Member to Mentor
          </CardTitle>
          <CardDescription>
            Select a mentor and a participant member to link them. The mentor will see the assigned participant's ideas and pitch decks in their dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mentors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No mentors found. Add users with the <strong>MENTOR</strong> role in the Members tab first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground">Mentor</label>
                <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mentor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {mentors.map((m) => (
                      <SelectItem key={m.user.id} value={m.user.id}>
                        {fullName(m.user.firstName, m.user.lastName, m.user.email)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground">Member (participant)</label>
                <Select
                  value={selectedMemberId}
                  onValueChange={setSelectedMemberId}
                  disabled={!selectedMentorId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants
                      .filter((m) => !alreadyAssigned.has(m.user.id))
                      .map((m) => (
                        <SelectItem key={m.user.id} value={m.user.id}>
                          {fullName(m.user.firstName, m.user.lastName, m.user.email)}
                        </SelectItem>
                      ))}
                    {participants.filter((m) => !alreadyAssigned.has(m.user.id)).length === 0 && (
                      <SelectItem value="__none" disabled>
                        All members are already assigned to this mentor
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => assignMutation.mutate()}
                disabled={!selectedMentorId || !selectedMemberId || assignMutation.isPending}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {assignMutation.isPending ? "Assigning…" : "Assign"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current assignments grouped by mentor */}
      <div className="space-y-4">
        {mentors.length === 0 && assignments.length === 0 ? null : (
          <>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Current Assignments
            </h3>

            {mentors.map((mentor) => {
              const mentorAssignmentList = byMentor[mentor.user.id] ?? [];
              return (
                <Card key={mentor.user.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={mentor.user.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {initials(mentor.user.firstName, mentor.user.lastName, mentor.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {fullName(mentor.user.firstName, mentor.user.lastName, mentor.user.email)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{mentor.user.email}</p>
                      </div>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {mentorAssignmentList.length} participant{mentorAssignmentList.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  {mentorAssignmentList.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {mentorAssignmentList.map((a) => {
                          const member = a.memberInfo;
                          return (
                            <div
                              key={a.id}
                              className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-1.5"
                            >
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={member?.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {initials(member?.firstName, member?.lastName, member?.email)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">
                                {fullName(member?.firstName, member?.lastName, member?.email)}
                              </span>
                              <button
                                onClick={() => removeMutation.mutate(a.id)}
                                disabled={removeMutation.isPending}
                                className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                title="Remove assignment"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                  {mentorAssignmentList.length === 0 && (
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground italic">No participants assigned yet.</p>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {mentors.length === 0 && assignments.length > 0 && (
              <p className="text-sm text-muted-foreground">No mentors in this workspace.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
