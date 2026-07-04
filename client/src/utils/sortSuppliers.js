export const parsePercentage = (value) => {
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const sortSuppliers = (suppliers, sortBy) => {
  if (!Array.isArray(suppliers)) return [];
  const list = [...suppliers];

  switch (sortBy) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "highest-rated":
      return list.sort((a, b) => b.rating - a.rating);
    case "lowest-moq":
      return list.sort((a, b) => a.moq - b.moq);
    case "fastest-shipping":
      return list.sort((a, b) => a.shippingDays - b.shippingDays);
    case "highest-stock":
      return list.sort((a, b) => b.stock - a.stock);
    case "best-response":
      return list.sort(
        (a, b) => parsePercentage(b.responseRate) - parsePercentage(a.responseRate),
      );
    default:
      return list;
  }
};