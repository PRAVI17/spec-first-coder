import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Medal, Award, Search } from "lucide-react";

type UserStats = {
  id: string;
  full_name: string;
  username: string;
  totalSubmissions: number;
  acceptedSubmissions: number;
  totalScore: number;
  successRate: number;
};

export default function Leaderboards() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch global leaderboard
  const { data: leaderboard, isLoading } = useQuery<UserStats[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username");

      if (profilesError) throw profilesError;

      // Fetch all submissions
      const { data: allSubmissions, error: submissionsError } = (await supabase
        .from("submissions" as any)
        .select("user_id, status, score")) as any;

      if (submissionsError) throw submissionsError;
      if (!allSubmissions) return [];

      // Calculate stats for each user
      const userStats: UserStats[] = profiles.map((user) => {
        const userSubmissions = allSubmissions.filter((s) => s.user_id === user.id);
        const totalSubmissions = userSubmissions.length;
        const acceptedSubmissions = userSubmissions.filter((s) => s.status === "accepted").length;
        const totalScore = userSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
        const successRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

        return {
          id: user.id,
          full_name: user.full_name,
          username: user.username,
          totalSubmissions,
          acceptedSubmissions,
          totalScore,
          successRate,
        };
      });

      // Sort by total score (descending)
      return userStats.sort((a, b) => b.totalScore - a.totalScore);
    },
  });

  // Filter leaderboard by search query
  const filteredLeaderboard = leaderboard?.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-orange-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-yellow-500";
    if (rank === 2) return "bg-gray-400";
    if (rank === 3) return "bg-orange-600";
    return "bg-muted";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Global Leaderboard</h1>
          <p className="text-muted-foreground">Top performers ranked by total score</p>
        </div>

        {/* Top 3 Podium */}
        {!isLoading && filteredLeaderboard && filteredLeaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
            {/* 2nd Place */}
            <Card className="mt-8">
              <CardContent className="pt-6 text-center">
                <Medal className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <h3 className="font-bold text-lg">{filteredLeaderboard[1].full_name}</h3>
                <p className="text-sm text-muted-foreground mb-2">@{filteredLeaderboard[1].username}</p>
                <p className="text-2xl font-bold text-primary">{filteredLeaderboard[1].totalScore}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </CardContent>
            </Card>

            {/* 1st Place */}
            <Card className="border-2 border-yellow-500">
              <CardContent className="pt-6 text-center">
                <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-2" />
                <h3 className="font-bold text-xl">{filteredLeaderboard[0].full_name}</h3>
                <p className="text-sm text-muted-foreground mb-2">@{filteredLeaderboard[0].username}</p>
                <p className="text-3xl font-bold text-primary">{filteredLeaderboard[0].totalScore}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </CardContent>
            </Card>

            {/* 3rd Place */}
            <Card className="mt-8">
              <CardContent className="pt-6 text-center">
                <Award className="h-12 w-12 text-orange-600 mx-auto mb-2" />
                <h3 className="font-bold text-lg">{filteredLeaderboard[2].full_name}</h3>
                <p className="text-sm text-muted-foreground mb-2">@{filteredLeaderboard[2].username}</p>
                <p className="text-2xl font-bold text-primary">{filteredLeaderboard[2].totalScore}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>All Rankings</CardTitle>
            <CardDescription>Search and view all participants</CardDescription>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Total Score</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead>Success Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaderboard?.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {getRankIcon(index + 1)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRankBadge(index + 1)}>
                          {user.totalScore} pts
                        </Badge>
                      </TableCell>
                      <TableCell>{user.totalSubmissions}</TableCell>
                      <TableCell>{user.acceptedSubmissions}</TableCell>
                      <TableCell>
                        <Badge variant={user.successRate >= 50 ? "default" : "secondary"}>
                          {user.successRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredLeaderboard?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
