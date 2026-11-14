-- The school's documents as files (owner, 2026-11-14): the offer, the provider
-- details, the prices, the account terms and the privacy notice are uploaded in
-- Settings (PDF, Word or an image) instead of pasted as text. They live in a
-- public Storage bucket "docs" - anyone with the link can read them, which is
-- the point: families read them before signing. Only staff can add, replace
-- or remove a file. The setting keeps {url, name} of the current file.
-- ASCII only.

insert into public.settings (id, value) values ('doc_privacy', '""') on conflict (id) do nothing;

-- Storage exists on Supabase only (the local tests have no storage schema).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('docs', 'docs', true, 10485760, array[
      'application/pdf', 'image/png', 'image/jpeg',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
    on conflict (id) do nothing;
    execute $p$create policy "docs: staff add" on storage.objects for insert to authenticated with check (bucket_id = 'docs' and public.is_staff())$p$;
    execute $p$create policy "docs: staff change" on storage.objects for update to authenticated using (bucket_id = 'docs' and public.is_staff())$p$;
    execute $p$create policy "docs: staff remove" on storage.objects for delete to authenticated using (bucket_id = 'docs' and public.is_staff())$p$;
    execute $p$create policy "docs: staff list" on storage.objects for select to authenticated using (bucket_id = 'docs' and public.is_staff())$p$;
  end if;
end $$;
