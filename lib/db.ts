import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;
let _schemaReady: Promise<void> | null = null;

function getSql() {
  if (_sql) return _sql;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  _sql = neon(connectionString);
  return _sql;
}

export interface Lead {
  id: number;
  raw_text: string;
  task: string | null;
  location: string | null;
  budget: string | null;
  summary: string | null;
  is_cross_border: number;
  tier: string;
  auto_reply: string | null;
  author: string | null;
  platform: string;
  author_url: string | null;
  post_content: string | null;
  confidence: number;
  summary_zh: string | null;
  requester_contact: string | null;
  privacy_level: string;
  urgency: string;
  assigned_operator: string | null;
  last_contacted_at: string | null;
  status: string;
  source_url: string | null;
  created_at: string;
}

export interface NewLead {
  raw_text: string;
  task?: string | null;
  location?: string | null;
  budget?: string | null;
  summary?: string | null;
  is_cross_border?: number;
  tier?: string;
  auto_reply?: string | null;
  author?: string | null;
  platform?: string;
  author_url?: string | null;
  post_content?: string | null;
  confidence?: number;
  summary_zh?: string | null;
  requester_contact?: string | null;
  privacy_level?: string;
  urgency?: string;
  source_url?: string | null;
}

export interface CommunityItem {
  id: number;
  publisher_key: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  approximate_area: string;
  dimensions: string | null;
  floor_elevator: string | null;
  availability: string;
  image_url: string | null;
  contact: string;
  needs_service: string | null;
  status: string;
  created_at: string;
}

export interface NewCommunityItem {
  publisher_key: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  approximate_area: string;
  dimensions?: string | null;
  floor_elevator?: string | null;
  availability: string;
  image_url?: string | null;
  contact: string;
  needs_service?: string | null;
  policy_version: string;
}

export type PublicCommunityItem = Pick<CommunityItem,
  'id' | 'publisher_key' | 'title' | 'description' | 'category' | 'condition' | 'approximate_area' |
  'dimensions' | 'floor_elevator' | 'availability' | 'status' | 'created_at'
>;

