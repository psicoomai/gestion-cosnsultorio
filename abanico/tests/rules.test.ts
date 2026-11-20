import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBirthday, formatBirthday } from "../src/lib/birthday.ts";
import { formatCardCode, normalizeCardCode, tokenFromScan } from "../src/lib/card-code.ts";
import { formatPhone, normalizePhone } from "../src/lib/phone.ts";
import { applyStamps, cooldownRemainingMinutes, parseMoneyToCents, pointsForPurchase } from "../src/lib/stamps.ts";
import { dayKey, startOfDay } from "../src/lib/time.ts";

describe("tarjeta de sellos", () => {
  it("suma sellos sin premio mientras no se completa", () => {
    assert.deepEqual(applyStamps(0, 1, 10), { stamps: 1, rewardsEarned: 0 });
    assert.deepEqual(applyStamps(4, 3, 10), { stamps: 7, rewardsEarned: 0 });
  });

  it("al completar la tarjeta gana la recompensa y vuelve a empezar", () => {
    assert.deepEqual(applyStamps(9, 1, 10), { stamps: 0, rewardsEarned: 1 });
    assert.deepEqual(applyStamps(8, 4, 10), { stamps: 2, rewardsEarned: 1 });
  });

  it("muchos sellos de golpe pueden completar más de una tarjeta", () => {
    assert.deepEqual(applyStamps(5, 10, 6), { stamps: 3, rewardsEarned: 2 });
  });

  it("si la tarjeta se acortó, el cliente queda a un sello de completarla", () => {
    assert.deepEqual(applyStamps(15, 1, 8), { stamps: 0, rewardsEarned: 1 });
  });

  it("rechaza cantidades inválidas", () => {
    assert.throws(() => applyStamps(0, 0, 10));
    assert.throws(() => applyStamps(0, 1.5, 10));
    assert.throws(() => applyStamps(0, 1, 0));
  });

  it("respeta los minutos entre sellos", () => {
    const now = 1_000_000_000;
    assert.equal(cooldownRemainingMinutes(null, 60, now), 0);
    assert.equal(cooldownRemainingMinutes(now - 10 * 60_000, 0, now), 0);
    assert.equal(cooldownRemainingMinutes(now - 10 * 60_000, 60, now), 50);
    assert.equal(cooldownRemainingMinutes(now - 61 * 60_000, 60, now), 0);
  });
});

describe("puntos", () => {
  it("da puntos por cada monto completo", () => {
    assert.equal(pointsForPurchase(8500, 10, 1), 8); // $85 con 1 pt por $10
    assert.equal(pointsForPurchase(999, 10, 1), 0); // $9.99
    assert.equal(pointsForPurchase(10000, 1, 1), 100); // $100 con 1 pt por $1
    assert.equal(pointsForPurchase(25000, 50, 5), 25); // $250 con 5 pts por $50
  });

  it("ignora montos o reglas inválidas", () => {
    assert.equal(pointsForPurchase(0, 10, 1), 0);
    assert.equal(pointsForPurchase(-100, 10, 1), 0);
    assert.equal(pointsForPurchase(5000, 0, 1), 0);
  });

  it("lee montos en pesos", () => {
    assert.equal(parseMoneyToCents("85"), 8500);
    assert.equal(parseMoneyToCents("85.5"), 8550);
    assert.equal(parseMoneyToCents("$1,200.75"), 120075);
    assert.equal(parseMoneyToCents(" 40 "), 4000);
    assert.equal(parseMoneyToCents(""), null);
    assert.equal(parseMoneyToCents("abc"), null);
    assert.equal(parseMoneyToCents("1.234"), null);
    assert.equal(parseMoneyToCents("-5"), null);
  });
});

describe("teléfonos de México", () => {
  it("normaliza a 10 dígitos", () => {
    assert.equal(normalizePhone("55 1234 5678"), "5512345678");
    assert.equal(normalizePhone("+52 55 1234 5678"), "5512345678");
    assert.equal(normalizePhone("521 55 1234 5678"), "5512345678");
    assert.equal(normalizePhone("(33) 1234-5678"), "3312345678");
    assert.equal(normalizePhone("12345"), null);
    assert.equal(normalizePhone(""), null);
  });

  it("formatea para mostrar", () => {
    assert.equal(formatPhone("5512345678"), "55 1234 5678");
  });
});

describe("códigos de tarjeta", () => {
  it("formatea y limpia el código corto", () => {
    assert.equal(formatCardCode("K7QM4P"), "K7Q-M4P");
    assert.equal(normalizeCardCode("k7q-m4p "), "K7QM4P");
  });

  it("extrae el token del QR", () => {
    const token = "AbCdEfGhIjKlMnOpQrStUv";
    assert.equal(tokenFromScan(`https://abanico.mx/tarjeta/${token}`), token);
    assert.equal(tokenFromScan(`https://abanico.mx/tarjeta/${token}?bienvenida=1`), token);
    assert.equal(tokenFromScan(token), token);
    assert.equal(tokenFromScan("https://otro-sitio.com/promo"), null);
    assert.equal(tokenFromScan("hola"), null);
  });
});

describe("cumpleaños", () => {
  it("valida día y mes", () => {
    assert.equal(parseBirthday("14", "3"), "03-14");
    assert.equal(parseBirthday("29", "2"), "02-29");
    assert.equal(parseBirthday("", ""), null);
    assert.equal(parseBirthday("31", "4"), "invalid");
    assert.equal(parseBirthday("10", ""), "invalid");
    assert.equal(formatBirthday("03-14"), "14 de marzo");
  });
});

describe("fechas en la zona del negocio", () => {
  it("calcula la medianoche local de Ciudad de México", () => {
    // 20 nov 2026 03:00 UTC = 19 nov 21:00 en CDMX (UTC−6).
    const instant = Date.UTC(2026, 10, 20, 3, 0);
    assert.equal(dayKey(instant, "America/Mexico_City"), "2026-11-19");
    assert.equal(startOfDay(instant, 0, "America/Mexico_City"), Date.UTC(2026, 10, 19, 6, 0));
    assert.equal(startOfDay(instant, 1, "America/Mexico_City"), Date.UTC(2026, 10, 18, 6, 0));
  });
});
