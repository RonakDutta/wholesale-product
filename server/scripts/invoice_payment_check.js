/**
 * Does a part payment reach the invoice?
 *
 * It did not. An order can be paid half now and half later, but the invoice
 * only ever heard about a payment once the whole amount was in, so a buyer who
 * had paid his first instalment looked, on his own bill, exactly like a buyer
 * who had paid nothing: no entry, no date, no amount, and UNPAID stamped over
 * the PDF. The order screen showed him a receipt for money the bill said had
 * never arrived.
 *
 * What has to hold:
 *   - the first instalment appears on the invoice, for the right amount
 *   - the bill says Partial, not Paid, while money is still owed
 *   - the second instalment settles it, and the two entries sum to the bill
 *   - running the reconcile again changes nothing, because it is called on
 *     every payment event and on the backfill
 *   - a payment the wholesaler recorded by hand is not counted twice
 *   - the invoice closes on its own total, not the order's, so GST rounding
 *     cannot leave a few paise owing forever
 *
 *     node scripts/invoice_payment_check.js <database>
 */
const Module = require("module");
const { Pool } = require("pg");

const DB = process.argv[2] || "qa_invpay";
const dbPath = require.resolve("../src/config/db");
const testPool = new Pool({ connectionString: `postgres://postgres@127.0.0.1:5433/${DB}` });
const stub = new Module(dbPath, null);
stub.exports = testPool;
stub.loaded = true;
require.cache[dbPath] = stub;

const orders = require("../src/controllers/orderController");
const invoiceService = require("../src/services/invoiceService");
const invoiceRepository = require("../src/repositories/invoiceRepository");
const partyService = require("../src/services/partyService");
const saleService = require("../src/services/orderSaleService");

const mk = () => {
  const r = { statusCode: 200, body: null };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  return r;
};
const call = async (fn, req) => { const r = mk(); await fn(req, r); return r; };

let fails = 0;
const check = (cond, label, v) => {
  if (!cond) fails++;
  console.log(`  ${cond ? "PASS" : "FAIL"} ${String(label).padEnd(54)} ${JSON.stringify(v ?? "")}`);
};
const q = (sql, args) => testPool.query(sql, args);
const money = (n) => Number(Number(n || 0).toFixed(2));

const stamp = Date.now();
let seq = 0;
const mkUser = async (role, phone) =>
  (await q(
    `INSERT INTO users (first_name,last_name,email,role,phone,password_hash)
     VALUES ($1,'T',$2,$3,$4,'x') RETURNING id`,
    [role === "seller" ? "Ram" : "Kishan", `${role}${stamp}${seq++}@x.local`, role, phone],
  )).rows[0].id;

