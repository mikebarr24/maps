"use client";

import { useEffect, useRef, useState } from "react";
import { type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import { FiFilter, FiLayers } from "react-icons/fi";
import Button from "@/app/components/Button";
import Popup from "@/app/components/Popup";

const ukAndNorthernIrelandBounds: LatLngBoundsExpression = [
  [49.8, -8.9],
  [61.1, 2.1],
];

const rainViewerApiUrl = "https://api.rainviewer.com/public/weather-maps.json";
const rainTilePath = "/256/{z}/{x}/{y}/2/1_1.png";

type RainViewerResponse = {
  host?: string;
  radar?: {
    past?: Array<{
      path?: string;
    }>;
  };
};

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

export default function UKMap() {
  const [showRain, setShowRain] = useState(false);
  const [rainTileUrl, setRainTileUrl] = useState<string | null>(null);
  const [isRainLoading, setIsRainLoading] = useState(false);
  const [rainError, setRainError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const menuId = "map-controls-menu";

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
          className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-map-control-foreground ${
            isFilterOpen
              ? "border-map-control-active bg-map-control-active hover:border-map-control-active hover:bg-map-control-active"
              : "border-map-control bg-map-control hover:border-map-control hover:bg-map-control"
          }`}
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
                className={`flex w-full items-center justify-between gap-2.5 bg-transparent px-3 py-2.5 text-sm text-map-menu-foreground ${
                  isRainLoading ? "cursor-wait" : "cursor-pointer"
                }`}
              >
                <span>{isRainLoading ? "Loading rain..." : "Show rain"}</span>
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${
                    showRain ? "bg-map-indicator-active" : "bg-map-indicator"
                  }`}
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
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-map-control-foreground ${
              isMenuOpen || showRain
                ? "border-map-control-active bg-map-control-active hover:border-map-control-active hover:bg-map-control-active"
                : "border-map-control bg-map-control hover:border-map-control hover:bg-map-control"
            }`}
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
          {null}
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
      </MapContainer>
    </div>
  );
}
