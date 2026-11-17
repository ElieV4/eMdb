/**
 * Hooks API des sous-groupes d'une liste et du "vu" partagé.
 *
 * Droits (cf. capabilities) :
 * - créer / supprimer un sous-groupe : canAddItems / canRemoveItems (mode ouvert)
 * - renommer, ranger un titre, marquer vu : canEditItems (collaboratif, ouvert)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

function useInvalidateList() {
  const queryClient = useQueryClient();
  return (listId: string) => queryClient.invalidateQueries({ queryKey: ["list", listId] });
}

export function useCreateGroup() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({
      listId,
      nom,
      parentId,
      emoji,
    }: {
      listId: string;
      nom: string;
      parentId?: string;
      emoji?: string | null;
    }) =>
      apiFetch(`/lists/${listId}/groups`, {
        method: "POST",
        body: { nom, ...(parentId ? { parent_id: parentId } : {}), ...(emoji ? { emoji } : {}) },
      }),
    onSuccess: (_, { listId }) => invalidate(listId),
  });
}

export function useRenameGroup() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({
      listId,
      groupId,
      nom,
      emoji,
    }: {
      listId: string;
      groupId: string;
      nom?: string;
      emoji?: string | null;
    }) =>
      apiFetch(`/lists/${listId}/groups/${groupId}`, {
        method: "PATCH",
        body: { ...(nom !== undefined ? { nom } : {}), ...(emoji !== undefined ? { emoji: emoji ?? "" } : {}) },
      }),
    onSuccess: (_, { listId }) => invalidate(listId),
  });
}

export function useDeleteGroup() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({ listId, groupId }: { listId: string; groupId: string }) =>
      apiFetch(`/lists/${listId}/groups/${groupId}`, { method: "DELETE" }),
    onSuccess: (_, { listId }) => invalidate(listId),
  });
}

export function useSetItemGroups() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({
      listId,
      titleId,
      groupIds,
    }: {
      listId: string;
      titleId: string;
      groupIds: string[];
    }) =>
      apiFetch(`/lists/${listId}/items/${titleId}/groups`, {
        method: "PUT",
        body: { group_ids: groupIds },
      }),
    onSuccess: (_, { listId }) => invalidate(listId),
  });
}

export function useSetItemVu() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({ listId, titleId, vu }: { listId: string; titleId: string; vu: boolean }) =>
      apiFetch(`/lists/${listId}/items/${titleId}/vu`, { method: "PATCH", body: { vu } }),
    onSuccess: (_, { listId }) => invalidate(listId),
  });
}
