import MasterList from "./MasterList";

/**
 * The four master lists, as data.
 *
 * Same shape as the server's LISTS map and for the same reason: four screens
 * that each keep their own copy of "validate, save, refresh" is how three of
 * them end up behaving slightly differently from the fourth.
 *
 * The validation lives on the server. What is here is labels, hints and what
 * a blank row looks like, so a person filling one in knows what is wanted
 * before he is told no.
 */

const SPECS = {
  states: {
    list: "states",
    field: "states",
    key: "code",
    title: "States",
    singular: "State",
    blurb:
      "The two digit code at the front of every GSTIN. It is what decides whether a bill charges CGST and SGST or IGST, so it is a number on a legal document rather than a label.",
    columns: [{ field: "code" }, { field: "name" }],
    fields: [
      { name: "code", label: "GST code", hint: "Exactly two digits, like 24 for Gujarat.", fixedOnEdit: true },
      { name: "name", label: "Name" },
      { name: "isUnionTerritory", label: "Union territory", type: "checkbox", hint: "Recorded, not yet used: nothing computes UTGST." },
    ],
    blank: () => ({ code: "", name: "", isUnionTerritory: false, active: true }),
    toDraft: (r) => ({ code: r.code, name: r.name, isUnionTerritory: Boolean(r.isUnionTerritory), active: r.active !== false }),
    primary: (r) => `${r.code}  ${r.name}`,
    secondary: (r) => (r.isUnionTerritory ? "Union territory" : "State"),
  },

  units: {
    list: "units",
    field: "units",
    key: "code",
    title: "Units",
    singular: "Unit",
    blurb:
      "How goods are counted. Cloth by the metre, oil by the litre, and a wholesaler who sells in bales needs the word bale.",
    columns: [{ field: "code" }, { field: "name" }],
    fields: [
      { name: "code", label: "Code", hint: "What is stored and shown on a bill, like mtr.", fixedOnEdit: true },
      { name: "name", label: "Name", hint: "What a person reads, like Metre." },
      { name: "allowsDecimals", label: "Allows fractions", type: "checkbox", hint: "2.5 metres makes sense; 2.5 pieces does not." },
      { name: "sortOrder", label: "Order in the list", type: "number", hint: "Lower comes first." },
    ],
    blank: () => ({ code: "", name: "", allowsDecimals: true, sortOrder: 0, active: true }),
    toDraft: (r) => ({ code: r.code, name: r.name, allowsDecimals: r.allowsDecimals !== false, sortOrder: 0, active: r.active !== false }),
    primary: (r) => `${r.name} (${r.code})`,
    secondary: (r) => (r.allowsDecimals === false ? "Whole numbers only" : "Fractions allowed"),
  },

  "tax-rates": {
    list: "tax-rates",
    field: "taxRates",
    key: "rate",
    title: "Tax rates",
    singular: "Tax rate",
    blurb:
      "The GST slabs actually in force. A fixed list rather than a free number box, because a rate that is not a real slab is a rejected return later.",
    columns: [{ field: "rate" }, { field: "label" }],
    fields: [
      { name: "rate", label: "Rate (%)", type: "number", hint: "0, 0.25, 3, 5, 12, 18 and 28 are the real slabs.", fixedOnEdit: true },
      { name: "label", label: "Label", hint: "What a person picks from a list." },
    ],
    blank: () => ({ rate: "", label: "", active: true }),
    toDraft: (r) => ({ rate: r.rate, label: r.label, active: r.active !== false }),
    primary: (r) => r.label || `GST ${r.rate}%`,
    secondary: (r) => `${r.rate}%`,
  },

  hsn: {
    list: "hsn",
    field: "hsn",
    key: "code",
    title: "HSN codes",
    singular: "HSN code",
    blurb:
      "What the goods ARE on a tax bill, and what the customer claims his input credit against. Codes and descriptions only: nothing here maps a code to a GST rate, because rates change and the same heading carries several by price slab.",
    columns: [{ field: "code" }, { field: "label" }],
    fields: [
      { name: "code", label: "Code", hint: "4, 6 or 8 digits. Six is required above 5 crore turnover.", fixedOnEdit: true },
      { name: "description", label: "What the goods are" },
    ],
    blank: () => ({ code: "", description: "", active: true }),
    toDraft: (r) => ({ code: r.code, description: r.label, active: r.active !== false }),
    primary: (r) => `${r.code}  ${r.label}`,
    secondary: () => "Listed as common, not as verified",
  },
};

export const MasterStates = () => <MasterList spec={SPECS.states} />;
export const MasterUnits = () => <MasterList spec={SPECS.units} />;
export const MasterTaxRates = () => <MasterList spec={SPECS["tax-rates"]} />;
export const MasterHsn = () => <MasterList spec={SPECS.hsn} />;

export default SPECS;
