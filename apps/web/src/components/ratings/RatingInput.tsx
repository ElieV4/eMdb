/**
 * Input de notation par étoiles (0-10, demi-étoiles).
 *
 * Phase 4.2 — Ratings
 */

"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingInputProps = {
  value?: number | null;
  onChange: (value: number) => void;
  className?: string;
};

export function RatingInput({ value, onChange, className }: RatingInputProps) {
  const [hover, setHover] = useState<number | null>(null);

  const rating = hover ?? value ?? 0;

  const handleClick = (star: number) => {
    onChange(star);
  };

  const handleMouseEnter = (star: number) => {
    setHover(star);
  };

  const handleMouseLeave = () => {
    setHover(null);
  };

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: 10 }).map((_, i) => {
        const starValue = i + 0.5;
        const filled = rating >= starValue;
        const halfFilled = !filled && rating >= i + 0.5;

        return (
          <button
            key={i}
            type="button"
            className="p-0 bg-transparent border-none cursor-pointer"
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
          >
            <Star
              className={cn(
                "h-5 w-5 transition-colors",
                filled
                  ? "fill-yellow-400 text-yellow-400"
                  : halfFilled
                    ? "fill-yellow-400/50 text-yellow-400"
                    : "text-gray-300"
              )}
            />
          </button>
        );
      })}
      <span className="ml-2 text-sm text-muted-foreground">
        {value !== undefined && value !== null ? `${value}/10` : ""}
      </span>
    </div>
  );
}