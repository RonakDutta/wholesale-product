const invoiceRepository = require("../repositories/invoiceRepository");

class InvoiceNumberService {
  /**
   * Generates a unique, sequential invoice number for the current calendar year.
   * Format: INV-2026-000001, INV-2026-000002, etc.
   */
  async generateInvoiceNumber(client = null, prefix = "INV", yearOverride = null) {
    const currentYear = yearOverride || new Date().getFullYear();
    const sequenceNumber = await invoiceRepository.getNextSequenceNumber(client, currentYear);

    // Pad sequence number to 6 digits
    const paddedSequence = String(sequenceNumber).padStart(6, "0");
    // Keep the column's 50 characters in reach whatever prefix is configured.
    const safePrefix = String(prefix || "INV").trim().slice(0, 10) || "INV";
    return `${safePrefix}-${currentYear}-${paddedSequence}`;
  }
}

module.exports = new InvoiceNumberService();
