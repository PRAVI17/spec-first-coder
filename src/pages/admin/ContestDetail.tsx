import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, FileText, Trophy, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export default function ContestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch contest details
  const { data: contest, refetch: refetchContest } = useQuery({
    queryKey: ['admin-contest-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch contest problems
  const { data: problems } = useQuery({
    queryKey: ['admin-contest-problems', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contest_problems')
        .select('*, problems(*)')
        .eq('contest_id', id)
        .order('order_num');

      if (error) throw error;
      return data;
    },
  });

  // Fetch participants with accuracy
  const { data: participants } = useQuery({
    queryKey: ['admin-contest-participants', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contest_participants')
        .select('*, profiles(full_name, username)')
        .eq('contest_id', id)
        .order('total_score', { ascending: false });

      if (error) throw error;

      // Calculate accuracy for each participant
      const participantsWithAccuracy = await Promise.all(
        data.map(async (participant: any) => {
          const { data: userSubmissions } = await (supabase as any)
            .from('submissions')
            .select('status')
            .eq('contest_id', id)
            .eq('user_id', participant.user_id);

          const totalSubmissions = userSubmissions?.length || 0;
          const acceptedSubmissions = userSubmissions?.filter((s: any) => s.status === 'accepted').length || 0;
          const accuracy = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

          return {
            ...participant,
            totalSubmissions,
            acceptedSubmissions,
            accuracy,
          };
        })
      );

      return participantsWithAccuracy;
    },
  });

  // Fetch recent submissions
  const { data: submissions } = useQuery({
    queryKey: ['admin-contest-submissions', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('submissions')
        .select('*, profiles(full_name, username), problems(title)')
        .eq('contest_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-contest-stats', id],
    queryFn: async () => {
      const [participantsRes, submissionsRes, acceptedRes] = await Promise.all([
        (supabase as any).from('contest_participants').select('id', { count: 'exact', head: true }).eq('contest_id', id),
        (supabase as any).from('submissions').select('id', { count: 'exact', head: true }).eq('contest_id', id),
        (supabase as any).from('submissions').select('id', { count: 'exact', head: true }).eq('contest_id', id).eq('status', 'accepted'),
      ]);

      return {
        totalParticipants: participantsRes.count || 0,
        totalSubmissions: submissionsRes.count || 0,
        acceptedSubmissions: acceptedRes.count || 0,
      };
    },
  });

  // Real-time updates for live leaderboard
  useEffect(() => {
    const channel = supabase
      .channel('admin-contest-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contest_participants',
          filter: `contest_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-contest-participants', id] });
          queryClient.invalidateQueries({ queryKey: ['admin-contest-stats', id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `contest_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-contest-submissions', id] });
          queryClient.invalidateQueries({ queryKey: ['admin-contest-participants', id] });
          queryClient.invalidateQueries({ queryKey: ['admin-contest-stats', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return '';
    }
  };

  const getSubmissionStatusColor = (status: string) => {
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

  const exportLeaderboard = () => {
    if (!participants || participants.length === 0) {
      toast({
        title: 'No Data',
        description: 'No participants to export',
        variant: 'destructive',
      });
      return;
    }

    const csv = [
      ['Rank', 'Username', 'Full Name', 'Score', 'Submissions', 'Accuracy'],
      ...participants.map((p: any, index: number) => [
        index + 1,
        p.profiles?.username || 'Unknown',
        p.profiles?.full_name || 'Unknown',
        p.total_score || 0,
        p.totalSubmissions || 0,
        `${p.accuracy || 0}%`,
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contest?.title || 'contest'}_leaderboard.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Leaderboard exported successfully',
    });
  };

  if (!contest) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/contests')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Contests
        </Button>

        {/* Contest Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{contest.title}</h1>
              <p className="text-muted-foreground">{contest.description}</p>
            </div>
            <Badge variant="outline" className={getStatusColor(contest.status)}>
              {contest.status}
            </Badge>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Start: {format(new Date(contest.start_time), 'MMM dd, yyyy HH:mm')}</span>
            <span>•</span>
            <span>End: {format(new Date(contest.end_time), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalParticipants || 0}</div>
              <p className="text-xs text-muted-foreground">Active participants</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submissions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSubmissions || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.acceptedSubmissions || 0} accepted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Problems</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{problems?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Contest problems</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Leaderboard</CardTitle>
                  <CardDescription>Top performers</CardDescription>
                </div>
                <Button onClick={exportLeaderboard} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {participants && participants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Submissions</TableHead>
                      <TableHead className="text-right">Accuracy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.slice(0, 10).map((participant: any, index: number) => {
                      const rankColor = index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-muted-foreground';
                      return (
                      <TableRow key={participant.id}>
                        <TableCell className={`font-bold ${rankColor}`}>#{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{participant.profiles?.username || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{participant.profiles?.full_name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">{participant.total_score || 0}</TableCell>
                        <TableCell className="text-right">{participant.totalSubmissions || 0}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={participant.accuracy >= 50 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}>
                            {participant.accuracy || 0}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">No participants yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>Live submission feed</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions && submissions.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {submissions.map((submission: any) => (
                    <div key={submission.id} className="flex justify-between items-start border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{submission.profiles?.username || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{submission.problems?.title || 'Unknown Problem'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(submission.created_at), 'MMM dd, HH:mm:ss')}
                        </p>
                      </div>
                      <Badge variant="outline" className={getSubmissionStatusColor(submission.status)}>
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
        </div>

        {/* Contest Problems */}
        <Card>
          <CardHeader>
            <CardTitle>Contest Problems</CardTitle>
            <CardDescription>Problems in this contest</CardDescription>
          </CardHeader>
          <CardContent>
            {problems && problems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Order</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {problems.map((cp: any) => (
                    <TableRow key={cp.id}>
                      <TableCell className="font-medium">{cp.order_num + 1}</TableCell>
                      <TableCell>{cp.problems?.title || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cp.problems?.difficulty || 'unknown'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">{cp.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No problems added yet</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
