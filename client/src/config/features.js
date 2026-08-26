/**
 * Feature flags.
 *
 * The marketplace was switched off while the sales book was built, on the
 * understanding that it would come back. It is back on now: the two halves
 * are being merged, and a wholesaler gets both a shop his retailers can order
 * from and a book to manage what he sells.
 *
 * The flag stays rather than being deleted, because it is still the switch
 * for a wholesaler who does not want a public shop at all, and because
 * turning the browsing surface off is how the B2C phase will be staged.
 *
 * What the flag does NOT control any more: the seller dashboard. That is the
 * 3.0 one in both states. The marketplace-era dashboard is gone.
 */
export const FEATURES = {
  // Browsing, search, cross seller comparison, cart, checkout, wishlist.
  MARKETPLACE: true,

  // The wholesaler's customer book, sales records and khata. The new trunk.
  SALES_MANAGEMENT: true,

  // Wholesaler only, and intended to sit behind a subscription plan later.
  // Off until there is real data to report on, because an analytics screen
  // with nothing in it teaches a wholesaler the product is empty.
  ANALYTICS: false,
};

export default FEATURES;
