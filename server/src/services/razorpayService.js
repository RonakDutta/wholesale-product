const crypto = require("crypto");

/**
 * Razorpay, scaffolded.
 *
 * There is no payment gateway in this product. A buyer scans a UPI QR code and
 * presses a button to say he paid, and the server caps what he can claim at
 * what is owed. That is honest for a closed network where the two parties know
 * each other, and it is not going to be enough forever.
 *
 * This is the shape of the real thing with the network call left out, asked
 * for on 12 Sept as "absolutely no need to make it working, just setup fake".
 *
 * ---------------------------------------------------------------------------
 * THE ONE DECISION THAT MATTERS HERE
 * ---------------------------------------------------------------------------
 * The stub signs its fake payments with REAL HMAC-SHA256, using the same
 * string Razorpay signs and the same comparison Razorpay documents. It would
 * have been less code to have verifySignature() return true in stub mode.
 *
 * That shortcut is how a fake gateway becomes a live hole. Somebody sets
 * RAZORPAY_KEY_ID one afternoon, the stub flag is still on or the branch is
 * the wrong way round, and the verify endpoint accepts a payment id posted by
 * anybody with the order number. Money is the one place in this codebase where
 * the untested path must not be the one that says yes.
 *
 * So verification is the real algorithm in both modes, and it is the same
 * function. Going live changes the keys and the order-creation call, and
 * changes nothing about what is trusted.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT BUILT, deliberately
 * ---------------------------------------------------------------------------
 * createOrder does not call api.razorpay.com. In live mode it throws and says
 * so, rather than returning something that looks like an order and is not. The
 * call is a Basic-auth POST to /v1/orders and is perhaps fifteen lines, but it
 * cannot be exercised from here, and untested network code that reports
 * success is worse than a clear refusal.
 *
 * Webhooks are not built either. The handler flow below is the browser telling
 * the server it succeeded, which Razorpay itself treats as a hint: the payment
 * is authoritative only over the webhook, because a buyer whose browser dies
 * after paying never sends the handler. Before this goes live it needs
 * POST /api/webhooks/razorpay verifying X-Razorpay-Signature over the raw body.
 *
 * Settlement across wholesalers is not addressed. Every rupee here would land
 * in ONE Razorpay account, and this is a marketplace where the money belongs
 * to whichever wholesaler was bought from. That is Razorpay Route and linked
 * accounts, it needs each wholesaler onboarded and KYC'd, and it is the real
 * work behind "the UPI needs to be of each wholesaler we are buying from".
 */

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

/**
 * Stub mode is the absence of a secret, not a flag somebody can leave set.
 *
 * Deliberately not a FEATURES-style boolean. A flag and a credential can
 * disagree, and the failure when they do is the expensive one. If there is a
 * secret we are not pretending; if there is not, we cannot be.
 */
const isStub = () => KEY_SECRET === "";

/**
 * What the stub signs with.
 *
 * Generated per process because there is no secret to use. That means a server
 * restart orphans any checkout already open in a browser: verification fails,
 * the buyer is told to start again, and nothing is recorded. For a stub that
 * is the right failure, and it is one more reason this cannot quietly become
 * production.
 */
const STUB_SECRET = crypto.randomBytes(32).toString("hex");
const secret = () => (isStub() ? STUB_SECRET : KEY_SECRET);

/** What the browser needs to open a checkout. Never the secret. */
const publicConfig = () => ({
  keyId: isStub() ? "rzp_test_stub0000000000" : KEY_ID,
  stub: isStub(),
});

/**
 * Razorpay works in paise, like the rest of this codebase.
 * See utils/money for why rupees are never summed as floats.
 */
const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);

/**
 * Opens a Razorpay order for an amount the SERVER decided.
 *
 * `amountRupees` comes from the order row, never from the browser, exactly as
 * initiatePayment already arranges: the client naming its own amount is how a
 * gateway integration turns into a discount coupon.
 */
const createOrder = async ({ amountRupees, receipt, notes = {} }) => {
  const amount = toPaise(amountRupees);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("A payment must be for more than zero.");
  }

  if (!isStub()) {
    // See the header. Refusing loudly beats returning a plausible fake to a
    // deployment that believes it is taking real money.
    const err = new Error(
      "Razorpay keys are configured but order creation is not implemented. " +
        "Add the POST to https://api.razorpay.com/v1/orders with Basic auth " +
        "over RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET, then remove this guard.",
    );
    err.code = "RAZORPAY_NOT_IMPLEMENTED";
    throw err;
  }

  return {
    id: `order_stub${crypto.randomBytes(9).toString("hex")}`,
    amount,
    currency: "INR",
    receipt,
    notes,
    status: "created",
    stub: true,
  };
};

/**
 * The signature Razorpay returns to the browser on success.
 *
 * HMAC-SHA256 of "<order_id>|<payment_id>" keyed on the secret, which is what
 * Razorpay documents and what verifySignature below checks. Only reachable in
 * stub mode: in live mode this is Razorpay's to produce and knowing how to
 * make one here would defeat the point of checking it.
 */
const signStub = (orderId, paymentId) => {
  if (!isStub()) throw new Error("Signatures are the gateway's to issue.");
  return crypto
    .createHmac("sha256", secret())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
};

/** A payment id shaped like Razorpay's, for the stub checkout. */
const stubPaymentId = () => `pay_stub${crypto.randomBytes(9).toString("hex")}`;

/**
 * Is this handler payload really from the gateway?
 *
 * The real algorithm in both modes. timingSafeEqual rather than === because
 * comparing a secret-derived value byte by byte with an early exit leaks its
 * length and, given enough attempts, its content. It throws on a length
 * mismatch, so that is checked first and a wrong length is simply a wrong
 * signature.
 */
const verifySignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const given = String(signature);
  if (given.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
  } catch {
    return false;
  }
};

module.exports = {
  isStub,
  publicConfig,
  createOrder,
  signStub,
  stubPaymentId,
  verifySignature,
  toPaise,
};
