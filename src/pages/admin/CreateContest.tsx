import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

export default function CreateContest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    is_public: true,
  });
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);

  const { data: problems } = useQuery({
    queryKey: ['problems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .order('title');
      
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create contest
      const { data: contest, error: contestError } = await supabase
        .from('contests')
        .insert([formData])
        .select()
        .single();

      if (contestError) throw contestError;

      // Link problems to contest
      if (selectedProblems.length > 0) {
        const contestProblems = selectedProblems.map((problemId, index) => ({
          contest_id: contest.id,
          problem_id: problemId,
          order_num: index + 1,
          points: 100,
        }));

        const { error: linkError } = await supabase
          .from('contest_problems')
          .insert(contestProblems);

        if (linkError) throw linkError;
      }

      toast({
        title: 'Contest created',
        description: 'The contest has been created successfully.',
      });
      navigate('/admin/contests');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleProblem = (problemId: string) => {
    setSelectedProblems(prev =>
      prev.includes(problemId)
        ? prev.filter(id => id !== problemId)
        : [...prev, problemId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/admin/contests')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contests
          </Button>
          <h1 className="text-3xl font-bold mb-2">Create New Contest</h1>
          <p className="text-muted-foreground">Set up a new coding contest</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Contest Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_public: checked as boolean })
                  }
                />
                <Label htmlFor="is_public" className="font-normal cursor-pointer">
                  Make this contest public
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Problems</CardTitle>
            </CardHeader>
            <CardContent>
              {problems && problems.length > 0 ? (
                <div className="space-y-2">
                  {problems.map((problem) => (
                    <div key={problem.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                      <Checkbox
                        id={problem.id}
                        checked={selectedProblems.includes(problem.id)}
                        onCheckedChange={() => toggleProblem(problem.id)}
                      />
                      <Label htmlFor={problem.id} className="font-normal cursor-pointer flex-1">
                        {problem.title} - <span className="text-muted-foreground">{problem.difficulty}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No problems available. Create problems first.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Contest'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/contests')}>
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
