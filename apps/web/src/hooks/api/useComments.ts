/**
 * Hooks des commentaires :
 * - commentaire perso sur un titre (user_ratings.commentaire, via PUT /ratings) ;
 * - fil de commentaires partagés d'un titre dans une liste partagée ;
 * - réglage "commentaires perso visibles des membres de mes listes partagées".
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ListItemComment, MyProfile, MyTitleRating } from "@/lib/types/api";

export function useMyTitleRating(titleId: string, enabled = true) {
  return useQuery<MyTitleRating>({
    queryKey: ["my-title-rating", titleId],
    queryFn: () => apiFetch<MyTitleRating>(`/titles/${titleId}/my-rating`),
    enabled: !!titleId && enabled,
  });
}

/** Enregistre (ou efface, avec une chaîne vide) le commentaire perso d'un titre. */
export function useSaveMyComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ titleId, commentaire }: { titleId: string; commentaire: string }) =>
      apiFetch("/ratings", { method: "PUT", body: { title_id: titleId, commentaire } }),
    onSuccess: (_, { titleId }) => {
      queryClient.invalidateQueries({ queryKey: ["my-title-rating", titleId] });
      queryClient.invalidateQueries({ queryKey: ["user-ratings"] });
      queryClient.invalidateQueries({ queryKey: ["list"] });
      queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
    },
  });
}

export function useItemComments(listId: string, titleId: string, enabled = true) {
  return useQuery<{ canWrite: boolean; comments: ListItemComment[] }>({
    queryKey: ["list-item-comments", listId, titleId],
    queryFn: () => apiFetch(`/lists/${listId}/items/${titleId}/comments`),
    enabled: !!listId && !!titleId && enabled,
  });
}

function useInvalidateThread() {
  const queryClient = useQueryClient();
  return (listId: string, titleId: string) => {
    queryClient.invalidateQueries({ queryKey: ["list-item-comments", listId, titleId] });
    // Compteur de commentaires sur l'affiche.
    queryClient.invalidateQueries({ queryKey: ["list", listId] });
  };
}

export function useAddItemComment() {
  const invalidate = useInvalidateThread();
  return useMutation({
    mutationFn: ({ listId, titleId, contenu }: { listId: string; titleId: string; contenu: string }) =>
      apiFetch(`/lists/${listId}/items/${titleId}/comments`, { method: "POST", body: { contenu } }),
    onSuccess: (_, { listId, titleId }) => invalidate(listId, titleId),
  });
}

export function useUpdateItemComment() {
  const invalidate = useInvalidateThread();
  return useMutation({
    mutationFn: ({
      listId,
      commentId,
      contenu,
    }: {
      listId: string;
      titleId: string;
      commentId: string;
      contenu: string;
    }) => apiFetch(`/lists/${listId}/comments/${commentId}`, { method: "PATCH", body: { contenu } }),
    onSuccess: (_, { listId, titleId }) => invalidate(listId, titleId),
  });
}

export function useDeleteItemComment() {
  const invalidate = useInvalidateThread();
  return useMutation({
    mutationFn: ({ listId, commentId }: { listId: string; titleId: string; commentId: string }) =>
      apiFetch(`/lists/${listId}/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: (_, { listId, titleId }) => invalidate(listId, titleId),
  });
}

export function useMyProfile(enabled = true) {
  return useQuery<MyProfile>({
    queryKey: ["my-profile"],
    queryFn: () => apiFetch<MyProfile>("/users/me"),
    enabled,
  });
}

export function useSetCommentsVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visible: boolean) =>
      apiFetch<MyProfile>("/users/me", { method: "PATCH", body: { commentaires_visibles: visible } }),
    onSuccess: (profile) => queryClient.setQueryData(["my-profile"], profile),
  });
}
