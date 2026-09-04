{{
  config(
    alias='mv_watch_time_by_period',
    indexes=[{'columns': ['user_id', 'periode_semaine'], 'unique': true}]
  )
}}

-- periode_mois/periode_annee sont derives de periode_semaine (pas de date_vue
-- brut) : une semaine ISO peut chevaucher deux mois calendaires, deriver du
-- date_vue individuel produirait deux lignes pour la meme semaine et
-- violerait l'index unique (user_id, periode_semaine).
select
    user_id,
    date_trunc('week', date_vue)::date as periode_semaine,
    date_trunc('month', date_trunc('week', date_vue))::date as periode_mois,
    date_trunc('year', date_trunc('week', date_vue))::date as periode_annee,
    sum(duree_minutes) as minutes
from {{ ref('int_watches_enriched') }}
group by user_id, periode_semaine, periode_mois, periode_annee
