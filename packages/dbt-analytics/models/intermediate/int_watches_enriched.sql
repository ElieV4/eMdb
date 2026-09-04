-- Un visionnage par ligne, enrichi de la duree effective (episode sinon
-- titre) et du titre resolu (direct ou via l'episode -> saison -> serie).
-- Base commune aux 8 marts dataviz (time/count x period/genre/country/animation).
with watches as (
    select * from {{ ref('stg_user_watches') }}
),

episodes as (
    select id, season_id, duree_minutes from {{ source('emdb', 'episodes') }}
),

seasons as (
    select id, title_id from {{ source('emdb', 'seasons') }}
),

titles as (
    select * from {{ ref('stg_titles') }}
)

select
    w.watch_id,
    w.user_id,
    w.date_vue,
    coalesce(w.title_id, s.title_id) as title_id,
    coalesce(e.duree_minutes, t.duree_minutes, 0) as duree_minutes,
    t.is_animation
from watches w
left join episodes e on e.id = w.episode_id
left join seasons s on s.id = e.season_id
left join titles t on t.title_id = coalesce(w.title_id, s.title_id)
