/**
 * Layout pour les pages frontend protégées.
 * Inclut Sidebar, Header et Footer.
 */

"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      {/* min-w-0 : sans lui, un enfant flex ne rétrécit jamais sous la
          largeur de son contenu (ex. une rangée de cartes qui déborde),
          ce qui poussait toute la mise en page plus large que le viewport
          et rendait un scroll horizontal possible (bug remonté). pb-14 :
          laisse la place à la barre d'icônes fixe en bas (< lg). */}
      <div className="flex min-w-0 flex-1 flex-col pb-14 lg:pb-0 lg:pl-64">
        <Suspense fallback={<div className="h-14" />}>
          <Header />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
