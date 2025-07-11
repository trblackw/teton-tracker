import { type NewRunForm, type RunType } from './schema';

export interface ParsedScheduleRun {
  id: string;
  time: string;
  flightNumber: string;
  airline: string;
  departure: string;
  arrival: string;
  pickupLocation: string;
  dropoffLocation: string;
  type: RunType;
  passengerInfo: string;
  passengerCount: string;
  price: string;
  notes: string;
}

export interface ParseResult {
  success: boolean;
  runs: ParsedScheduleRun[];
  errors: string[];
  warnings: string[];
}

// Flight number patterns to detect
const FLIGHT_NUMBER_PATTERNS = [
  /^[A-Z]{2,3}\s*\d{1,4}[A-Z]?$/i, // Standard: AA123, UA1234A
  /^[A-Z]{2,3}\s*CABIN\s*#?\s*\d{1,4}-?\d*$/i, // JLL CABIN # 111-105
  /^[A-Z]{2,3}\s*\d{1,4}$/i, // Simple: JLL123
  /[A-Z]{2,3}\d{1,4}[A-Z]?$/i, // Flight number at end of line: WAS 12 NOON DL1466
];

// Airport code patterns
const AIRPORT_CODE_PATTERNS = [
  /^[A-Z]{3,4}$/i, // Standard: JAC, KJAC
  /^AP$/i, // Special case for "AP" = airport
];

// Common airport mappings
const AIRPORT_MAPPINGS: Record<string, string> = {
  AP: 'JAC', // Airport = Jackson Hole
  JLL: 'JAC', // Likely local code for Jackson Hole
  SK: 'SLC', // Salt Lake City
  DL: 'DEN', // Denver (Delta hub)
};

// Common airline mappings
const AIRLINE_MAPPINGS: Record<string, string> = {
  AA: 'American Airlines',
  UA: 'United Airlines',
  DL: 'Delta Air Lines',
  SK: 'SkyWest',
  JLL: 'Jackson Hole Airlines',
};

function normalizeTime(timeStr: string): string {
  const cleaned = timeStr.trim().toUpperCase();

  // Handle special cases
  if (cleaned === 'ASAP') {
    return 'ASAP';
  }

  // Handle various time formats
  const match = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
  if (!match) return timeStr;

  const [, hours, minutes = '00', period] = match;
  const paddedHours = hours.padStart(2, '0');
  const paddedMinutes = minutes.padStart(2, '0');

  return `${paddedHours}:${paddedMinutes} ${period}`;
}

function extractFlightNumber(text: string): string | null {
  const cleaned = text.trim().toUpperCase();

  // Try each flight number pattern
  for (const pattern of FLIGHT_NUMBER_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      // Clean up the flight number
      return match[0]
        .replace(/\s+/g, '')
        .replace(/CABIN#?/, '')
        .replace(/-/g, '');
    }
  }

  return null;
}

function extractAirportCode(text: string): string {
  const cleaned = text.trim().toUpperCase();

  // Check if it matches airport patterns
  for (const pattern of AIRPORT_CODE_PATTERNS) {
    if (pattern.test(cleaned)) {
      // Apply mappings
      return AIRPORT_MAPPINGS[cleaned] || cleaned;
    }
  }

  // Fallback - assume it's an airport code if it's 2-4 uppercase letters
  if (/^[A-Z]{2,4}$/.test(cleaned)) {
    return AIRPORT_MAPPINGS[cleaned] || cleaned;
  }

  return 'JAC'; // Default to Jackson Hole
}

function extractAirlineName(flightNumber: string): string {
  const airlineCode = flightNumber.replace(/\d.*/, '');
  return AIRLINE_MAPPINGS[airlineCode] || `${airlineCode} Airlines`;
}

function isFlightNumber(text: string): boolean {
  return extractFlightNumber(text) !== null;
}

function isCancelled(lines: string[]): boolean {
  return lines.some(line => line.toUpperCase().includes('CANCEL'));
}

function extractPhoneNumber(text: string): string | null {
  const phoneMatch = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
  return phoneMatch ? phoneMatch[0] : null;
}

function hasFlightInLine(text: string): boolean {
  // Check if line contains a flight number anywhere
  return /[A-Z]{2,3}\d{1,4}[A-Z]?/i.test(text);
}

