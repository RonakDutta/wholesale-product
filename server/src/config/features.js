/**
 * Server side feature flags. The mirror of client/src/config/features.js.
 */
const FEATURES = {
  /**
   * Whether stock counts are believed.
   *
   * Off for now, by decision: stock comes off the screens until it is
   * properly implemented, because a hand written sale does not decrement it
   * and a count nobody maintains is worse than no count.
   *
   * What "off" changes, and what it deliberately does not:
   *
   *   - An order is NOT refused for insufficient stock. With the number
   *     hidden, a buyer told "only 3 left" cannot act on it, and a listing
   *     created since stock was hidden has a count of zero, so every one of
   *     them would be unorderable.
   *   - Orders DO still decrement, and cancellations still credit back. A
   *     wholesaler who had real counts keeps them moving, so turning this
   *     back on is a screen change rather than a stock take. The cost is
   *     that a listing which never had a count can go negative, which reads
   *     correctly as "we do not know".
   */
  STOCK_TRACKING: false,
};

module.exports = { FEATURES };
