const invoiceRepository = require("../repositories/invoiceRepository");

class InvoiceNumberService {
  /**
   * Generates a unique, sequential invoice number for the current calendar year.
   * Format: INV-2026-000001, INV-2026-000002, etc.
   */
  async generateInvoiceNumber(client = null, yearOverride = null) {
    const currentYear = yearOverride || new Date().getFullYear();
    const sequenceNumber = await invoiceRepository.getNextSequenceNumber(client, currentYear);
    
    // Pad sequence number to 6 digits
    const paddedSequence = String(sequenceNumber).padStart(6, "0");
    return `INV-${currentYear}-${paddedSequence}`;
  }
}

module.exports = new InvoiceNumberService();
