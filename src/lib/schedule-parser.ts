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
  const airlineCode = flightNumber.match(/^[A-Z]{2,3}/)?.[0];
  return airlineCode
    ? AIRLINE_MAPPINGS[airlineCode] || airlineCode
    : 'Unknown Airline';
}

function isFlightNumber(text: string): boolean {
  return FLIGHT_NUMBER_PATTERNS.some(pattern => pattern.test(text.trim()));
}

function hasFlightInLine(text: string): boolean {
  return FLIGHT_NUMBER_PATTERNS.some(pattern => pattern.test(text));
}

function isCancelled(lines: string[]): boolean {
  return lines.some(line => /cancel/i.test(line));
}

function extractPhoneNumber(text: string): string | null {
  const phoneMatch = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
  return phoneMatch ? phoneMatch[0] : null;
}

function extractPrice(lines: string[]): string {
  // Search through all lines for a price pattern
  for (const line of lines) {
    const priceMatch = line.match(/\$\d+(?:\.\d{2})?/);
    if (priceMatch) {
      return priceMatch[0];
    }
  }
  return '';
}

function parseScheduleBlock(
  lines: string[],
  blockIndex: number
): ParsedScheduleRun | null {
  if (lines.length < 5) return null; // Reduced from 6 to 5 for shorter format

  try {
    // Detect if this is a message starting with time (no run ID) or with run ID
    const firstLine = lines[0]?.trim() || '';
    const isTimeFirst = /^\d{1,2}:?\d{0,2}\s*(AM|PM)$/i.test(firstLine);

    let id: string;
    let rawTime: string;
    let thirdLine: string;
    let fourthLine: string;
    let passengerInfo: string;
    let locationInfo: string;
    let passengerCount: string;

    // Extract price by searching all lines for price pattern
    const price = extractPrice(lines);

    if (isTimeFirst) {
      // Format: Time, Flight, Airport, Passenger, etc.
      id = `run-${blockIndex}`;
      rawTime = lines[0]?.trim() || '';
      thirdLine = lines[1]?.trim() || ''; // Flight number
      fourthLine = lines[2]?.trim() || ''; // Airport code
      passengerInfo = lines[3]?.trim() || '';
      locationInfo = lines[4]?.trim() || '';
      passengerCount = lines[5]?.trim() || '';
    } else {
      // Original format: ID, Time, Flight, Airport, etc.
      id = lines[0]?.trim() || `run-${blockIndex}`;
      rawTime = lines[1]?.trim() || '';
      thirdLine = lines[2]?.trim() || '';
      fourthLine = lines[3]?.trim() || '';
      passengerInfo = lines[4]?.trim() || '';
      locationInfo = lines[5]?.trim() || '';
      passengerCount = lines[6]?.trim() || '';
    }

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

// Helper function to detect date patterns in schedule messages
function extractDateFromMessage(message: string): string | null {
  const lines = message.split('\n').map(line => line.trim());

  // Look for common date patterns
  const datePatterns = [
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/, // MM/DD/YYYY or MM-DD-YYYY
    /\b(\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/, // YYYY/MM/DD or YYYY-MM-DD
    /\b(yesterday|today|tomorrow)\b/i, // Relative dates
    /\b(\d{1,2}\/\d{1,2})\b/, // MM/DD (current year)
    /\b(\w{3,9}\s+\d{1,2})\b/, // "December 15" or "Dec 15"
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        const dateStr = match[1];

        // Handle relative dates
        if (dateStr.toLowerCase() === 'yesterday') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return yesterday.toISOString().split('T')[0];
        } else if (dateStr.toLowerCase() === 'today') {
          return new Date().toISOString().split('T')[0];
        } else if (dateStr.toLowerCase() === 'tomorrow') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow.toISOString().split('T')[0];
        }

        // Try to parse the date
        try {
          let parsedDate: Date;

          // Handle MM/DD format (assume current year)
          if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
            const [month, day] = dateStr.split('/');
            const currentYear = new Date().getFullYear();
            parsedDate = new Date(
              currentYear,
              parseInt(month, 10) - 1,
              parseInt(day, 10)
            );
          } else {
            parsedDate = new Date(dateStr);
          }

          // Validate the date
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString().split('T')[0];
          }
        } catch (error) {
          // Continue searching if this date couldn't be parsed
          continue;
        }
      }
    }
  }

  return null;
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
    // Try to extract date from the message
    const extractedDate = extractDateFromMessage(message);

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
      if (block.length < 5) {
        warnings.push(
          `Block ${index + 1} has insufficient lines (${block.length} < 5)`
        );
        return;
      }

      const parsedRun = parseScheduleBlock(block, index);
      if (parsedRun) {
        // Add extracted date to the parsed run for later use
        if (extractedDate) {
          parsedRun.notes = `${parsedRun.notes} | Detected date: ${extractedDate}`;
        }
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
  // Check if there's a detected date in the notes
  const detectedDateMatch = parsedRun.notes.match(
    /Detected date: (\d{4}-\d{2}-\d{2})/
  );
  const useDate = detectedDateMatch
    ? detectedDateMatch[1]
    : baseDate || new Date().toISOString().split('T')[0];

  let scheduledTime = '';

  if (parsedRun.time) {
    try {
      // Handle ASAP - set to current time
      if (parsedRun.time.toUpperCase() === 'ASAP') {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        scheduledTime = `${useDate}T${hours}:${minutes}`;
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

          scheduledTime = `${useDate}T${hour24.toString().padStart(2, '0')}:${minutes}`;
        }
      }
    } catch (error) {
      console.error('Error converting time:', error);
    }
  }

  // Clean price: remove $ sign and decimal places to get whole number
  let cleanPrice = '';
  if (parsedRun.price) {
    const priceMatch = parsedRun.price.match(/\$?(\d+)(?:\.\d{2})?/);
    if (priceMatch) {
      cleanPrice = priceMatch[1]; // Just the whole number part
    }
  }

  // Clean up notes to remove the detected date marker
  const cleanNotes = parsedRun.notes.replace(
    /\s*\|\s*Detected date: \d{4}-\d{2}-\d{2}/,
    ''
  );

  return {
    flightNumber: parsedRun.flightNumber,
    airline: parsedRun.airline,
    departure: parsedRun.departure,
    arrival: parsedRun.arrival,
    pickupLocation: parsedRun.pickupLocation,
    dropoffLocation: parsedRun.dropoffLocation,
    scheduledTime,
    estimatedDuration: 60, // Default 60 minutes for parsed runs
    type: parsedRun.type,
    price: cleanPrice,
    notes: cleanNotes,
  };
}

