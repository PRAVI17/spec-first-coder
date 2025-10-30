import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function Problems() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: problems, isLoading, refetch } = useQuery({
    queryKey: ['admin-problems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;

    const { error } = await supabase
      .from('problems')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete problem',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Problem deleted successfully',
      });
      refetch();
    }
  };

  const filteredProblems = problems?.filter(problem =>
    problem.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'hard': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Problem Bank</h1>
            <p className="text-muted-foreground">Manage coding problems</p>
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
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
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
                        <Badge variant="outline" className={getDifficultyColor(problem.difficulty)}>
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
                            onClick={() => handleDelete(problem.id)}
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
