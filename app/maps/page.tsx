import { loadMapsData } from "./data";
import MapClient from "./MapClient";

export const dynamic = "force-dynamic";

export default async function MapsPage() {
  const { activityTypes, isSchemaReady } = await loadMapsData();

  return (
    <main className="flex min-h-0 w-full flex-1 overflow-hidden">
      <MapClient activityTypes={activityTypes} isSchemaReady={isSchemaReady} />
    </main>
  );
}
