import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, MessageCircle, Lightbulb, TrendingUp, GraduationCap, FileText } from "lucide-react";

interface AnalyticsDashboardProps {
  orgId: string;
}

export default function AnalyticsDashboard({ orgId }: AnalyticsDashboardProps) {
  const { t } = useTranslation();
  
  // Fetch organization stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/organizations', orgId, 'admin', 'stats'],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${orgId}/admin/stats`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  const statCards = [
    {
      title: t('admin.analytics.stats.totalIdeas.title'),
      value: stats?.totalIdeas || 0,
      description: t('admin.analytics.stats.totalIdeas.description'),
      icon: Lightbulb,
      color: "text-blue-600"
    },
    {
      title: t('admin.analytics.stats.activeConversations.title'),
      value: stats?.totalChats || 0,
      description: t('admin.analytics.stats.activeConversations.description'),
      icon: MessageCircle,
      color: "text-green-600"
    },
    {
      title: t('admin.analytics.stats.businessAssets.title'),
      value: stats?.totalAssets || 0,
      description: t('admin.analytics.stats.businessAssets.description'),
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      title: t('admin.analytics.stats.teamMembers.title'),
      value: stats?.totalMembers || 0,
      description: t('admin.analytics.stats.teamMembers.description'),
      icon: Users,
      color: "text-orange-600"
    },
    {
      title: "Mentors",
      value: stats?.totalMentors || 0,
      description: "assigned mentors",
      icon: GraduationCap,
      color: "text-pink-600"
    },
    {
      title: "Pitch Decks",
      value: stats?.totalPitchDecks || 0,
      description: "generated pitch decks",
      icon: FileText,
      color: "text-cyan-600"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-24">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getEngagementLevel = (count: number) => {
    if (count === 0) return t('admin.analytics.engagement.low');
    if (count > 0) return t('admin.analytics.engagement.active');
    return t('admin.analytics.engagement.low');
  };

  const getIdeaActivityLevel = (count: number) => {
    if (count > 5) return t('admin.analytics.activity.high');
    if (count > 0) return t('admin.analytics.activity.medium');
    return t('admin.analytics.activity.low');
  };

  const getAssetCreationLevel = (count: number) => {
    if (count > 10) return t('admin.analytics.activity.high');
    if (count > 0) return t('admin.analytics.activity.medium');
    return t('admin.analytics.activity.low');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-row" data-testid="text-analytics-title">
            <BarChart3 className="w-5 h-5" />
            {t('admin.analytics.overview.title')}
          </CardTitle>
          <CardDescription className="ltr:text-left rtl:text-right">
            {t('admin.analytics.overview.description')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium ltr:text-left rtl:text-right">{stat.title}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold ltr:text-left rtl:text-right" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}-value`}>
                  {stat.value}
                </div>
                <p className="text-xs text-text-secondary mt-1 ltr:text-left rtl:text-right">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-recent-activity-title" className="ltr:text-left rtl:text-right">
              {t('admin.analytics.recentActivity.title')}
            </CardTitle>
            <CardDescription className="ltr:text-left rtl:text-right">
              {t('admin.analytics.recentActivity.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between flex-row" data-testid="card-activity-ideas">
              <div className="flex items-center gap-3 flex-row">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium ltr:text-left rtl:text-right">{t('admin.analytics.recentActivity.ideasSubmitted')}</p>
                  <p className="text-sm text-text-secondary ltr:text-left rtl:text-right">{t('admin.analytics.recentActivity.thisMonth')}</p>
                </div>
              </div>
              <Badge variant="secondary">{stats?.totalIdeas || 0}</Badge>
            </div>

            <div className="flex items-center justify-between flex-row" data-testid="card-activity-chats">
              <div className="flex items-center gap-3 flex-row">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium ltr:text-left rtl:text-right">{t('admin.analytics.recentActivity.conversationsStarted')}</p>
                  <p className="text-sm text-text-secondary ltr:text-left rtl:text-right">{t('admin.analytics.recentActivity.thisMonth')}</p>
                </div>
              </div>
              <Badge variant="secondary">{stats?.totalChats || 0}</Badge>
            </div>

            <div className="flex items-center justify-between flex-row" data-testid="card-activity-assets">
              <div className="flex items-center gap-3 flex-row">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium ltr:text-left rtl:text-right">{t('admin.analytics.recentActivity.assetsGenerated')}</p>
                  <p className="text-sm text-text-secondary ltr:text-left rtl:text-right">{t('admin.analytics.recentActivity.thisMonth')}</p>
                </div>
              </div>
              <Badge variant="secondary">{stats?.totalAssets || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle data-testid="text-workspace-health-title" className="ltr:text-left rtl:text-right">
              {t('admin.analytics.workspaceHealth.title')}
            </CardTitle>
            <CardDescription className="ltr:text-left rtl:text-right">
              {t('admin.analytics.workspaceHealth.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium ltr:text-left rtl:text-right">
                  {t('admin.analytics.workspaceHealth.memberEngagement')}
                </span>
                <span className="text-sm text-text-secondary">
                  {getEngagementLevel(stats?.totalMembers || 0)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats?.totalMembers || 0) * 25, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium ltr:text-left rtl:text-right">
                  {t('admin.analytics.workspaceHealth.ideaActivity')}
                </span>
                <span className="text-sm text-text-secondary">
                  {getIdeaActivityLevel(stats?.totalIdeas || 0)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats?.totalIdeas || 0) * 10, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium ltr:text-left rtl:text-right">
                  {t('admin.analytics.workspaceHealth.assetCreation')}
                </span>
                <span className="text-sm text-text-secondary">
                  {getAssetCreationLevel(stats?.totalAssets || 0)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats?.totalAssets || 0) * 5, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Idea Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="ltr:text-left rtl:text-right">Idea Status Breakdown</CardTitle>
          <CardDescription className="ltr:text-left rtl:text-right">
            Distribution of ideas by current stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Backlog", key: "BACKLOG", color: "bg-slate-500", text: "text-slate-600" },
              { label: "Under Review", key: "UNDER_REVIEW", color: "bg-amber-500", text: "text-amber-600" },
              { label: "Shortlisted", key: "SHORTLISTED", color: "bg-blue-500", text: "text-blue-600" },
              { label: "In Incubation", key: "IN_INCUBATION", color: "bg-green-500", text: "text-green-600" },
              { label: "Archived", key: "ARCHIVED", color: "bg-gray-400", text: "text-gray-500" },
            ].map(({ label, key, color, text }) => {
              const count = stats?.ideaStatusBreakdown?.[key as keyof typeof stats.ideaStatusBreakdown] || 0;
              const total = stats?.totalIdeas || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium ltr:text-left rtl:text-right">{label}</span>
                    <span className={`text-sm font-bold ${text}`}>{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-text-secondary ltr:text-left rtl:text-right">{pct}% of total</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}