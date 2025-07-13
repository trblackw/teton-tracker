import type { NewRunForm } from './schema';

export function validateFlightNumber(flightNumber: string): string | null {
  if (!flightNumber || flightNumber.length < 2) {
    return 'Flight number must be at least 2 characters';
  }
  if (flightNumber.length > 10) {
    return 'Flight number must be at most 10 characters';
  }
  if (!/^[A-Z]{1,3}[0-9]{1,4}[A-Z]?$/.test(flightNumber)) {
    return 'Flight number format invalid (e.g., AA1234, UA123A)';
  }
  return null;
}

export function validateAirportCode(code: string): string | null {
  if (!code || code.length < 3) {
    return 'Airport code must be at least 3 characters';
  }
  if (code.length > 4) {
    return 'Airport code must be at most 4 characters';
  }
  if (!/^[A-Z]{3,4}$/.test(code)) {
    return 'Airport code must be uppercase letters only';
  }
  return null;
}

export function validateLocation(location: string): string | null {
  if (!location || location.trim().length < 5) {
    return 'Location must be at least 5 characters';
  }
  if (location.length > 200) {
    return 'Location must be at most 200 characters';
  }
  return null;
}

export function validateDateTime(dateTime: string): string | null {
  if (!dateTime) {
    return 'Date and time is required';
  }
  const date = new Date(dateTime);
  if (isNaN(date.getTime())) {
    return 'Invalid date and time format';
  }
  return null;
}

export function validateAirline(airline: string): string | null {
  if (!airline || airline.trim().length < 2) {
    return 'Airline name must be at least 2 characters';
  }
  if (airline.length > 100) {
    return 'Airline name must be at most 100 characters';
  }
  return null;
}

export function validateNewRunForm(data: Partial<NewRunForm>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const flightNumberError = validateFlightNumber(data.flightNumber || '');
  if (flightNumberError) errors.flightNumber = flightNumberError;

  const airlineError = validateAirline(data.airline || '');
  if (airlineError) errors.airline = airlineError;

  const departureError = validateAirportCode(data.departure || '');
  if (departureError) errors.departure = departureError;

  const arrivalError = validateAirportCode(data.arrival || '');
  if (arrivalError) errors.arrival = arrivalError;

  const pickupLocationError = validateLocation(data.pickupLocation || '');
  if (pickupLocationError) errors.pickupLocation = pickupLocationError;

  const dropoffLocationError = validateLocation(data.dropoffLocation || '');
  if (dropoffLocationError) errors.dropoffLocation = dropoffLocationError;

  const scheduledTimeError = validateDateTime(data.scheduledTime || '');
  if (scheduledTimeError) errors.scheduledTime = scheduledTimeError;

  if (data.notes && data.notes.length > 500) {
    errors.notes = 'Notes must be at most 500 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
