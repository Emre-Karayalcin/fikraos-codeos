import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid, Lightbulb, Calendar, User, ExternalLink, GripVertical } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface IdeasOverviewProps {
  orgId: string;
}

type IdeaStatus = 'Submitted' | 'Evaluated' | 'Qualified' | 'Dismissed';
type ViewMode = 'table' | 'kanban';

interface Idea {
  id: string;
  title: string;
  description?: string;
  status?: IdeaStatus;
  createdAt: string;
  createdById: string;
  tags?: string[];
}

export default function IdeasOverview({ orgId }: IdeasOverviewProps) {
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch organization ideas (projects)
  const { data: ideas, isLoading } = useQuery({
    queryKey: ['/api/organizations', orgId, 'admin', 'ideas'],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${orgId}/admin/ideas`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch ideas');
      const data = await response.json();
      // Add default status to ideas that don't have one
      return data.map((idea: any) => ({
        ...idea,
        status: idea.status || 'Submitted'
      }));
    }
  });

  // Update idea status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ideaId, status }: { ideaId: string; status: IdeaStatus }) => {
      const response = await fetch(`/api/organizations/${orgId}/admin/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update idea status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', orgId, 'admin', 'ideas']
      });
      toast({
        title: "Status updated",
        description: "Idea status has been successfully updated."
      });
    },
    onError: () => {
      toast({
        title: "Error updating status",
        description: "Failed to update idea status. Please try again.",
        variant: "destructive"
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: IdeaStatus) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Evaluated': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Qualified': return 'bg-green-100 text-green-800 border-green-300';
      case 'Dismissed': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleDragStart = (e: React.DragEvent, ideaId: string) => {
    e.dataTransfer.setData('text/plain', ideaId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: IdeaStatus) => {
    e.preventDefault();
    const ideaId = e.dataTransfer.getData('text/plain');
    if (ideaId) {
      updateStatusMutation.mutate({ ideaId, status: newStatus });
    }
  };

  const groupIdeasByStatus = (ideas: Idea[]) => {
    const statuses: IdeaStatus[] = ['Submitted', 'Evaluated', 'Qualified', 'Dismissed'];
    return statuses.reduce((acc, status) => {
      acc[status] = ideas.filter(idea => idea.status === status);
      return acc;
    }, {} as Record<IdeaStatus, Idea[]>);
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

  const renderTableView = () => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Idea</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas?.map((idea: Idea) => (
            <TableRow key={idea.id} data-testid={`row-idea-${idea.id}`}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium" data-testid={`text-idea-${idea.id}-title`}>
                      {idea.title}
                    </div>
                    {idea.description && (
                      <div className="text-sm text-text-secondary line-clamp-1">
                        {idea.description}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  className={getStatusColor(idea.status || 'Submitted')}
                  data-testid={`badge-idea-${idea.id}-status`}
                >
                  {idea.status || 'Submitted'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-text-secondary">
                {formatDate(idea.createdAt)}
              </TableCell>
              <TableCell className="text-sm text-text-secondary">
                {idea.createdById.slice(0, 8)}...
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(`/chat/${idea.id}`)}
                  data-testid={`button-view-idea-${idea.id}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderKanbanView = () => {
    const groupedIdeas = groupIdeasByStatus(ideas || []);
    const statuses: IdeaStatus[] = ['Submitted', 'Evaluated', 'Qualified', 'Dismissed'];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statuses.map((status) => (
          <div
            key={status}
            className="bg-muted/30 rounded-lg p-4 min-h-[500px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
            data-testid={`column-${status.toLowerCase()}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold">{status}</h3>
              <Badge variant="secondary" className="text-xs">
                {groupedIdeas[status]?.length || 0}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {groupedIdeas[status]?.map((idea) => (
                <div
                  key={idea.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idea.id)}
                  className="bg-card border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow"
                  data-testid={`card-kanban-idea-${idea.id}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <GripVertical className="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2" data-testid={`text-kanban-idea-${idea.id}-title`}>
                        {idea.title}
                      </h4>
                      {idea.description && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {idea.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(idea.createdAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setLocation(`/chat/${idea.id}`)}
                      data-testid={`button-kanban-view-idea-${idea.id}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="text-ideas-overview-title">
              <List className="w-5 h-5" />
              Ideas Overview
            </CardTitle>
            <CardDescription>
              All ideas submitted to this workspace ({ideas?.length || 0} total)
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              data-testid="button-table-view"
            >
              <List className="w-4 h-4 mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              data-testid="button-kanban-view"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Kanban
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!ideas || ideas.length === 0 ? (
          <div className="text-center py-12" data-testid="card-no-ideas">
            <Lightbulb className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Ideas Yet</h3>
            <p className="text-text-secondary mb-4">
              No ideas have been submitted to this workspace yet.
            </p>
            <Button
              onClick={() => setLocation('/dashboard')}
              data-testid="button-create-first-idea"
            >
              Create First Idea
            </Button>
          </div>
        ) : (
          viewMode === 'table' ? renderTableView() : renderKanbanView()
        )}
      </CardContent>
    </Card>
  );
}