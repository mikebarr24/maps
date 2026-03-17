// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapSearchFormState, MapViewProps } from "../../../../app/maps/types";

const {
  fetchMock,
  fitBoundsMock,
  latLngBoundsMock,
  searchActionMock,
  searchActivitiesActionMock,
  searchStateRef,
  setViewMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  fitBoundsMock: vi.fn(),
  latLngBoundsMock: vi.fn((coordinates: unknown) => ({
    coordinates,
  })),
  searchActionMock: vi.fn(),
  searchActivitiesActionMock: vi.fn(),
  searchStateRef: {
    current: {
      status: "idle",
      results: [],
    },
  },
  setViewMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("leaflet/dist/leaflet.css", () => ({}));

vi.mock("leaflet", () => ({
  Icon: vi.fn(function MockIcon(this: Record<string, unknown>, options: unknown) {
    this.options = options;
  }),
  latLngBounds: latLngBoundsMock,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    useActionState: () => [searchStateRef.current, searchActionMock] as const,
  };
});

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  Marker: () => <div data-testid="marker" />,
  Popup: () => null,
  TileLayer: ({ url }: { url: string }) => <div data-url={url} data-testid="tile-layer" />,
  useMap: () => ({
    fitBounds: fitBoundsMock,
    setView: setViewMock,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock("../../../../app/maps/actions", () => ({
  searchActivitiesAction: searchActivitiesActionMock,
}));

import UKMap from "../../../../app/maps/UKMap";

const activityTypes: MapViewProps["activityTypes"] = [
  {
    id: 1,
    name: "Walking",
    activities: [
      {
        id: 101,
        title: "Canal walk",
        description: "Flat routes along towpaths.",
        activityTypeId: 1,
      },
      {
        id: 102,
        title: "Hill walk",
        description: "Longer walks with elevation.",
        activityTypeId: 1,
      },
    ],
  },
  {
    id: 2,
    name: "Cycling",
    activities: [
      {
        id: 201,
        title: "Gravel ride",
        description: "Mixed-surface riding.",
        activityTypeId: 2,
      },
    ],
  },
];

const rainTileUrl =
  "https://tilecache.rainviewer.com/v2/radar/frame/256/{z}/{x}/{y}/2/1_1.png";

const buildSuccessState = (
  overrides: Partial<MapSearchFormState> = {},
): MapSearchFormState => ({
  status: "success",
  message: "Found places.",
  submittedAt: 123,
  activityId: 101,
  locationQuery: "Peak District",
  results: [
    {
      title: "Summit Cafe",
      latitude: 53.348,
      longitude: -1.623,
      shortDescription: "A scenic stop near the trail.",
      originalUrl: "https://example.com/summit-cafe",
    },
  ],
  ...overrides,
});

function renderMap(props: Partial<MapViewProps> = {}) {
  return render(
    <UKMap
      activityTypes={props.activityTypes ?? activityTypes}
      isSchemaReady={props.isSchemaReady ?? true}
    />,
  );
}

function getRainLayer() {
  return document.querySelector(`[data-url="${rainTileUrl}"]`);
}

async function openFilters() {
  fireEvent.click(screen.getByRole("button", { name: "Open filters" }));
  await screen.findByRole("dialog");
}

async function openMapOptions() {
  fireEvent.click(screen.getByRole("button", { name: "Map options" }));
  await screen.findByRole("group", { name: "Map options" });
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  searchStateRef.current = {
    status: "idle",
    results: [],
  };
  fetchMock.mockReset();
  fitBoundsMock.mockReset();
  latLngBoundsMock.mockClear();
  searchActionMock.mockReset();
  searchActivitiesActionMock.mockReset();
  setViewMock.mockReset();
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);

  if (typeof window.PointerEvent === "undefined") {
    window.PointerEvent = MouseEvent as typeof PointerEvent;
  }
});

describe("app/maps/UKMap", () => {
  it("opens and closes the map options menu with escape and outside clicks", async () => {
    renderMap();

    await openMapOptions();
    expect(
      screen.getByRole("group", { name: "Map options" }),
    ).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("group", { name: "Map options" })).toBeNull();
    });

    await openMapOptions();
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("group", { name: "Map options" })).toBeNull();
    });
  });

  it("loads the rain overlay once and reuses the cached tile URL when reopened", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        host: "https://tilecache.rainviewer.com",
        radar: {
          past: [{ path: "/v2/radar/frame" }],
        },
      }),
    });

    renderMap();

    await openMapOptions();
    fireEvent.click(screen.getByRole("button", { name: "Show rain" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(getRainLayer()).toBeTruthy();
    });

    await openMapOptions();
    fireEvent.click(screen.getByRole("button", { name: "Show rain" }));
    await waitFor(() => {
      expect(getRainLayer()).toBeNull();
    });

    await openMapOptions();
    fireEvent.click(screen.getByRole("button", { name: "Show rain" }));
    await waitFor(() => {
      expect(getRainLayer()).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a rain overlay error when the RainViewer request fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
    });

    renderMap();

    await openMapOptions();
    fireEvent.click(screen.getByRole("button", { name: "Show rain" }));

    expect(
      await screen.findByText("RainViewer request failed (503)"),
    ).toBeTruthy();
    expect(getRainLayer()).toBeNull();
  });

  it("shows schema-unavailable and no-activities filter states", async () => {
    const rendered = renderMap({
      activityTypes: [],
      isSchemaReady: false,
    });

    await openFilters();
    expect(
      screen.getByText(
        /The activity catalog is unavailable until the latest database migration is applied\./,
      ),
    ).toBeTruthy();

    rendered.rerender(<UKMap activityTypes={[]} isSchemaReady />);
    expect(
      await screen.findByText("No published activities are available yet."),
    ).toBeTruthy();
  });

  it("updates activity selection flow and only enables search when requirements are satisfied", async () => {
    renderMap();

    await openFilters();
    fireEvent.click(screen.getByRole("button", { name: /Walking/i }));

    const submitButton = screen.getByRole("button", { name: "Find places" });
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Canal walk/i }));
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Bristol" },
    });
    expect((submitButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Activity types")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Walking/i }));
    expect(
      (screen.getByRole("button", { name: "Find places" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("shows successful search results, notifies success, and recenters for a single result", async () => {
    const rendered = renderMap();

    await openFilters();
    searchStateRef.current = buildSuccessState();
    rendered.rerender(<UKMap activityTypes={activityTypes} isSchemaReady />);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("Found places.", {
        id: 123,
      });
      expect(
        screen.getByText("Canal walk near Peak District"),
      ).toBeTruthy();
      expect(screen.getByText("1 place added to the map.")).toBeTruthy();
      expect(screen.getByText("Summit Cafe")).toBeTruthy();
      expect(setViewMock).toHaveBeenCalledWith([53.348, -1.623], 11, {
        animate: true,
      });
    });
  });

  it("shows error notifications for failed searches", async () => {
    const rendered = renderMap();

    await openFilters();
    searchStateRef.current = {
      status: "error",
      message: "Unable to search for places right now. Please try again.",
      submittedAt: 456,
      results: [],
      activityId: 101,
      locationQuery: "Leeds",
    };
    rendered.rerender(<UKMap activityTypes={activityTypes} isSchemaReady />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Unable to search for places right now. Please try again.",
        {
          id: 456,
        },
      );
    });
    expect(screen.queryByText(/near Leeds/)).toBeNull();
  });

  it("fits bounds when multiple search results are returned", async () => {
    const rendered = renderMap();

    await openFilters();
    searchStateRef.current = buildSuccessState({
      submittedAt: 789,
      locationQuery: "Yorkshire",
      results: [
        {
          title: "North Loop",
          latitude: 54.001,
          longitude: -1.002,
          shortDescription: "A route through open countryside.",
          originalUrl: "https://example.com/north-loop",
        },
        {
          title: "South Loop",
          latitude: 53.101,
          longitude: -1.202,
          shortDescription: "A route with café stops.",
          originalUrl: "https://example.com/south-loop",
        },
      ],
    });
    rendered.rerender(<UKMap activityTypes={activityTypes} isSchemaReady />);

    await waitFor(() => {
      expect(latLngBoundsMock).toHaveBeenCalledWith([
        [54.001, -1.002],
        [53.101, -1.202],
      ]);
      expect(fitBoundsMock).toHaveBeenCalledWith(
        {
          coordinates: [
            [54.001, -1.002],
            [53.101, -1.202],
          ],
        },
        {
          animate: true,
          padding: [40, 40],
        },
      );
      expect(screen.getByText("2 places added to the map.")).toBeTruthy();
    });
  });
});
