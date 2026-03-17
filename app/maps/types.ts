export type MapActivity = {
  id: number;
  title: string;
  description: string;
  activityTypeId: number;
};

export type MapActivityType = {
  id: number;
  name: string;
  activities: MapActivity[];
};

export type MapViewProps = {
  activityTypes: MapActivityType[];
  isSchemaReady: boolean;
};

export type MapPlaceResult = {
  title: string;
  latitude: number;
  longitude: number;
  shortDescription: string;
  originalUrl: string;
};

export type MapSearchFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  submittedAt?: number;
  results: MapPlaceResult[];
  activityId?: number;
  locationQuery?: string;
};

export const initialMapSearchState: MapSearchFormState = {
  status: "idle",
  results: [],
};
