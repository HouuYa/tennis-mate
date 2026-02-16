-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Players Table
create table public.players (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

-- 2. Sessions Table
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  played_at timestamptz default now(),
  location text,
  status text default 'active', -- 'active', 'completed'
  created_at timestamptz default now()
);

-- 3. Session Players (Junction Table)
create table public.session_players (
  session_id uuid references public.sessions(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (session_id, player_id)
);

-- 4. Matches Table
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade,
  played_at timestamptz default now(),
  end_time timestamptz,
  
  -- We store player IDs in JSONB objects for teams
  team_a jsonb not null, -- {player1Id: uuid, player2Id: uuid}
  team_b jsonb not null, -- {player1Id: uuid, player2Id: uuid}
  
  score_a integer default 0,
  score_b integer default 0,
  is_finished boolean default false,
  court_number integer default 1,
  
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
-- For now, we allow public access to keep it simple as per "Guest Mode" / shared usage feel.
-- In a real production app with auth, we would lock this down.
alter table public.players enable row level security;
alter table public.sessions enable row level security;
alter table public.session_players enable row level security;
alter table public.matches enable row level security;

-- Create policies for public access (Anon key)
-- NOTE: DROP POLICY IF EXISTS를 사용하여 이미 존재하는 정책이 있어도 에러 없이 재생성 가능
-- (Supabase에서 동일 이름 정책이 있으면 CREATE POLICY가 에러 발생하므로 DROP 먼저 실행)

-- 1. players
drop policy if exists "Allow public read access" on public.players;
create policy "Allow public read access" on public.players for select using (true);
drop policy if exists "Allow public insert access" on public.players;
create policy "Allow public insert access" on public.players for insert with check (true);
drop policy if exists "Allow public update access" on public.players;
create policy "Allow public update access" on public.players for update using (true);
drop policy if exists "Allow public delete access" on public.players;
create policy "Allow public delete access" on public.players for delete using (true);

-- 2. sessions
drop policy if exists "Allow public read access" on public.sessions;
create policy "Allow public read access" on public.sessions for select using (true);
drop policy if exists "Allow public insert access" on public.sessions;
create policy "Allow public insert access" on public.sessions for insert with check (true);
drop policy if exists "Allow public update access" on public.sessions;
create policy "Allow public update access" on public.sessions for update using (true);
drop policy if exists "Allow public delete access" on public.sessions;
create policy "Allow public delete access" on public.sessions for delete using (true);

-- 3. session_players
drop policy if exists "Allow public read access" on public.session_players;
create policy "Allow public read access" on public.session_players for select using (true);
drop policy if exists "Allow public insert access" on public.session_players;
create policy "Allow public insert access" on public.session_players for insert with check (true);
drop policy if exists "Allow public update access" on public.session_players;
create policy "Allow public update access" on public.session_players for update using (true);
drop policy if exists "Allow public delete access" on public.session_players;
create policy "Allow public delete access" on public.session_players for delete using (true);

-- 4. matches
drop policy if exists "Allow public read access" on public.matches;
create policy "Allow public read access" on public.matches for select using (true);
drop policy if exists "Allow public insert access" on public.matches;
create policy "Allow public insert access" on public.matches for insert with check (true);
drop policy if exists "Allow public update access" on public.matches;
create policy "Allow public update access" on public.matches for update using (true);
drop policy if exists "Allow public delete access" on public.matches;
create policy "Allow public delete access" on public.matches for delete using (true);
