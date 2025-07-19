import {
  AIRLINE_CODE_REGEX,
  AIRPORT_CODE_REGEX,
  DATE_TIME_REGEX,
  FLIGHT_NUMBER_REGEX,
  RESERVATION_ID_REGEX,
} from './schema';

export function isAirlineCode(code: string): boolean {
  return AIRLINE_CODE_REGEX.test(code);
}

export function isAirportCode(code: string): boolean {
  return AIRPORT_CODE_REGEX.test(code);
}

export function isFlightNumber(flightNumber: string): boolean {
  return FLIGHT_NUMBER_REGEX.test(flightNumber);
}

export function isReservationId(reservationId: string): boolean {
  return RESERVATION_ID_REGEX.test(reservationId);
}

export function isDateTime(dateTime: string): boolean {
  return DATE_TIME_REGEX.test(dateTime);
}
