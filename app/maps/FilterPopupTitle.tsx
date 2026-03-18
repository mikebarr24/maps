"use client";

import { FiArrowLeft } from "react-icons/fi";
import Button from "@/app/components/Button";

type FilterPopupTitleProps = {
  canGoBack?: boolean;
  onBack?: () => void;
};

export default function FilterPopupTitle({
  canGoBack = false,
  onBack,
}: FilterPopupTitleProps) {
  const showBackButton = canGoBack && typeof onBack === "function";

  return (
    <div className="min-w-0 space-y-3">
      {showBackButton ? (
        <Button
          onClick={onBack}
          size="sm"
          variant="ghost"
          className="w-fit shrink-0 rounded-full border border-border bg-surface-elevated text-foreground shadow-sm hover:bg-muted"
        >
          <FiArrowLeft aria-hidden="true" size={16} />
          Back
        </Button>
      ) : null}
      <h2 className="m-0 text-lg font-semibold text-foreground">Filter</h2>
    </div>
  );
}
