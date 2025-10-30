import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Clock, Award, Target, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user statistics
  const { data: stats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get total contests participated
      const participationsQuery = await (supabase as any)
        .from('contest_participants')
        .select('contest_id')
        .eq('user_id', user.id);
      const participations = participationsQuery.data;

      // Get all submissions
      const submissionsQuery = await (supabase as any)
        .from('submissions')
        .select('problem_id, status, contest_id')
        .eq('user_id', user.id);
      const submissions = submissionsQuery.data;

      const totalContests = participations?.length || 0;
      const uniqueProblems = new Set(submissions?.map((s: any) => s.problem_id)).size;
      
      // Calculate accuracy
      const totalSubmissions = submissions?.length || 0;
      const acceptedSubmissions = submissions?.filter((s: any) => s.status === 'accepted').length || 0;
      const accuracy = totalSubmissions > 0 ? (acceptedSubmissions / totalSubmissions) * 100 : 0;

      return {
        totalContests,
        uniqueProblems,
        accuracy: accuracy.toFixed(1),
      };
    },
    enabled: !!user?.id,
  });

  // Fetch active and upcoming contests
  const { data: contests } = useQuery({
    queryKey: ['dashboard-contests'],
    queryFn: async () => {
      await (supabase as any).rpc('update_contest_status');
      
      const { data, error } = await (supabase as any)
        .from('contests')
        .select('*, contest_problems(count)')
        .eq('is_public', true)
        .in('status', ['active', 'upcoming'])
        .order('start_time', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  // Fetch completed contests with user data
  const { data: completedContests } = useQuery({
    queryKey: ['completed-contests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const participationsQuery = await (supabase as any)
        .from('contest_participants')
        .select('contest_id, total_score')
        .eq('user_id', user.id);
      const participations = participationsQuery.data;

      if (!participations?.length) return [];

      const contestIds = participations.map((p: any) => p.contest_id);
      
      const contestsQuery = await (supabase as any)
        .from('contests')
        .select('id, title, start_time, end_time, status')
        .in('id', contestIds)
        .eq('status', 'completed')
        .order('end_time', { ascending: false });
      const contests = contestsQuery.data;

      if (!contests) return [];

      // Get leaderboard positions and submission stats
      const contestsWithData = await Promise.all(
        contests.map(async (contest: any) => {
          const participation = participations.find((p: any) => p.contest_id === contest.id);
          
          // Get leaderboard position
          const leaderboardQuery = await (supabase as any)
            .from('contest_participants')
            .select('user_id, total_score')
            .eq('contest_id', contest.id)
            .order('total_score', { ascending: false });
          const leaderboard = leaderboardQuery.data;

          const position = leaderboard?.findIndex((p: any) => p.user_id === user.id) + 1 || 0;

          // Get submission stats for this contest
          const contestSubmissionsQuery = await (supabase as any)
            .from('submissions')
            .select('status, problem_id')
            .eq('user_id', user.id)
            .eq('contest_id', contest.id);
          const contestSubmissions = contestSubmissionsQuery.data;

          const totalSubs = contestSubmissions?.length || 0;
          const acceptedSubs = contestSubmissions?.filter((s: any) => s.status === 'accepted').length || 0;
          const contestAccuracy = totalSubs > 0 ? (acceptedSubs / totalSubs) * 100 : 0;

          return {
            ...contest,
            position,
            totalScore: participation?.total_score || 0,
            totalSubmissions: totalSubs,
            accuracy: contestAccuracy.toFixed(1),
          };
        })
      );

      return contestsWithData;
    },
    enabled: !!user?.id,
  });

  const activeContests = contests?.filter((c: any) => c.status === 'active') || [];
  const upcomingContests = contests?.filter((c: any) => c.status === 'upcoming') || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to CodeArena</h1>
          <p className="text-muted-foreground">Your competitive programming dashboard</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contests Participated</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalContests || 0}</div>
              <p className="text-xs text-muted-foreground">Total contests joined</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.uniqueProblems || 0}</div>
              <p className="text-xs text-muted-foreground">Unique problems</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Contests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeContests.length}</div>
              <p className="text-xs text-muted-foreground">Live now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.accuracy || 0}%</div>
              <p className="text-xs text-muted-foreground">Acceptance rate</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Active Contests
              </CardTitle>
              <CardDescription>Join now and start competing</CardDescription>
            </CardHeader>
            <CardContent>
              {activeContests.length > 0 ? (
                <div className="space-y-3">
                  {activeContests.map((contest: any) => (
                    <div key={contest.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium">{contest.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Ends: {format(new Date(contest.end_time), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => navigate(`/contests/${contest.id}`)}>
                        Join <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No active contests</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Contests
              </CardTitle>
              <CardDescription>Get ready for upcoming challenges</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingContests.length > 0 ? (
                <div className="space-y-3">
                  {upcomingContests.map((contest: any) => (
                    <div key={contest.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium">{contest.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Starts: {format(new Date(contest.start_time), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/contests/${contest.id}`)}>
                        View <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No upcoming contests</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Completed Contests</CardTitle>
            <CardDescription>Your performance history</CardDescription>
          </CardHeader>
          <CardContent>
            {completedContests && completedContests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contest</TableHead>
                    <TableHead className="text-center">Rank</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Submissions</TableHead>
                    <TableHead className="text-center">Accuracy</TableHead>
                    <TableHead className="text-center">Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedContests.map((contest: any) => (
                    <TableRow key={contest.id}>
                      <TableCell className="font-medium">{contest.title}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">#{contest.position}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{contest.totalScore}</TableCell>
                      <TableCell className="text-center">{contest.totalSubmissions}</TableCell>
                      <TableCell className="text-center">{contest.accuracy}%</TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {format(new Date(contest.end_time), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => navigate(`/contests/${contest.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No completed contests yet</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
