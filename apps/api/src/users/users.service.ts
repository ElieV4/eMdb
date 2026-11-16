import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Sélection de champs publics exposés par les endpoints utilisateurs.
 * Le `password_hash` n'est jamais inclus.
 */
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  pseudo: true,
  avatar_url: true,
  created_at: true,
  // Réglage : commentaires perso visibles des membres de ses listes partagées.
  commentaires_visibles: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère le profil public d'un utilisateur par son ID.
   * @throws NotFoundException si l'utilisateur n'existe pas.
   */
  async getById(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return user;
  }

  /**
   * Met à jour le profil (pseudo et/ou avatar_url) d'un utilisateur.
   * @throws NotFoundException si l'utilisateur n'existe pas.
   */
  async updateProfile(id: string, payload: UpdateUserDto) {
    return this.prisma.users.update({
      where: { id },
      data: {
        pseudo: payload.pseudo,
        avatar_url: payload.avatar_url,
        commentaires_visibles: payload.commentaires_visibles,
      },
      select: USER_PUBLIC_SELECT,
    });
  }

  /**
   * Met à jour l'URL de l'avatar d'un utilisateur.
   * Appelé après un upload via multer (POST /users/me/avatar).
   * @throws NotFoundException si l'utilisateur n'existe pas.
   */
  async updateAvatar(id: string, avatarUrl: string) {
    return this.prisma.users.update({
      where: { id },
      data: { avatar_url: avatarUrl },
      select: USER_PUBLIC_SELECT,
    });
  }

  /**
   * Recherche d'utilisateurs pour le partage de listes (GET /users/search).
   *
   * Ne doit pas permettre d'énumérer les comptes :
   * - un fragment de pseudo (2 caractères min.) cherche par "contient" ;
   * - une saisie contenant "@" ne trouve que l'email EXACT (insensible à la
   *   casse) : on retrouve un ami dont on connaît l'adresse, sans pouvoir
   *   lister les emails par sous-chaîne ;
   * - l'email n'est jamais renvoyé ;
   * - seuls les comptes actifs sont proposés, hors utilisateur connecté.
   *
   * @param query - Fragment de pseudo, ou email complet.
   * @param currentUserId - Utilisateur connecté, exclu des résultats.
   * @returns Utilisateurs correspondants (max 10) : id, pseudo, avatar_url.
   */
  async findByPseudoOrEmail(query: string, currentUserId: string) {
    const trimmed = query.trim();
    const isEmail = trimmed.includes('@');

    if (!isEmail && trimmed.length < 2) {
      return [];
    }

    return this.prisma.users.findMany({
      where: {
        status: 'active',
        id: { not: currentUserId },
        ...(isEmail
          ? { email: { equals: trimmed, mode: 'insensitive' as const } }
          : { pseudo: { contains: trimmed, mode: 'insensitive' as const } }),
      },
      select: {
        id: true,
        pseudo: true,
        avatar_url: true,
      },
      orderBy: { pseudo: 'asc' },
      take: 10,
    });
  }

  /**
   * Alias de findByPseudoOrEmail pour la route GET /users/search.
   * Conservé pour la compatibilité avec le contrôleur existant.
   */
  async search(query: string, currentUserId: string) {
    return this.findByPseudoOrEmail(query, currentUserId);
  }

  /**
   * Supprime un utilisateur et toutes ses données associées.
   * La suppression en cascade est gérée par les clés étrangères
   * ON DELETE CASCADE définies dans le schéma (db_init.sql).
   * @throws NotFoundException si l'utilisateur n'existe pas.
   */
  async delete(id: string): Promise<void> {
    await this.prisma.users.delete({
      where: { id },
    });
  }
}
