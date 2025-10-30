import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, Trophy, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function ContestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: contest, isLoading } = useQuery({
    queryKey: ['contest', id],
    queryFn: async () => {
      // Update contest status based on current time
      await supabase.rpc('update_contest_status');
      
      const { data, error } = await supabase
        .from('contests')
        .select(`
          *,
          contest_problems(
            id,
            points,
            order_num,
            problems(id, title, difficulty)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds to keep status updated
  });

  const { data: participation } = useQuery({
    queryKey: ['participation', id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await (supabase as any)
        .from('contest_participants')
        .select('*')
        .eq('contest_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('contest_participants')
        .insert({
          contest_id: id!,
          user_id: user!.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Joined!',
        description: 'You have successfully joined the contest',
      });
      navigate(`/contests/${id}/participate`);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to join contest',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return '';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'hard': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Loading contest...</p>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Contest not found</p>
        </div>
      </div>
    );
  }

  const sortedProblems = contest.contest_problems?.sort((a, b) => a.order_num - b.order_num) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/contests">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contests
          </Button>
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start mb-2">
              <Badge variant="outline" className={getStatusColor(contest.status)}>
                {contest.status}
              </Badge>
            </div>
            <CardTitle className="text-3xl">{contest.title}</CardTitle>
            <CardDescription className="text-base">
              {contest.description || 'No description provided'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <div>
                  <p className="text-sm">Start Date</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(contest.start_time), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <div>
                  <p className="text-sm">End Date</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(contest.end_time), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </div>

            {contest.status === 'active' && (
              <div className="flex gap-4">
                {participation ? (
                  <Button onClick={() => navigate(`/contests/${id}/participate`)} size="lg">
                    Continue Contest
                  </Button>
                ) : (
                  <Button onClick={() => joinMutation.mutate()} size="lg" disabled={joinMutation.isPending}>
                    {joinMutation.isPending ? 'Joining...' : 'Join Contest'}
                  </Button>
                )}
              </div>
            )}

            {contest.status === 'upcoming' && (
              <p className="text-muted-foreground">Contest will start soon</p>
            )}

            {contest.status === 'completed' && (
              <p className="text-muted-foreground">This contest has ended</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Problems</CardTitle>
            <CardDescription>
              {sortedProblems.length} problem{sortedProblems.length !== 1 ? 's' : ''} in this contest
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedProblems.length > 0 ? (
              <div className="space-y-3">
                {sortedProblems.map((cp, index) => (
                  <div
                    key={cp.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-muted-foreground">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <div>
                        <h3 className="font-medium">{cp.problems.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className={getDifficultyColor(cp.problems.difficulty)}>
                            {cp.problems.difficulty}
                          </Badge>
                          <Badge variant="secondary">{cp.points} points</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No problems added to this contest yet
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
