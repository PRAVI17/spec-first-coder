import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, Code, Target } from "lucide-react";
import { format } from "date-fns";

type SubmissionWithDetails = {
  id: string;
  code: string;
  language: string;
  status: string;
  score: number | null;
  created_at: string;
  problem_title: string;
  contest_title: string;
};

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setFullName(data.full_name);
      setUsername(data.username);
      return data;
    },
  });

  // Fetch submission statistics
  const { data: stats } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: submissions, error } = (await supabase
        .from("submissions" as any)
        .select("status, score, contest_id")
        .eq("user_id", user.id)) as any;

      if (error) throw error;
      if (!submissions) return { totalSubmissions: 0, acceptedSubmissions: 0, uniqueContests: 0, totalScore: 0, successRate: 0 };

      const totalSubmissions = submissions.length;
      const acceptedSubmissions = submissions.filter(s => s.status === "accepted").length;
      const uniqueContests = new Set(submissions.map(s => s.contest_id)).size;
      const totalScore = submissions.reduce((sum, s) => sum + (s.score || 0), 0);

      return {
        totalSubmissions,
        acceptedSubmissions,
        uniqueContests,
        totalScore,
        successRate: totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0,
      };
    },
  });

  // Fetch submission history
  const { data: submissions } = useQuery<SubmissionWithDetails[]>({
    queryKey: ["profile-submissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: submissionsData, error } = (await supabase
        .from("submissions" as any)
        .select("id, code, language, status, score, created_at, problem_id, contest_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)) as any;

      if (error) throw error;
      if (!submissionsData) return [];

      // Fetch related problems and contests
      const enrichedData = await Promise.all(
        submissionsData.map(async (sub) => {
          const { data: problem } = await supabase
            .from("problems")
            .select("title")
            .eq("id", sub.problem_id)
            .single();
          
          const { data: contest } = await supabase
            .from("contests")
            .select("title")
            .eq("id", sub.contest_id)
            .single();

          return {
            id: sub.id,
            code: sub.code,
            language: sub.language,
            status: sub.status,
            score: sub.score,
            created_at: sub.created_at,
            problem_title: problem?.title || "Unknown",
            contest_title: contest?.title || "Unknown",
          };
        })
      );

      return enrichedData;
    },
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, username })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update profile", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-500";
      case "wrong_answer": return "bg-red-500";
      case "time_limit_exceeded": return "bg-yellow-500";
      case "runtime_error": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Profile Info Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input value={profile?.id} disabled />
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
                        {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Code className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-bold">{stats?.totalSubmissions || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Trophy className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                  <p className="text-2xl font-bold">{stats?.acceptedSubmissions || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{stats?.successRate || 0}%</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">Total Score</p>
                <p className="text-3xl font-bold text-primary">{stats?.totalScore || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submission History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>Your last 20 submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Problem</TableHead>
                  <TableHead>Contest</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions?.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.problem_title}</TableCell>
                    <TableCell>{submission.contest_title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{submission.language}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(submission.status)}>
                        {submission.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{submission.score || 0}</TableCell>
                    <TableCell>{format(new Date(submission.created_at), "MMM d, HH:mm")}</TableCell>
                  </TableRow>
                ))}
                {!submissions?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No submissions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
