-- Create difficulty enum
create type public.difficulty_level as enum ('easy', 'medium', 'hard');

-- Create contest status enum
create type public.contest_status as enum ('upcoming', 'active', 'completed');

-- Create problems table
create table public.problems (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  difficulty difficulty_level not null,
  constraints text,
  input_format text,
  output_format text,
  sample_input text,
  sample_output text,
  test_cases jsonb not null default '[]'::jsonb,
  time_limit integer not null default 2000, -- in milliseconds
  memory_limit integer not null default 256, -- in MB
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on problems
alter table public.problems enable row level security;

-- Create contests table
create table public.contests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status contest_status not null default 'upcoming',
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_range check (end_time > start_time)
);

-- Enable RLS on contests
alter table public.contests enable row level security;

-- Create junction table for contest problems
create table public.contest_problems (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  points integer not null default 100,
  order_num integer not null default 0,
  created_at timestamptz not null default now(),
  unique(contest_id, problem_id)
);

-- Enable RLS on contest_problems
alter table public.contest_problems enable row level security;

-- RLS Policies for problems
create policy "Anyone can view problems"
  on public.problems
  for select
  to authenticated
  using (true);

create policy "Admins can insert problems"
  on public.problems
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update problems"
  on public.problems
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete problems"
  on public.problems
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for contests
create policy "Anyone can view public contests"
  on public.contests
  for select
  to authenticated
  using (is_public = true or public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert contests"
  on public.contests
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update contests"
  on public.contests
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete contests"
  on public.contests
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for contest_problems
create policy "Anyone can view contest problems"
  on public.contest_problems
  for select
  to authenticated
  using (true);

create policy "Admins can insert contest problems"
  on public.contest_problems
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update contest problems"
  on public.contest_problems
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete contest problems"
  on public.contest_problems
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
create trigger update_problems_updated_at
  before update on public.problems
  for each row
  execute function public.update_updated_at();

create trigger update_contests_updated_at
  before update on public.contests
  for each row
  execute function public.update_updated_at();

-- Function to auto-update contest status
create or replace function public.update_contest_status()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.contests
  set status = case
    when now() < start_time then 'upcoming'::contest_status
    when now() >= start_time and now() <= end_time then 'active'::contest_status
    else 'completed'::contest_status
  end
  where status != case
    when now() < start_time then 'upcoming'::contest_status
    when now() >= start_time and now() <= end_time then 'active'::contest_status
    else 'completed'::contest_status
  end;
end;
$$;