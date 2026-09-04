{{
  config(
    alias='mv_watch_count_by_period',
    indexes=[{'columns': ['user_id', 'periode_semaine'], 'unique': true}]
  )
}}

-- Voir mart_watch_time_by_period.sql : periode_mois/periode_annee derives de
-- periode_semaine pour ne jamais violer l'index unique (user_id, periode_semaine).
select
    user_id,
    date_trunc('week', date_vue)::date as periode_semaine,
    date_trunc('month', date_trunc('week', date_vue))::date as periode_mois,
    date_trunc('year', date_trunc('week', date_vue))::date as periode_annee,
    count(*) as nb_items
from {{ ref('int_watches_enriched') }}
group by user_id, periode_semaine, periode_mois, periode_annee
