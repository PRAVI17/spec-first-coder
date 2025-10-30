import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Users, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

export default function Contests() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: contests, isLoading } = useQuery({
    queryKey: ['contests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contests')
        .select('*, contest_problems(id)')
        .eq('is_public', true)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredContests = contests?.filter(contest =>
    contest.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Contests</h1>
          <p className="text-muted-foreground">Browse and join coding contests</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contests..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading contests...</div>
        ) : filteredContests && filteredContests.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredContests.map((contest) => (
              <Card key={contest.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className={getStatusColor(contest.status)}>
                      {contest.status}
                    </Badge>
                    <Badge variant="secondary">
                      {contest.contest_problems?.length || 0} problems
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{contest.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {contest.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(contest.start_time), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(contest.start_time), 'HH:mm')} - {format(new Date(contest.end_time), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                  <Link to={`/contests/${contest.id}`}>
                    <Button className="w-full">
                      {contest.status === 'active' ? 'Join Now' : 'View Details'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No contests available at the moment
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