export async function ensureDb(): Promise<void> {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        raw_text TEXT NOT NULL,
        task TEXT,
        location TEXT,
        budget TEXT,
        summary TEXT,
        is_cross_border INTEGER NOT NULL DEFAULT 0,
        tier TEXT NOT NULL DEFAULT 'normal',
        auto_reply TEXT,
        author TEXT,
        platform TEXT NOT NULL DEFAULT 'web',
        author_url TEXT,
        post_content TEXT,
        confidence INTEGER NOT NULL DEFAULT 0,
        summary_zh TEXT,
        requester_contact TEXT,
        privacy_level TEXT NOT NULL DEFAULT 'normal',
        urgency TEXT NOT NULL DEFAULT 'normal',
        assigned_operator TEXT,
        last_contacted_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending',
        source_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS leads_source_url_unique_idx ON leads(source_url) WHERE source_url IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status)`;
    await sql`
      CREATE TABLE IF NOT EXISTS submission_events (
        id BIGSERIAL PRIMARY KEY,
        source_key TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS submission_events_source_idx ON submission_events(source_key, created_at DESC)`;
    await sql`
      CREATE TABLE IF NOT EXISTS community_items (
        id SERIAL PRIMARY KEY,
        publisher_key TEXT NOT NULL DEFAULT 'legacy',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        condition TEXT NOT NULL,
        approximate_area TEXT NOT NULL,
        dimensions TEXT,
        floor_elevator TEXT,
        availability TEXT NOT NULL,
        image_url TEXT,
        contact TEXT NOT NULL,
        needs_service TEXT,
        policy_version TEXT NOT NULL DEFAULT 'legacy',
        accepted_terms_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending_review',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS community_items_status_idx ON community_items(status, created_at DESC)`;
    await sql`
      CREATE TABLE IF NOT EXISTS item_claims (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
        contact TEXT NOT NULL,
        pickup_time TEXT NOT NULL,
        transport_plan TEXT NOT NULL,
        note TEXT,
        policy_version TEXT NOT NULL DEFAULT 'legacy',
        accepted_terms_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        handoff_code_hash TEXT,
        handoff_code_expires_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS service_requests (
        id SERIAL PRIMARY KEY,
        item_id INTEGER REFERENCES community_items(id) ON DELETE SET NULL,
        service_type TEXT NOT NULL,
        contact TEXT NOT NULL,
        details TEXT NOT NULL,
        policy_version TEXT NOT NULL DEFAULT 'legacy',
        accepted_terms_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'new',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS community_reports (
        id SERIAL PRIMARY KEY,
        item_id INTEGER REFERENCES community_items(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        details TEXT,
        contact TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS community_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        detail JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE community_items ADD COLUMN IF NOT EXISTS policy_version TEXT NOT NULL DEFAULT 'legacy'`;
    await sql`ALTER TABLE community_items ADD COLUMN IF NOT EXISTS publisher_key TEXT NOT NULL DEFAULT 'legacy'`;
    await sql`ALTER TABLE community_items ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
    await sql`ALTER TABLE community_items ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`;
    await sql`ALTER TABLE item_claims ADD COLUMN IF NOT EXISTS policy_version TEXT NOT NULL DEFAULT 'legacy'`;
    await sql`ALTER TABLE item_claims ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
    await sql`ALTER TABLE item_claims ADD COLUMN IF NOT EXISTS handoff_code_hash TEXT`;
    await sql`ALTER TABLE item_claims ADD COLUMN IF NOT EXISTS handoff_code_expires_at TIMESTAMPTZ`;
    await sql`ALTER TABLE item_claims ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS policy_version TEXT NOT NULL DEFAULT 'legacy'`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
    await sql`CREATE INDEX IF NOT EXISTS item_claims_item_idx ON item_claims(item_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS service_requests_status_idx ON service_requests(status, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS community_reports_status_idx ON community_reports(status, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS community_audit_logs_resource_idx ON community_audit_logs(resource_type, resource_id, created_at DESC)`;
  })();
  return _schemaReady;
}

function normalizeCommunityItem(row: Record<string, unknown>): CommunityItem {
  return {
    ...row,
    id: Number(row.id),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  } as CommunityItem;
}

export async function insertCommunityItem(input: NewCommunityItem): Promise<CommunityItem> {
  await ensureDb();
  const rows = await getSql()`
    INSERT INTO community_items (
      publisher_key, title, description, category, condition, approximate_area, dimensions,
      floor_elevator, availability, image_url, contact, needs_service, policy_version
    ) VALUES (
      ${input.publisher_key}, ${input.title}, ${input.description}, ${input.category}, ${input.condition},
      ${input.approximate_area}, ${input.dimensions ?? null}, ${input.floor_elevator ?? null},
      ${input.availability}, ${input.image_url ?? null}, ${input.contact},
      ${input.needs_service ?? null}, ${input.policy_version}
    ) RETURNING *
  `;
  return normalizeCommunityItem(rows[0]);
}

export async function listCommunityItems(): Promise<PublicCommunityItem[]> {
  await ensureDb();
  const rows = await getSql()`
    SELECT id, publisher_key, title, description, category, condition, approximate_area, dimensions,
      floor_elevator, availability, status, created_at
    FROM community_items
    WHERE status = 'available'
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return rows.map(row => ({
    ...row,
    id: Number(row.id),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  })) as PublicCommunityItem[];
}

export async function listCommunityOperations() {
  await ensureDb();
  const sql = getSql();
  const [items, claims, services, reports] = await Promise.all([
    sql`SELECT * FROM community_items ORDER BY created_at DESC LIMIT 200`,
    sql`
      SELECT item_claims.*, community_items.title AS item_title
      FROM item_claims
      JOIN community_items ON community_items.id = item_claims.item_id
      ORDER BY item_claims.created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT service_requests.*, community_items.title AS item_title
      FROM service_requests
      LEFT JOIN community_items ON community_items.id = service_requests.item_id
      ORDER BY service_requests.created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT community_reports.*, community_items.title AS item_title
      FROM community_reports
      LEFT JOIN community_items ON community_items.id = community_reports.item_id
      ORDER BY community_reports.created_at DESC
      LIMIT 200
    `,
  ]);
  return {
    items: items.map(normalizeCommunityItem),
    claims,
    services,
    reports,
  };
}

export async function updateCommunityItemStatus(id: number, status: string) {
  await ensureDb();
  const rows = await getSql()`
    UPDATE community_items
    SET status = ${status}, reviewed_at = CASE WHEN ${status} = 'available' THEN NOW() ELSE reviewed_at END
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? normalizeCommunityItem(rows[0]) : null;
}

