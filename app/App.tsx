"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import Popup from "@/app/components/Popup";

export default function App() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1>Hello World</h1>
      <Button onClick={() => setIsPopupOpen(true)}>Open popup</Button>
      {isPopupOpen ? (
        <Popup onClose={() => setIsPopupOpen(false)}>
          <h2 className="m-0 text-xl font-semibold">Popup title</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            This is the reusable popup portal. Click the backdrop or the close
            button to dismiss it.
          </p>
        </Popup>
      ) : null}
    </div>
  );
}
