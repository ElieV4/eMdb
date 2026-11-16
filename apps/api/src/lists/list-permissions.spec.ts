import { ListAction, ListRole, ShareMode, canOnList, listCapabilities } from './list-permissions';

/**
 * Matrice attendue, écrite à plat pour être relue d'un coup d'œil. Doit
 * correspondre à fn_list_can() (migration list_share_modes).
 */
const EXPECTED: Record<ShareMode, Record<ListAction, boolean>> = {
  lecture: {
    read: true,
    'item:update': false,
    'list:update': false,
    'item:add': false,
    'item:remove': false,
    'list:delete': false,
    'shares:manage': false,
  },
  collaboratif: {
    read: true,
    'item:update': true,
    'list:update': true,
    'item:add': false,
    'item:remove': false,
    'list:delete': false,
    'shares:manage': false,
  },
  ouvert: {
    read: true,
    'item:update': true,
    'list:update': true,
    'item:add': true,
    'item:remove': true,
    'list:delete': false,
    'shares:manage': false,
  },
};

const MODES = Object.keys(EXPECTED) as ShareMode[];
const ACTIONS = Object.keys(EXPECTED.lecture) as ListAction[];

describe('canOnList', () => {
  describe.each(MODES)('mode %s', (mode) => {
    it.each(ACTIONS)('membre — %s', (action) => {
      expect(canOnList('member', mode, action)).toBe(EXPECTED[mode][action]);
    });

    it.each(ACTIONS)('créateur — %s toujours autorisé', (action) => {
      expect(canOnList('owner', mode, action)).toBe(true);
    });

    it.each(ACTIONS)('non membre — %s toujours refusé', (action) => {
      expect(canOnList('none', mode, action)).toBe(false);
    });
  });

  it('refuse un mode inconnu (valeur inattendue en base)', () => {
    expect(canOnList('member', 'inconnu' as ShareMode, 'read')).toBe(false);
  });
});

describe('listCapabilities', () => {
  it.each<[ListRole, ShareMode]>([
    ['owner', 'lecture'],
    ['member', 'lecture'],
    ['member', 'collaboratif'],
    ['member', 'ouvert'],
  ])('%s en mode %s reflète canOnList', (role, mode) => {
    expect(listCapabilities(role, mode)).toEqual({
      canAddItems: canOnList(role, mode, 'item:add'),
      canRemoveItems: canOnList(role, mode, 'item:remove'),
      canEditItems: canOnList(role, mode, 'item:update'),
      canEditList: canOnList(role, mode, 'list:update'),
      canDeleteList: canOnList(role, mode, 'list:delete'),
      canManageShares: canOnList(role, mode, 'shares:manage'),
    });
  });
});
