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
