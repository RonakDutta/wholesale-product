/**
 * Showing an amount, in one place.
 *
 * There are eighteen copies of a local `money()` helper across the screens and
 * they do not agree. Most round to whole rupees, the sale form keeps two
 * decimals, and the invoice keeps two without grouping, which is why the same
 * figure reads 12,000 on one screen and 12000.00 on the next. Asked about on
 * 11 Sept, and the answer is that a wholesaler should not have to work out
 * whether two screens are showing him the same number.
 *
 * This is the destination those copies collapse into, not a nineteenth. It is
 * used by the purchase screens from the day they are written, so the new work
 * does not add to the pile, and the existing screens move onto it one at a
 * time. That order matters: /master/settings is meant to control decimals and
 * grouping across the product, and wiring that up while eighteen components
 * still format their own would give a setting that reaches some screens and
 * not others, which is worse than no setting at all.
 *
 * Indian digit grouping throughout, via en-IN: 12,00,000 rather than
 * 1,200,000. That is not cosmetic. A trader reads lakhs and crores by the
 * position of the commas, and western grouping makes him count digits.
 */

/**
 * A plain amount, no symbol. Whole rupees by default, because that is what
 * almost every screen wants and what a trader says out loud.
 *
 * Pass `paise: true` where the figure is a document total that has to foot
 * exactly, such as an invoice line or a tax amount.
 */
export const money = (value, { paise = false } = {}) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: paise ? 2 : 0,
    maximumFractionDigits: paise ? 2 : 0,
  });

/** The same, with the rupee sign in front. */
export const rupees = (value, options) => `₹${money(value, options)}`;

/**
 * Same paise arithmetic as the server, so a total worked out on screen and
 * the total that gets saved cannot drift apart on an odd rate. Floating point
 * rupees lose a paisa per line, and a wholesaler notices a total a rupee off.
 */
export const toPaise = (value) => Math.round(Number(value || 0) * 100);

export const fromPaise = (value) => Number((Number(value || 0) / 100).toFixed(2));

/**
 * A date as a trader reads it: 9 Sep 2026.
 *
 * Here rather than in its own file because it is copied beside `money()` in
 * the same eighteen components, and separating them would mean two rounds of
 * the same tidying.
 */
export const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
