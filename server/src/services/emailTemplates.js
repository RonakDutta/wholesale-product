const renderEmailTemplate = (templateName, variables) => {
  const brandHeader = `<div style="font-family: Arial, sans-serif; color: #111; background: #f9fafb; padding: 24px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0f766e; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 26px;">Marketplace</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: #d1fae5;">Wholesale B2B Marketplace</p>
      </div>
      <div style="padding: 24px;">`;
  const footer = `</div>
      <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">Thank you for using Marketplace. &copy; ${new Date().getFullYear()} Marketplace</p>
      </div>
    </div>
  </div>`;

  const templates = {
    registration_success: `<h2 style="font-size: 20px; margin-bottom: 16px;">Welcome to Marketplace!</h2><p style="margin-bottom: 16px;">Hello ${variables.firstName || "Customer"}, your account has been created successfully.</p><p style="margin-bottom: 16px;">Get started by browsing products, adding items to your cart, and connecting with verified suppliers.</p>`,
    email_verification: `<h2 style="font-size: 20px; margin-bottom: 16px;">Verify your email address</h2><p style="margin-bottom: 16px;">Please click the button below to verify your email.</p><p style="margin-bottom: 24px;"><a href="${variables.verifyUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none;">Verify Email</a></p>`,
    password_reset: `<h2 style="font-size: 20px; margin-bottom: 16px;">Reset your password</h2><p style="margin-bottom: 16px;">Use this link to reset your password:</p><p style="margin-bottom: 24px;"><a href="${variables.resetUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none;">Reset Password</a></p>`,
    order_update: `<h2 style="font-size: 20px; margin-bottom: 16px;">Order #${variables.orderNumber} Update</h2><p style="margin-bottom: 16px;">${variables.message}</p><p style="margin-bottom: 16px;">Current status: <strong>${variables.status}</strong></p>`,
    promo_alert: `<h2 style="font-size: 20px; margin-bottom: 16px;">${variables.title}</h2><p style="margin-bottom: 16px;">${variables.message}</p><p style="margin-bottom: 16px;">${variables.ctaText ? `<a href="${variables.ctaUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none;">${variables.ctaText}</a>` : ""}</p>`,
    low_stock_alert: `<h2 style="font-size: 20px; margin-bottom: 16px;">Low stock alert</h2><p style="margin-bottom: 16px;">Your product ${variables.productName} is low in stock with only ${variables.stockLeft} units remaining.</p>`,
    review_request: `<h2 style="font-size: 20px; margin-bottom: 16px;">Review your purchase</h2><p style="margin-bottom: 16px;">Thank you for ordering ${variables.productName}. Please share your feedback and help the supplier improve.</p>`,
    coupon_received: `<h2 style="font-size: 20px; margin-bottom: 16px;">You have a new coupon</h2><p style="margin-bottom: 16px;">Use code <strong>${variables.couponCode}</strong> to get savings on your next purchase.</p>`,
  };

  const body = templates[templateName] || `<p>Notification from Marketplace.</p>`;
  return `${brandHeader}${body}${footer}`;
};

module.exports = {
  renderEmailTemplate,
};
