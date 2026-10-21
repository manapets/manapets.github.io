import { STORE, DISCOUNT_CODES } from '../config';

/** Ítem mínimo para calcular totales (compatible con CartItem). */
export interface PricedItem {
  name?: string;
  price: number;
  qty: number;
}

export interface Totals {
  subtotal: number;
  discount: number;
  code: string | null;
  total: number;
  reintegro: number;
}

export interface GoalProgress {
  target: number;
  remaining: number;
  percent: number;
  reached: boolean;
}

export interface ShippingProgress {
  freeShipping: GoalProgress;
  installments: GoalProgress;
}

/** Porcentaje entero de descuento (-24) a partir del precio anterior. */
export function discountPercent(price: number, compareAtPrice?: number | null): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** Tasa de descuento (0..1) de un código. 0 si no existe. */
export function codeDiscountRate(code?: string | null): number {
  if (!code) return 0;
  return DISCOUNT_CODES[code.trim().toUpperCase()] ?? 0;
}

/** Totales del carrito: subtotal, descuento, total y reintegro. */
export function computeTotals(items: PricedItem[], code?: string | null): Totals {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const rate = codeDiscountRate(code);
  const discount = Math.round(subtotal * rate);
  return {
    subtotal,
    discount,
    code: rate > 0 ? (code ?? '').trim().toUpperCase() : null,
    total: subtotal - discount,
    reintegro: Math.round(subtotal * STORE.reintegroRate),
  };
}

function goal(target: number, subtotal: number): GoalProgress {
  const reached = subtotal >= target;
  const remaining = Math.max(0, target - subtotal);
  const percent = Math.min(100, Math.max(0, (subtotal / target) * 100));
  return { target, remaining, percent, reached };
}

/** Progreso hacia el envío gratis y hacia las cuotas sin interés. */
export function shippingProgress(subtotal: number): ShippingProgress {
  return {
    freeShipping: goal(STORE.freeShippingGoal, subtotal),
    installments: goal(STORE.installmentsGoal, subtotal),
  };
}

/** Arma el mensaje de WhatsApp con el pedido completo. */
export function buildOrderMessage(items: PricedItem[], totals: Totals): string {
  const lines = items.map(
    (item, i) => `${i + 1}. ${item.name ?? 'Producto'} x${item.qty} — ${format(item.price * item.qty)}`,
  );
  const model = [
    STORE.whatsappGreeting.replace('{store}', STORE.name),
    '',
    ...lines,
    '',
    `Subtotal: ${format(totals.subtotal)}`,
    totals.code ? `Descuento (${totals.code}): -${format(totals.discount)}` : '',
    `Total: ${format(totals.total)}`,
    `Reintegro para tu próxima compra: ${format(totals.reintegro)}`,
  ];
  return model.filter((line) => line !== '').join('\n');
}

function format(value: number): string {
  return new Intl.NumberFormat(STORE.locale, {
    style: 'currency',
    currency: STORE.currency,
    maximumFractionDigits: 0,
  }).format(value);
}
