class GSTService {
  /**
   * Checks whether the transaction is Intra-State (same state) or Inter-State (different state).
   */
  isIntraState(supplierCityOrState = "Delhi", buyerCityOrState = "Delhi") {
    if (!supplierCityOrState || !buyerCityOrState) return true;
    const cleanSupplier = String(supplierCityOrState).trim().toLowerCase();
    const cleanBuyer = String(buyerCityOrState).trim().toLowerCase();
    return cleanSupplier === cleanBuyer;
  }

  /**
   * Computes GST tax breakdown for line items and invoice summary.
   * Handles tax-inclusive and tax-exclusive pricing mode.
   * Returns itemized breakdown and grand totals with currency rounding.
   */
  calculateGST({
    items = [],
    discount = 0.00,
    shippingCharge = 0.00,
    supplierLocation = "Delhi",
    buyerLocation = "Delhi",
    isTaxInclusive = false,
  }) {
    const intraState = this.isIntraState(supplierLocation, buyerLocation);
    let subtotal = 0;
    let totalTax = 0;

    const processedItems = items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const gstPercent = Number(item.gstPercent ?? 18.00);
      const hsnCode = item.hsnCode || "8504";

      let lineTaxable = 0;
      let lineTaxAmount = 0;
      let lineTotal = 0;

      if (isTaxInclusive) {
        // Price includes tax: Taxable = Total / (1 + Rate/100)
        lineTotal = Number((unitPrice * qty).toFixed(2));
        lineTaxable = Number((lineTotal / (1 + gstPercent / 100)).toFixed(2));
        lineTaxAmount = Number((lineTotal - lineTaxable).toFixed(2));
      } else {
        // Price excludes tax: Taxable = UnitPrice * Qty
        lineTaxable = Number((unitPrice * qty).toFixed(2));
        lineTaxAmount = Number(((lineTaxable * gstPercent) / 100).toFixed(2));
        lineTotal = Number((lineTaxable + lineTaxAmount).toFixed(2));
      }

      subtotal += lineTaxable;
      totalTax += lineTaxAmount;

      return {
        productId: item.productId || item.product_id || null,
        productName: item.productName || item.product_name || "Wholesale Product",
        hsnCode,
        quantity: qty,
        unitPrice,
        gstPercent,
        taxAmount: lineTaxAmount,
        total: lineTotal,
      };
    });

    const netSubtotal = Number(subtotal.toFixed(2));
    const netDiscount = Number(Number(discount).toFixed(2));
    const netShipping = Number(Number(shippingCharge).toFixed(2));

    const taxableAmount = Math.max(0, Number((netSubtotal - netDiscount + netShipping).toFixed(2)));
    const netTotalTax = Number(totalTax.toFixed(2));

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (intraState) {
      // Intra-state: Split tax equally into CGST & SGST
      cgst = Number((netTotalTax / 2).toFixed(2));
      sgst = Number((netTotalTax - cgst).toFixed(2)); // handle odd paise rounding
      igst = 0.00;
    } else {
      // Inter-state: All tax goes to IGST
      cgst = 0.00;
      sgst = 0.00;
      igst = netTotalTax;
    }

    const rawGrandTotal = taxableAmount + netTotalTax;
    const roundedGrandTotal = Math.round(rawGrandTotal * 100) / 100;
    const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));

    return {
      subtotal: netSubtotal,
      discount: netDiscount,
      shippingCharge: netShipping,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalTax: netTotalTax,
      roundOff,
      grandTotal: roundedGrandTotal,
      isIntraState: intraState,
      items: processedItems,
    };
  }
}

module.exports = new GSTService();
