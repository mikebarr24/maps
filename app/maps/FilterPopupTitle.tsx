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
  return (
    <div className="flex items-center gap-3">
      {canGoBack ? (
        <Button
          onClick={onBack}
          size="sm"
          variant="ghost"
          className="shrink-0 border border-border bg-background shadow-sm hover:border-slate-400"
        >
          <FiArrowLeft size={16} />
          Back
        </Button>
      ) : null}
      <h2 className="text-lg font-semibold">Filter</h2>
    </div>
  );
}
