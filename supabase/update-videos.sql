-- ============================================================
-- TiVoi — Mises à jour : vidéos de test réelles
-- À exécuter une fois dans le SQL Editor Supabase
-- ============================================================

-- 1. Table de progression (si pas déjà exécuté)
create table if not exists progressions (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  contenu_id bigint not null references catalogue(id) on delete cascade,
  position_secondes integer not null default 0,
  duree_secondes integer not null default 0,
  termine boolean not null default false,
  unique (user_id, contenu_id),
  updated_at timestamptz not null default now()
);
alter table progressions enable row level security;
create policy "lire ses progressions" on progressions for select using (auth.uid() = user_id);
create policy "ecrire ses progressions" on progressions for insert with check (auth.uid() = user_id);
create policy "maj ses progressions" on progressions for update using (auth.uid() = user_id);

create or replace function public.enregistrer_progression(p_contenu_id bigint, p_position int, p_duree int)
returns void language plpgsql security definer as $$
begin
  insert into progressions (user_id, contenu_id, position_secondes, duree_secondes, termine)
  values (auth.uid(), p_contenu_id, p_position, p_duree, p_duree > 0 and p_position >= p_duree - 5)
  on conflict (user_id, contenu_id) do update set
    position_secondes = excluded.position_secondes,
    duree_secondes = excluded.duree_secondes,
    termine = excluded.termine,
    updated_at = now();
end;
$$;
grant execute on function public.enregistrer_progression(bigint, int, int) to authenticated;

-- 2. Temps réel pour les cadeaux animés
do $$ begin
  alter publication supabase_realtime add table cadeaux_envoyes;
exception when duplicate_object then null; end $$;

-- 3. Vraies vidéos de test sur les contenus démo
--    (films open source Blender + Google sample bucket, licences libres)
update catalogue set bande_annonce_url = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  where titre = 'L''Ombre de Babi';

update catalogue set bande_annonce_url = 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
  where titre = 'Le Trône d''Abidjan';

update catalogue set bande_annonce_url = 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
  where titre = 'Babi by Night';

update catalogue set bande_annonce_url = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
  where titre = 'Le Studio des Étoiles';

update catalogue set bande_annonce_url = 'https://www.youtube.com/watch?v=eRsGyueVLvQ'
  where titre = '24h sur Abidjan';

update catalogue set bande_annonce_url = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
  where titre = 'Les Couleurs du Marché';
