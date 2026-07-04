import { parsePercentage } from "./sortSuppliers";

export const filterSuppliers = (suppliers, filters) => {
  if (!Array.isArray(suppliers)) return [];
  const normalizedSearch = String(filters.search || "").trim().toLowerCase();
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
      const searchTarget = [
        supplier.name,
        supplier.city,
        supplier.country,
      ]
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

  let bestPrice = Infinity;
  let bestMOQ = Infinity;
  let bestRating = -Infinity;
  let bestShipping = Infinity;
  let bestResponse = -Infinity;
  let bestStock = -Infinity;

  suppliers.forEach((supplier) => {
    if (supplier.price < bestPrice) {
      bestPrice = supplier.price;
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
