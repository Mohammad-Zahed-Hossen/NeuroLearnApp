Help me to implement this:
I'll generate recommended Supabase migration SQL for the three tables you asked (tasks, study_sessions, memory_palaces), include sensible indexes, upsert examples, and recommended Row Level Security (RLS) policies for Supabase. I'll also provide short Jest test skeletons you can add to the repo to validate the new Supabase-backed methods (mocking the Supabase client like the project does). Finally, I'll list next steps you can take to apply and verify the migration.

What I'm providing
SQL migration (CREATE TABLE) for:
tasks
study_sessions
memory_palaces
Useful indexes, JSONB/GIN where appropriate
Example upsert statements
Recommended RLS policies for Supabase (enable per-user access)
Short Jest test skeletons for getTasks() and saveTasks() and similar for study sessions and memory palaces
Next steps and verification tips
Supabase migration SQL
Notes before running:

Supabase supports gen_random_uuid() from the pgcrypto extension. Enable it in your DB or change defaults to uuid_generate_v4() if you prefer uuid-ossp.
Wrap these statements in one migration file for Supabase CLI (or run via psql). I included IF NOT EXISTS for safety.
-- Enable pgcrypto for gen_random_uuid() (Supabase usually supports this)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- tasks
-- =========================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  description text,
  is_completed boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 1,
  due timestamptz,
  project_name text,
  tags text[],                 -- simple array for tags
  labels text[],               -- simple array for labels
  todoist_id text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS tasks_user_idx ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS tasks_created_idx ON public.tasks (user_id, created_at DESC);
-- GIN index for tags/labels array lookups
CREATE INDEX IF NOT EXISTS tasks_tags_gin ON public.tasks USING GIN (tags);
CREATE INDEX IF NOT EXISTS tasks_labels_gin ON public.tasks USING GIN (labels);

-- =========================
-- study_sessions
-- =========================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration integer,                -- store duration in seconds or minutes per convention
  type text,
  cards_reviewed integer,
  correct_answers integer,
  total_answers integer,
  focus_rating numeric,
  notes text,
  cognitive_load numeric,
  completed boolean DEFAULT false,
  mode text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_sessions_user_idx ON public.study_sessions (user_id);
CREATE INDEX IF NOT EXISTS study_sessions_created_idx ON public.study_sessions (user_id, created_at DESC);

-- =========================
-- memory_palaces
-- =========================
CREATE TABLE IF NOT EXISTS public.memory_palaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  rooms jsonb DEFAULT '[]'::jsonb,       -- flexible structure for rooms
  locations jsonb DEFAULT '[]'::jsonb,   -- alternate representation
  total_items integer DEFAULT 0,
  mastered_items integer DEFAULT 0,
  last_studied timestamptz,
  is_active boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS memory_palaces_user_idx ON public.memory_palaces (user_id);
-- GIN on JSONB for searching inside rooms/locations
CREATE INDEX IF NOT EXISTS memory_palaces_rooms_gin ON public.memory_palaces USING GIN (rooms);
CREATE INDEX IF NOT EXISTS memory_palaces_locations_gin ON public.memory_palaces USING GIN (locations);

-- =========================
-- Optional: helpful triggers to keep updated_at in sync
-- (If you want automatic updated_at maintenance)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER memory_palaces_set_updated_at
BEFORE UPDATE ON public.memory_palaces
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER study_sessions_set_updated_at
BEFORE UPDATE ON public.study_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

Upsert examples (how your code maps to SQL)
Your code uses upsert semantics via Supabase. Example patterns you can use in raw SQL (if you ever need it):

INSERT INTO public.tasks (
  id, user_id, content, description, is_completed, priority, due, project_name, tags, labels, todoist_id, source, created_at
)
VALUES (..., ..., 'do X', 'desc', false, 1, '2025-10-01T12:00:00Z', 'Inbox', ARRAY['a','b'], ARRAY['l1'], 'tid', 'local', now())
ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  is_completed = EXCLUDED.is_completed,
  priority = EXCLUDED.priority,
  due = EXCLUDED.due,
  project_name = EXCLUDED.project_name,
  tags = EXCLUDED.tags,
  labels = EXCLUDED.labels,
  todoist_id = EXCLUDED.todoist_id,
  source = EXCLUDED.source,
  modified_at = now();

Study session upsert (single record):
INSERT INTO public.study_sessions (id, user_id, start_time, end_time, duration, type, created_at)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  duration = EXCLUDED.duration,
  type = EXCLUDED.type,
  created_at = EXCLUDED.created_at;

