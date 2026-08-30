-- ============================================================
-- TiVoi — Contenus de démonstration
-- À exécuter UNE fois dans le SQL Editor Supabase
-- ============================================================

insert into catalogue (titre, description, categorie, acteurs, duree_minutes, annee, image_url, bande_annonce_url, type_acces, prix_fcfa, note, badge, actif, ordre) values
(
  'L''Ombre de Babi',
  'Un enquêteur remonte les rues néon d''Abidjan pour percer un mystère qui secoue la capitale. Thriller haletant entre ombre et lumière.',
  'Thriller', 'Serge Abé, Aïcha Koné, Moussa Traoré', 112, 2024,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDAt24u2-Nk2UViS1ze2LcFaxpobcLN7w5ERM4danlnUVS69N63G74L1i2RFl4wN5TezKx0n12RU6bMvnyNpfj3iUtdXC_VQpNdKYoj2rC9KzjzG8cDAbrQ_xLHX587QWx6LclX7mCoR31N64tgQXDsxBj8-F5GBUSbgu7XScYZKFP-imPzSbhvki7rBQ68Ak4L_OYae8ayntPuQNAJp4CS7p0O-UH3kVCQ1Ne3QAyziRn_03fkuU6c',
  null, 'seance', 2500, 4.8, '2 500 FCFA', true, 1
),
(
  'Le Trône d''Abidjan',
  'Série événement : dynasties, alliances et trahisons au sommet du monde des affaires ivoirien.',
  'Séries', 'Fatou Bamba, Ibrahim Sylla', 6, 2025,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDIfEm5sw8FYQbGwJAhEpvbK4Fvr2vGuVoieWBmh0d7VhKnd0yAaccA6TiKIrtbTWFXCkqTyYRZDjIPMbL2FXsSDrnYJ38Ude8-aBfsJ8LVzbBdZAAKkmFH0gN8vfP6gzZuEmupCOv6YEdLeFsFNDs_IILr7Je24umgG8NfAs243KOleiONSoT6eixaqdR2L0ZRdeKy2Chaq1qNgoplY7U9aiBmc0UJMiQHKzvlHU73WiqW0TziYWUq',
  null, 'abonnement', 0, 4.9, 'VIP', true, 2
),
(
  'Babi by Night',
  'Quand la nuit tombe sur la lagune, une autre ville s''éveille. Un portrait nocturne d''Abidjan.',
  'Drame', 'Nadège Yao, Koffi Adjallé', 98, 2023,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA_kaIwBSBirYg1jWkjEriT9nEdkXbI3YE4GT-CGdwbplu4c_m-8BKOjg1Kf1avBtFLdEYj9GJL8aamaVHOSxyxYkbQ8rDcxTPgw5DyU6p4mCWW4hI3Wb_aPUnFa12zHcbphrxq8USx9qrjIdSAGvBI-TzI7oikIJgoDoWVDaNzZKDWk5X4xti5U0ZquWu3GdyJrPXWkAQGPLbMEEE_W1lE0lvFWFo1RlaSaVZajlnFoHp8wUsBYRf_',
  null, 'seance', 1500, 4.2, '1 500 FCFA', true, 3
),
(
  'Le Studio des Étoiles',
  'Dans les coulisses des créateurs qui font vibrer la scène live ouest-africaine.',
  'Documentaire', 'Lui-même', 54, 2025,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDgEBR9OHRG7yB_7OmC3pxhyEEFnGgJvKXfjWg2yZBaZBN1naR79HbwlLogeT_KDI2syCdItfPPYW8OXEWGsCvUevEnzOpVYVTbLRsfX_7U--BmfV0HQWtDMhobhdCxRpk2Kq6vmD40djqLY8jq2XPckRJtJIrv9fbxH8oyM49fdF52CKaksuyY1TLDEy9uOtQxp4bfeeDbDyKGmZ8d0MhW4Tz2sLoqrTUhJgDC7yD1d9gJqAwy8md7',
  null, 'gratuit', 0, 4.5, 'GRATUIT', true, 4
),
(
  '24h sur Abidjan',
  'Une journée entière dans la régie d''une chaîne ivoirienne, du premier café au générique du soir.',
  'Documentaire', 'Ensemble du plateau', 47, 2024,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAnWHCkOT-mRDA0NLQ7TkvBcASRb2VoTHTeRLWTDdvNggo-hLiVRBwE-7VHFyGKkqRiQbOggUYG26tzj-J-GzQrWV32wLogWEYJA1p_zozL0G2pvVgP7lLhxJ6p9vDPu6vqE9GqNtek7SifQD93x2w7jCYZUJqqkraZ2Ad7MFIvWzBtNRIPMQsFFSeJ8PUKfNLjvS2U0HcDLjwrFehsVJRHiPaxZ6MpZ7a3r6A-cpzKszWOPdvX_3c0',
  null, 'gratuit', 0, 4.0, 'GRATUIT', true, 5
),
(
  'Les Couleurs du Marché',
  'Au cœur de Grand-Bassam et d''Adjamé, les artisans et commerçantes racontent la couleur de leur quotidien.',
  'Documentaire', 'Voix de Awa Sangaré', 61, 2023,
  'https://picsum.photos/seed/tivoi-marche/400/600',
  null, 'seance', 1000, 4.4, '1 000 FCFA', true, 6
)
on conflict do nothing;

-- Carrousel "À la une" (3 contenus mis en avant)
insert into a_une (contenu_id, titre, accroche, image_url, ordre, actif)
select id, titre,
  'Une production originale TiVoi — à voir en priorité.',
  image_url, ordre, true
from catalogue where titre in ('L''Ombre de Babi', 'Le Trône d''Abidjan', 'Babi by Night')
on conflict do nothing;
