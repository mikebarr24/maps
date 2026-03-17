"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useFormStatus } from "react-dom";
import { Icon, latLngBounds, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Popup as LeafletPopup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { FiArrowLeft, FiFilter, FiLayers, FiMapPin } from "react-icons/fi";
import { toast } from "sonner";
import Button from "@/app/components/Button";
import FormFieldError from "@/app/components/FormFieldError";
import Popup from "@/app/components/Popup";
import { searchActivitiesAction } from "./actions";
import type {
  MapPlaceResult,
  MapSearchFormState,
  MapViewProps,
} from "./types";
import { initialMapSearchState } from "./types";

const ukAndNorthernIrelandBounds: LatLngBoundsExpression = [
  [49.8, -8.9],
  [61.1, 2.1],
];

const rainViewerApiUrl = "https://api.rainviewer.com/public/weather-maps.json";
const rainTilePath = "/256/{z}/{x}/{y}/2/1_1.png";
const googlePinIcon = new Icon({
  iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 42">
      <path
        fill="#DB4437"
        stroke="#B3261E"
        stroke-width="1.5"
        d="M20 1.5C11.44 1.5 4.5 8.44 4.5 17c0 10.54 11.86 20.89 14.59 23.1.54.44 1.28.44 1.82 0C23.64 37.89 35.5 27.54 35.5 17 35.5 8.44 28.56 1.5 20 1.5Z"
      />
      <circle cx="20" cy="17" r="6.5" fill="#fff" />
    </svg>
  `)}`,
  iconSize: [30, 42],
  iconAnchor: [15, 41],
  popupAnchor: [0, -36],
});

const fieldClassName =
  "w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition focus:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-60";
const distanceRangeMinKm = 5;
const distanceRangeMaxKm = 50;
const distanceRangeStepKm = 5;
const defaultDistanceKm = 25;

type RainViewerResponse = {
  host?: string;
  radar?: {
    past?: Array<{
      path?: string;
    }>;
  };
};

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const getLatestRainTileUrl = (data: RainViewerResponse): string => {
  const latestFrame = data.radar?.past?.at(-1);
  if (!data.host || !latestFrame?.path) {
    throw new Error("RainViewer did not return a usable radar frame.");
  }

  return `${data.host}${latestFrame.path}${rainTilePath}`;
};

const fetchLatestRainTileUrl = async (): Promise<string> => {
  const response = await fetch(rainViewerApiUrl);
  if (!response.ok) {
    throw new Error(`RainViewer request failed (${response.status})`);
  }

  const data = (await response.json()) as RainViewerResponse;
  return getLatestRainTileUrl(data);
};

function SearchSubmitButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending} type="submit">
      {pending ? "Searching..." : "Find places"}
    </Button>
  );
}

