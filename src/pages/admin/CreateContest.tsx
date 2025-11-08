import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    queryKey: ['problems-for-contest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problems')
        .select('id, title, difficulty')
        .order('title');
      
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(formData.end_time) <= new Date(formData.start_time)) {
      toast({
        title: 'Error',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    // Convert datetime-local to ISO string with proper timezone handling
    const startDate = new Date(formData.start_time);
    const endDate = new Date(formData.end_time);

    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .insert({
        ...formData,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      })
      .select()
      .single();

    if (contestError) {
      toast({
        title: 'Error',
        description: 'Failed to create contest',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (selectedProblems.length > 0) {
      const contestProblems = selectedProblems.map((problemId, index) => ({
        contest_id: contest.id,
        problem_id: problemId,
        order_num: index,
        points: 100,
      }));

      const { error: problemsError } = await supabase
        .from('contest_problems')
        .insert(contestProblems);

      if (problemsError) {
        toast({
          title: 'Warning',
          description: 'Contest created but failed to add problems',
          variant: 'destructive',
        });
      }
    }

    toast({
      title: 'Success',
      description: 'Contest created successfully',
    });
    navigate('/admin/contests');
    setLoading(false);
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
        <Link to="/admin/contests">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contests
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Create New Contest</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
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
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                <Label htmlFor="is_public" className="cursor-pointer">
                  Make contest public
                </Label>
              </div>

              <div className="space-y-4">
                <Label>Select Problems</Label>
                <Card>
                  <CardContent className="pt-6 max-h-96 overflow-y-auto">
                    {problems && problems.length > 0 ? (
                      <div className="space-y-3">
                        {problems.map((problem) => (
                          <div key={problem.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={problem.id}
                              checked={selectedProblems.includes(problem.id)}
                              onCheckedChange={() => toggleProblem(problem.id)}
                            />
                            <Label htmlFor={problem.id} className="cursor-pointer flex-1">
                              {problem.title}
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({problem.difficulty})
                              </span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No problems available. Create some problems first.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Contest'}
                </Button>
                <Link to="/admin/contests">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