(async () => {
  console.log(`\n=== invoice part payments, ${DB} ===`);
  partyService.resetPartyLink();
  saleService.resetSaleLink();

  const wid = await mkUser("seller", "9000000001");
  await q(
    `INSERT INTO wholesaler_profiles (user_id, company_name, upi_id, contact_phone, city, gstin)
     VALUES ($1,'Ram Textiles','ram@upi','9000000001','Surat','24AAAAA0000A1Z8')`,
    [wid],
  );

  const p = (await q(`INSERT INTO products (name,category) VALUES ($1,'Fabric') RETURNING id`,
    [`Cotton shirting ${stamp}`])).rows[0].id;
  const inv = (await q(
    `INSERT INTO supplier_inventory (supplier_id,product_id,price,moq,stock,status,visibility,shipping_days,unit,gst_percent)
     VALUES ($1,$2,255,1,0,'Active','public',5,'mtr',5) RETURNING id`,
    [wid, p],
  )).rows[0].id;

  // 7 metres at 255 gives an odd total on purpose, so a 50/50 split cannot
  // divide evenly and rounding has somewhere to go wrong.
  const buyer = await mkUser("buyer", "9820011223");
  const placed = await call(orders.createOrder, {
    user: { id: buyer },
    body: {
      products: [{ productId: p, inventoryId: inv, quantity: 7 }],
      deliveryAddress: { name: "Kishan Cloth House", phone: "9820011223", city: "Surat" },
      paymentPlan: "installment_50_50",
    },
  });
  const orderId = placed.body?.orderId;
  check(!!orderId, "an order was placed on the 50/50 plan", { s: placed.statusCode });

  const orderTotal = money((await q("SELECT total_amount FROM orders WHERE id=$1", [orderId])).rows[0].total_amount);

  // The invoice is raised when the order is placed, but off the request, so
  // wait for it rather than racing it.
  const invoiceOf = async () => invoiceRepository.findInvoiceByOrderId(orderId);
  const waitForInvoice = async () => {
    for (let i = 0; i < 40; i++) {
      const found = await invoiceOf();
      if (found) return found;
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  };
  let bill = await waitForInvoice();
  check(!!bill, "an invoice exists before any payment", { n: bill?.invoice_number });
  const grandTotal = money(bill?.grand_total);
  check((bill?.payments || []).length === 0, "and it shows no payments yet", {});

  const invoiceCount = async (id) =>
    Number((await q("SELECT COUNT(*)::int AS n FROM invoices WHERE order_id=$1", [id])).rows[0].n);
  check((await invoiceCount(orderId)) === 1,
    "the order has exactly one invoice", { n: await invoiceCount(orderId) });

  const paidOnBill = async () => {
    const b = await invoiceOf();
    return {
      status: String(b.payment_status || ""),
      rows: (b.payments || []).length,
      sum: money((b.payments || []).reduce((s, x) => s + Number(x.amount), 0)),
      logs: (b.logs || []).map((l) => l.action),
    };
  };

  // ---- first instalment --------------------------------------------------
  await call(orders.initiatePayment, { user: { id: buyer }, params: { orderId }, body: {} });
  const first = await call(orders.updatePaymentStatus, {
    user: { id: buyer }, params: { orderId }, body: { paymentStatus: "paid" },
  });
  check(first.statusCode === 200, "the first instalment goes through", { s: first.statusCode });
  const afterFirstOrder = (await q("SELECT amount_paid, remaining_amount, payment_status FROM orders WHERE id=$1", [orderId])).rows[0];
  check(money(afterFirstOrder.remaining_amount) > 0,
    "the order still says money is owed", { left: afterFirstOrder.remaining_amount });

  // reconcile runs in the background off the request, so drive it directly.
  await invoiceService.reconcileInvoiceForOrder(orderId);
  let onBill = await paidOnBill();
  check(onBill.rows === 1, "the part payment reached the invoice", onBill);
  check(onBill.sum === money(afterFirstOrder.amount_paid),
    "for exactly what the order says was received",
    { bill: onBill.sum, order: money(afterFirstOrder.amount_paid) });
  check(onBill.status.toLowerCase() === "partial",
    "the bill reads Partial, not Paid", { status: onBill.status });
  check(onBill.logs.includes("Payment"),
    "and the timeline has an entry for it", { logs: onBill.logs });
  check(!onBill.logs.includes("Paid"),
    "but does not claim the bill is settled", { logs: onBill.logs });

  // ---- running it again must not double count ----------------------------
  await invoiceService.reconcileInvoiceForOrder(orderId);
  await invoiceService.reconcileInvoiceForOrder(orderId);
  const repeated = await paidOnBill();
  check(repeated.rows === 1 && repeated.sum === onBill.sum,
    "reconciling again adds nothing", repeated);

  // ---- second instalment settles it --------------------------------------
  await call(orders.initiatePayment, { user: { id: buyer }, params: { orderId }, body: {} });
  const second = await call(orders.updatePaymentStatus, {
    user: { id: buyer }, params: { orderId }, body: { paymentStatus: "paid" },
  });
  check(second.statusCode === 200, "the second instalment goes through", { s: second.statusCode });
  await invoiceService.reconcileInvoiceForOrder(orderId);

  onBill = await paidOnBill();
  check(onBill.rows === 2, "the invoice now shows both payments", onBill);
  check(onBill.sum === grandTotal,
    "which add up to the bill exactly", { sum: onBill.sum, bill: grandTotal });
  check(onBill.status.toLowerCase() === "paid", "and the bill reads Paid", { status: onBill.status });
  check(onBill.logs.includes("Paid"), "the timeline records the settlement", { logs: onBill.logs });

  const finalInvoice = await invoiceOf();
  check(String(finalInvoice.invoice_status) === "Paid",
    "the document is marked Paid too", { s: finalInvoice.invoice_status });

  // The invoice closes on its own total, which need not equal the order's once
  // GST has been worked out. Settling against the order's figure is what would
  // leave a few paise owing forever.
  check(money(grandTotal - onBill.sum) === 0,
    "nothing is left owing on the bill",
    { left: money(grandTotal - onBill.sum), order: orderTotal });
  check((await invoiceCount(orderId)) === 1,
    "and still exactly one invoice after four reconciles",
    { n: await invoiceCount(orderId) });

  // ---- a hand entered payment is not billed twice ------------------------
  const buyer2 = await mkUser("buyer", "9820011224");
  const placed2 = await call(orders.createOrder, {
    user: { id: buyer2 },
    body: {
      products: [{ productId: p, inventoryId: inv, quantity: 4 }],
      deliveryAddress: { name: "Second Shop", phone: "9820011224", city: "Surat" },
      paymentPlan: "installment_50_50",
    },
  });
  const orderId2 = placed2.body.orderId;
  let bill2 = null;
  for (let i = 0; i < 40 && !bill2; i++) {
    bill2 = await invoiceRepository.findInvoiceByOrderId(orderId2);
    if (!bill2) await new Promise((r) => setTimeout(r, 100));
  }

  await call(orders.initiatePayment, { user: { id: buyer2 }, params: { orderId: orderId2 }, body: {} });
  await call(orders.updatePaymentStatus, {
    user: { id: buyer2 }, params: { orderId: orderId2 }, body: { paymentStatus: "paid" },
  });
  const paidByOrder = money((await q("SELECT amount_paid FROM orders WHERE id=$1", [orderId2])).rows[0].amount_paid);

  // The wholesaler writes the same money onto the bill himself first.
  await invoiceRepository.addPayment({
    invoiceId: bill2.id, amount: paidByOrder, paymentMethod: "Cash",
    remarks: "Entered by hand",
  });
  await invoiceService.reconcileInvoiceForOrder(orderId2);

  const b2 = await invoiceRepository.findInvoiceByOrderId(orderId2);
  const sum2 = money((b2.payments || []).reduce((s, x) => s + Number(x.amount), 0));
  check((b2.payments || []).length === 1,
    "a payment entered by hand is not duplicated", { rows: (b2.payments || []).length });
  check(sum2 === paidByOrder, "and the total on the bill is right", { sum: sum2, paid: paidByOrder });

  // ---- a cancelled invoice is never touched ------------------------------
  await invoiceRepository.updateInvoice(b2.id, { invoice_status: "Cancelled" });
  await call(orders.initiatePayment, { user: { id: buyer2 }, params: { orderId: orderId2 }, body: {} });
  await call(orders.updatePaymentStatus, {
    user: { id: buyer2 }, params: { orderId: orderId2 }, body: { paymentStatus: "paid" },
  });
  await invoiceService.reconcileInvoiceForOrder(orderId2);
  const b3 = await invoiceRepository.findInvoiceByOrderId(orderId2);
  check(String(b3.invoice_status) === "Cancelled",
    "a cancelled bill stays cancelled", { s: b3.invoice_status });
  check((b3.payments || []).length === 1,
    "and takes on no further payments", { rows: (b3.payments || []).length });

  console.log(fails ? `\n${fails} FAILED\n` : "\nall good\n");
  await testPool.end();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("THREW", e); process.exit(1); });
