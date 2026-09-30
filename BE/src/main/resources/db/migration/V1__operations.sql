CREATE TABLE catalog_draft (
 id uuid PRIMARY KEY, release_id text NOT NULL UNIQUE, author text NOT NULL,
 body bytea NOT NULL, digest char(64) NOT NULL, status text NOT NULL CHECK (status IN ('DRAFT','REVIEWED','PUBLISHED')),
 review jsonb, reviewed_digest char(64), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalog_release (
 release_id text PRIMARY KEY, body bytea NOT NULL, digest char(64) NOT NULL,
 size_bytes integer NOT NULL CHECK (size_bytes>0 AND size_bytes<=5242880), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE release_activation (
 id bigserial PRIMARY KEY, release_id text NOT NULL REFERENCES catalog_release, actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE safety_state (id integer PRIMARY KEY CHECK(id=1), revision bigint NOT NULL, body jsonb NOT NULL);
INSERT INTO safety_state VALUES (1,0,'{"blockedRuleIds":[],"blockedSourceIds":[],"flags":{"catalog":true,"foregroundLocation":false,"iosBackground":false,"androidBackground":false,"area":false}}');
CREATE TABLE error_report (
 id uuid PRIMARY KEY, rule_id text, category text NOT NULL, message text NOT NULL CHECK(char_length(message)<=2000),
 token_hash char(64) NOT NULL, status text NOT NULL CHECK(status IN ('OPEN','CLASSIFIED','CLOSED')),
 created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz
);
CREATE TABLE journal_applied (event_id uuid PRIMARY KEY, sequence bigint NOT NULL UNIQUE, digest char(64) NOT NULL);
CREATE TABLE audit_event (
 id bigserial PRIMARY KEY, actor text NOT NULL, action text NOT NULL, target text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable record'; END $$;
CREATE TRIGGER immutable_release BEFORE UPDATE OR DELETE ON catalog_release FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_event FOR EACH ROW EXECUTE FUNCTION reject_mutation();