// Helper function to detect if pasted text looks like a schedule message
export function isScheduleMessage(text: string): boolean {
  if (!text || text.length < 20) {
    return false;
  }

  const lines = text.split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 4) {
    return false;
  }

  // Look for patterns that suggest it's a schedule message
  const hasFlightPattern = lines.some(line =>
    /[A-Z]{2,3}\s*\d{1,4}[A-Z]?|[A-Z]{2,3}\s*CABIN|ASAP/i.test(line)
  );
  const hasTimePattern = lines.some(line =>
    /\d{1,2}:?\d{0,2}\s*(AM|PM)|ASAP/i.test(line)
  );
  const hasVehiclePattern = lines.some(line => /SUV|EXEC|SEDAN/i.test(line));
  const hasPricePattern = lines.some(line => /\$\d+\.?\d*/i.test(line));
  const hasRunIdPattern = lines.some(line => /^\d+\*?\d*/i.test(line));
  const hasAirportPattern = lines.some(line =>
    /\b(AP|JLL|SK|DL|AA|UA)\b/i.test(line)
  );

  // Must have at least 2 of these patterns to be considered a schedule
  const patterns = [
    hasFlightPattern,
    hasTimePattern,
    hasVehiclePattern,
    hasPricePattern,
    hasRunIdPattern,
    hasAirportPattern,
  ];
  const patternCount = patterns.filter(Boolean).length;

  return patternCount >= 2;
}
