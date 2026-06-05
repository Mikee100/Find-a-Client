CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "searchDocument" tsvector;

CREATE INDEX IF NOT EXISTS project_search_document_idx ON "Project" USING GIN ("searchDocument");

CREATE OR REPLACE FUNCTION update_project_search_document() RETURNS trigger AS $$
BEGIN
  NEW."searchDocument" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."shortDescription", '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(NEW."techStack", ' ')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_search_document_trigger ON "Project";
CREATE TRIGGER project_search_document_trigger
BEFORE INSERT OR UPDATE ON "Project"
FOR EACH ROW EXECUTE FUNCTION update_project_search_document();