function parseScheduleBlock(
  lines: string[],
  blockIndex: number
): ParsedScheduleRun | null {
  if (lines.length < 6) return null;

  try {
    const id = lines[0]?.trim() || `run-${blockIndex}`;
    const rawTime = lines[1]?.trim() || '';
    const thirdLine = lines[2]?.trim() || '';
    const fourthLine = lines[3]?.trim() || '';
    const passengerInfo = lines[4]?.trim() || '';
    const locationInfo = lines[5]?.trim() || '';
    const passengerCount = lines[6]?.trim() || '';
    const price = lines[7]?.trim() || '';

    const time = normalizeTime(rawTime);

    // Check for cancellation
    const cancelled = isCancelled(lines);

    // Extract phone number if present
    const phoneNumber = extractPhoneNumber(lines.join(' '));

    // Determine if this is a pickup or dropoff - improved logic
    let isPickup = false;

    // Check if third line is a clear flight number
    if (isFlightNumber(thirdLine)) {
      isPickup = true;
    } else if (hasFlightInLine(thirdLine)) {
      // Handle cases like "WAS 12 NOON DL1466" - flight number at end
      isPickup = true;
    } else {
      // If no flight number in third line, it's likely a dropoff (location first)
      isPickup = false;
    }

    let flightNumber = '';
    let airline = '';
    let departure = '';
    let arrival = '';
    let pickupLocation = '';
    let dropoffLocation = '';

    if (isPickup) {
      // Pickup from airport: flight number first, then airport code
      flightNumber = extractFlightNumber(thirdLine) || '';
      airline = extractAirlineName(flightNumber);
      const airportCode = extractAirportCode(fourthLine);
      departure = airportCode; // Coming from this airport
      arrival = airportCode; // Same airport for pickup
      pickupLocation = airportCode;
      dropoffLocation = locationInfo;
    } else {
      // Dropoff to airport: location first, then flight info
      const airportCode = extractAirportCode(fourthLine);
      flightNumber = extractFlightNumber(fourthLine) || '';
      airline = extractAirlineName(flightNumber) || 'Unknown Airline';
      departure = airportCode;
      arrival = airportCode;
      pickupLocation = thirdLine; // The location mentioned first
      dropoffLocation = airportCode;
    }

    // Enhanced notes with additional info
    const notesArray = [
      passengerInfo ? `Passenger: ${passengerInfo}` : '',
      passengerCount ? `Count: ${passengerCount}` : '',
      price ? `Price: ${price}` : '',
      phoneNumber ? `Phone: ${phoneNumber}` : '',
      cancelled ? 'CANCELLED' : '',
      `Original ID: ${id}`,
    ].filter(Boolean);

    const notes = notesArray.join(' | ');

    return {
      id,
      time,
      flightNumber,
      airline,
      departure,
      arrival,
      pickupLocation,
      dropoffLocation,
      type: isPickup ? 'pickup' : 'dropoff',
      passengerInfo,
      passengerCount,
      price,
      notes,
    };
  } catch (error) {
    console.error(`Error parsing schedule block ${blockIndex}:`, error);
    return null;
  }
}

export function parseScheduleMessage(message: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const runs: ParsedScheduleRun[] = [];

  if (!message?.trim()) {
    return {
      success: false,
      runs: [],
      errors: ['Empty message provided'],
      warnings: [],
    };
  }

  try {
    // Split message into blocks (each run is separated by multiple newlines or specific patterns)
    const lines = message
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      return {
        success: false,
        runs: [],
        errors: ['No valid lines found in message'],
        warnings: [],
      };
    }

    // Group lines into blocks - each block represents one run
    const blocks: string[][] = [];
    let currentBlock: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line looks like the start of a new block (ID pattern or ASAP)
      if (
        (line.match(/^\d+\*?\d*.*SUV|EXEC|SEDAN/i) || line.match(/^ASAP$/i)) &&
        currentBlock.length > 0
      ) {
        blocks.push([...currentBlock]);
        currentBlock = [line];
      } else {
        currentBlock.push(line);
      }
    }

    // Don't forget the last block
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    // Parse each block
    blocks.forEach((block, index) => {
      if (block.length < 6) {
        warnings.push(
          `Block ${index + 1} has insufficient lines (${block.length} < 6)`
        );
        return;
      }

      const parsedRun = parseScheduleBlock(block, index);
      if (parsedRun) {
        runs.push(parsedRun);
      } else {
        errors.push(`Failed to parse block ${index + 1}`);
      }
    });

    return {
      success: runs.length > 0,
      runs,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      runs: [],
      errors: [
        `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      warnings: [],
    };
  }
}

export function convertParsedRunToForm(
  parsedRun: ParsedScheduleRun,
  baseDate: string = ''
): NewRunForm {
  // Convert time to datetime-local format
  const today = baseDate || new Date().toISOString().split('T')[0];
  let scheduledTime = '';

  if (parsedRun.time) {
    try {
      // Handle ASAP - set to current time
      if (parsedRun.time.toUpperCase() === 'ASAP') {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        scheduledTime = `${today}T${hours}:${minutes}`;
      } else {
        // Parse time like "11:00 AM" and convert to 24-hour format
        const timeMatch = parsedRun.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let [, hours, minutes, period] = timeMatch;
          let hour24 = parseInt(hours, 10);

          if (period.toUpperCase() === 'PM' && hour24 !== 12) {
            hour24 += 12;
          } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
            hour24 = 0;
          }

          scheduledTime = `${today}T${hour24.toString().padStart(2, '0')}:${minutes}`;
        }
      }
    } catch (error) {
      console.error('Error converting time:', error);
    }
  }

  return {
    flightNumber: parsedRun.flightNumber,
    airline: parsedRun.airline,
    departure: parsedRun.departure,
    arrival: parsedRun.arrival,
    pickupLocation: parsedRun.pickupLocation,
    dropoffLocation: parsedRun.dropoffLocation,
    scheduledTime,
    type: parsedRun.type,
    notes: parsedRun.notes,
  };
}
