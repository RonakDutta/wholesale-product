import { Link } from "react-router-dom";

const pageContent = {
  "browse-products": {
    tag: "Marketplace",
    title: "Browse wholesale products with confidence",
    description:
      "Explore verified inventory across packaging, electronics, apparel, and fast-moving essentials. Every listing includes supplier transparency, pricing history, and delivery expectations so buyers can compare options quickly and make informed bulk decisions.",
    highlights: [
      "Filter by category, region, and verified suppliers",
      "Compare bulk pricing and minimum order quantities",
      "Save products for later in your personalized wishlist",
    ],
    extra: [
      "Search across trusted categories with real-time inventory visibility.",
      "Create a shortlist for procurement teams before finalizing a purchase.",
    ],
  },
  "verified-sellers": {
    tag: "Trust & Quality",
    title: "Work with verified sellers only",
    description:
      "We highlight suppliers who have completed onboarding, identity checks, and quality reviews. This helps wholesale buyers reduce risk and transact with confidence at scale while keeping procurement standards consistent.",
    highlights: [
      "Verified seller badges and business credentials",
      "Transparent review history and response times",
      "Priority support for high-volume buyers",
    ],
    extra: [
      "Every seller profile includes business readiness and compliance signals.",
      "High-trust suppliers receive faster approvals for repeat orders.",
    ],
  },
  "dynamic-pricing": {
    tag: "Pricing Engine",
    title: "See dynamic pricing that updates with demand",
    description:
      "Our pricing engine adjusts live market quotes based on demand, stock levels, and supplier activity so buyers can spot opportunities before they disappear and plan their margin more effectively.",
    highlights: [
      "Track price movement across suppliers",
      "Understand discount eligibility and MOQ impact",
      "Plan orders around the best available rates",
    ],
    extra: [
      "Monitor price shifts to avoid overpaying during peak demand.",
      "Compare offers across multiple suppliers to find the best trade-off.",
    ],
  },
  "help-center": {
    tag: "Support",
    title: "Get help with ordering, payments, and onboarding",
    description:
      "The help center covers the essentials for new and returning wholesale buyers, including account setup, order management, dispute resolution, and supplier communication.",
    highlights: [
      "Step-by-step guides for first-time buyers",
      "Answers to common questions about invoicing",
      "Fast access to account specialists",
    ],
    extra: [
      "Useful resources are grouped by buyer, seller, and finance workflows.",
      "Live assistance is available for urgent order or payment issues.",
    ],
  },
  "upi-guide": {
    tag: "Payments",
    title: "Make secure UPI payments for wholesale orders",
    description:
      "Use UPI to complete transactions quickly with seller-friendly confirmation flows. The guide explains accepted payment steps, settlement expectations, and safety checks for smoother checkout experiences.",
    highlights: [
      "Simple setup steps for trusted UPI payments",
      "Confirmation details for every transaction",
      "Support for payment disputes and failed transfers",
    ],
    extra: [
      "UPI payments help reduce delays for repeat purchases and urgent restocks.",
      "Each payment includes transparent confirmation details for account records.",
    ],
  },
  "contact-us": {
    tag: "Contact",
    title: "Talk to the marketplace team",
    description:
      "Whether you need help choosing a supplier, setting up your account, or resolving an order issue, our team is ready to help with practical support and fast follow-up.",
    highlights: [
      "Email: support@marketplace.in",
      "Phone: +91 99999 11111",
      "Business hours: Mon–Sat, 9:00 AM to 7:00 PM",
    ],
    extra: [
      "Prefer email? We typically respond within one business day.",
      "Large-order buyers can request a dedicated account manager.",
    ],
  },
  "terms-of-service": {
    tag: "Legal",
    title: "Terms of service",
    description:
      "These terms define how buyers, sellers, and marketplace administrators interact across product listings, payments, delivery coordination, and account usage in a transparent and compliant environment.",
    highlights: [
      "Use of platform services is subject to account compliance",
      "Buyers and sellers are responsible for accurate product details",
      "Marketplace policies may change with notice to users",
    ],
    extra: [
      "The terms are designed to keep commercial operations fair and predictable.",
      "Users are encouraged to review updates before renewing partnerships.",
    ],
  },
  "privacy-policy": {
    tag: "Legal",
    title: "Privacy policy",
    description:
      "We collect only the data needed to run your account, provide support, and improve your buying experience. Your information is handled with care and shared only where required.",
    highlights: [
      "Profile, contact, and transaction data are securely stored",
      "Communication preferences can be updated anytime",
      "Data requests and deletion support are available on request",
    ],
    extra: [
      "We use your data to personalize recommendations and improve platform reliability.",
      "You can request access or correction of stored information at any time.",
    ],
  },
  "seller-agreement": {
    tag: "Legal",
    title: "Seller agreement",
    description:
      "The seller agreement outlines onboarding responsibilities, catalog standards, payment handling, and conduct expectations for verified suppliers on the platform, helping both sides work with clarity.",
    highlights: [
      "Suppliers must keep product data accurate and current",
      "Fulfillment commitments and service levels are part of the agreement",
      "Platform policies apply to pricing, communication, and disputes",
    ],
    extra: [
      "The agreement supports reliable order fulfillment and better buyer trust.",
      "Suppliers can review their obligations anytime from the dashboard.",
    ],
  },
};

const FooterInfoPage = ({ page }) => {
  const content = pageContent[page];

  if (!content) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <div className="rounded-2xl border border-sage/30 bg-white/70 p-8 text-center">
          <h1 className="text-2xl font-black text-espresso">Page not found</h1>
          <p className="mt-3 text-sm text-espresso/70">
            The requested page is unavailable. Return to the marketplace
            homepage.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white transition hover:bg-clay/90"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 py-8 sm:py-12">
      <div className="rounded-3xl border border-sage/30 bg-white/80 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-clay">
          {content.tag}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-espresso">
          {content.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-espresso/75">
          {content.description}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {content.highlights.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-sage/20 bg-cream/70 p-4 text-sm text-espresso/80 transition duration-200 hover:border-clay hover:bg-cream hover:shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 rounded-2xl border border-sage/20 bg-cream/60 p-4 md:grid-cols-2">
          {content.extra.map((item) => (
            <div key={item} className="text-sm leading-6 text-espresso/75">
              • {item}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-espresso/90"
          >
            Back to marketplace
          </Link>
          <Link
            to="/contact-us"
            className="rounded-full border border-sage/40 px-4 py-2 text-sm font-semibold text-espresso transition duration-200 hover:-translate-y-0.5 hover:border-clay hover:text-clay"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FooterInfoPage;
