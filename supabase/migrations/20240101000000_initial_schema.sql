-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 1. Profiles (Tied to Supabase Auth)
-- ==============================================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  role text default 'customer' check (role in ('customer', 'owner', 'admin')),
  avatar text,
  bio text,
  city text,
  taste_profile jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 2. Restaurants (including Hotel_Master seed fields)
-- ==============================================================================
create table public.restaurants (
  id uuid default uuid_generate_v4() primary key,
  hotel_id text unique, -- From Hotel_Master.xlsx
  name text not null,
  slug text not null unique,
  area text,
  address text,
  city text default 'Kolhapur',
  lat double precision,
  lng double precision,
  phone text,
  website text,
  upi text,
  price_level integer check (price_level between 1 and 4),
  approx_price integer,
  seating_capacity integer,
  established_year integer,
  weekly_off text,
  opening_hours jsonb,
  features jsonb, -- { parking: boolean, ac: boolean, veg: boolean, delivery: boolean, takeaway: boolean, family_friendly: boolean, wheelchair: boolean }
  peak_hours jsonb, -- { "monday": ["12:00", "13:00"] }
  cover_image text,
  logo text,
  
  -- Ownership
  owner_id uuid references public.profiles(id),
  claimed boolean default false,
  
  -- Ratings (Denormalized for perf)
  google_rating double precision,
  google_reviews integer,
  taste_score double precision default 0,
  review_count integer default 0,
  mps_score double precision,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.restaurants enable row level security;
create policy "Restaurants are viewable by everyone." on public.restaurants for select using (true);
create policy "Owners can update their restaurant." on public.restaurants for update using (auth.uid() = owner_id);
create policy "Admins can update any restaurant." on public.restaurants for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ==============================================================================
-- 3. Reviews
-- ==============================================================================
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  sub_ratings jsonb not null, -- 11 dimensions
  overall_rating integer not null check (overall_rating between 1 and 5),
  would_recommend boolean default true,
  would_visit_again boolean default true,
  
  written_review text,
  favourite_dish text,
  amount_spent integer,
  visit_date date,
  tags text[] default array[]::text[],
  media text[] default array[]::text[],
  
  verified_visit boolean default false,
  
  -- Anti-spam & Moderation
  is_spam boolean default false,
  is_fake boolean default false,
  fake_score double precision default 0,
  helpful_count integer default 0,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reviews enable row level security;
create policy "Reviews are viewable by everyone." on public.reviews for select using (true);
create policy "Users can insert their own review." on public.reviews for insert with check (auth.uid() = user_id);
create policy "Users can update their own review." on public.reviews for update using (auth.uid() = user_id);

-- Helpful increment RPC
create or replace function increment_helpful(review_id uuid)
returns void as $$
begin
  update reviews set helpful_count = helpful_count + 1 where id = review_id;
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 4. Review Replies
-- ==============================================================================
create table public.review_replies (
  id uuid default uuid_generate_v4() primary key,
  review_id uuid references public.reviews(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.review_replies enable row level security;
create policy "Replies are viewable by everyone." on public.review_replies for select using (true);
create policy "Owners can insert reply." on public.review_replies for insert with check (auth.uid() = owner_id);

-- ==============================================================================
-- 5. Restaurant Events
-- ==============================================================================
create table public.restaurant_events (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  title text not null,
  type text not null, -- festival, special_menu, competition
  description text,
  image text,
  start_date date not null,
  end_date date,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.restaurant_events enable row level security;
create policy "Events are viewable by everyone." on public.restaurant_events for select using (true);
create policy "Owners can manage events." on public.restaurant_events for all using (
  exists (select 1 from public.restaurants where id = restaurant_id and owner_id = auth.uid())
);

-- ==============================================================================
-- 6. Ownership Claims
-- ==============================================================================
create table public.claims (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  full_name text not null,
  phone text not null,
  business_role text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.claims enable row level security;
create policy "Users can view their own claims." on public.claims for select using (auth.uid() = user_id);
create policy "Admins can view all claims." on public.claims for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Users can insert claims." on public.claims for insert with check (auth.uid() = user_id);
create policy "Admins can update claims." on public.claims for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ==============================================================================
-- 7. MPS Score View (Business Intelligence Layer)
-- ==============================================================================
-- MPS = 0.30(R) + 0.30(CS) + 0.20(V) + 0.10(Rec) + 0.10(RP)

create or replace view public.v_mps_scores as
with stats as (
  select
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.area,
    count(rev.id)::float as review_count,
    coalesce(avg(rev.overall_rating), 0)::float as avg_rating,
    
    -- Sub-ratings averages
    coalesce(avg((rev.sub_ratings->>'taste')::numeric), 0)::float as avg_taste,
    coalesce(avg((rev.sub_ratings->>'service')::numeric), 0)::float as avg_service,
    coalesce(avg((rev.sub_ratings->>'cleanliness')::numeric), 0)::float as avg_clean,
    coalesce(avg((rev.sub_ratings->>'ambience')::numeric), 0)::float as avg_amb,
    coalesce(avg((rev.sub_ratings->>'value_for_money')::numeric), 0)::float as avg_val,
    
    coalesce(sum(case when rev.would_recommend then 1 else 0 end)::float / nullif(count(rev.id), 0), 0)::float as rec_rate
    
  from public.restaurants r
  left join public.reviews rev on r.id = rev.restaurant_id and rev.is_spam = false and rev.is_fake = false
  group by r.id, r.name, r.area
),
components as (
  select
    restaurant_id,
    restaurant_name,
    area,
    review_count,
    avg_rating as overall_rating,
    
    -- 1. Rating Score (R) [Max 1.0] -> Maps 1-5 to 0-1
    (greatest(avg_rating - 1, 0) / 4.0) as norm_rating,
    
    -- 2. Customer Satisfaction (CS) [Max 1.0] -> Average of Taste, Service, Cleanliness, Ambience mapped to 0-1
    ((greatest(avg_taste - 1, 0) + greatest(avg_service - 1, 0) + greatest(avg_clean - 1, 0) + greatest(avg_amb - 1, 0)) / 16.0) as norm_cs,
    
    -- 3. Value (V) [Max 1.0] -> Value for money mapped to 0-1
    (greatest(avg_val - 1, 0) / 4.0) as norm_v,
    
    -- 4. Recommendation (Rec) [Max 1.0] -> Already 0-1
    rec_rate as norm_rec,
    
    -- 5. Review Popularity (RP) [Max 1.0] -> Log scale based on max reviews. (We use a simple log normalization here. If max reviews is small, it tops out quickly)
    least(ln(review_count + 1) / ln(100.0), 1.0) as norm_rp
    
  from stats
  where review_count > 0 -- only score restaurants with reviews
)
select
  restaurant_id,
  restaurant_name,
  area,
  review_count,
  overall_rating,
  
  -- Component scores (for breakdown display)
  (0.30 * norm_rating) as r_score,
  (0.30 * norm_cs) as cs_score,
  (0.20 * norm_v) as v_score,
  (0.10 * norm_rec) as rec_score,
  (0.10 * norm_rp) as rp_score,
  
  -- Final MPS (0 to 10)
  ((0.30 * norm_rating) + 
   (0.30 * norm_cs) + 
   (0.20 * norm_v) + 
   (0.10 * norm_rec) + 
   (0.10 * norm_rp)) * 10.0 as mps
from components;
