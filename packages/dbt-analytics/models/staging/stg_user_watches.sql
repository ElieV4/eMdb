-- Visionnages utilisateur, renommes/typés pour la couche staging.
select
    id as watch_id,
    user_id,
    title_id,
    episode_id,
    date_vue,
    support,
    compagnie,
    emotion
from {{ source('emdb', 'user_watches') }}
