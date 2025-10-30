import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, FileCode, Activity, Plus, Eye, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Fetch statistics
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersRes, contestsRes, problemsRes, activeContestsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('contests').select('id', { count: 'exact', head: true }),
        supabase.from('problems').select('id', { count: 'exact', head: true }),
        supabase.from('contests').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      return {
        totalUsers: usersRes.count || 0,
        totalContests: contestsRes.count || 0,
        totalProblems: problemsRes.count || 0,
        activeContests: activeContestsRes.count || 0,
      };
    },
  });

  // Fetch recent submissions
  const { data: recentSubmissions, refetch: refetchSubmissions } = useQuery({
    queryKey: ['recent-submissions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('submissions')
        .select(`
          *,
          profiles(full_name, username),
          problems(title),
          contests(title)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch contest analytics
  const { data: contestAnalytics } = useQuery({
    queryKey: ['contest-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contests')
        .select('title, id')
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
  });

  // Real-time updates for submissions
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions',
        },
        () => {
          refetchSubmissions();
          refetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contests',
        },
        () => {
          refetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchSubmissions, refetchStats]);

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

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Live Submission Feed</CardTitle>
              <CardDescription>Real-time submission updates</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSubmissions && recentSubmissions.length > 0 ? (
                <div className="space-y-4">
                  {recentSubmissions.map((submission: any) => (
                    <div key={submission.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{submission.profiles?.username || 'Unknown User'}</p>
                        <p className="text-xs text-muted-foreground">{submission.problems?.title || 'Unknown Problem'}</p>
                        <p className="text-xs text-muted-foreground">{submission.contests?.title || 'Unknown Contest'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className={getStatusColor(submission.status)}>
                        {submission.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No submissions yet</p>
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
      </main>
    </div>
  );
}
