const challanService = require("../services/challanService");
const pdfService = require("../services/pdfService");
const { businessId } = require("../middlewares/businessContext");

/**
 * Delivery challans.
 *
 * See challanService.js for what this document is, what it is not, and why
 * the rule behind it is expected to change.
 */

const REASONS = {
  disabled: [409, "Delivery challans are switched off."],
  notReady: [409, "This feature needs its migration run first."],
  notFound: [404, "Sale not found"],
  cancelled: [400, "A cancelled sale has nothing to send out"],
  draft: [400, "Confirm this sale before sending goods out"],
  empty: [400, "This sale has no items"],
  settled: [400, "This sale is fully paid, so raise the bill instead"],
  reason: [400, "That is not a reason we know"],
  noSale: [400, "Accept this order first, then goods can go out against it"],
};

exports.createForSale = async (req, res) => {
  const wholesalerId = businessId(req);
  const { id } = req.params;
  const { reason, reasonNote } = req.body || {};

  try {
    const result = await challanService.createChallanForSale(
      id,
      wholesalerId,
      reason || "payment_pending",
      reasonNote || null,
    );

    if (result.error) {
      const [status, message] = REASONS[result.error] || [400, "Could not make this challan"];
      return res.status(status).json({ message, code: result.error });
    }

    res.status(201).json(result.challan);
  } catch (err) {
    console.error("Error making a delivery challan:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * The same thing from the order screen.
 *
 * An accepted order has a sale behind it, and that sale is what carries the
 * goods and the money, so this delegates. A wholesaler looking at an order
 * should not have to go and find its sale first.
 */
exports.createForOrder = async (req, res) => {
  const wholesalerId = businessId(req);
  const { id } = req.params;
  const { reason, reasonNote } = req.body || {};

  try {
    const result = await challanService.createChallanForOrder(
      id,
      wholesalerId,
      reason || "payment_pending",
      reasonNote || null,
    );

    if (result.error) {
      const [status, message] = REASONS[result.error] || [400, "Could not make this challan"];
      return res.status(status).json({ message, code: result.error });
    }

    res.status(201).json(result.challan);
  } catch (err) {
    console.error("Error making a delivery challan for an order:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.listForOrder = async (req, res) => {
  const wholesalerId = businessId(req);
  try {
    const [challans, settlement, saleId] = await Promise.all([
      challanService.listForOrder(req.params.id, wholesalerId),
      challanService.settlementForOrder(req.params.id, wholesalerId),
      challanService.saleIdForOrder(req.params.id, wholesalerId),
    ]);
    // The settlement and whether the order has a sale behind it ride along, so
    // the order screen knows whether to offer the button without working the
    // rule out for itself.
    res.status(200).json({
      challans,
      settlement,
      hasSale: Boolean(saleId),
      challansOn: challanService.challanEnabled() && (await challanService.challanTablesExist()),
    });
  } catch (err) {
    console.error("Error listing challans for an order:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.listChallans = async (req, res) => {
  try {
    res.status(200).json(await challanService.list(businessId(req)));
  } catch (err) {
    console.error("Error listing delivery challans:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.listForSale = async (req, res) => {
  try {
    res.status(200).json(
      await challanService.listForSale(req.params.id, businessId(req)),
    );
  } catch (err) {
    console.error("Error listing challans for a sale:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getChallan = async (req, res) => {
  try {
    const challan = await challanService.findById(req.params.id, businessId(req));
    if (!challan) return res.status(404).json({ message: "Challan not found" });
    res.status(200).json(challan);
  } catch (err) {
    console.error("Error reading a delivery challan:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getChallanPdf = async (req, res) => {
  try {
    const challan = await challanService.findById(req.params.id, businessId(req));
    if (!challan) return res.status(404).json({ message: "Challan not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${challan.challan_number}.pdf"`,
    );
    await pdfService.generateChallanPDF(challan, res);
  } catch (err) {
    console.error("Error making the challan PDF:", err);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// The challan as a document in its own right. See services/challanBook.js.
// ---------------------------------------------------------------------------
const challanBook = require("../services/challanBook");

/** Record a challan. Goods moved, no bill yet, either direction. */
exports.recordChallan = async (req, res) => {
  try {
    const result = await challanBook.create(businessId(req), req.body || {});
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.status(201).json({ success: true, challan: result.challan });
  } catch (err) {
    console.error("Could not record the challan:", err);
    res.status(500).json({ success: false, message: "Could not record that challan." });
  }
};

/** Change one that has not been billed. */
exports.editChallan = async (req, res) => {
  try {
    const result = await challanBook.update(req.params.id, businessId(req), req.body || {});
    if (result.error === "notFound") {
      return res.status(404).json({ success: false, message: "That challan is not in your book." });
    }
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, challan: result.challan });
  } catch (err) {
    console.error("Could not change the challan:", err);
    res.status(500).json({ success: false, message: "Could not change that challan." });
  }
};

/** Close one raised in error. Cancelled, never deleted. */
exports.cancelChallan = async (req, res) => {
  try {
    const result = await challanBook.cancel(
      req.params.id, businessId(req), req.body?.reason);
    if (result.error === "notFound") {
      return res.status(404).json({ success: false, message: "That challan is not in your book." });
    }
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true });
  } catch (err) {
    console.error("Could not cancel the challan:", err);
    res.status(500).json({ success: false, message: "Could not cancel that challan." });
  }
};

/**
 * One kind's list, for the two tabs.
 *
 * `kind` defaults to sale, so an older client that does not send one sees
 * what it always saw rather than an empty screen.
 */
exports.listByKind = async (req, res) => {
  try {
    const rows = await challanBook.list(
      businessId(req),
      req.query.kind === "purchase" ? "purchase" : "sale",
      ["pending", "billed", "cancelled"].includes(req.query.status) ? req.query.status : null,
    );
    res.json({ success: true, challans: rows });
  } catch (err) {
    console.error("Could not list challans:", err);
    res.status(500).json({ success: false, message: "Could not load your challans." });
  }
};

/**
 * What is still waiting to be billed for one customer or supplier.
 *
 * The sale and purchase forms call this the moment a party is picked, which
 * is the whole point of the feature: a wholesaler who sent goods out three
 * times last week should not have to remember that when he comes to bill.
 */
exports.pendingForParty = async (req, res) => {
  try {
    const kind = req.query.kind === "purchase" ? "purchase" : "sale";
    const rows = await challanBook.pendingFor(businessId(req), kind, req.params.id);
    res.json({ success: true, challans: rows });
  } catch (err) {
    console.error("Could not list pending challans:", err);
    res.status(500).json({ success: false, message: "Could not load pending challans." });
  }
};

/** The reasons a challan can give, for the dropdown. */
exports.challanReasons = (req, res) => {
  const kind = req.query.kind === "purchase" ? "purchase" : "sale";
  res.json({
    success: true,
    reasons: challanBook.REASONS.filter((r) => r.forKind === "both" || r.forKind === kind),
  });
};
