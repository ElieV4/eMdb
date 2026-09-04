{{
  config(
    alias='mv_watch_count_by_country',
    indexes=[{'columns': ['user_id', 'country_id'], 'unique': true}]
  )
}}

select
    w.user_id,
    tc.country_id,
    count(*) as nb_items
from {{ ref('int_watches_enriched') }} w
join {{ source('emdb', 'title_countries') }} tc on tc.title_id = w.title_id
group by w.user_id, tc.country_id
