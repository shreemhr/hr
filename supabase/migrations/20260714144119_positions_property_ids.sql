-- Positions can be scoped to specific properties (empty = applies to all
-- properties). Completes a field already referenced defensively by
-- src/app/(app)/employees/new/page.tsx, which never had backing data.
alter table positions add column if not exists property_ids uuid[] not null default '{}';
create index if not exists positions_property_ids_idx on positions using gin (property_ids);
