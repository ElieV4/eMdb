{{
  config(
    alias='mv_watch_time_by_animation',
    indexes=[{'columns': ['user_id', 'is_animation'], 'unique': true}]
  )
}}

select
    user_id,
    is_animation,
    sum(duree_minutes) as minutes
from {{ ref('int_watches_enriched') }}
group by user_id, is_animation
