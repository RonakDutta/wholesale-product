/**
 * Where a wholesaler's goods come from, and how a buyer filters by it.
 *
 * Two columns hold a city. `warehouse_city` is where the stock actually sits
 * and is the one that matters to a buyer working out how far his order has to
 * travel; `city` is the older, plainer field a seller filled in when he signed
 * up. The warehouse wins when it is set, because that is the more specific
 * answer, and the older field is the fallback so a seller who never opened the
 * warehouse screen is still findable.
 *
 * Cities are free text. Sellers type "surat", "Surat" and "SURAT ", and no
 * amount of wishing makes those one row. Matching is therefore done on a
 * normalised form: trimmed, inner runs of whitespace collapsed, lowercased.
 *
 * What this deliberately does NOT do is decide that "Delhi", "New Delhi" and
 * "Delhi NCR" are the same place. They may well be, but guessing would put a
 * seller in a city he did not choose, and a buyer filtering to Delhi would be
 * shown stock the system only assumes is nearby. The picker offers exactly the
 * cities sellers have actually typed, so whatever a buyer picks has stock
 * behind it.
 */

// The city a listing ships from, in its original spelling.
const CITY_SQL = `COALESCE(
  NULLIF(btrim(wp.warehouse_city), ''),
  NULLIF(btrim(wp.city), '')
)`;

// The same, folded so two spellings of one city compare equal.
const CITY_KEY_SQL = `lower(regexp_replace(btrim(${CITY_SQL}), '\\s+', ' ', 'g'))`;

/**
 * The JS half of CITY_KEY_SQL. These two must agree: a buyer's chosen city
 * arrives as text and is compared against the database's folded column, so a
 * difference here silently returns nothing.
 */
const cityKey = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
};

/**
 * Reads the city filter off a request.
 *
 * An absent city, an empty one, or the explicit "all" means no filter at all,
 * which is the right default: a buyer who has not chosen should see the whole
 * country rather than one city picked for him.
 */
const cityFilterFrom = (query = {}) => {
  const key = cityKey(query.city);
  if (!key || key === "all" || key === "all india") return null;
  return key;
};

module.exports = { CITY_SQL, CITY_KEY_SQL, cityKey, cityFilterFrom };
