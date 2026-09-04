{{
  config(
    alias='mv_watch_count_by_animation',
    indexes=[{'columns': ['user_id', 'is_animation'], 'unique': true}]
  )
}}

select
    user_id,
    is_animation,
    count(*) as nb_items
from {{ ref('int_watches_enriched') }}
group by user_id, is_animation
