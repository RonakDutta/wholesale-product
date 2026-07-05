export const getEffectivePrice = (supplier) =>
  supplier?.discountPrice ?? supplier?.price ?? 0;

export const parsePercentage = (value) => {
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const getCheapestSupplier = (product) => {
  const suppliers = product?.suppliers ?? [];
  if (suppliers.length === 0) return null;
  return [...suppliers].sort(
    (a, b) => getEffectivePrice(a) - getEffectivePrice(b),
  )[0];
};

export const getSortedSuppliers = (product) => {
  const suppliers = product?.suppliers ?? [];
  return [...suppliers].sort(
    (a, b) => getEffectivePrice(a) - getEffectivePrice(b),
  );
};

export const hasVerifiedSupplier = (product) =>
  (product?.suppliers ?? []).some((s) => s.verified);

export const sortSuppliers = (suppliers, sortBy) => {
  if (!Array.isArray(suppliers)) return [];
  const list = [...suppliers];

  switch (sortBy) {
    case "price-asc":
      return list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    case "price-desc":
      return list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
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
        (a, b) =>
          parsePercentage(b.responseRate) - parsePercentage(a.responseRate),
      );
    default:
      return list;
  }
};

export const filterSuppliers = (suppliers, filters) => {
  if (!Array.isArray(suppliers)) return [];
  const normalizedSearch = String(filters.search || "")
    .trim()
    .toLowerCase();
  const maxMOQ = Number(filters.maxMOQ || 0);
  const maxShipping = Number(filters.maxShipping || 0);
  const minRating = Number(filters.minRating || 0);

  return suppliers.filter((supplier) => {
    if (filters.verifiedOnly && !supplier.verified) return false;
    if (filters.gstVerifiedOnly && !supplier.gstVerified) return false;
    if (maxMOQ > 0 && supplier.moq > maxMOQ) return false;
    if (maxShipping > 0 && supplier.shippingDays > maxShipping) return false;
    if (minRating > 0 && supplier.rating < minRating) return false;

    if (normalizedSearch) {
      const searchTarget = [supplier.name, supplier.city, supplier.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!searchTarget.includes(normalizedSearch)) return false;
    }
    return true;
  });
};

export const getBestSupplierMetrics = (suppliers) => {
  const metrics = {
    lowestPriceId: null,
    lowestMOQId: null,
    highestRatingId: null,
    fastestShippingId: null,
    bestResponseId: null,
    highestStockId: null,
  };

  let bestPrice = Infinity,
    bestMOQ = Infinity,
    bestRating = -Infinity;
  let bestShipping = Infinity,
    bestResponse = -Infinity,
    bestStock = -Infinity;

  suppliers.forEach((supplier) => {
    const price = getEffectivePrice(supplier);
    if (price < bestPrice) {
      bestPrice = price;
      metrics.lowestPriceId = supplier.id;
    }
    if (supplier.moq < bestMOQ) {
      bestMOQ = supplier.moq;
      metrics.lowestMOQId = supplier.id;
    }
    if (supplier.rating > bestRating) {
      bestRating = supplier.rating;
      metrics.highestRatingId = supplier.id;
    }
    if (supplier.shippingDays < bestShipping) {
      bestShipping = supplier.shippingDays;
      metrics.fastestShippingId = supplier.id;
    }
    const response = parsePercentage(supplier.responseRate);
    if (response > bestResponse) {
      bestResponse = response;
      metrics.bestResponseId = supplier.id;
    }
    if (supplier.stock > bestStock) {
      bestStock = supplier.stock;
      metrics.highestStockId = supplier.id;
    }
  });

  return metrics;
};

export const getSupplyLabel = (stock = 0) => {
  if (stock === 0) return "Out of stock";
  if (stock < 50) return "Low stock";
  return "High supply";
};
