"use client";

import dynamic from "next/dynamic";

const UKMap = dynamic(() => import("./UKMap"), { ssr: false });

export default function MapsPage() {
  return (
    <main className="flex min-h-0 w-full flex-1 overflow-hidden">
      <UKMap />
    </main>
  );
}
