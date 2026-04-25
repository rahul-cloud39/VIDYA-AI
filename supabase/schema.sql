create table if not exists users (
  id uuid primary key,
  email text unique not null,
  plan text default 'free' check (plan in ('free', 'pro')),
  exam text default 'JEE' check (exam in ('JEE', 'NEET', 'UPSC')),
  streak integer default 0,
  last_active date,
  razorpay_customer_id text,
  created_at timestamptz default now()
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  exam text,
  subject text,
  topic text,
  correct boolean,
  time_taken integer,
  difficulty text,
  created_at timestamptz default now()
);

create table if not exists doubt_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  question text,
  answer text,
  exam text,
  tokens_used integer,
  created_at timestamptz default now()
);

create table if not exists mock_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  exam text,
  total integer,
  correct integer,
  subject_breakdown jsonb,
  time_taken integer,
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plan text,
  amount integer,
  currency text default 'INR',
  razorpay_order_id text,
  razorpay_payment_id text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  front text not null,
  back text not null,
  difficulty text,
  exam_relevance text,
  next_review timestamptz default now(),
  created_at timestamptz default now()
);

create or replace function get_weak_topics(uid uuid)
returns table(topic text, subject text, accuracy float, attempts bigint) as $$
  select
    topic,
    subject,
    avg(correct::int)::float as accuracy,
    count(*) as attempts
  from attempts
  where user_id = uid
  group by topic, subject
  having count(*) >= 3
  order by accuracy asc
  limit 10;
$$ language sql security definer;

alter table users enable row level security;
alter table attempts enable row level security;
alter table doubt_sessions enable row level security;
alter table mock_tests enable row level security;
alter table subscriptions enable row level security;
alter table flashcards enable row level security;
