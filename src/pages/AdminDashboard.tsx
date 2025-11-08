import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, FileCode, Activity, Plus, Eye, TrendingUp } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/useAuth';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch statistics - personalized for each admin
  const { data: stats } = useQuery({
    queryKey: ['admin-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalUsers: 0, totalContests: 0, totalProblems: 0, activeContests: 0 };
      
      const [usersRes, contestsRes, problemsRes, activeContestsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('contests').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
        supabase.from('problems').select('id', { count: 'exact', head: true }),
        supabase.from('contests').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('created_by', user.id),
      ]);

      return {
        totalUsers: usersRes.count || 0,
        totalContests: contestsRes.count || 0,
        totalProblems: problemsRes.count || 0,
        activeContests: activeContestsRes.count || 0,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch recent submissions with rank and points - only from admin's contests
  const { data: recentSubmissions } = useQuery({
    queryKey: ['recent-submissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get the admin's contest IDs
      const { data: adminContests } = await supabase
        .from('contests')
        .select('id')
        .eq('created_by', user.id);
      
      const contestIds = adminContests?.map(c => c.id) || [];
      
      if (contestIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from('submissions')
        .select(`
          *,
          profiles(full_name, username),
          problems(title),
          contests(title)
        `)
        .in('contest_id', contestIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get rank and total points for each submission
      const enrichedData = await Promise.all(
        data.map(async (submission: any) => {
          const { data: participants } = await (supabase as any)
            .from('contest_participants')
            .select('user_id, total_score')
            .eq('contest_id', submission.contest_id)
            .order('total_score', { ascending: false });

          const userRank = participants?.findIndex((p: any) => p.user_id === submission.user_id) + 1 || 0;
          const userPoints = participants?.find((p: any) => p.user_id === submission.user_id)?.total_score || 0;

          return {
            ...submission,
            rank: userRank,
            totalPoints: userPoints,
          };
        })
      );

      return enrichedData;
    },
    enabled: !!user?.id,
  });

  // Fetch top performers - only from admin's contests
  const { data: topPerformers } = useQuery({
    queryKey: ['top-performers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get the admin's contest IDs
      const { data: adminContests } = await supabase
        .from('contests')
        .select('id')
        .eq('created_by', user.id);
      
      const contestIds = adminContests?.map(c => c.id) || [];
      
      if (contestIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from('contest_participants')
        .select(`
          user_id,
          total_score,
          profiles(full_name, username),
          contests(title)
        `)
        .in('contest_id', contestIds)
        .gt('total_score', 0)
        .order('total_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch contest analytics - only admin's contests
  const { data: contestAnalytics } = useQuery({
    queryKey: ['contest-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('contests')
        .select('title, id')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const analyticsData = await Promise.all(
        data.map(async (contest) => {
          const [participantsRes, submissionsRes] = await Promise.all([
            (supabase as any).from('contest_participants').select('id', { count: 'exact', head: true }).eq('contest_id', contest.id),
            (supabase as any).from('submissions').select('id', { count: 'exact', head: true }).eq('contest_id', contest.id),
          ]);

          return {
            name: contest.title.length > 20 ? contest.title.substring(0, 20) + '...' : contest.title,
            participants: participantsRes.count || 0,
            submissions: submissionsRes.count || 0,
          };
        })
      );

      return analyticsData;
    },
    enabled: !!user?.id,
  });

  // Real-time updates for live dashboard
  useEffect(() => {
    const submissionsChannel = supabase
      .channel('admin-submissions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['recent-submissions'] });
          queryClient.invalidateQueries({ queryKey: ['top-performers'] });
          queryClient.invalidateQueries({ queryKey: ['contest-analytics'] });
        }
      )
      .subscribe();

    const contestsChannel = supabase
      .channel('admin-contests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contests'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          queryClient.invalidateQueries({ queryKey: ['contest-analytics'] });
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel('admin-participants-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contest_participants'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['top-performers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(contestsChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'wrong_answer':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'time_limit_exceeded':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'runtime_error':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time platform insights and management</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contests</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalContests || 0}</div>
              <p className="text-xs text-muted-foreground">Created contests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Problems</CardTitle>
              <FileCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProblems || 0}</div>
              <p className="text-xs text-muted-foreground">Problem bank</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Contests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeContests || 0}</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Contest Engagement
            </CardTitle>
            <CardDescription>Participants and submissions per contest</CardDescription>
          </CardHeader>
          <CardContent>
            {contestAnalytics && contestAnalytics.length > 0 ? (
              <ChartContainer
                config={{
                  participants: {
                    label: 'Participants',
                    color: 'hsl(var(--primary))',
                  },
                  submissions: {
                    label: 'Submissions',
                    color: 'hsl(var(--accent))',
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contestAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="participants" fill="var(--color-participants)" />
                    <Bar dataKey="submissions" fill="var(--color-submissions)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No contest data available yet</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Leading participants in your contests</CardDescription>
            </CardHeader>
            <CardContent>
              {topPerformers && topPerformers.length > 0 ? (
                <div className="space-y-4">
                  {topPerformers.map((participant: any, index: number) => (
                    <div key={participant.user_id + participant.contests.title} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{participant.profiles?.username || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground">{participant.contests?.title || 'Unknown Contest'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{participant.total_score} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No participants with points yet</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/admin/contests/create')} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Contest
                </Button>
                <Button 
                  onClick={() => navigate('/admin/problems/create')} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Problem
                </Button>
                <Button 
                  onClick={() => navigate('/admin/contests')} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All Contests
                </Button>
                <Button 
                  onClick={() => navigate('/admin/problems')} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Problem Bank
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>Latest submissions with participant rankings</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubmissions && recentSubmissions.length > 0 ? (
              <div className="space-y-4">
                {recentSubmissions.map((submission: any) => (
                  <div key={submission.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{submission.profiles?.username || 'Unknown User'}</p>
                        {submission.rank > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Rank #{submission.rank}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{submission.problems?.title || 'Unknown Problem'}</p>
                      <p className="text-xs text-muted-foreground">{submission.contests?.title || 'Unknown Contest'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                        </p>
                        {submission.totalPoints > 0 && (
                          <span className="text-xs font-medium text-primary">
                            • {submission.totalPoints} pts
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={getStatusColor(submission.status)}>
                        {submission.status.replace('_', ' ')}
                      </Badge>
                      {submission.score > 0 && (
                        <span className="text-xs text-muted-foreground">
                          +{submission.score} pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No submissions yet</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
