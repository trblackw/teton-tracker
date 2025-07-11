// Core entity interfaces
export interface Run {
  id: string;
  flightNumber: string;
  airline: string;
  departure: string;
  arrival: string;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledTime: string;
  type: RunType;
  status: RunStatus;
  createdAt?: Date;
  updatedAt?: Date;
  notes?: string;
}

export interface FlightStatus {
  flightNumber: string;
  status: FlightStatusType;
  scheduledDeparture?: string;
  actualDeparture?: string;
  scheduledArrival?: string;
  actualArrival?: string;
  delay?: number;
  gate?: string;
  terminal?: string;
  aircraft?: string;
  lastUpdated?: Date;
}

export interface TrafficData {
  route: string;
  duration: number;
  durationInTraffic: number;
  distance: string;
  status: TrafficStatus;
  lastUpdated?: Date;
  incidents?: TrafficIncident[];
}

export interface TrafficIncident {
  type: 'accident' | 'construction' | 'closure' | 'congestion';
  description: string;
  severity: 'minor' | 'moderate' | 'major';
}

// Form interfaces
export interface NewRunForm {
  flightNumber: string;
  airline: string;
  departure: string;
  arrival: string;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledTime: string;
  type: RunType;
  notes?: string;
}

// External API response interfaces
export interface OpenSkyFlightResponse {
  icao24: string;
  firstSeen: number;
  estDepartureAirport: string | null;
  lastSeen: number;
  estArrivalAirport: string | null;
  callsign: string | null;
  estDepartureAirportHorizDistance: number | null;
  estDepartureAirportVertDistance: number | null;
  estArrivalAirportHorizDistance: number | null;
  estArrivalAirportVertDistance: number | null;
  departureAirportCandidatesCount: number;
  arrivalAirportCandidatesCount: number;
}

export interface TomTomRouteResponse {
  routes: TomTomRoute[];
}

export interface TomTomRoute {
  summary: TomTomRouteSummary;
  legs: TomTomRouteLeg[];
}

export interface TomTomRouteSummary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
  trafficDelayInSeconds: number;
  trafficLengthInMeters: number;
  departureTime: string;
  arrivalTime: string;
}

export interface TomTomRouteLeg {
  summary: TomTomRouteSummary;
}

// Enum types
export type RunType = 'pickup' | 'dropoff';

export type RunStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export type FlightStatusType = 
  | 'On Time'
  | 'Delayed'
  | 'Cancelled'
  | 'Departed'
  | 'Arrived'
  | 'Boarding'
  | 'Unknown';

export type TrafficStatus = 'good' | 'moderate' | 'heavy';

// Utility types for common use cases
export type RunWithFlightStatus = Run & {
  flightStatus?: FlightStatus;
};

export type RunWithTrafficData = Run & {
  trafficData?: TrafficData;
};

export type FullRunDetails = Run & {
  flightStatus?: FlightStatus;
  trafficData?: TrafficData;
};

// Filter and sort types
export type RunFilter = {
  status?: RunStatus;
  type?: RunType;
  airline?: string;
  departure?: string;
  arrival?: string;
  dateRange?: {
    start: string;
    end: string;
  };
};

export type RunSortField = 'scheduledTime' | 'flightNumber' | 'airline' | 'status' | 'createdAt';

export type SortOrder = 'asc' | 'desc';

export type RunSort = {
  field: RunSortField;
  order: SortOrder;
};