function MapResultsLayer({
  results,
}: {
  results: MapPlaceResult[];
}) {
  const map = useMap();

  useEffect(() => {
    if (results.length === 0) {
      return;
    }

    if (results.length === 1) {
      const [result] = results;
      map.setView([result.latitude, result.longitude], 11, {
        animate: true,
      });
      return;
    }

    map.fitBounds(
      latLngBounds(
        results.map((result) => [result.latitude, result.longitude] as const),
      ),
      {
        animate: true,
        padding: [40, 40],
      },
    );
  }, [map, results]);

  return (
    <>
      {results.map((result, index) => (
        <Marker
          key={`${result.title}-${result.latitude}-${result.longitude}-${index}`}
          icon={googlePinIcon}
          position={[result.latitude, result.longitude]}
        >
          <LeafletPopup>
            <div className="space-y-2">
              <h3 className="m-0 text-base font-semibold">{result.title}</h3>
              <p className="m-0 text-sm text-slate-700">
                {result.shortDescription}
              </p>
              <p className="m-0 text-xs text-slate-500">
                {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
              </p>
              <a
                className="text-sm font-medium text-sky-700 underline"
                href={result.originalUrl}
                rel="noreferrer noopener"
                target="_blank"
              >
                Open source
              </a>
            </div>
          </LeafletPopup>
        </Marker>
      ))}
    </>
  );
}

export default function UKMap({
  activityTypes,
  isSchemaReady,
}: MapViewProps) {
  const [showRain, setShowRain] = useState(false);
  const [rainTileUrl, setRainTileUrl] = useState<string | null>(null);
  const [isRainLoading, setIsRainLoading] = useState(false);
  const [rainError, setRainError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState<
    number | null
  >(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(
    null,
  );
  const [locationQuery, setLocationQuery] = useState("");
  const [distanceKm, setDistanceKm] = useState(defaultDistanceKm);
  const [activeResults, setActiveResults] = useState<MapPlaceResult[]>([]);
  const [activeSearchState, setActiveSearchState] = useState<{
    activityTitle: string;
    locationQuery: string;
    resultCount: number;
  } | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const menuId = "map-controls-menu";
  const [searchState, searchAction] = useActionState<
    MapSearchFormState,
    FormData
  >(searchActivitiesAction, initialMapSearchState);

  const activityLookup = useMemo(() => {
    const entries = activityTypes.flatMap((activityType) =>
      activityType.activities.map((activity) => [
        activity.id,
        {
          ...activity,
          activityTypeName: activityType.name,
        },
      ] as const),
    );

    return new Map(entries);
  }, [activityTypes]);

  const selectedActivityType =
    activityTypes.find((activityType) => activityType.id === selectedActivityTypeId) ??
    null;

  useEffect(() => {
    if (!selectedActivityType) {
      setSelectedActivityId(null);
      return;
    }

    if (
      selectedActivityId !== null &&
      selectedActivityType.activities.some(
        (activity) => activity.id === selectedActivityId,
      )
    ) {
      return;
    }

    setSelectedActivityId(null);
  }, [selectedActivityId, selectedActivityType]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (searchState.status === "idle" || !searchState.message) {
      return;
    }

    const notify =
      searchState.status === "success" ? toast.success : toast.error;

    notify(searchState.message, {
      id: searchState.submittedAt,
    });

    if (searchState.status !== "success") {
      return;
    }

    const matchedActivity =
      searchState.activityId !== undefined
        ? activityLookup.get(searchState.activityId)
        : undefined;

    setActiveResults(searchState.results);
    setActiveSearchState({
      activityTitle: matchedActivity?.title ?? "Selected activity",
      locationQuery: searchState.locationQuery ?? "",
      resultCount: searchState.results.length,
    });
  }, [activityLookup, searchState]);

  const showRainOverlay = async () => {
    setRainError(null);
    if (rainTileUrl) {
      setShowRain(true);
      return;
    }

    setIsRainLoading(true);
    try {
      const latestRainTileUrl = await fetchLatestRainTileUrl();
      setRainTileUrl(latestRainTileUrl);
      setShowRain(true);
    } catch (error) {
      setRainError(
        error instanceof Error ? error.message : "Unable to load rain overlay.",
      );
    } finally {
      setIsRainLoading(false);
    }
  };

  const toggleRainOverlay = async () => {
    if (showRain) {
      setShowRain(false);
      return;
    }

    await showRainOverlay();
  };

  const handleLocationQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLocationQuery(event.currentTarget.value);
  };

  const handleDistanceChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDistanceKm(Number(event.currentTarget.value));
  };

  const hasActivities = activityTypes.length > 0;
  const isSearchDisabled =
    !isSchemaReady || !selectedActivityId || locationQuery.trim().length === 0;

  return (
    <div className="relative h-full w-full">
      <div
        ref={controlsRef}
        className="absolute right-4 bottom-12 z-1000 flex flex-col items-end gap-3"
      >
        <Button
          aria-expanded={isFilterOpen}
          aria-haspopup="dialog"
          aria-label="Open filters"
          onClick={() => {
            setIsMenuOpen(false);
            setIsFilterOpen(true);
          }}
          size="icon"
          variant="secondary"
          className={joinClasses(
            "flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-map-control-foreground",
            isFilterOpen
              ? "border-map-control-active bg-map-control-active hover:border-map-control-active hover:bg-map-control-active"
              : "border-map-control bg-map-control hover:border-map-control hover:bg-map-control",
          )}
        >
          <FiFilter size={18} />
        </Button>

        <div className="relative">
          {isMenuOpen ? (
            <div
              id={menuId}
              aria-label="Map options"
              role="group"
              className="absolute right-0 bottom-13 min-w-44 overflow-hidden rounded-lg bg-map-menu text-map-menu-foreground"
            >
              <Button
                aria-pressed={showRain}
                fullWidth
                isLoading={isRainLoading}
                onClick={() => {
                  setIsMenuOpen(false);
                  void toggleRainOverlay();
                }}
                size="sm"
                variant="inverseGhost"
                className={joinClasses(
                  "flex w-full items-center justify-between gap-2.5 bg-transparent px-3 py-2.5 text-sm text-map-menu-foreground",
                  isRainLoading ? "cursor-wait" : "cursor-pointer",
                )}
              >
                <span>{isRainLoading ? "Loading rain..." : "Show rain"}</span>
                <span
                  aria-hidden="true"
                  className={joinClasses(
                    "h-2.5 w-2.5 rounded-full",
                    showRain ? "bg-map-indicator-active" : "bg-map-indicator",
                  )}
                />
              </Button>
            </div>
          ) : null}

          <Button
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label="Map options"
            aria-controls={menuId}
            onClick={() => {
              setIsMenuOpen((current) => !current);
            }}
            size="icon"
            variant="secondary"
            className={joinClasses(
              "flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-map-control-foreground",
              isMenuOpen || showRain
                ? "border-map-control-active bg-map-control-active hover:border-map-control-active hover:bg-map-control-active"
                : "border-map-control bg-map-control hover:border-map-control hover:bg-map-control",
            )}
          >
            <FiLayers size={18} />
          </Button>
        </div>
      </div>

      {isFilterOpen ? (
        <Popup
          onClose={() => setIsFilterOpen(false)}
          title={<h2 className="text-lg font-semibold">Filter</h2>}
        >
          <div className="space-y-6">
            {!isSchemaReady ? (
              <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                The activity catalog is unavailable until the latest database
                migration is applied.
              </div>
            ) : null}

            {isSchemaReady && !hasActivities ? (
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                No published activities are available yet.
              </div>
            ) : null}

            {isSchemaReady && hasActivities ? (
              <>
                {selectedActivityType ? (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Activity type
                        </p>
                        <h3 className="m-0 mt-1 text-xl font-semibold">
                          {selectedActivityType.name}
                        </h3>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedActivityTypeId(null);
                          setSelectedActivityId(null);
                        }}
                        size="sm"
                        variant="ghost"
                        className="gap-2"
                      >
                        <FiArrowLeft size={16} />
                        Back
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {selectedActivityType.activities.map((activity) => {
                        const isSelected = selectedActivityId === activity.id;

                        return (
                          <button
                            key={activity.id}
                            className={joinClasses(
                              "w-full rounded-2xl border px-4 py-3 text-left transition",
                              isSelected
                                ? "border-sky-700 bg-sky-50"
                                : "border-border bg-background hover:border-slate-400",
                            )}
                            onClick={() => setSelectedActivityId(activity.id)}
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="m-0 text-base font-semibold">
                                  {activity.title}
                                </h4>
                                <p className="m-0 mt-1 text-sm leading-6 text-muted-foreground">
                                  {activity.description}
                                </p>
                              </div>
                              <span
                                className={joinClasses(
                                  "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
                                  isSelected
                                    ? "border-sky-700 bg-sky-700"
                                    : "border-slate-300 bg-transparent",
                                )}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <form action={searchAction} className="space-y-4">
                      <input
                        name="activityId"
                        type="hidden"
                        value={selectedActivityId ?? ""}
                      />

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium">Where</span>
                        <input
                          className={fieldClassName}
                          maxLength={160}
                          name="where"
                          onChange={handleLocationQueryChange}
                          placeholder="Eg. Peak District, Bristol, or around Manchester"
                          required
                          type="text"
                          value={locationQuery}
                        />
                        <p className="m-0 text-sm text-muted-foreground">
                          Tell us where you want to do this activity and we will
                          search nearby options.
                        </p>
                        <FormFieldError message={searchState.fieldErrors?.where} />
                      </label>

                      <label className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">
                            Search radius
                          </span>
                          <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                            {distanceKm}km
                          </span>
                        </div>
                        <input
                          className="w-full accent-sky-700"
                          max={distanceRangeMaxKm}
                          min={distanceRangeMinKm}
                          name="distanceKm"
                          onChange={handleDistanceChange}
                          step={distanceRangeStepKm}
                          type="range"
                          value={distanceKm}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{distanceRangeMinKm}km</span>
                          <span>{distanceRangeMaxKm}km</span>
                        </div>
                        <p className="m-0 text-sm text-muted-foreground">
                          Choose how far from your selected location we should
                          look for matching places.
                        </p>
                        <FormFieldError
                          message={searchState.fieldErrors?.distanceKm}
                        />
                      </label>

                      <FormFieldError
                        message={searchState.fieldErrors?.activityId}
                      />

                      <div className="flex justify-start">
                        <SearchSubmitButton disabled={isSearchDisabled} />
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Browse
                      </p>
                      <h3 className="m-0 mt-1 text-xl font-semibold">
                        Activity types
                      </h3>
                      <p className="m-0 mt-2 text-sm leading-6 text-muted-foreground">
                        Choose a type first, then pick the exact activity you want
                        to search for.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {activityTypes.map((activityType) => (
                        <button
                          key={activityType.id}
                          className="rounded-2xl border border-border bg-background px-4 py-4 text-left transition hover:border-slate-400"
                          onClick={() => setSelectedActivityTypeId(activityType.id)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="m-0 text-base font-semibold">
                                {activityType.name}
                              </h4>
                              <p className="m-0 mt-1 text-sm text-muted-foreground">
                                {`${activityType.activities.length} ${
                                  activityType.activities.length === 1
                                    ? "activity"
                                    : "activities"
                                }`}
                              </p>
                            </div>
                            <FiMapPin
                              className="mt-0.5 shrink-0 text-muted-foreground"
                              size={18}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeSearchState ? (
                  <section className="space-y-3 border-t border-border pt-5">
                    <div>
                      <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Results
                      </p>
                      <h3 className="m-0 mt-1 text-xl font-semibold">
                        {activeSearchState.activityTitle} near{" "}
                        {activeSearchState.locationQuery}
                      </h3>
                      <p className="m-0 mt-2 text-sm leading-6 text-muted-foreground">
                        {activeSearchState.resultCount === 0
                          ? "No places matched that search."
                          : `${activeSearchState.resultCount} place${activeSearchState.resultCount === 1 ? "" : "s"} added to the map.`}
                      </p>
                    </div>

                    {activeResults.length > 0 ? (
                      <div className="space-y-3">
                        {activeResults.map((result, index) => (
                          <article
                            key={`${result.title}-${result.latitude}-${result.longitude}-${index}`}
                            className="rounded-2xl border border-border bg-background px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="m-0 text-base font-semibold">
                                  {result.title}
                                </h4>
                                <p className="m-0 mt-1 text-sm leading-6 text-muted-foreground">
                                  {result.shortDescription}
                                </p>
                                <p className="m-0 mt-2 text-xs text-muted-foreground">
                                  {result.latitude.toFixed(4)},{" "}
                                  {result.longitude.toFixed(4)}
                                </p>
                              </div>
                              <a
                                className="shrink-0 text-sm font-medium text-sky-700 underline"
                                href={result.originalUrl}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                Source
                              </a>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </>
            ) : null}
          </div>
        </Popup>
      ) : null}

      {rainError ? (
        <p className="absolute top-4 right-4 z-1000 m-0 max-w-70 rounded-lg bg-map-banner px-3 py-2 text-map-banner-foreground">
          {rainError}
        </p>
      ) : null}

      <MapContainer
        bounds={ukAndNorthernIrelandBounds}
        className="h-full w-full"
        maxBounds={ukAndNorthernIrelandBounds}
        maxBoundsViscosity={1}
        minZoom={5}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        />
        {showRain && rainTileUrl ? (
          <TileLayer
            attribution='Rain radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>'
            opacity={0.6}
            url={rainTileUrl}
            zIndex={700}
          />
        ) : null}
        {activeResults.length > 0 ? <MapResultsLayer results={activeResults} /> : null}
      </MapContainer>
    </div>
  );
}
