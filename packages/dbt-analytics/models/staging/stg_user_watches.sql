-- Visionnages utilisateur, renommes/typés pour la couche staging.
select
    id as watch_id,
    user_id,
    title_id,
    episode_id,
    date_vue
from {{ source('emdb', 'user_watches') }}
