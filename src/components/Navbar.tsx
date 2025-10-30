import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Code2, LogOut, Menu, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function Navbar() {
  const { user, role, signOut } = useAuth();

  const NavLinks = () => (
    <>
      {user && role === 'admin' && (
        <>
          <Link to="/admin/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <Link to="/admin/contests">
            <Button variant="ghost">Contests</Button>
          </Link>
          <Link to="/admin/problems">
            <Button variant="ghost">Problems</Button>
          </Link>
        </>
      )}
      {user && role === 'user' && (
        <>
          <Link to="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <Link to="/contests">
            <Button variant="ghost">Contests</Button>
          </Link>
          <Link to="/leaderboards">
            <Button variant="ghost">Leaderboards</Button>
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CodeArena</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-2">
            <NavLinks />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden md:flex rounded-full p-0 h-10 w-10">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || '')}&background=1e40af&color=fff`} 
                        alt={user.email || 'User'} 
                      />
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <nav className="flex flex-col gap-4 mt-8">
                    <NavLinks />
                    <Button variant="ghost" asChild>
                      <Link to="/profile">Profile</Link>
                    </Button>
                    <Button variant="ghost" onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden md:block">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
