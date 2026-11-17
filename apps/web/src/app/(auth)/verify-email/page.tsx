/**
 * Page de confirmation de l'adresse email, ouverte depuis le lien reçu après
 * l'inscription (/verify-email?token=...).
 */

import { VerifyEmailStatus } from "@/components/auth/VerifyEmailStatus";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Confirmation de l&apos;email</h1>
      </div>
      <VerifyEmailStatus token={searchParams?.token} />
    </>
  );
}
