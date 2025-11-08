import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Send, Trophy, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import Editor from '@monaco-editor/react';

export default function ContestParticipate() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python' | 'java' | 'cpp' | 'c'>('javascript');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [contestEnded, setContestEnded] = useState(false);
  const [testCaseResults, setTestCaseResults] = useState<Array<{index: number, status: 'pending' | 'passed' | 'failed'}>>([]);

  const { data: contest } = useQuery({
    queryKey: ['contest-participate', id],
    queryFn: async () => {
      // Update contest status
      await supabase.rpc('update_contest_status');
      
      const { data, error } = await supabase
        .from('contests')
        .select(`
          *,
          contest_problems(
            id,
            points,
            order_num,
            problem_id,
            problems(*)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', id, user?.id],
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
            accuracy,
            isCurrentUser: participant.user_id === user?.id,
          };
        })
      );

      // If current user is not in the list, add them
      const hasCurrentUser = participantsWithAccuracy.some(p => p.user_id === user?.id);
      if (!hasCurrentUser && user) {
        const { data: userProfile } = await (supabase as any)
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single();

        const { data: userSubmissions } = await (supabase as any)
          .from('submissions')
          .select('status')
          .eq('contest_id', id)
          .eq('user_id', user.id);

        const totalSubmissions = userSubmissions?.length || 0;
        const acceptedSubmissions = userSubmissions?.filter((s: any) => s.status === 'accepted').length || 0;
        const accuracy = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

        participantsWithAccuracy.unshift({
          id: `temp-${user.id}`,
          user_id: user.id,
          contest_id: id,
          total_score: 0,
          joined_at: new Date().toISOString(),
          profiles: userProfile,
          totalSubmissions,
          accuracy,
          isCurrentUser: true,
        });
      }
      
      // Sort with current user at top if they're the only one or tied at 0
      return participantsWithAccuracy.sort((a, b) => {
        if (a.isCurrentUser && participantsWithAccuracy.length === 1) return -1;
        if (b.isCurrentUser && participantsWithAccuracy.length === 1) return 1;
        return b.total_score - a.total_score;
      });
    },
  });

  // Real-time leaderboard updates
  useEffect(() => {
    const participantsChannel = supabase
      .channel(`leaderboard-participants-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contest_participants',
          filter: `contest_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard', id, user?.id] });
        }
      )
      .subscribe();

    const submissionsChannel = supabase
      .channel(`leaderboard-submissions-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions',
          filter: `contest_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard', id, user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(submissionsChannel);
    };
  }, [id, user?.id, queryClient]);

  const { data: mySubmissions } = useQuery({
    queryKey: ['my-submissions', id, selectedProblemId],
    queryFn: async () => {
      if (!selectedProblemId) return [];
      
      const { data, error } = await (supabase as any)
        .from('submissions')
        .select('*')
        .eq('contest_id', id)
        .eq('problem_id', selectedProblemId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProblemId && !!user,
  });

  const selectedProblem = contest?.contest_problems?.find(
    cp => cp.problem_id === selectedProblemId
  )?.problems;

  useEffect(() => {
    if (contest?.contest_problems && contest.contest_problems.length > 0) {
      setSelectedProblemId(contest.contest_problems[0].problem_id);
    }
  }, [contest]);

  // Load boilerplate code when problem or language changes
  useEffect(() => {
    if (selectedProblem) {
      const boilerplateKey = `boilerplate_${language}` as keyof typeof selectedProblem;
      const boilerplate = selectedProblem[boilerplateKey] as string;
      if (boilerplate) {
        setCode(boilerplate);
      } else {
        setCode('');
      }
    }
  }, [selectedProblemId, language, selectedProblem]);

  useEffect(() => {
    if (!contest) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(contest.end_time).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('Contest Ended');
        setContestEnded(true);
        clearInterval(timer);
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [contest]);

  const handleSubmit = async () => {
    if (contestEnded) {
      toast({
        title: 'Contest Ended',
        description: 'This contest has ended. No more submissions are accepted.',
        variant: 'destructive',
      });
      return;
    }

    if (!code.trim()) {
      toast({
        title: 'Error',
        description: 'Please write some code before submitting',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const problem = contest?.contest_problems?.find(cp => cp.problem_id === selectedProblemId)?.problems;
    
    if (!problem) {
      toast({
        title: 'Error',
        description: 'Problem not found',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    // Initialize test case animation
    const totalTestCases = (problem.test_cases as any[])?.length || 0;
    const initialTestCases = Array.from({ length: totalTestCases }, (_, i) => ({
      index: i,
      status: 'pending' as const
    }));
    setTestCaseResults(initialTestCases);

    // Create submission record
    const { data: submission, error } = await (supabase as any).from('submissions').insert({
      user_id: user!.id,
      contest_id: id!,
      problem_id: selectedProblemId,
      language,
      code,
      status: 'pending',
      total_test_cases: totalTestCases,
    }).select().single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit solution',
        variant: 'destructive',
      });
      setTestCaseResults([]);
      setSubmitting(false);
      return;
    }

    // Call Judge0 edge function for real evaluation
    try {
      const { data: evalResult, error: evalError } = await supabase.functions.invoke('evaluate-submission', {
        body: {
          submissionId: submission.id,
          code,
          language,
          testCases: problem.test_cases,
          contestId: id,
          problemId: selectedProblemId,
        },
      });

      if (evalError) throw evalError;

      // Animate test case results based on actual evaluation
      for (let i = 0; i < totalTestCases; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const passed = evalResult.results[i]?.passed || false;
        setTestCaseResults(prev => prev.map(tc => 
          tc.index === i ? { ...tc, status: passed ? 'passed' : 'failed' } : tc
        ));
      }

      const passedCount = evalResult.passedCount;
      const finalStatus = evalResult.status;
      const score = evalResult.score || 0;
      const maxPoints = evalResult.maxPoints || 0;

      toast({
        title: finalStatus === 'accepted' ? 'Accepted!' : 'Wrong Answer',
        description: `${passedCount}/${totalTestCases} test cases passed. Score: ${score}/${maxPoints}`,
        variant: finalStatus === 'accepted' ? 'default' : 'destructive',
      });

    } catch (evalError) {
      console.error('Evaluation error:', evalError);
      
      // Update submission as failed
      await (supabase as any).from('submissions').update({
        status: 'wrong_answer',
        test_cases_passed: 0,
        score: 0,
      }).eq('id', submission.id);

      toast({
        title: 'Evaluation Failed',
        description: 'Failed to evaluate your submission. Please try again.',
        variant: 'destructive',
      });
    }

    queryClient.invalidateQueries({ queryKey: ['my-submissions', id, selectedProblemId] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard', id, user?.id] });

    // Clear test results after 3 seconds
    setTimeout(() => setTestCaseResults([]), 3000);
    setSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'wrong_answer': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (!contest) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{contest.title}</h1>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              {leaderboard?.length || 0} Active Participants
            </Badge>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="font-mono font-semibold">{timeLeft}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Problems Sidebar */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Problems</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {contest.contest_problems?.sort((a, b) => a.order_num - b.order_num).map((cp, index) => (
                    <Button
                      key={cp.id}
                      variant={selectedProblemId === cp.problem_id ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSelectedProblemId(cp.problem_id)}
                    >
                      <span className="mr-2">{String.fromCharCode(65 + index)}</span>
                      {cp.problems.title}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Leaderboard
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {leaderboard?.length || 0} Total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {leaderboard && leaderboard.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {leaderboard.map((participant: any, index: number) => {
                      const rankColor = index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-muted-foreground';
                      const isCurrentUser = participant.user_id === user?.id;
                      return (
                      <div 
                        key={participant.id} 
                        className={`p-2 rounded hover:bg-muted/50 border ${isCurrentUser ? 'border-primary bg-primary/5' : 'border-border/50'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="flex items-center gap-2">
                            <span className={`font-bold ${rankColor}`}>#{index + 1}</span>
                            <span className="text-sm font-medium">
                              {participant.profiles?.username || 'User'}
                              {isCurrentUser && <span className="ml-1 text-xs text-primary">(You)</span>}
                            </span>
                          </span>
                          <Badge variant="secondary" className="font-bold">{participant.total_score}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>{participant.totalSubmissions || 0} submissions</span>
                          <span className={participant.accuracy >= 50 ? 'text-green-500' : 'text-orange-500'}>
                            {participant.accuracy || 0}% accuracy
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No participants yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            <Tabs defaultValue="problem">
              <TabsList>
                <TabsTrigger value="problem">Problem</TabsTrigger>
                <TabsTrigger value="submissions">My Submissions</TabsTrigger>
              </TabsList>

              <TabsContent value="problem" className="space-y-4">
                {selectedProblem && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedProblem.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{selectedProblem.description}</p>
                      </div>

                      {selectedProblem.sample_input && (
                        <div>
                          <h3 className="font-semibold mb-2">Sample Input</h3>
                          <pre className="bg-muted p-3 rounded text-sm">{selectedProblem.sample_input}</pre>
                        </div>
                      )}

                      {selectedProblem.sample_output && (
                        <div>
                          <h3 className="font-semibold mb-2">Sample Output</h3>
                          <pre className="bg-muted p-3 rounded text-sm">{selectedProblem.sample_output}</pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Code Editor</CardTitle>
                      <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                          <SelectItem value="python">Python</SelectItem>
                          <SelectItem value="java">Java</SelectItem>
                          <SelectItem value="cpp">C++</SelectItem>
                          <SelectItem value="c">C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <Editor
                        height="400px"
                        language={language === 'cpp' ? 'cpp' : language}
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                        }}
                      />
                    </div>
                    
                    {/* Test Case Results Animation */}
                    {testCaseResults.length > 0 && (
                      <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Evaluating Test Cases...
                        </h4>
                        <div className="space-y-2">
                          {testCaseResults.map((tc) => (
                            <div key={tc.index} className="flex items-center gap-3 animate-fade-in">
                              <span className="text-sm text-muted-foreground">Test {tc.index + 1}</span>
                              <div className="flex-1">
                                <Progress value={tc.status === 'pending' ? 50 : 100} className="h-2" />
                              </div>
                              {tc.status === 'passed' && (
                                <CheckCircle2 className="h-5 w-5 text-green-500 animate-scale-in" />
                              )}
                              {tc.status === 'failed' && (
                                <XCircle className="h-5 w-5 text-red-500 animate-scale-in" />
                              )}
                              {tc.status === 'pending' && (
                                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full mt-4"
                      onClick={handleSubmit}
                      disabled={submitting || contestEnded}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {contestEnded ? 'Contest Ended' : submitting ? 'Evaluating...' : 'Submit Solution'}
                    </Button>
                    
                    {contestEnded && (
                      <p className="text-sm text-center text-muted-foreground mt-2">
                        No more submissions are accepted for this contest
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="submissions">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {mySubmissions && mySubmissions.length > 0 ? (
                      <div className="space-y-3">
                        {mySubmissions.map((submission: any) => (
                          <div key={submission.id} className="flex justify-between items-center p-3 border rounded">
                            <div>
                              <Badge variant="outline" className={getStatusColor(submission.status)}>
                                {submission.status.replace('_', ' ')}
                              </Badge>
                              <p className="text-sm text-muted-foreground mt-1">
                                {new Date(submission.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{submission.score} points</p>
                              <p className="text-sm text-muted-foreground">
                                {submission.test_cases_passed}/{submission.total_test_cases} passed
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No submissions yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
