// Airport codes utility with comprehensive IATA to ICAO conversion
// Data source: https://github.com/mwgg/Airports (28k+ airports)

import airportData from '../data/airports-comprehensive.json';

interface AirportData {
  icao: string;
  iata: string | null;
  name: string;
  city: string;
  state?: string;
  country: string;
  elevation: number;
  lat: number;
  lon: number;
  tz: string;
}

let iataToIcaoMap: Record<string, string> | null = null;

// Build IATA to ICAO mapping from local data
function buildIataToIcaoMap(): void {
  if (iataToIcaoMap) return;

  iataToIcaoMap = {};

  for (const [icao, airport] of Object.entries(
    airportData as Record<string, AirportData>
  )) {
    if (airport.iata && airport.iata.length === 3) {
      iataToIcaoMap[airport.iata] = icao;
    }
  }

  console.log(
    `Loaded ${Object.keys(airportData).length} airports with ${Object.keys(iataToIcaoMap).length} IATA codes`
  );
}

/**
 * Convert IATA airport code to ICAO airport code
 * @param iataCode - 3-letter IATA code (e.g., 'JAC')
 * @returns 4-letter ICAO code (e.g., 'KJAC') or null if not found
 */
export function convertIATAToICAO(iataCode: string): string | null {
  if (!iataCode || iataCode.length !== 3) {
    return null;
  }

  buildIataToIcaoMap();

  if (!iataToIcaoMap) {
    return null;
  }

  const icaoCode = iataToIcaoMap[iataCode.toUpperCase()];
  return icaoCode || null;
}

/**
 * Get airport information by IATA code
 * @param iataCode - 3-letter IATA code
 * @returns Airport data or null if not found
 */
export function getAirportByIATA(iataCode: string): AirportData | null {
  if (!iataCode || iataCode.length !== 3) {
    return null;
  }

  buildIataToIcaoMap();

  if (!iataToIcaoMap) {
    return null;
  }

  const icaoCode = iataToIcaoMap[iataCode.toUpperCase()];
  if (!icaoCode) {
    return null;
  }

  return (airportData as Record<string, AirportData>)[icaoCode] || null;
}

/**
 * Get airport information by ICAO code
 * @param icaoCode - 4-letter ICAO code
 * @returns Airport data or null if not found
 */
export function getAirportByICAO(icaoCode: string): AirportData | null {
  if (!icaoCode || icaoCode.length !== 4) {
    return null;
  }

  return (
    (airportData as Record<string, AirportData>)[icaoCode.toUpperCase()] || null
  );
}

/**
 * Get airport name by IATA code
 * @param iataCode - 3-letter IATA code
 * @returns Airport name or null if not found
 */
export function getAirportName(iataCode: string): string | null {
  const airport = getAirportByIATA(iataCode);
  return airport?.name || null;
}

/**
 * Get airport city by IATA code
 * @param iataCode - 3-letter IATA code
 * @returns Airport city or null if not found
 */
export function getAirportCity(iataCode: string): string | null {
  const airport = getAirportByIATA(iataCode);
  return airport?.city || null;
}

/**
 * Get formatted airport display name (City, State (Code))
 * @param iataCode - 3-letter IATA code
 * @returns Formatted display name or the original code if not found
 */
export function getAirportDisplayName(iataCode: string): string {
  const airport = getAirportByIATA(iataCode);

  if (!airport) {
    return iataCode;
  }

  const parts = [airport.city];
  if (airport.state) {
    parts.push(airport.state);
  }
  parts.push(`(${airport.iata || iataCode})`);

  return parts.join(', ');
}

/**
 * Check if airport data is loaded
 * @returns True if airport data is loaded
 */
export function isAirportDataLoaded(): boolean {
  return iataToIcaoMap !== null;
}

/**
 * Get the total number of airports in the dataset
 * @returns Number of airports
 */
export function getAirportCount(): number {
  return Object.keys(airportData).length;
}

/**
 * Get the total number of IATA codes in the dataset
 * @returns Number of IATA codes
 */
export function getIATACodeCount(): number {
  buildIataToIcaoMap();
  return iataToIcaoMap ? Object.keys(iataToIcaoMap).length : 0;
}
