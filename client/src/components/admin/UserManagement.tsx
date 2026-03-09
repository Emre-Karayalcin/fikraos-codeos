import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import toast from 'react-hot-toast';
import { Users, UserPlus, MoreHorizontal, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const inviteUserSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  role: z.enum(["MEMBER", "MENTOR", "ADMIN"])
});

type InviteUserForm = z.infer<typeof inviteUserSchema>;

interface UserManagementProps {
  orgId: string;
}

export default function UserManagement({ orgId }: UserManagementProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);

  const form = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      role: "MEMBER"
    }
  });

  // Fetch organization members
  const { data: members, isLoading } = useQuery({
    queryKey: ['/api/organizations', orgId, 'admin', 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${orgId}/admin/members`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    }
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: InviteUserForm) => {
      const response = await fetch(`/api/organizations/${orgId}/admin/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to invite user');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(t('admin.userManagement.invite.success.description'));
      form.reset();
      setShowInviteForm(false);
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', orgId, 'admin', 'members']
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('admin.userManagement.invite.error.description'));
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(`/api/organizations/${orgId}/admin/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update role');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(t('admin.userManagement.role.success.description'));
       
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', orgId, 'admin', 'members']
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('admin.userManagement.role.error.description'));
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/organizations/${orgId}/admin/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove member');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(t('admin.userManagement.remove.success.description'));
       
      setMemberToRemove(null);
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', orgId, 'admin', 'members']
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('admin.userManagement.remove.error.description'));
    }
  });

  const onSubmit = (data: InviteUserForm) => {
    inviteUserMutation.mutate(data);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER': return 'default';
      case 'ADMIN': return 'secondary';
      case 'MENTOR': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-row">
            <div>
              <CardTitle className="flex items-center gap-2 flex-row" data-testid="text-user-management-title">
                <Users className="w-5 h-5" />
                {t('admin.userManagement.title')}
              </CardTitle>
              <CardDescription className="ltr:text-left rtl:text-right">
                {t('admin.userManagement.description')}
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowInviteForm(!showInviteForm)}
              data-testid="button-toggle-invite"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t('admin.userManagement.inviteUser')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showInviteForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg ltr:text-left rtl:text-right" data-testid="text-invite-form-title">
                  {t('admin.userManagement.invite.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="ltr:text-left rtl:text-right">
                            {t('admin.userManagement.invite.fields.email')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('admin.userManagement.invite.fields.emailPlaceholder')}
                              type="email"
                              {...field}
                              data-testid="input-invite-email"
                              dir="auto"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="ltr:text-left rtl:text-right">
                            {t('admin.userManagement.invite.fields.role')}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-invite-role">
                                <SelectValue placeholder={t('admin.userManagement.invite.fields.rolePlaceholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MEMBER">
                                {t('admin.userManagement.roles.member')}
                              </SelectItem>
                              <SelectItem value="MENTOR">
                                {t('admin.userManagement.roles.mentor')}
                              </SelectItem>
                              <SelectItem value="ADMIN">
                                {t('admin.userManagement.roles.admin')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 flex-row">
                      <Button
                        type="submit"
                        disabled={inviteUserMutation.isPending}
                        data-testid="button-send-invite"
                      >
                        {inviteUserMutation.isPending 
                          ? t('admin.userManagement.invite.inviting')
                          : t('admin.userManagement.invite.sendInvite')
                        }
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowInviteForm(false)}
                        data-testid="button-cancel-invite"
                      >
                        {t('admin.userManagement.invite.cancel')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Members Table */}
          <div className="space-y-4">
            <h4 className="font-semibold ltr:text-left rtl:text-right" data-testid="text-members-list-title">
              {t('admin.userManagement.members.title', { count: members?.length || 0 })}
            </h4>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="ltr:text-left rtl:text-right">
                      {t('admin.userManagement.table.user')}
                    </TableHead>
                    <TableHead className="ltr:text-left rtl:text-right">
                      {t('admin.userManagement.table.email')}
                    </TableHead>
                    <TableHead className="ltr:text-left rtl:text-right">
                      {t('admin.userManagement.table.role')}
                    </TableHead>
                    <TableHead className="ltr:text-left rtl:text-right">
                      {t('admin.userManagement.table.joined')}
                    </TableHead>
                    <TableHead className="ltr:text-right rtl:text-left">
                      {t('admin.userManagement.table.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map((member: any) => (
                    <TableRow key={member.user.id} data-testid={`row-member-${member.user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3 flex-row">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-sm font-bold text-white">
                            {member.user.username?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium ltr:text-left rtl:text-right" data-testid={`text-member-${member.user.id}-name`}>
                              {member.user.username || t('admin.userManagement.unknownUser')}
                            </div>
                            {member.user?.status === 'PENDING' && (
                              <Badge variant="destructive" className="text-xs h-5 px-2">
                                {t('admin.userManagement.status.pending') ?? 'PENDING'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-text-secondary flex-row">
                          <Mail className="w-3 h-3" />
                          <span className="ltr:text-left rtl:text-right">{member.user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getRoleBadgeVariant(member.role)}
                          data-testid={`badge-member-${member.user.id}-role`}
                        >
                          {t(`admin.userManagement.roles.${member.role.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary ltr:text-left rtl:text-right">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="ltr:text-right rtl:text-left">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-member-${member.user.id}-menu`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role !== 'OWNER' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => updateRoleMutation.mutate({ userId: member.user.id, role: 'MEMBER' })}
                                  disabled={member.role === 'MEMBER'}
                                >
                                  {t('admin.userManagement.actions.makeMember')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateRoleMutation.mutate({ userId: member.user.id, role: 'MENTOR' })}
                                  disabled={member.role === 'MENTOR'}
                                >
                                  {t('admin.userManagement.actions.makeMentor')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateRoleMutation.mutate({ userId: member.user.id, role: 'ADMIN' })}
                                  disabled={member.role === 'ADMIN'}
                                >
                                  {t('admin.userManagement.actions.makeAdmin')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setMemberToRemove(member)}
                                  className="text-destructive"
                                >
                                  {t('admin.userManagement.actions.removeFromWorkspace')}
                                </DropdownMenuItem>
                              </>
                            )}
                            {member.role === 'OWNER' && (
                              <DropdownMenuItem disabled>
                                {t('admin.userManagement.actions.ownerCannotModify')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remove member confirmation dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="ltr:text-left rtl:text-right">
              {t('admin.userManagement.remove.dialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="ltr:text-left rtl:text-right">
              {t('admin.userManagement.remove.dialog.description', { 
                username: memberToRemove?.user.username 
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row">
            <AlertDialogCancel data-testid="button-cancel-remove">
              {t('admin.userManagement.remove.dialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMemberMutation.mutate(memberToRemove?.user.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove"
            >
              {t('admin.userManagement.remove.dialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}