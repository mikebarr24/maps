"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "./types";

const UKMap = dynamic(() => import("./UKMap"), { ssr: false });

export default function MapClient(props: MapViewProps) {
  return <UKMap {...props} />;
}
