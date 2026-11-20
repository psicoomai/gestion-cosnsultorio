import "server-only";
import type { InStatement, Transaction } from "@libsql/client";
import { db, num, numOrNull, str } from "@/lib/db";
import { newCardCode, newCardToken, normalizeCardCode } from "@/lib/codes";
import { applyStamps, cooldownRemainingMinutes, pointsForPurchase } from "@/lib/stamps";
import { APP_TIMEZONE, dayKey, startOfDay } from "@/lib/time";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type CatalogItem = { id: number; title: string; cost: number; active: boolean };

export type Settings = {
  businessName: string;
  rewardTerms: string;
  stampsEnabled: boolean;
  /** Sellos para completar la tarjeta y ganar la recompensa. */
  stampsRequired: number;
  /** Recompensa al completar la tarjeta de sellos. */
  rewardTitle: string;
  pointsEnabled: boolean;
  welcomeStamps: number;
  cooldownMinutes: number;
  /** Pesos de compra necesarios para ganar `earnPoints` puntos. */
  earnAmount: number;
  earnPoints: number;
  /** Catálogo de premios por puntos (solo los activos), del más barato al más caro. */
  catalog: CatalogItem[];
};

export type Customer = {
  id: number;
  token: string;
  code: string;
  name: string;
  phone: string;
  /** Cumpleaños "MM-DD" (opcional). */
  birthday: string | null;
  stamps: number;
  totalStamps: number;
  points: number;
  totalPoints: number;
  createdAt: number;
  lastStampAt: number | null;
  lastVisitAt: number | null;
};

export type Reward = {
  id: number;
  customerId: number;
  source: "stamps" | "points";
  title: string;
  pointsCost: number | null;
  earnedAt: number;
  redeemedAt: number | null;
  redeemedByName: string | null;
};

export type ActivityType =
  | "join"
  | "stamp"
  | "unstamp"
  | "reward_earned"
  | "reward_redeemed"
  | "points_earned"
  | "points_redeemed"
  | "points_removed";

export type Activity = {
  id: number;
  customerId: number;
  customerName: string;
  staffName: string | null;
  type: ActivityType;
  amount: number;
  purchaseCents: number | null;
  detail: string | null;
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Mapeo de filas
// ---------------------------------------------------------------------------

function rowToCustomer(row: Record<string, unknown>): Customer {
  return {
    id: num(row.id),
    token: str(row.token),
    code: str(row.code),
    name: str(row.name),
    phone: str(row.phone),
    birthday: row.birthday ? str(row.birthday) : null,
    stamps: num(row.stamps),
    totalStamps: num(row.total_stamps),
    points: num(row.points),
    totalPoints: num(row.total_points),
    createdAt: num(row.created_at),
    lastStampAt: numOrNull(row.last_stamp_at),
    lastVisitAt: numOrNull(row.last_visit_at),
  };
}

function rowToReward(row: Record<string, unknown>): Reward {
  return {
    id: num(row.id),
    customerId: num(row.customer_id),
    source: str(row.source) === "points" ? "points" : "stamps",
    title: str(row.title),
    pointsCost: numOrNull(row.points_cost),
    earnedAt: num(row.earned_at),
    redeemedAt: numOrNull(row.redeemed_at),
    redeemedByName: row.redeemed_by_name ? str(row.redeemed_by_name) : null,
  };
}

function rowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: num(row.id),
    customerId: num(row.customer_id),
    customerName: str(row.customer_name),
    staffName: row.staff_name ? str(row.staff_name) : null,
    type: str(row.type) as ActivityType,
    amount: num(row.amount),
    purchaseCents: numOrNull(row.purchase_cents),
    detail: row.detail ? str(row.detail) : null,
    createdAt: num(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Ajustes del programa
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const client = await db();
  const [settingsResult, catalogResult] = await client.batch(
    ["SELECT * FROM settings WHERE id = 1", "SELECT * FROM point_rewards WHERE active = 1 ORDER BY cost, id"],
    "read"
  );
  const row = settingsResult.rows[0];
  return {
    businessName: str(row?.business_name) || "Abanico",
    rewardTerms: str(row?.reward_terms),
    stampsEnabled: num(row?.stamps_enabled) === 1,
    stampsRequired: num(row?.stamps_required) || 10,
    rewardTitle: str(row?.reward_title) || "Un producto de cortesía",
    pointsEnabled: num(row?.points_enabled) === 1,
    welcomeStamps: num(row?.welcome_stamps),
    cooldownMinutes: num(row?.cooldown_minutes),
    earnAmount: num(row?.earn_amount) || 10,
    earnPoints: num(row?.earn_points) || 1,
    catalog: catalogResult.rows.map((r) => ({
      id: num(r.id),
      title: str(r.title),
      cost: num(r.cost),
      active: num(r.active) === 1,
    })),
  };
}

export type ProgramInput = {
  businessName: string;
  rewardTerms: string;
  stampsEnabled: boolean;
  stampsRequired: number;
  rewardTitle: string;
  pointsEnabled: boolean;
  welcomeStamps: number;
  cooldownMinutes: number;
  earnAmount: number;
  earnPoints: number;
};

export async function saveProgram(input: ProgramInput): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `UPDATE settings SET business_name = ?, reward_terms = ?, stamps_enabled = ?, stamps_required = ?,
            reward_title = ?, points_enabled = ?, welcome_stamps = ?, cooldown_minutes = ?, earn_amount = ?,
            earn_points = ?, updated_at = ?
          WHERE id = 1`,
    args: [
      input.businessName,
      input.rewardTerms,
      input.stampsEnabled ? 1 : 0,
      input.stampsRequired,
      input.rewardTitle,
      input.pointsEnabled ? 1 : 0,
      input.welcomeStamps,
      input.cooldownMinutes,
      input.earnAmount,
      input.earnPoints,
      Date.now(),
    ],
  });
}

