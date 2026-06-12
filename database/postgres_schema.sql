create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('customer', 'operator', 'provider', 'merchant', 'admin')),
  display_name text,
  contact text,
  locale text,
  created_at timestamptz not null default now()
);

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references users(id),
  contact text not null,
  address_text text not null,
  approximate_need text not null,
  privacy_level text not null default 'normal' check (privacy_level in ('normal', 'private')),
  urgency text not null default 'normal' check (urgency in ('normal', 'urgent')),
  status text not null default 'pending',
  assigned_operator_id uuid references users(id),
  risk_status text not null default 'unreviewed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_briefs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  objective text not null,
  approximate_area text,
  private_address text,
  requested_time text,
  deliverables text,
  requires_video boolean not null default true,
  requires_advance_payment boolean not null default false,
  agreed_price text,
  customer_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  country text not null,
  city text not null,
  service_radius_km numeric,
  languages text,
  capabilities text,
  transport text,
  verification_level text not null default 'applicant',
  active boolean not null default false,
  completed_tasks integer not null default 0,
  rating numeric,
  created_at timestamptz not null default now()
);

create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  country text not null,
  city text not null,
  categories text,
  offerings text,
  delivery_area text,
  verification_level text not null default 'applicant',
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  task_brief_id uuid not null references task_briefs(id) on delete cascade,
  provider_id uuid references providers(id),
  assignment_type text not null check (assignment_type in ('public', 'private', 'urgent')),
  status text not null default 'invited',
  provider_response text,
  assigned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists task_events (
  id uuid primary key default gen_random_uuid(),
  task_brief_id uuid not null references task_briefs(id) on delete cascade,
  actor_id uuid references users(id),
  event_type text not null,
  detail text,
  media_url text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  sender_id uuid references users(id),
  body text,
  media_url text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  action text not null,
  resource_type text not null,
  resource_id text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists requests_status_idx on requests(status);
create index if not exists requests_urgency_idx on requests(urgency);
create index if not exists providers_city_idx on providers(country, city);
create index if not exists merchants_city_idx on merchants(country, city);
create index if not exists task_events_task_idx on task_events(task_brief_id, created_at);
