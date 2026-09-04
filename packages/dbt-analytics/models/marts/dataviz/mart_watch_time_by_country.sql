{{
  config(
    alias='mv_watch_time_by_country',
    indexes=[{'columns': ['user_id', 'country_id'], 'unique': true}]
  )
}}

select
    w.user_id,
    tc.country_id,
    sum(w.duree_minutes) as minutes
from {{ ref('int_watches_enriched') }} w
join {{ source('emdb', 'title_countries') }} tc on tc.title_id = w.title_id
group by w.user_id, tc.country_id
