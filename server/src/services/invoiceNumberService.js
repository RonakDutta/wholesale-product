const invoiceRepository = require("../repositories/invoiceRepository");

class InvoiceNumberService {
  /**
   * The next invoice number for one wholesaler, in his own run.
   *
   * Format: INV-2026-000001, INV-2026-000002. The prefix is his, from
   * invoice_settings, and so is the count.
   *
   * The count used to be shared across the whole platform, so a wholesaler's
   * own book read 000001, 000003, 000009, with other firms' invoices filling
   * the gaps. Rule 46(b) of the CGST Rules wants a consecutive serial number
   * per supplier for the financial year, and gaps in a bill book are exactly
   * what gets asked about. "The software gave that number to another firm" is
   * not an answer a wholesaler can give about his own records.
   *
   * @param {object}  client        a pg client, so the number is taken inside
   *                                the same transaction that writes the invoice
   * @param {string}  prefix        his prefix from invoice_settings
   * @param {number}  yearOverride  for backdating, otherwise this year
   * @param {string}  wholesalerId  whose run to draw from. Without it the old
   *                                shared counter is used, which keeps an
   *                                invoice raisable rather than failing.
   */
  async generateInvoiceNumber(
    client = null,
    prefix = "INV",
    yearOverride = null,
    wholesalerId = null,
  ) {
    const currentYear = yearOverride || new Date().getFullYear();
    const sequenceNumber = await invoiceRepository.getNextSequenceNumber(
      client,
      currentYear,
      wholesalerId,
    );

    // Pad sequence number to 6 digits
    const paddedSequence = String(sequenceNumber).padStart(6, "0");
    // Keep the column's 50 characters in reach whatever prefix is configured.
    const safePrefix = String(prefix || "INV").trim().slice(0, 10) || "INV";
    return `${safePrefix}-${currentYear}-${paddedSequence}`;
  }
}

module.exports = new InvoiceNumberService();
