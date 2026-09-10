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
