/**
 * Matrice des droits sur une liste (partagée ou non).
 *
 * Le mode de partage est porté par la liste (`user_lists.share_mode`) et
 * s'applique à tous ses membres (`list_shares`) :
 *
 * | Action                                   | lecture | collaboratif | ouvert |
 * |------------------------------------------|---------|--------------|--------|
 * | read                                     |   oui   |     oui      |  oui   |
 * | item:update, list:update                 |   non   |     oui      |  oui   |
 * | item:add, item:remove                    |   non   |     non      |  oui   |
 * | list:delete, shares:manage               | créateur uniquement           |
 *
 * ⚠️ Dupliquée en SQL dans `fn_list_can()` (migration list_share_modes), qui
 * l'applique via RLS : les deux doivent rester synchronisées.
 */

export const SHARE_MODES = ['lecture', 'collaboratif', 'ouvert'] as const;
export type ShareMode = (typeof SHARE_MODES)[number];

export type ListRole = 'owner' | 'member' | 'none';

export type ListAction =
  | 'read'
  | 'item:add'
  | 'item:remove'
  | 'item:update'
  | 'list:update'
  | 'list:delete'
  | 'shares:manage';

/** Types de liste personnels, jamais partageables. */
export const NON_SHAREABLE_LIST_TYPES = ['watchlist', 'favoris'] as const;

const MEMBER_ACTIONS: Record<ShareMode, ReadonlySet<ListAction>> = {
  lecture: new Set<ListAction>(['read']),
  collaboratif: new Set<ListAction>(['read', 'item:update', 'list:update']),
  ouvert: new Set<ListAction>(['read', 'item:update', 'list:update', 'item:add', 'item:remove']),
};

export function canOnList(role: ListRole, mode: ShareMode, action: ListAction): boolean {
  if (role === 'owner') return true;
  if (role === 'none') return false;
  return MEMBER_ACTIONS[mode]?.has(action) ?? false;
}

/** Droits renvoyés au frontend pour afficher ou masquer les actions. */
export type ListCapabilities = {
  canAddItems: boolean;
  canRemoveItems: boolean;
  canEditItems: boolean;
  canEditList: boolean;
  canDeleteList: boolean;
  canManageShares: boolean;
};

export function listCapabilities(role: ListRole, mode: ShareMode): ListCapabilities {
  return {
    canAddItems: canOnList(role, mode, 'item:add'),
    canRemoveItems: canOnList(role, mode, 'item:remove'),
    canEditItems: canOnList(role, mode, 'item:update'),
    canEditList: canOnList(role, mode, 'list:update'),
    canDeleteList: canOnList(role, mode, 'list:delete'),
    canManageShares: canOnList(role, mode, 'shares:manage'),
  };
}
