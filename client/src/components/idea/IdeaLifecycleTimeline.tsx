import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, MessageSquare, Star, FileText, Users, Activity, Zap, Calendar } from 'lucide-react';

interface IdeaLifecycleTimelineProps {
  ideaId: string;
}

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'bg-gray-500',
  UNDER_REVIEW: 'bg-blue-500',
  SHORTLISTED: 'bg-amber-500',
  IN_INCUBATION: 'bg-purple-500',
  ARCHIVED: 'bg-teal-500'
};

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: 'Registration & Idea Evaluation',
  UNDER_REVIEW: 'Program Participation',
  SHORTLISTED: 'Pre-Demo Evaluation & Qualification',
  IN_INCUBATION: 'Demo Day & Final Selection',
  ARCHIVED: 'Results Published'
};

export function IdeaLifecycleTimeline({ ideaId }: IdeaLifecycleTimelineProps) {
  const { data: lifecycle, isLoading } = useQuery({
    queryKey: ['/api/ideas/management', ideaId, 'lifecycle'],
    queryFn: async () => {
      const response = await fetch(`/api/ideas/management/${ideaId}/lifecycle`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch lifecycle data');
      return response.json();
    },
    enabled: !!ideaId
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Lifecycle & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lifecycle || !lifecycle.idea || !lifecycle.metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Lifecycle & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No lifecycle data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const { idea, timeline = [], metrics } = lifecycle;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (days: number) => {
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Lifecycle Summary */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Lifecycle Summary
          </CardTitle>
          <CardDescription>Complete journey from creation to current status</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div className="text-lg font-bold mt-1">{formatDate(idea.createdAt)}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-muted-foreground">Time in Current Status</div>
              <div className="text-lg font-bold mt-1">{idea.daysInCurrentStatus} days</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-muted-foreground">Development Velocity</div>
              <div className="text-lg font-bold mt-1">{metrics.velocity} assets/day</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Key Metrics
          </CardTitle>
          <CardDescription>Comprehensive lifecycle analytics and performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Age */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-6 transition-all hover:shadow-md hover:border-blue-500/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Age</p>
                  <p className="text-4xl font-bold text-foreground">{idea.ageDays}</p>
                  <p className="text-xs text-muted-foreground mt-1">days old</p>
                </div>
                <div className="rounded-full bg-blue-500/20 p-3">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Status Changes */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-6 transition-all hover:shadow-md hover:border-purple-500/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Status Changes</p>
                  <p className="text-4xl font-bold text-foreground">{metrics.totalTransitions}</p>
                  <p className="text-xs text-muted-foreground mt-1">transitions</p>
                </div>
                <div className="rounded-full bg-purple-500/20 p-3">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            {/* AI Outputs */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-6 transition-all hover:shadow-md hover:border-orange-500/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">AI Assets</p>
                  <p className="text-4xl font-bold text-foreground">{metrics.aiOutputsCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">generated</p>
                </div>
                <div className="rounded-full bg-orange-500/20 p-3">
                  <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            {/* Velocity */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-green-500/10 to-green-600/5 p-6 transition-all hover:shadow-md hover:border-green-500/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Velocity</p>
                  <p className="text-4xl font-bold text-foreground">{metrics.velocity}</p>
                  <p className="text-xs text-muted-foreground mt-1">assets per day</p>
                </div>
                <div className="rounded-full bg-green-500/20 p-3">
                  <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Time in Each Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Time in Each Status
          </CardTitle>
          <CardDescription>Duration breakdown showing time spent in different stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.statusDurations && Object.entries(metrics.statusDurations).length > 0 ? (
              Object.entries(metrics.statusDurations).map(([status, duration]) => {
                const durationDays = duration as number;
                const percentage = Math.min((durationDays / idea.ageDays) * 100, 100);
                return (
                  <div key={status} className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${STATUS_COLORS[status] || 'bg-gray-500'}`} />
                        <span className="text-base font-semibold">{STATUS_LABELS[status] || status}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{durationDays} {durationDays === 1 ? 'day' : 'days'}</div>
                        <div className="text-xs text-muted-foreground">{percentage.toFixed(0)}% of total</div>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${STATUS_COLORS[status] || 'bg-gray-500'} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No status history available yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Trends
            </CardTitle>
            <CardDescription>Weekly progress and activity patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Week 1</span>
                <span className="text-sm font-bold">8 activities</span>
              </div>
              <div className="w-full bg-white/50 dark:bg-black/20 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Week 2</span>
                <span className="text-sm font-bold">12 activities</span>
              </div>
              <div className="w-full bg-white/50 dark:bg-black/20 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Week 3</span>
                <span className="text-sm font-bold">6 activities</span>
              </div>
              <div className="w-full bg-white/50 dark:bg-black/20 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Key Milestones
            </CardTitle>
            <CardDescription>Important achievements and events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Concept Validation', date: 'Completed', status: 'complete' },
              { label: 'Market Research', date: 'Completed', status: 'complete' },
              { label: 'Prototype Development', date: 'In Progress', status: 'progress' },
              { label: 'User Testing', date: 'Pending', status: 'pending' }
            ].map((milestone, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    milestone.status === 'complete' ? 'bg-green-500' :
                    milestone.status === 'progress' ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                  <span className="text-sm font-medium">{milestone.label}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  milestone.status === 'complete' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  milestone.status === 'progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>{milestone.date}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Team Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Activity & Contributions
          </CardTitle>
          <CardDescription>Recent contributions from team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Sarah Johnson', action: 'Added 3 new AI outputs', time: '2 hours ago', avatar: 'SJ' },
              { name: 'Michael Chen', action: 'Updated idea status', time: '5 hours ago', avatar: 'MC' },
              { name: 'Emily Davis', action: 'Added market research document', time: '1 day ago', avatar: 'ED' },
              { name: 'Admin', action: 'Created idea', time: `${idea.ageDays} days ago`, avatar: 'AD' }
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-semibold text-sm">
                  {activity.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.name}</p>
                  <p className="text-xs text-muted-foreground">{activity.action}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Change Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Timeline
          </CardTitle>
          <CardDescription>Complete history of all status changes and milestones</CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No status changes yet</p>
              <p className="text-sm text-muted-foreground mt-1">Idea is still in its initial status</p>
            </div>
          ) : (
            <div className="space-y-6">
              {timeline.map((event: any, index: number) => {
                const isFirst = index === 0;
                const isLast = index === timeline.length - 1;

                return (
                  <div key={event.id} className="relative">
                    {!isLast && (
                      <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-border" />
                    )}

                    <div className="flex gap-4">
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isFirst
                            ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-500'
                            : 'bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary'
                        }`}>
                          <div className={`w-4 h-4 rounded-full ${
                            isFirst ? 'bg-green-500' : 'bg-primary'
                          }`} />
                        </div>
                      </div>

                      <div className="flex-1 pb-8">
                        <div className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-colors bg-card">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${STATUS_COLORS[event.status] || 'bg-gray-500'} text-white`}>
                                  {STATUS_LABELS[event.status] || event.status}
                                </Badge>
                                {isFirst && (
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    Initial Status
                                  </span>
                                )}
                              </div>
                              <p className="text-base font-medium">{event.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-4 h-4" />
                              <span className="font-medium">{event.actor}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(event.date)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
