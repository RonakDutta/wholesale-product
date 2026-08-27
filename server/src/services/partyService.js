/**
 * The customer book, shared by every way business arrives.
 *
 * A wholesaler has one list of customers. He writes some of them into it by
 * hand, and others arrive by placing an order through the shop. Both have to
 * land on the same row, or he ends up with the same man twice and two
 * different balances for one khata.
 *
 * That is what this module is for, and it is the only place allowed to decide
 * whether a person is already in the book.
 */
const { clean } = require("../utils/money");

/**
 * The last ten digits of a phone number, or null.
 *
 * Indian mobile numbers get typed a dozen ways: 98765 43210, +91 9876543210,
 * 09876543210. They are the same number, and matching them as raw strings
 * would put the same customer in the book three times.
 */
const phoneKey = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
};

/**
 * Find this person in the wholesaler's book, or add them.
 *
 * Matching, in order, because each rule is more certain than the next:
 *
 *   1. An account already linked to a party. Unambiguous.
 *   2. The same phone number. This is the one that matters in practice: the
 *      wholesaler wrote "Kishan 98200 11223" in his diary months ago, and now
 *      Kishan has signed up and ordered. Same man, same row, and the account
 *      gets linked to it so rule 1 answers next time.
 *   3. Nobody matched, so add them.
 *
 * Runs on the caller's client so it joins the caller's transaction. If the
 * order rolls back, the party goes with it.
 *
 * @param {object} client   a pg client already inside a transaction
 * @param {object} details
 * @param {string} details.wholesalerId  whose book to look in
 * @param {string} [details.userId]      the buyer's account, if they have one
 * @returns {Promise<object>} the party row
 */
const findOrCreateParty = async (client, details) => {
  const {
    wholesalerId,
    userId = null,
    name,
    businessName = null,
    phone = null,
    city = null,
    address = null,
    gstin = null,
  } = details;

  if (!wholesalerId) throw new Error("findOrCreateParty needs a wholesaler.");

  const key = phoneKey(phone);

  // 1. Already linked to this account.
  if (userId) {
    const byUser = await client.query(
      "SELECT * FROM parties WHERE wholesaler_id = $1 AND user_id = $2 LIMIT 1",
      [wholesalerId, userId],
    );
    if (byUser.rows.length > 0) return byUser.rows[0];
  }

  // 2. Same phone number, however it was typed. Scoped to one wholesaler, so
  // this reads a handful of rows off idx_parties_wholesaler.
  if (key) {
    const byPhone = await client.query(
      `SELECT * FROM parties
       WHERE wholesaler_id = $1
         AND phone IS NOT NULL
         AND right(regexp_replace(phone, '\\D', '', 'g'), 10) = $2
       ORDER BY created_at ASC
       LIMIT 1`,
      [wholesalerId, key],
    );
    if (byPhone.rows.length > 0) {
      const party = byPhone.rows[0];
      // The diary entry now has an account behind it. Only ever fill a blank:
      // never move a party from one account to another.
      if (userId && !party.user_id) {
        const linked = await client.query(
          `UPDATE parties SET user_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND user_id IS NULL
           RETURNING *`,
          [userId, party.id],
        );
        if (linked.rows.length > 0) return linked.rows[0];
      }
      return party;
    }
  }

  // 3. New customer. Nothing here overwrites anything, so the wholesaler's own
  // notes on a party he already had are never touched by an order.
  try {
    const created = await client.query(
      `INSERT INTO parties
         (wholesaler_id, user_id, name, business_name, phone, city, address, gstin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        wholesalerId,
        userId,
        clean(name) || "Customer",
        clean(businessName),
        clean(phone),
        clean(city),
        clean(address),
        clean(gstin),
      ],
    );
    return created.rows[0];
  } catch (err) {
    // The partial unique index on (wholesaler_id, phone) fired, which means
    // two checkouts raced for the same new customer. The other one won, so
    // read its row rather than failing a checkout over a duplicate.
    if (err.code === "23505" && key) {
      const raced = await client.query(
        `SELECT * FROM parties
         WHERE wholesaler_id = $1
           AND phone IS NOT NULL
           AND right(regexp_replace(phone, '\\D', '', 'g'), 10) = $2
         ORDER BY created_at ASC
         LIMIT 1`,
        [wholesalerId, key],
      );
      if (raced.rows.length > 0) return raced.rows[0];
    }
    throw err;
  }
};

/**
 * Is the database new enough to link an order to a party?
 *
 * Migrations here are applied by hand, so the code is routinely ahead of the
 * schema it is talking to. Twice already a query has named a column that had
 * not been added yet and taken a whole screen down with a 500. Checkout is the
 * worst possible place for that, so it asks first and does without if the
 * answer is no.
 *
 * Cached after the first look: the schema does not change under a running
 * server, and this would otherwise be a round trip on every order.
 */
let partyLinkReady = null;

const hasPartyLink = async (client) => {
  if (partyLinkReady !== null) return partyLinkReady;
  try {
    const probe = await client.query(
      `SELECT to_regclass('public.parties') IS NOT NULL AS has_parties,
              EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'orders'
                  AND column_name = 'party_id'
              ) AS has_column`,
    );
    const row = probe.rows[0] || {};
    partyLinkReady = Boolean(row.has_parties && row.has_column);
  } catch {
    partyLinkReady = false;
  }
  return partyLinkReady;
};

// For tests, which build a schema after the module is already loaded.
const resetPartyLink = () => { partyLinkReady = null; };

module.exports = { findOrCreateParty, phoneKey, hasPartyLink, resetPartyLink };
