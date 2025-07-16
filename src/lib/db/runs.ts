import { type NewRunForm, type Run, type RunStatus } from '../schema';
import { getDatabase, handleDatabaseError } from './index';
import { deleteNotificationsByRunId } from './notifications';

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
  userId: string
): Promise<Run> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    const run: Run = {
      id: runId,
      userId: userId,
      ...runData,
      airline: runData.airline || '',
      status: (runData as any).status || 'scheduled', // Use provided status or default to scheduled
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    // activatedAt should only be set when explicitly activating a run, not during creation
    const activatedAt = null;

    await db.query(
      `INSERT INTO runs (
        id, user_id, flight_number, airline, departure_airport, arrival_airport,
        pickup_location, dropoff_location, scheduled_time, estimated_duration, status, type,
        price, notes, created_at, updated_at, activated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        run.id,
        run.userId,
        run.flightNumber,
        run.airline,
        run.departure,
        run.arrival,
        run.pickupLocation,
        run.dropoffLocation,
        run.scheduledTime,
        run.estimatedDuration,
        run.status,
        run.type,
        run.price,
        run.notes || null,
        now,
        now,
        activatedAt,
      ]
    );

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
        pickup_location, dropoff_location, scheduled_time, estimated_duration, actual_duration, status, type,
        price, notes, user_id, created_at, updated_at, completed_at, activated_at
      FROM runs
    `;

    const conditions: string[] = [];
    const args: any[] = [];

    // Add conditions only if they exist
    if (userId) {
      conditions.push('user_id = $' + (args.length + 1));
      args.push(userId);
    }

    if (status && Array.isArray(status) && status.length > 0) {
      const placeholders = status
        .map((_, index) => '$' + (args.length + index + 1))
        .join(',');
      conditions.push(`status IN (${placeholders})`);
      args.push(...status);
    }

    // Add WHERE clause only if we have conditions
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY and LIMIT with validated values
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;
    sql += ` LIMIT $${args.length + 1} OFFSET $${args.length + 2}`;
    args.push(limit, offset);

    const result = await db.query(sql, args);

    // Transform database rows to Run objects
    const runs: Run[] = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      flightNumber: row.flight_number,
      airline: row.airline,
      departure: row.departure_airport,
      arrival: row.arrival_airport,
      pickupLocation: row.pickup_location,
      dropoffLocation: row.dropoff_location,
      scheduledTime: row.scheduled_time,
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      status: row.status as RunStatus,
      type: row.type as 'pickup' | 'dropoff',
      price: row.price,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      activatedAt: row.activated_at,
    }));

    return runs;
  } catch (error) {
    handleDatabaseError(error, 'get runs');
    return [];
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
        pickup_location, dropoff_location, scheduled_time, estimated_duration, actual_duration, status, type,
        price, notes, user_id, created_at, updated_at, completed_at, activated_at
      FROM runs
      WHERE id = $1
    `;

    const args = [id];

    if (userId) {
      sql += ' AND user_id = $2';
      args.push(userId);
    }

    const result = await db.query(sql, args);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      flightNumber: row.flight_number,
      airline: row.airline,
      departure: row.departure_airport,
      arrival: row.arrival_airport,
      pickupLocation: row.pickup_location,
      dropoffLocation: row.dropoff_location,
      scheduledTime: row.scheduled_time,
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      status: row.status as RunStatus,
      type: row.type as 'pickup' | 'dropoff',
      price: row.price,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      activatedAt: row.activated_at,
    };
  } catch (error) {
    handleDatabaseError(error, 'get run by id');
    return null;
  }
}

// Update run
export async function updateRun(
  id: string,
  updateData: Partial<Omit<Run, 'id' | 'createdAt'>>,
  userId: string
): Promise<Run | null> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!id) {
    throw new Error('Run ID is required');
  }

  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // First, verify the run exists and belongs to the user
    const existingRun = await getRunById(id, userId);
    if (!existingRun) {
      return null; // Run doesn't exist or doesn't belong to user
    }

    const setFields: string[] = [];
    const args: any[] = [];

    // Build dynamic update query
    if (updateData.flightNumber !== undefined) {
      setFields.push(`flight_number = $${args.length + 1}`);
      args.push(updateData.flightNumber);
    }

    if (updateData.airline !== undefined) {
      setFields.push(`airline = $${args.length + 1}`);
      args.push(updateData.airline);
    }

    if (updateData.departure !== undefined) {
      setFields.push(`departure_airport = $${args.length + 1}`);
      args.push(updateData.departure);
    }

    if (updateData.arrival !== undefined) {
      setFields.push(`arrival_airport = $${args.length + 1}`);
      args.push(updateData.arrival);
    }

    if (updateData.pickupLocation !== undefined) {
      setFields.push(`pickup_location = $${args.length + 1}`);
      args.push(updateData.pickupLocation);
    }

    if (updateData.dropoffLocation !== undefined) {
      setFields.push(`dropoff_location = $${args.length + 1}`);
      args.push(updateData.dropoffLocation);
    }

    if (updateData.scheduledTime !== undefined) {
      setFields.push(`scheduled_time = $${args.length + 1}`);
      args.push(updateData.scheduledTime);
    }

    if (updateData.estimatedDuration !== undefined) {
      setFields.push(`estimated_duration = $${args.length + 1}`);
      args.push(updateData.estimatedDuration);
    }

    if (updateData.actualDuration !== undefined) {
      setFields.push(`actual_duration = $${args.length + 1}`);
      args.push(updateData.actualDuration);
    }

    if (updateData.status !== undefined) {
      setFields.push(`status = $${args.length + 1}`);
      args.push(updateData.status);
    }

    if (updateData.type !== undefined) {
      setFields.push(`type = $${args.length + 1}`);
      args.push(updateData.type);
    }

    if (updateData.price !== undefined) {
      setFields.push(`price = $${args.length + 1}`);
      args.push(updateData.price);
    }

    if (updateData.notes !== undefined) {
      setFields.push(`notes = $${args.length + 1}`);
      args.push(updateData.notes);
    }

    if (updateData.completedAt !== undefined) {
      setFields.push(`completed_at = $${args.length + 1}`);
      args.push(updateData.completedAt);
    }

    if (updateData.activatedAt !== undefined) {
      setFields.push(`activated_at = $${args.length + 1}`);
      args.push(updateData.activatedAt);
    }

    // Always update the updated_at timestamp
    setFields.push(`updated_at = $${args.length + 1}`);
    args.push(now);

    if (setFields.length === 1) {
      // Only updated_at was set, nothing to update
      return existingRun;
    }

    // Add WHERE clause with user validation
    let sql = `
      UPDATE runs 
      SET ${setFields.join(', ')}
      WHERE id = $${args.length + 1} AND user_id = $${args.length + 2}
    `;
    args.push(id, userId);

    sql += ' RETURNING *';

    const result = await db.query(sql, args);

    if (result.rows.length === 0) {
      return null; // Update failed - either run doesn't exist or user doesn't own it
    }

    const row = result.rows[0];
    const updatedRun: Run = {
      id: row.id,
      userId: row.user_id,
      flightNumber: row.flight_number,
      airline: row.airline,
      departure: row.departure_airport,
      arrival: row.arrival_airport,
      pickupLocation: row.pickup_location,
      dropoffLocation: row.dropoff_location,
      scheduledTime: row.scheduled_time,
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      status: row.status as RunStatus,
      type: row.type as 'pickup' | 'dropoff',
      price: row.price,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      activatedAt: row.activated_at,
    };

    console.log(`✅ Updated run: ${id}`);
    return updatedRun;
  } catch (error) {
    handleDatabaseError(error, 'update run');
    return null;
  }
}

// Delete run
export async function deleteRun(id: string, userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!id) {
    throw new Error('Run ID is required');
  }

  try {
    const db = getDatabase();

    // First delete related notifications (only those belonging to the user)
    await deleteNotificationsByRunId(id, userId);

    // Delete the run only if it belongs to the user
    const sql = 'DELETE FROM runs WHERE id = $1 AND user_id = $2';
    const result = await db.query(sql, [id, userId]);

    const success = result.rowCount != null && result.rowCount > 0;
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
      sql += ' WHERE user_id = $1';
      args.push(userId);
    }

    sql += ' GROUP BY status, type';

    const result = await db.query(sql, args);

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
      const count = parseInt(row.count);
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
  userId: string
): Promise<Run[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const runs: Run[] = [];

    // Start transaction
    await db.query('BEGIN TRANSACTION');

    try {
      for (const runData of runsData) {
        const runId = crypto.randomUUID();
        const run: Run = {
          id: runId,
          userId: userId,
          ...runData,
          airline: runData.airline || '',
          status: 'scheduled',
          createdAt: new Date(now),
          updatedAt: new Date(now),
        };

        await db.query(
          `INSERT INTO runs (
            id, user_id, flight_number, airline, departure_airport, arrival_airport,
            pickup_location, dropoff_location, scheduled_time, estimated_duration, status, type,
            price, notes, created_at, updated_at, activated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            run.id,
            run.userId,
            run.flightNumber,
            run.airline,
            run.departure,
            run.arrival,
            run.pickupLocation,
            run.dropoffLocation,
            run.scheduledTime,
            run.estimatedDuration,
            run.status,
            run.type,
            run.price,
            run.notes || null,
            now,
            now,
            null, // activatedAt
          ]
        );

        runs.push(run);
      }

      // Commit transaction
      await db.query('COMMIT');
      console.log(`✅ Created ${runs.length} runs in batch`);
      return runs;
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    handleDatabaseError(error, 'create runs batch');
    throw new Error('Failed to create runs batch');
  }
}
