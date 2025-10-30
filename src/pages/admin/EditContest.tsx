import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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

export default function EditContest() {
  const { id } = useParams();
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

  // Fetch contest data
  const { data: contest, isLoading: contestLoading } = useQuery({
    queryKey: ['contest-edit', id],
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
  const { data: contestProblems } = useQuery({
    queryKey: ['contest-problems-edit', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contest_problems')
        .select('problem_id')
        .eq('contest_id', id);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all problems
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

  // Set form data when contest loads
  useEffect(() => {
    if (contest) {
      // Convert ISO timestamp to datetime-local format
      const startDate = new Date(contest.start_time);
      const endDate = new Date(contest.end_time);
      
      const formatDateTimeLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        title: contest.title,
        description: contest.description || '',
        start_time: formatDateTimeLocal(startDate),
        end_time: formatDateTimeLocal(endDate),
        is_public: contest.is_public,
      });
    }
  }, [contest]);

  // Set selected problems when contest problems load
  useEffect(() => {
    if (contestProblems) {
      setSelectedProblems(contestProblems.map((cp: any) => cp.problem_id));
    }
  }, [contestProblems]);

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

    // Convert datetime-local to ISO string
    const startDate = new Date(formData.start_time);
    const endDate = new Date(formData.end_time);

    // Update contest
    const { error: contestError } = await supabase
      .from('contests')
      .update({
        title: formData.title,
        description: formData.description,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        is_public: formData.is_public,
      })
      .eq('id', id);

    if (contestError) {
      toast({
        title: 'Error',
        description: 'Failed to update contest',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Delete existing contest problems
    await (supabase as any)
      .from('contest_problems')
      .delete()
      .eq('contest_id', id);

    // Insert new contest problems
    if (selectedProblems.length > 0) {
      const contestProblemsData = selectedProblems.map((problemId, index) => ({
        contest_id: id,
        problem_id: problemId,
        order_num: index,
        points: 100,
      }));

      const { error: problemsError } = await (supabase as any)
        .from('contest_problems')
        .insert(contestProblemsData);

      if (problemsError) {
        toast({
          title: 'Warning',
          description: 'Contest updated but failed to update problems',
          variant: 'destructive',
        });
      }
    }

    toast({
      title: 'Success',
      description: 'Contest updated successfully',
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

  if (contestLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading contest...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <CardTitle>Edit Contest</CardTitle>
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
                  {loading ? 'Updating...' : 'Update Contest'}
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
