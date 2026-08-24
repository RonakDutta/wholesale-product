// CGST/SGST versus IGST turns on the state, not the city. Comparing cities
// treated Mumbai to Pune as inter-state and charged IGST on a tax document, so
// the common metros are mapped back to their state first. Anything unmapped
// falls back to comparing the value as given, which is right when a state name
// was passed in and no worse than before when it was a city.
const STATE_BY_CITY = {
  delhi: "delhi",
  "new delhi": "delhi",
  noida: "uttar pradesh",
  ghaziabad: "uttar pradesh",
  lucknow: "uttar pradesh",
  kanpur: "uttar pradesh",
  gurgaon: "haryana",
  gurugram: "haryana",
  faridabad: "haryana",
  mumbai: "maharashtra",
  pune: "maharashtra",
  nagpur: "maharashtra",
  nashik: "maharashtra",
  thane: "maharashtra",
  bengaluru: "karnataka",
  bangalore: "karnataka",
  mysore: "karnataka",
  chennai: "tamil nadu",
  coimbatore: "tamil nadu",
  madurai: "tamil nadu",
  hyderabad: "telangana",
  warangal: "telangana",
  kolkata: "west bengal",
  howrah: "west bengal",
  ahmedabad: "gujarat",
  surat: "gujarat",
  vadodara: "gujarat",
  rajkot: "gujarat",
  jaipur: "rajasthan",
  jodhpur: "rajasthan",
  udaipur: "rajasthan",
  indore: "madhya pradesh",
  bhopal: "madhya pradesh",
  patna: "bihar",
  chandigarh: "chandigarh",
  ludhiana: "punjab",
  amritsar: "punjab",
  kochi: "kerala",
  ernakulam: "kerala",
  thiruvananthapuram: "kerala",
  bhubaneswar: "odisha",
  guwahati: "assam",
  raipur: "chhattisgarh",
  ranchi: "jharkhand",
  dehradun: "uttarakhand",
  visakhapatnam: "andhra pradesh",
  vijayawada: "andhra pradesh",
};

const toState = (value) => {
  const clean = String(value || "").trim().toLowerCase();
  return STATE_BY_CITY[clean] || clean;
};

class GSTService {
  /**
   * Checks whether the transaction is Intra-State (same state) or Inter-State (different state).
   */
  isIntraState(supplierCityOrState = "Delhi", buyerCityOrState = "Delhi") {
    if (!supplierCityOrState || !buyerCityOrState) return true;
    return toState(supplierCityOrState) === toState(buyerCityOrState);
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
      // No invented HSN. This used to default to 8504, which is the code for
      // electrical transformers, so a bill for cotton shirting went out
      // declaring it as transformers. A blank HSN on a tax document is a gap
      // the wholesaler can fill in; a wrong one is a false statement.
      const hsnCode = item.hsnCode || null;

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