export async function setBusinessName(name: string): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE settings SET business_name = ?, updated_at = ? WHERE id = 1",
    args: [name, Date.now()],
  });
}

export async function listCatalog(): Promise<CatalogItem[]> {
  const client = await db();
  const result = await client.execute("SELECT * FROM point_rewards ORDER BY active DESC, cost, id");
  return result.rows.map((r) => ({ id: num(r.id), title: str(r.title), cost: num(r.cost), active: num(r.active) === 1 }));
}

export async function addCatalogItem(title: string, cost: number): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "INSERT INTO point_rewards (title, cost, created_at) VALUES (?, ?, ?)",
    args: [title, cost, Date.now()],
  });
}

export async function updateCatalogItem(id: number, input: { title: string; cost: number; active: boolean }): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE point_rewards SET title = ?, cost = ?, active = ? WHERE id = ?",
    args: [input.title, input.cost, input.active ? 1 : 0, id],
  });
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export async function getCustomerByToken(token: string): Promise<Customer | null> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM customers WHERE token = ?", args: [token] });
  return result.rows[0] ? rowToCustomer(result.rows[0]) : null;
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM customers WHERE id = ?", args: [id] });
  return result.rows[0] ? rowToCustomer(result.rows[0]) : null;
}

export type NewCustomerResult = { ok: true; customer: Customer } | { ok: false; reason: "phone_taken" };