export async function updateCommunityRecordStatus(table: 'item_claims' | 'service_requests' | 'community_reports', id: number, status: string) {
  await ensureDb();
  const sql = getSql();
  const rows = table === 'item_claims'
    ? await sql`UPDATE item_claims SET status = ${status} WHERE id = ${id} RETURNING *`
    : table === 'service_requests'
      ? await sql`UPDATE service_requests SET status = ${status} WHERE id = ${id} RETURNING *`
      : await sql`UPDATE community_reports SET status = ${status} WHERE id = ${id} RETURNING *`;
  return rows[0] ?? null;
}

export async function issueClaimHandoffCode(id: number, codeHash: string, expiresAt: Date) {
  await ensureDb();
  const rows = await getSql()`
    UPDATE item_claims
    SET status = 'contacted', handoff_code_hash = ${codeHash}, handoff_code_expires_at = ${expiresAt.toISOString()}
    WHERE id = ${id}
      AND status IN ('pending', 'contacted')
      AND EXISTS (
        SELECT 1 FROM community_items
        WHERE community_items.id = item_claims.item_id AND community_items.status = 'available'
      )
      AND NOT EXISTS (
        SELECT 1 FROM item_claims other
        WHERE other.item_id = item_claims.item_id
          AND other.id <> item_claims.id
          AND other.status = 'contacted'
          AND other.handoff_code_expires_at > NOW()
      )
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function completeClaimHandoff(id: number, codeHash: string) {
  await ensureDb();
  const sql = getSql();
  const rows = await sql`
    UPDATE item_claims
    SET status = 'completed', completed_at = NOW(), handoff_code_hash = NULL
    WHERE id = ${id}
      AND status = 'contacted'
      AND handoff_code_hash = ${codeHash}
      AND handoff_code_expires_at > NOW()
      AND EXISTS (
        SELECT 1 FROM community_items
        WHERE community_items.id = item_claims.item_id AND community_items.status = 'available'
      )
    RETURNING *
  `;
  if (!rows[0]) return null;
  await sql`UPDATE community_items SET status = 'claimed' WHERE id = ${Number(rows[0].item_id)}`;
  return rows[0];
}

export async function insertItemClaim(input: {
  item_id: number;
  contact: string;
  pickup_time: string;
  transport_plan: string;
  note?: string | null;
  policy_version: string;
}) {
  await ensureDb();
  const rows = await getSql()`
    INSERT INTO item_claims (item_id, contact, pickup_time, transport_plan, note, policy_version)
    SELECT ${input.item_id}, ${input.contact}, ${input.pickup_time}, ${input.transport_plan}, ${input.note ?? null}, ${input.policy_version}
    FROM community_items
    WHERE id = ${input.item_id} AND status = 'available'
    RETURNING *
  `;
  return rows[0];
}

export async function insertServiceRequest(input: {
  item_id?: number | null;
  service_type: string;
  contact: string;
  details: string;
  policy_version: string;
}) {
  await ensureDb();
  const rows = await getSql()`
    INSERT INTO service_requests (item_id, service_type, contact, details, policy_version)
    VALUES (${input.item_id ?? null}, ${input.service_type}, ${input.contact}, ${input.details}, ${input.policy_version})
    RETURNING *
  `;
  return rows[0];
}

export async function insertCommunityReport(input: {
  item_id?: number | null;
  reason: string;
  details?: string | null;
  contact?: string | null;
}) {
  await ensureDb();
  const rows = await getSql()`
    INSERT INTO community_reports (item_id, reason, details, contact)
    VALUES (${input.item_id ?? null}, ${input.reason}, ${input.details ?? null}, ${input.contact ?? null})
    RETURNING *
  `;
  return rows[0];
}

export async function insertCommunityAuditLog(input: {
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  detail?: Record<string, unknown>;
}) {
  await ensureDb();
  const rows = await getSql()`
    INSERT INTO community_audit_logs (actor, action, resource_type, resource_id, detail)
    VALUES (${input.actor}, ${input.action}, ${input.resource_type}, ${input.resource_id}, ${JSON.stringify(input.detail ?? {})}::jsonb)
    RETURNING id
  `;
  return rows[0];
}

export async function databaseHealth() {
  await ensureDb();
  const rows = await getSql()`SELECT NOW() AS checked_at`;
  return rows[0];
}

function normalizeLead(row: Record<string, unknown>): Lead {
  return {
    ...row,
    id: Number(row.id),
    is_cross_border: Number(row.is_cross_border ?? 0),
    confidence: Number(row.confidence ?? 0),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    last_contacted_at: row.last_contacted_at instanceof Date ? row.last_contacted_at.toISOString() : row.last_contacted_at as string | null,
  } as Lead;
}

export async function findLeadBySourceUrl(sourceUrl: string): Promise<Lead | null> {
  await ensureDb();
  const rows = await getSql()`SELECT * FROM leads WHERE source_url = ${sourceUrl} LIMIT 1`;
  return rows[0] ? normalizeLead(rows[0]) : null;
}

export async function getLeadById(id: number): Promise<Lead | null> {
  await ensureDb();
  const rows = await getSql()`SELECT * FROM leads WHERE id = ${id} LIMIT 1`;
  return rows[0] ? normalizeLead(rows[0]) : null;
}

export async function insertLead(input: NewLead): Promise<Lead> {
  await ensureDb();
  const rows = await getSql()`
    INSERT INTO leads (
      raw_text, summary, summary_zh, task, location, budget, source_url,
      is_cross_border, tier, auto_reply, author, platform, author_url,
      post_content, confidence, requester_contact, privacy_level, urgency
    ) VALUES (
      ${input.raw_text}, ${input.summary ?? null}, ${input.summary_zh ?? null},
      ${input.task ?? null}, ${input.location ?? null}, ${input.budget ?? null},
      ${input.source_url ?? null}, ${input.is_cross_border ?? 0},
      ${input.tier ?? 'normal'}, ${input.auto_reply ?? null}, ${input.author ?? null},
      ${input.platform ?? 'web'}, ${input.author_url ?? null}, ${input.post_content ?? null},
      ${input.confidence ?? 0}, ${input.requester_contact ?? null},
      ${input.privacy_level ?? 'normal'}, ${input.urgency ?? 'normal'}
    )
    RETURNING *
  `;
  return normalizeLead(rows[0]);
}

export async function listLeads(since?: string | null): Promise<Lead[]> {
  await ensureDb();
  const rows = since
    ? await getSql()`SELECT * FROM leads WHERE created_at > ${since} ORDER BY created_at DESC`
    : await getSql()`SELECT * FROM leads ORDER BY created_at DESC`;
  return rows.map(normalizeLead);
}

export async function updateLeadStatus(id: number, status: string): Promise<Lead | null> {
  await ensureDb();
  const rows = await getSql()`UPDATE leads SET status = ${status} WHERE id = ${id} RETURNING *`;
  return rows[0] ? normalizeLead(rows[0]) : null;
}

export async function allowSubmission(sourceKey: string, limit = 10): Promise<boolean> {
  await ensureDb();
  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM submission_events
    WHERE source_key = ${sourceKey} AND created_at > NOW() - INTERVAL '1 hour'
  `;
  if (Number(rows[0]?.count ?? 0) >= limit) return false;
  await sql`INSERT INTO submission_events (source_key) VALUES (${sourceKey})`;
  await sql`DELETE FROM submission_events WHERE created_at < NOW() - INTERVAL '2 days'`;
  return true;
}
