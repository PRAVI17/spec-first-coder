import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function Contests() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: contests, isLoading } = useQuery({
    queryKey: ['contests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast({
        title: 'Contest deleted',
        description: 'The contest has been deleted successfully.',
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

  const filteredContests = contests?.filter(contest =>
    contest.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'active':
        return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'completed':
        return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
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
            <h1 className="text-3xl font-bold mb-2">Contests Management</h1>
            <p className="text-muted-foreground">Create and manage coding contests</p>
          </div>
          <Link to="/admin/contests/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Contest
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contests..."
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
            ) : filteredContests && filteredContests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContests.map((contest) => (
                    <TableRow key={contest.id}>
                      <TableCell className="font-medium">{contest.title}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(contest.status)}>
                          {contest.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(contest.start_time), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(contest.end_time), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/contests/${contest.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link to={`/admin/contests/${contest.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(contest.id)}
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
                No contests found
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
