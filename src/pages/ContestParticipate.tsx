import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Send, Trophy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Editor from '@monaco-editor/react';

export default function ContestParticipate() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python' | 'java' | 'cpp' | 'c'>('javascript');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const { data: contest } = useQuery({
    queryKey: ['contest-participate', id],
    queryFn: async () => {
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

  const { data: leaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['leaderboard', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contest_participants')
        .select('*, profiles(full_name, username)')
        .eq('contest_id', id)
        .order('total_score', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: mySubmissions, refetch: refetchSubmissions } = useQuery({
    queryKey: ['my-submissions', id, selectedProblemId],
    queryFn: async () => {
      if (!selectedProblemId) return [];
      
      const { data, error } = await supabase
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

  useEffect(() => {
    if (contest?.contest_problems && contest.contest_problems.length > 0) {
      setSelectedProblemId(contest.contest_problems[0].problem_id);
    }
  }, [contest]);

  useEffect(() => {
    if (!contest) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(contest.end_time).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('Contest Ended');
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

    // Simulate submission - in real app, this would call Judge0 API via edge function
    const { error } = await supabase.from('submissions').insert({
      user_id: user!.id,
      contest_id: id!,
      problem_id: selectedProblemId,
      language,
      code,
      status: 'pending',
      total_test_cases: (problem.test_cases as any[])?.length || 0,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit solution',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Submitted!',
        description: 'Your solution is being evaluated',
      });
      refetchSubmissions();
      refetchLeaderboard();
    }

    setSubmitting(false);
  };

  const selectedProblem = contest?.contest_problems?.find(
    cp => cp.problem_id === selectedProblemId
  )?.problems;

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
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-2">
                  {leaderboard?.map((participant, index) => (
                    <div key={participant.id} className="flex justify-between items-center text-sm p-2 rounded hover:bg-muted/50">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-muted-foreground">#{index + 1}</span>
                        <span>{participant.profiles?.username || 'User'}</span>
                      </span>
                      <Badge variant="secondary">{participant.total_score}</Badge>
                    </div>
                  ))}
                </div>
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
                    <Button
                      className="w-full mt-4"
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {submitting ? 'Submitting...' : 'Submit Solution'}
                    </Button>
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
                        {mySubmissions.map((submission) => (
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
