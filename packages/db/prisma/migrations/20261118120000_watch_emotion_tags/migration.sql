-- ============================================================
-- Tags d'émotion : 12 nouvelles valeurs pour user_watches.emotion
-- ============================================================
--
-- Avant : content, triste, emu, enthousiaste, decu, tendu, effraye, neutre.
-- Après : joie, rire, emerveillement, tendresse, nostalgie, tristesse, choc,
--         fascination, tension, peur, revolte, malaise.
-- Les valeurs sont validées par l'API (DTO), pas de CHECK en base (même
-- convention qu'avant). Conversion des visionnages existants :
--   content, enthousiaste -> joie ; triste -> tristesse ; emu -> tendresse ;
--   tendu -> tension ; effraye -> peur ; decu, neutre -> retirées (pas
--   d'équivalent). Doublons éventuels supprimés.

UPDATE "user_watches" uw
SET "emotion" = converted.emotions
FROM (
  SELECT w.id,
         CASE WHEN count(m.new_value) = 0 THEN NULL
              ELSE array_agg(DISTINCT m.new_value)
         END AS emotions
  FROM "user_watches" w
  CROSS JOIN LATERAL unnest(w.emotion) AS e(old_value)
  LEFT JOIN (VALUES
    ('content', 'joie'), ('enthousiaste', 'joie'), ('triste', 'tristesse'),
    ('emu', 'tendresse'), ('tendu', 'tension'), ('effraye', 'peur'),
    ('joie', 'joie'), ('rire', 'rire'), ('emerveillement', 'emerveillement'),
    ('tendresse', 'tendresse'), ('nostalgie', 'nostalgie'), ('tristesse', 'tristesse'),
    ('choc', 'choc'), ('fascination', 'fascination'), ('tension', 'tension'),
    ('peur', 'peur'), ('revolte', 'revolte'), ('malaise', 'malaise')
  ) AS m(old_value, new_value) ON m.old_value = e.old_value
  WHERE w.emotion IS NOT NULL AND cardinality(w.emotion) > 0
  GROUP BY w.id
) converted
WHERE uw.id = converted.id;
