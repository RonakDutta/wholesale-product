/**
 * Wholesale 3.0 feature flags.
 *
 * The product is becoming a sales management tool for wholesalers. The
 * marketplace side (browsing, search, comparing sellers, cart, wishlist,
 * reviews) is switched OFF here rather than deleted, because two things are
 * expected to want it back:
 *
 *   * the B2C phase, which is the same listing data with a consumer skin
 *   * paid retailer acquisition, which the marketplace already is
 *
 * Flip MARKETPLACE to true and the old surface returns intact. Nothing has
 * been removed from the tree, so both sides keep compiling.
 */
export const FEATURES = {
  // Browsing, search, cross seller comparison, cart, checkout, wishlist.
  MARKETPLACE: false,

  // The wholesaler's customer book, sales records and khata. The new trunk.
  SALES_MANAGEMENT: true,

  // Wholesaler only, and intended to sit behind a subscription plan later.
  // Off until there is real data to report on, because an analytics screen
  // with nothing in it teaches a wholesaler the product is empty.
  ANALYTICS: false,
};

export default FEATURES;
