import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function Problems() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: problems, isLoading } = useQuery({
    queryKey: ['problems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('problems')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      toast({
        title: 'Problem deleted',
        description: 'The problem has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredProblems = problems?.filter(problem =>
    problem.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
      case 'hard':
        return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Problem Bank</h1>
            <p className="text-muted-foreground">Manage coding problems for contests</p>
          </div>
          <Link to="/admin/problems/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Problem
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              </div>
            ) : filteredProblems && filteredProblems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Time Limit</TableHead>
                    <TableHead>Memory Limit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProblems.map((problem) => (
                    <TableRow key={problem.id}>
                      <TableCell className="font-medium">{problem.title}</TableCell>
                      <TableCell>
                        <Badge className={getDifficultyColor(problem.difficulty)}>
                          {problem.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>{problem.time_limit}ms</TableCell>
                      <TableCell>{problem.memory_limit}MB</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/problems/${problem.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(problem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No problems found
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
