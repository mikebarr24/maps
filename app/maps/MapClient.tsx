"use client";

import dynamic from "next/dynamic";
import type { MapActivityType } from "./types";

const UKMap = dynamic(() => import("./UKMap"), { ssr: false });

type MapClientProps = {
  activityTypes: MapActivityType[];
  isSchemaReady: boolean;
};

export default function MapClient(props: MapClientProps) {
  return <UKMap {...props} />;
}
