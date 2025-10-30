import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Code2, Trophy, Users, Zap } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="flex justify-center mb-6">
            <Code2 className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to smarTest
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Challenge yourself in competitive programming contests. Solve problems, compete with others, and climb the leaderboards.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/register">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center p-6 rounded-lg border bg-card">
              <div className="flex justify-center mb-4">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Competitive Contests</h3>
              <p className="text-muted-foreground">
                Participate in real-time coding contests with instant feedback and live leaderboards.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg border bg-card">
              <div className="flex justify-center mb-4">
                <Zap className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Evaluation</h3>
              <p className="text-muted-foreground">
                Get immediate feedback on your solutions with automated test case validation.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg border bg-card">
              <div className="flex justify-center mb-4">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Global Community</h3>
              <p className="text-muted-foreground">
                Compete with programmers worldwide and track your progress on the leaderboards.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 smarTest. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
