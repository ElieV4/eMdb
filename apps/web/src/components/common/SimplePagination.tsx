/**
 * Pagination simple (contrôles seulement, sans rendu des items).
 * Utilisé quand les items sont déjà rendus séparément.
 */

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPageNumbers?: boolean;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showPageNumbers = true,
}: SimplePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Page précédente"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {showPageNumbers && (
        <span className="text-sm text-muted-foreground">
          Page {currentPage} / {totalPages}
        </span>
      )}

      <Button
        variant="outline"
        size="icon"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Page suivante"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
