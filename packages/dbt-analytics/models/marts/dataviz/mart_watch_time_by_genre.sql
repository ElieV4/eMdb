{{
  config(
    alias='mv_watch_time_by_genre',
    indexes=[{'columns': ['user_id', 'genre_id'], 'unique': true}]
  )
}}

select
    w.user_id,
    tg.genre_id,
    sum(w.duree_minutes) as minutes
from {{ ref('int_watches_enriched') }} w
join {{ source('emdb', 'title_genres') }} tg on tg.title_id = w.title_id
group by w.user_id, tg.genre_id
