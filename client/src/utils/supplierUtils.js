// Safely parse any incoming number/string to a strict float
export const parseNum = (val, defaultVal = 0) => {
  if (val === null || val === undefined || (typeof val === "string" && val.trim() === "")) {
    return defaultVal;
  }
  const num = Number(val);
  return Number.isNaN(num) ? defaultVal : num;
};

export const getEffectivePrice = (supplier) =>
  parseNum(
    supplier?.discountPrice ?? supplier?.discount_price ?? supplier?.price ?? 0,
  );

export const getSupplyLabel = (stock = 0) => {
  const currentStock = parseNum(stock);
  if (currentStock <= 0) return "Out of stock";
  if (currentStock < 50) return "Low stock";
  return "High supply";
};

export const getSupplierPhone = (supplier) =>
  supplier?.contactPhone ??
  supplier?.contact_phone ??
  supplier?.phone ??
  supplier?.contactNo ??
  supplier?.mobile ??
  undefined;
