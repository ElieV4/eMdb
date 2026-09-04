-- Un visionnage par ligne, enrichi de la duree effective (episode sinon
-- titre) et du titre resolu (direct ou via l'episode -> saison -> serie).
-- Vue (non materialisee) : toujours a jour, jamais de decalage avec
-- user_watches. Consommee par les 8 marts dataviz ET directement par
-- l'endpoint GET /dataviz/query (apps/api/src/dataviz/dataviz.service.ts) --
-- remplace le JOIN episodes/seasons + calcul de duree qui etait auparavant
-- duplique dans 8 requetes SQL differentes de ce service.
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
    w.episode_id,
    w.date_vue,
    w.support,
    w.compagnie,
    w.emotion,
    coalesce(w.title_id, s.title_id) as title_id,
    coalesce(e.duree_minutes, t.duree_minutes, 0) as duree_minutes,
    t.is_animation
from watches w
left join episodes e on e.id = w.episode_id
left join seasons s on s.id = e.season_id
left join titles t on t.title_id = coalesce(w.title_id, s.title_id)
