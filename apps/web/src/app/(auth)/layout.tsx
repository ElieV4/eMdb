/**
 * Layout spécifique aux pages d'authentification.
 * Centre le contenu verticalement sans header/footer.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">{children}</div>
    </div>
  );
}