/** Da de alta a un cliente con su tarjeta nueva (y los sellos de bienvenida, si hay). */
export async function createCustomer(input: {
  name: string;
  phone: string;
  birthday: string | null;
}): Promise<NewCustomerResult> {
  const client = await db();
  const settings = await getSettings();
  const now = Date.now();

  for (let attempt = 0; attempt < 5; attempt++) {
    const tx = await client.transaction("write");
    try {
      const taken = await tx.execute({ sql: "SELECT 1 FROM customers WHERE phone = ?", args: [input.phone] });
      if (taken.rows.length > 0) {
        await tx.rollback();
        return { ok: false, reason: "phone_taken" };
      }
      const code = newCardCode();
      const codeTaken = await tx.execute({ sql: "SELECT 1 FROM customers WHERE code = ?", args: [code] });
      if (codeTaken.rows.length > 0) {
        await tx.rollback();
        continue;
      }
      const inserted = await tx.execute({
        sql: "INSERT INTO customers (token, code, name, phone, birthday, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [newCardToken(), code, input.name, input.phone, input.birthday, now],
      });
      const customerId = num(inserted.lastInsertRowid);
      await logActivity(tx, { customerId, staffId: null, type: "join", now });
      if (settings.stampsEnabled && settings.welcomeStamps > 0) {
        await addStampsInTx(tx, customerId, null, settings.welcomeStamps, settings, now);
      }
      const created = await tx.execute({ sql: "SELECT * FROM customers WHERE id = ?", args: [customerId] });
      await tx.commit();
      return { ok: true, customer: rowToCustomer(created.rows[0]) };
    } catch (error) {
      if (!tx.closed) await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  }
  throw new Error("No se pudo generar un código de tarjeta único.");
}

export async function updateCustomer(
  id: number,
  input: { name: string; phone: string; birthday: string | null }
): Promise<{ ok: true } | { ok: false; reason: "phone_taken" }> {
  const client = await db();
  const taken = await client.execute({
    sql: "SELECT 1 FROM customers WHERE phone = ? AND id <> ?",
    args: [input.phone, id],
  });
  if (taken.rows.length > 0) return { ok: false, reason: "phone_taken" };
  await client.execute({
    sql: "UPDATE customers SET name = ?, phone = ?, birthday = ? WHERE id = ?",
    args: [input.name, input.phone, input.birthday, id],
  });
  return { ok: true };
}

export async function deleteCustomer(id: number): Promise<void> {
  const client = await db();
  await client.batch(
    [
      { sql: "DELETE FROM activity WHERE customer_id = ?", args: [id] },
      { sql: "DELETE FROM rewards WHERE customer_id = ?", args: [id] },
      { sql: "DELETE FROM customers WHERE id = ?", args: [id] },
    ],
    "write"
  );
}

/** Busca por nombre, teléfono o código de tarjeta. */
export async function searchCustomers(query: string, limit = 50, offset = 0): Promise<Customer[]> {
  const client = await db();
  const q = query.trim().slice(0, 60);
  if (!q) {
    const result = await client.execute({
      sql: "SELECT * FROM customers ORDER BY COALESCE(last_visit_at, created_at) DESC LIMIT ? OFFSET ?",
      args: [limit, offset],
    });
    return result.rows.map(rowToCustomer);
  }
  const digits = q.replace(/\D/g, "");
  const code = normalizeCardCode(q);
  const result = await client.execute({
    sql: `SELECT * FROM customers
          WHERE name LIKE ? ESCAPE '\\'
             OR (length(?) >= 3 AND phone LIKE ?)
             OR (length(?) = 6 AND code = ?)
          ORDER BY COALESCE(last_visit_at, created_at) DESC
          LIMIT ? OFFSET ?`,
    args: [`%${q.replace(/[\\%_]/g, "\\$&")}%`, digits, `%${digits}%`, code, code, limit, offset],
  });
  return result.rows.map(rowToCustomer);
}

export async function countCustomers(): Promise<number> {
  const client = await db();
  const result = await client.execute("SELECT COUNT(*) AS n FROM customers");
  return num(result.rows[0]?.n);
}

export async function allCustomersForExport() {
  const client = await db();
  const result = await client.execute(`
    SELECT c.*,
      (SELECT COUNT(*) FROM rewards r WHERE r.customer_id = c.id AND r.source = 'stamps') AS rewards_earned,
      (SELECT COUNT(*) FROM rewards r WHERE r.customer_id = c.id AND r.redeemed_at IS NOT NULL) AS rewards_redeemed,
      (SELECT COALESCE(SUM(a.purchase_cents), 0) FROM activity a WHERE a.customer_id = c.id) AS purchases_cents
    FROM customers c ORDER BY c.created_at`);
  return result.rows.map((row) => ({
    ...rowToCustomer(row),
    rewardsEarned: num(row.rewards_earned),
    rewardsRedeemed: num(row.rewards_redeemed),
    purchasesCents: num(row.purchases_cents),
  }));
}

// ---------------------------------------------------------------------------
// Sellos, puntos y premios
// ---------------------------------------------------------------------------

async function logActivity(
  tx: Transaction,
  entry: {
    customerId: number;
    staffId: number | null;
    type: ActivityType;
    amount?: number;
    purchaseCents?: number | null;
    detail?: string | null;
    now: number;
  }
) {
  await tx.execute({
    sql: `INSERT INTO activity (customer_id, staff_id, type, amount, purchase_cents, detail, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      entry.customerId,
      entry.staffId,
      entry.type,
      entry.amount ?? 0,
      entry.purchaseCents ?? null,
      entry.detail ?? null,
      entry.now,
    ],
  });
}

async function addStampsInTx(
  tx: Transaction,
  customerId: number,
  staffId: number | null,
  amount: number,
  settings: Settings,
  now: number
): Promise<{ stamps: number; rewardsEarned: number }> {
  const current = await tx.execute({ sql: "SELECT stamps FROM customers WHERE id = ?", args: [customerId] });
  const result = applyStamps(num(current.rows[0]?.stamps), amount, settings.stampsRequired);
  await tx.execute({
    sql: `UPDATE customers SET stamps = ?, total_stamps = total_stamps + ?, last_stamp_at = ?, last_visit_at = ?
          WHERE id = ?`,
    args: [result.stamps, amount, now, now, customerId],
  });
  await logActivity(tx, { customerId, staffId, type: "stamp", amount, now });
  for (let i = 0; i < result.rewardsEarned; i++) {
    await tx.execute({
      sql: "INSERT INTO rewards (customer_id, source, title, earned_at) VALUES (?, 'stamps', ?, ?)",
      args: [customerId, settings.rewardTitle, now],
    });
    await logActivity(tx, { customerId, staffId, type: "reward_earned", amount: 1, detail: settings.rewardTitle, now });
  }
  return result;
}

export type VisitOutcome =
  | { ok: true; stamps: number | null; rewardsEarned: number; pointsAdded: number; points: number }
  | { ok: false; reason: "not_found" | "nothing" }
  | { ok: false; reason: "cooldown"; minutes: number };

/**
 * Registra una compra: suma sellos (si el programa de sellos está activo) y
 * puntos según el monto (si el de puntos está activo), todo en una sola
 * transacción.
 */
export async function recordVisit(input: {
  customerId: number;
  staffId: number;
  stamps: number;
  purchaseCents: number | null;
}): Promise<VisitOutcome> {
  const client = await db();
  const settings = await getSettings();
  const now = Date.now();
  const stamps = settings.stampsEnabled ? input.stamps : 0;
  const points =
    settings.pointsEnabled && input.purchaseCents
      ? pointsForPurchase(input.purchaseCents, settings.earnAmount, settings.earnPoints)
      : 0;
  if (stamps <= 0 && points <= 0) return { ok: false, reason: "nothing" };

  const tx = await client.transaction("write");
  try {
    const found = await tx.execute({ sql: "SELECT * FROM customers WHERE id = ?", args: [input.customerId] });
    if (!found.rows[0]) {
      await tx.rollback();
      return { ok: false, reason: "not_found" };
    }
    const customer = rowToCustomer(found.rows[0]);
    if (stamps > 0) {
      const wait = cooldownRemainingMinutes(customer.lastStampAt, settings.cooldownMinutes, now);
      if (wait > 0) {
        await tx.rollback();
        return { ok: false, reason: "cooldown", minutes: wait };
      }
    }

    let stampResult: { stamps: number; rewardsEarned: number } | null = null;
    if (stamps > 0) stampResult = await addStampsInTx(tx, customer.id, input.staffId, stamps, settings, now);

    if (points > 0) {
      await tx.execute({
        sql: "UPDATE customers SET points = points + ?, total_points = total_points + ?, last_visit_at = ? WHERE id = ?",
        args: [points, points, now, customer.id],
      });
      await logActivity(tx, {
        customerId: customer.id,
        staffId: input.staffId,
        type: "points_earned",
        amount: points,
        purchaseCents: input.purchaseCents,
        now,
      });
    }

    await tx.commit();
    return {
      ok: true,
      stamps: stampResult ? stampResult.stamps : null,
      rewardsEarned: stampResult?.rewardsEarned ?? 0,
      pointsAdded: points,
      points: customer.points + points,
    };
  } catch (error) {
    if (!tx.closed) await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

/** Quita un sello de la tarjeta actual (para corregir un error). */
export async function removeStamp(customerId: number, staffId: number): Promise<boolean> {
  return correction(customerId, staffId, "unstamp", 1);
}

/** Resta puntos del saldo (para corregir un error). */
export async function removePoints(customerId: number, staffId: number, amount: number): Promise<boolean> {
  return correction(customerId, staffId, "points_removed", amount);
}

async function correction(
  customerId: number,
  staffId: number,
  type: "unstamp" | "points_removed",
  amount: number
): Promise<boolean> {
  const client = await db();
  const now = Date.now();
  const tx = await client.transaction("write");
  try {
    const sql =
      type === "unstamp"
        ? "UPDATE customers SET stamps = stamps - ?, total_stamps = MAX(total_stamps - ?, 0) WHERE id = ? AND stamps >= ?"
        : "UPDATE customers SET points = points - ?, total_points = MAX(total_points - ?, 0) WHERE id = ? AND points >= ?";
    const updated = await tx.execute({ sql, args: [amount, amount, customerId, amount] });
    if (updated.rowsAffected === 0) {
      await tx.rollback();
      return false;
    }
    await logActivity(tx, { customerId, staffId, type, amount, now });
    await tx.commit();
    return true;
  } catch (error) {
    if (!tx.closed) await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

export async function getRewards(customerId: number): Promise<Reward[]> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT r.*, s.name AS redeemed_by_name FROM rewards r
          LEFT JOIN staff s ON s.id = r.redeemed_by
          WHERE r.customer_id = ?
          ORDER BY r.redeemed_at IS NOT NULL, r.earned_at DESC, r.id DESC`,
    args: [customerId],
  });
  return result.rows.map(rowToReward);
}

/** Marca un premio ganado con sellos como canjeado. false si ya estaba canjeado o no existe. */
export async function redeemStampReward(rewardId: number, customerId: number, staffId: number): Promise<boolean> {
  const client = await db();
  const now = Date.now();
  const tx = await client.transaction("write");
  try {
    const reward = await tx.execute({
      sql: "SELECT title FROM rewards WHERE id = ? AND customer_id = ? AND source = 'stamps' AND redeemed_at IS NULL",
      args: [rewardId, customerId],
    });
    if (!reward.rows[0]) {
      await tx.rollback();
      return false;
    }
    await tx.execute({
      sql: "UPDATE rewards SET redeemed_at = ?, redeemed_by = ? WHERE id = ?",
      args: [now, staffId, rewardId],
    });
    await tx.execute({ sql: "UPDATE customers SET last_visit_at = ? WHERE id = ?", args: [now, customerId] });
    await logActivity(tx, {
      customerId,
      staffId,
      type: "reward_redeemed",
      amount: 1,
      detail: str(reward.rows[0].title),
      now,
    });
    await tx.commit();
    return true;
  } catch (error) {
    if (!tx.closed) await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

export type PointsRedeemOutcome =
  | { ok: true; title: string; points: number }
  | { ok: false; reason: "not_found" | "insufficient" | "inactive" };

/** Cambia puntos por un premio del catálogo. */
export async function redeemWithPoints(
  customerId: number,
  itemId: number,
  staffId: number
): Promise<PointsRedeemOutcome> {
  const client = await db();
  const now = Date.now();
  const tx = await client.transaction("write");
  try {
    const itemResult = await tx.execute({ sql: "SELECT * FROM point_rewards WHERE id = ?", args: [itemId] });
    const customerResult = await tx.execute({ sql: "SELECT points FROM customers WHERE id = ?", args: [customerId] });
    const item = itemResult.rows[0];
    const customer = customerResult.rows[0];
    if (!item || !customer) {
      await tx.rollback();
      return { ok: false, reason: "not_found" };
    }
    if (num(item.active) !== 1) {
      await tx.rollback();
      return { ok: false, reason: "inactive" };
    }
    const cost = num(item.cost);
    const updated = await tx.execute({
      sql: "UPDATE customers SET points = points - ?, last_visit_at = ? WHERE id = ? AND points >= ?",
      args: [cost, now, customerId, cost],
    });
    if (updated.rowsAffected === 0) {
      await tx.rollback();
      return { ok: false, reason: "insufficient" };
    }
    const title = str(item.title);
    await tx.execute({
      sql: `INSERT INTO rewards (customer_id, source, title, points_cost, earned_at, redeemed_at, redeemed_by)
            VALUES (?, 'points', ?, ?, ?, ?, ?)`,
      args: [customerId, title, cost, now, now, staffId],
    });
    await logActivity(tx, { customerId, staffId, type: "points_redeemed", amount: cost, detail: title, now });
    await tx.commit();
    return { ok: true, title, points: num(customer.points) - cost };
  } catch (error) {
    if (!tx.closed) await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

export async function getCustomerActivity(customerId: number, limit = 30): Promise<Activity[]> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT a.*, c.name AS customer_name, s.name AS staff_name FROM activity a
          JOIN customers c ON c.id = a.customer_id
          LEFT JOIN staff s ON s.id = a.staff_id
          WHERE a.customer_id = ?
          ORDER BY a.created_at DESC, a.id DESC LIMIT ?`,
    args: [customerId, limit],
  });
  return result.rows.map(rowToActivity);
}

// ---------------------------------------------------------------------------
// Estadísticas del panel
// ---------------------------------------------------------------------------

/** Días sin visitas para considerar que un cliente "no ha vuelto". */
export const INACTIVE_DAYS = 21;

export type DashboardStats = {
  customers: number;
  newCustomers7d: number;
  visitsToday: number;
  stampsToday: number;
  stamps7d: number;
  pointsGiven7d: number;
  purchases7dCents: number;
  rewardsPending: number;
  rewardsRedeemed30d: number;
  returningRate30d: number | null;
  daily: { day: string; label: string; visits: number }[];
  recent: Activity[];
  closeToReward: Customer[];
  topCustomers: (Customer & { visitDays: number })[];
  inactive: Customer[];
  birthdaysThisMonth: Customer[];
};

const VISIT_TYPES = "('stamp', 'points_earned', 'reward_redeemed', 'points_redeemed')";

export async function getDashboardStats(): Promise<DashboardStats> {
  const client = await db();
  const settings = await getSettings();
  const now = Date.now();
  const today = startOfDay(now);
  const sevenDaysAgo = startOfDay(now, 6);
  const fourteenDaysAgo = startOfDay(now, 13);
  const thirtyDaysAgo = startOfDay(now, 29);
  const month = dayKey(now).slice(5, 7);
  // Para agrupar por día local en SQL: desplazamiento de la medianoche local respecto a UTC.
  const dayShift = ((today % 86_400_000) + 86_400_000) % 86_400_000;
  const localDay = `((created_at - ${dayShift}) / 86400000)`;

  // Clientes a 1 o 2 sellos de completar la tarjeta.
  const closeStatement: InStatement = settings.stampsEnabled
    ? {
        sql: "SELECT * FROM customers WHERE stamps >= ? ORDER BY stamps DESC, last_visit_at DESC LIMIT 6",
        args: [Math.max(1, settings.stampsRequired - 2)],
      }
    : "SELECT * FROM customers WHERE 0";

  const [totals, daily, recent, close, returning, top, inactive, birthdays] = await client.batch(
    [
      {
        sql: `SELECT
          (SELECT COUNT(*) FROM customers) AS customers,
          (SELECT COUNT(*) FROM customers WHERE created_at >= ?) AS new_customers,
          (SELECT COUNT(DISTINCT customer_id) FROM activity WHERE type IN ${VISIT_TYPES} AND created_at >= ?) AS visits_today,
          (SELECT COALESCE(SUM(amount), 0) FROM activity WHERE type = 'stamp' AND created_at >= ?) AS stamps_today,
          (SELECT COALESCE(SUM(amount), 0) FROM activity WHERE type = 'stamp' AND created_at >= ?) AS stamps_7d,
          (SELECT COALESCE(SUM(amount), 0) FROM activity WHERE type = 'points_earned' AND created_at >= ?) AS points_7d,
          (SELECT COALESCE(SUM(purchase_cents), 0) FROM activity WHERE created_at >= ?) AS purchases_7d,
          (SELECT COUNT(*) FROM rewards WHERE source = 'stamps' AND redeemed_at IS NULL) AS rewards_pending,
          (SELECT COUNT(*) FROM rewards WHERE redeemed_at >= ?) AS rewards_redeemed`,
        args: [sevenDaysAgo, today, today, sevenDaysAgo, sevenDaysAgo, sevenDaysAgo, thirtyDaysAgo],
      },
      {
        sql: `SELECT customer_id, created_at FROM activity WHERE type IN ${VISIT_TYPES} AND created_at >= ?`,
        args: [fourteenDaysAgo],
      },
      {
        sql: `SELECT a.*, c.name AS customer_name, s.name AS staff_name FROM activity a
              JOIN customers c ON c.id = a.customer_id
              LEFT JOIN staff s ON s.id = a.staff_id
              WHERE a.type <> 'reward_earned'
              ORDER BY a.created_at DESC, a.id DESC LIMIT 12`,
        args: [],
      },
      closeStatement,
      {
        // De los clientes que vinieron en los últimos 30 días, cuántos vinieron en más de un día distinto.
        sql: `SELECT COUNT(*) AS active, COUNT(CASE WHEN days > 1 THEN 1 END) AS repeat_visitors
              FROM (SELECT customer_id, COUNT(DISTINCT ${localDay}) AS days FROM activity
                    WHERE type IN ${VISIT_TYPES} AND created_at >= ? GROUP BY customer_id)`,
        args: [thirtyDaysAgo],
      },
      {
        sql: `SELECT c.*, v.days AS visit_days FROM customers c
              JOIN (SELECT customer_id, COUNT(DISTINCT ${localDay}) AS days FROM activity
                    WHERE type IN ${VISIT_TYPES} GROUP BY customer_id) v ON v.customer_id = c.id
              ORDER BY v.days DESC, c.total_stamps DESC, c.total_points DESC LIMIT 5`,
        args: [],
      },
      {
        sql: `SELECT * FROM customers WHERE last_visit_at IS NOT NULL AND last_visit_at < ?
              ORDER BY last_visit_at DESC LIMIT 8`,
        args: [startOfDay(now, INACTIVE_DAYS)],
      },
      {
        sql: "SELECT * FROM customers WHERE substr(birthday, 1, 2) = ? ORDER BY birthday LIMIT 20",
        args: [month],
      },
    ],
    "read"
  );

  const t = totals.rows[0];
  const perDay = new Map<string, Set<number>>();
  for (const row of daily.rows) {
    const key = dayKey(num(row.created_at));
    if (!perDay.has(key)) perDay.set(key, new Set());
    perDay.get(key)!.add(num(row.customer_id));
  }
  const dayLabel = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", timeZone: APP_TIMEZONE });
  const days: DashboardStats["daily"] = [];
  for (let i = 13; i >= 0; i--) {
    const noon = startOfDay(now, i) + 12 * 3600_000;
    const key = dayKey(noon);
    days.push({ day: key, label: dayLabel.format(noon), visits: perDay.get(key)?.size ?? 0 });
  }

  const active = num(returning.rows[0]?.active);
  return {
    customers: num(t.customers),
    newCustomers7d: num(t.new_customers),
    visitsToday: num(t.visits_today),
    stampsToday: num(t.stamps_today),
    stamps7d: num(t.stamps_7d),
    pointsGiven7d: num(t.points_7d),
    purchases7dCents: num(t.purchases_7d),
    rewardsPending: num(t.rewards_pending),
    rewardsRedeemed30d: num(t.rewards_redeemed),
    returningRate30d: active > 0 ? num(returning.rows[0]?.repeat_visitors) / active : null,
    daily: days,
    recent: recent.rows.map(rowToActivity),
    closeToReward: close.rows.map(rowToCustomer),
    topCustomers: top.rows.map((row) => ({ ...rowToCustomer(row), visitDays: num(row.visit_days) })),
    inactive: inactive.rows.map(rowToCustomer),
    birthdaysThisMonth: birthdays.rows.map(rowToCustomer),
  };
}
