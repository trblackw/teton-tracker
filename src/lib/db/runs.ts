import { type NewRunForm, type Run, type RunStatus } from '../schema';
import { generateUserId, getDatabase, handleDatabaseError } from './index';

export interface RunsQuery {
  userId?: string;
  status?: RunStatus[];
  limit?: number;
  offset?: number;
  orderBy?: 'scheduled_time' | 'created_at' | 'updated_at';
  orderDirection?: 'ASC' | 'DESC';
}

// Create a new run
export async function createRun(
  runData: NewRunForm,
  userId?: string
): Promise<Run> {
  try {
    const db = getDatabase();
    const currentUserId = userId || generateUserId();
    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    const run: Run = {
      id: runId,
      ...runData,
      airline: runData.airline || '',
      status: 'scheduled',
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await db.execute({
      sql: `
        INSERT INTO runs (
          id, flight_number, airline, departure_airport, arrival_airport,
          pickup_location, dropoff_location, scheduled_time, status, type,
          price, notes, user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        run.id,
        run.flightNumber,
        run.airline,
        run.departure,
        run.arrival,
        run.pickupLocation,
        run.dropoffLocation,
        run.scheduledTime,
        run.status,
        run.type,
        run.price,
        run.notes || null,
        currentUserId,
        now,
        now,
      ],
    });

    console.log(`✅ Created run: ${run.id}`);
    return run;
  } catch (error) {
    handleDatabaseError(error, 'create run');
    throw new Error('Failed to create run');
  }
}

// Get runs with optional filtering
export async function getRuns(query: RunsQuery = {}): Promise<Run[]> {
  try {
    const db = getDatabase();
    const { userId, status, limit = 50, offset = 0 } = query;

    // Handle orderBy and orderDirection with proper null-safe defaults
    const orderBy =
      query.orderBy &&
      query.orderBy !== null &&
      (query.orderBy as any) !== 'null'
        ? query.orderBy
        : 'scheduled_time';
    const orderDirection =
      query.orderDirection &&
      query.orderDirection !== null &&
      (query.orderDirection as any) !== 'null'
        ? query.orderDirection
        : 'ASC';

    // Start with base query
    let sql = `
      SELECT 
        id, flight_number, airline, departure_airport, arrival_airport,
        pickup_location, dropoff_location, scheduled_time, status, type,
        price, notes, user_id, created_at, updated_at, completed_at
      FROM runs
    `;

    const conditions: string[] = [];
    const args: any[] = [];

    // Add conditions only if they exist
    if (userId) {
      conditions.push('user_id = ?');
      args.push(userId);
    }

    if (status && Array.isArray(status) && status.length > 0) {
      const placeholders = status.map(() => '?').join(',');
      conditions.push(`status IN (${placeholders})`);
      args.push(...status);
    }

    // Add WHERE clause only if we have conditions
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY and LIMIT with validated values
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;
    sql += ` LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const result = await db.execute({ sql, args });

    const runs: Run[] = result.rows.map(row => ({
      id: row.id as string,
      flightNumber: row.flight_number as string,
      airline: (row.airline as string) || '',
      departure: row.departure_airport as string,
      arrival: row.arrival_airport as string,
      pickupLocation: row.pickup_location as string,
      dropoffLocation: row.dropoff_location as string,
      scheduledTime: row.scheduled_time as string,
      status: row.status as RunStatus,
      type: row.type as 'pickup' | 'dropoff',
      price: (row.price as string) || '0',
      notes: row.notes as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));

    console.log(`📊 Retrieved ${runs.length} runs`);
    return runs;
  } catch (error) {
    handleDatabaseError(error, 'get runs');
    return []; // Return empty array on error
  }
}

// Get a single run by ID
export async function getRunById(
  id: string,
  userId?: string
): Promise<Run | null> {
  try {
    const db = getDatabase();

    let sql = `
      SELECT 
        id, flight_number, airline, departure_airport, arrival_airport,
        pickup_location, dropoff_location, scheduled_time, status, type,
        price, notes, user_id, created_at, updated_at, completed_at
      FROM runs 
      WHERE id = ?
    `;
    const args: any[] = [id];

    if (userId) {
      sql += ' AND user_id = ?';
      args.push(userId);
    }

    const result = await db.execute({ sql, args });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      flightNumber: row.flight_number as string,
      airline: (row.airline as string) || '',
      departure: row.departure_airport as string,
      arrival: row.arrival_airport as string,
      pickupLocation: row.pickup_location as string,
      dropoffLocation: row.dropoff_location as string,
      scheduledTime: row.scheduled_time as string,
      status: row.status as RunStatus,
      type: row.type as 'pickup' | 'dropoff',
      price: (row.price as string) || '0',
      notes: row.notes as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  } catch (error) {
    handleDatabaseError(error, 'get run by ID');
    return null;
  }
}

// Update run status
export async function updateRunStatus(
  id: string,
  status: RunStatus,
  userId?: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    let sql = `
      UPDATE runs 
      SET status = ?, updated_at = ?
    `;
    const args: any[] = [status, now];

    // Set completed_at if status is completed
    if (status === 'completed') {
      sql += ', completed_at = ?';
      args.push(now);
    }

    sql += ' WHERE id = ?';
    args.push(id);

    if (userId) {
      sql += ' AND user_id = ?';
      args.push(userId);
    }

    const result = await db.execute({ sql, args });

    const success = result.rowsAffected > 0;
    if (success) {
      console.log(`✅ Updated run ${id} status to ${status}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'update run status');
    return false;
  }
}

// Update a run
export async function updateRun(
  id: string,
  runData: NewRunForm,
  userId?: string
): Promise<Run | null> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    let sql = `
      UPDATE runs 
      SET flight_number = ?, airline = ?, departure_airport = ?, arrival_airport = ?,
          pickup_location = ?, dropoff_location = ?, scheduled_time = ?, type = ?,
          price = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `;
    const args: any[] = [
      runData.flightNumber,
      runData.airline || '',
      runData.departure,
      runData.arrival,
      runData.pickupLocation,
      runData.dropoffLocation,
      runData.scheduledTime,
      runData.type,
      runData.price,
      runData.notes || '',
      now,
      id,
    ];

    if (userId) {
      sql += ' AND user_id = ?';
      args.push(userId);
    }

    const result = await db.execute({ sql, args });

    const success = result.rowsAffected > 0;
    if (success) {
      console.log(`✅ Updated run ${id}`);
      // Return the updated run
      return await getRunById(id, userId);
    }

    return null;
  } catch (error) {
    handleDatabaseError(error, 'update run');
    return null;
  }
}

// Delete a run
export async function deleteRun(id: string, userId?: string): Promise<boolean> {
  try {
    const db = getDatabase();

    let sql = 'DELETE FROM runs WHERE id = ?';
    const args: any[] = [id];

    if (userId) {
      sql += ' AND user_id = ?';
      args.push(userId);
    }

    const result = await db.execute({ sql, args });

    const success = result.rowsAffected > 0;
    if (success) {
      console.log(`🗑️ Deleted run: ${id}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete run');
    return false;
  }
}

// Get runs statistics
export async function getRunsStats(userId?: string): Promise<{
  total: number;
  byStatus: Record<RunStatus, number>;
  byType: Record<'pickup' | 'dropoff', number>;
}> {
  try {
    const db = getDatabase();

    let sql = 'SELECT status, type, COUNT(*) as count FROM runs';
    const args: any[] = [];

    if (userId) {
      sql += ' WHERE user_id = ?';
      args.push(userId);
    }

    sql += ' GROUP BY status, type';

    const result = await db.execute({ sql, args });

    const stats = {
      total: 0,
      byStatus: {
        scheduled: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
      } as Record<RunStatus, number>,
      byType: {
        pickup: 0,
        dropoff: 0,
      } as Record<'pickup' | 'dropoff', number>,
    };

    result.rows.forEach(row => {
      const count = row.count as number;
      const status = row.status as RunStatus;
      const type = row.type as 'pickup' | 'dropoff';

      stats.total += count;
      stats.byStatus[status] += count;
      stats.byType[type] += count;
    });

    return stats;
  } catch (error) {
    handleDatabaseError(error, 'get runs stats');
    return {
      total: 0,
      byStatus: { scheduled: 0, active: 0, completed: 0, cancelled: 0 },
      byType: { pickup: 0, dropoff: 0 },
    };
  }
}

// Bulk create runs (for import functionality)
export async function createRunsBatch(
  runsData: NewRunForm[],
  userId?: string
): Promise<Run[]> {
  try {
    const db = getDatabase();
    const currentUserId = userId || generateUserId();
    const now = new Date().toISOString();
    const runs: Run[] = [];

    // Start transaction
    await db.execute('BEGIN TRANSACTION');

    try {
      for (const runData of runsData) {
        const runId = crypto.randomUUID();
        const run: Run = {
          id: runId,
          ...runData,
          airline: runData.airline || '',
          status: 'scheduled',
          createdAt: new Date(now),
          updatedAt: new Date(now),
        };

        await db.execute({
          sql: `
            INSERT INTO runs (
              id, flight_number, airline, departure_airport, arrival_airport,
              pickup_location, dropoff_location, scheduled_time, status, type,
              price, notes, user_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            run.id,
            run.flightNumber,
            run.airline,
            run.departure,
            run.arrival,
            run.pickupLocation,
            run.dropoffLocation,
            run.scheduledTime,
            run.status,
            run.type,
            run.price,
            run.notes || null,
            currentUserId,
            now,
            now,
          ],
        });

        runs.push(run);
      }

      // Commit transaction
      await db.execute('COMMIT');

      console.log(`✅ Created ${runs.length} runs in batch`);
      return runs;
    } catch (error) {
      // Rollback on error
      await db.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    handleDatabaseError(error, 'create runs batch');
    throw new Error('Failed to create runs batch');
  }
}