Memory palace upsert:
INSERT INTO public.memory_palaces (id, user_id, name, description, rooms, locations, total_items, mastered_items, last_studied, is_active, created_at)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rooms = EXCLUDED.rooms,
  locations = EXCLUDED.locations,
  total_items = EXCLUDED.total_items,
  mastered_items = EXCLUDED.mastered_items,
  last_studied = EXCLUDED.last_studied,
  is_active = EXCLUDED.is_active,
  updated_at = now();
Row Level Security (RLS) — recommended policies
Supabase encourages using RLS for per-user row isolation. Example policies:
-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_palaces ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT/UPDATE/DELETE only their rows
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (user_id = auth.uid());

-- Repeat similarly for study_sessions and memory_palaces:
CREATE POLICY "study_sessions_select_own" ON public.study_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "study_sessions_insert_own" ON public.study_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "study_sessions_update_own" ON public.study_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "study_sessions_delete_own" ON public.study_sessions FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "memory_palaces_select_own" ON public.memory_palaces FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "memory_palaces_insert_own" ON public.memory_palaces FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "memory_palaces_update_own" ON public.memory_palaces FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "memory_palaces_delete_own" ON public.memory_palaces FOR DELETE USING (user_id = auth.uid());
Note: If you use service_role secret or run server-side jobs, those bypass RLS. For client apps, keep RLS on.

Jest test skeletons (mocking Supabase like existing tests)
You already have test conventions in the repo. Below are short skeletons you can drop into storage as tasks.supabase.test.ts etc.

getTasks happy path
// __tests__/storage/tasks.supabase.test.ts
import SupabaseStorageService from '../../src/services/storage/SupabaseStorageService';

describe('SupabaseStorageService - getTasks', () => {
  it('returns tasks mapped to app model when supabase returns rows', async () => {
    // Arrange: mock SupabaseService.auth.getUser and from('tasks').select to return rows
    const fakeUser = { id: 'test-user' };
    // Monkeypatch the SupabaseService module used by your SupabaseStorageService
    jest.mock('../../src/services/storage/SupabaseService', () => ({
      supabase: {
        auth: { getUser: async () => ({ data: { user: fakeUser } }) },
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({
                  data: [
                    {
                      id: '1111-2222',
                      content: 'Task 1',
                      description: 'Desc',
                      is_completed: false,
                      priority: 2,
                      due: '2025-10-01T00:00:00Z',
                      project_name: 'Inbox',
                      tags: ['a'],
                      labels: ['l1'],
                      created_at: '2025-09-01T00:00:00Z'
                    }
                  ],
                  error: null
                })
              })
            })
          })
        })
      }
    }));

    const svc = SupabaseStorageService.getInstance();
    const tasks = await svc.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].content).toBe('Task 1');
    // clear mocks so other tests are unaffected
    jest.resetModules();
  });
});

2. saveTasks happy path
// __tests__/storage/saveTasks.supabase.test.ts
import SupabaseStorageService from '../../src/services/storage/SupabaseStorageService';

describe('SupabaseStorageService - saveTasks', () => {
  it('upserts tasks', async () => {
    jest.mock('../../src/services/storage/SupabaseService', () => ({
      supabase: {
        auth: { getUser: async () => ({ data: { user: { id: 'test-user' } } }) },
        from: (table: string) => ({
          upsert: async (payload: any, opts?: any) => ({ data: payload, error: null })
        })
      }
    }));

    const svc = SupabaseStorageService.getInstance();
    const sample = [{ id: 'a', content: 'x', created: new Date() }];
    await expect(svc.saveTasks(sample as any)).resolves.not.toThrow();
    jest.resetModules();
  });
});


Offline / error handling test (hybrid behavior)
For HybridStorageService tests you should simulate supabase.from(...).upsert() returning an error and assert that Hybrid enqueues to syncQueue (look at existing backgroundSync tests to follow patterns). Example: mock supabase upsert to return { error: { code: 'PGRST500', message: 'boom' } } then call HybridStorageService.saveTasks and assert syncQueue.enqueue (or local DB record) was invoked.
How to apply the migration
Add the SQL to a new migration file for Supabase (e.g., supabase/migrations/2025xxxx_create_tasks_study_sessions_memory_palaces.sql) or run in psql.
If using the Supabase CLI:
supabase db remote set <your-db-url> (only once)
supabase db push or supabase migration new ... depending on your workflow
Verify tables exist in Supabase Studio and confirm RLS/policies.





