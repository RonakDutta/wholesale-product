# Features Not Working Correctly / Throwing Errors

This file summarizes the issues that are currently verified in the project so they can be handed to another agent or used to build a detailed fix prompt.

## Summary

The following items are currently broken or likely broken based on source inspection and runtime verification:

1. Messaging routes are not mounted on the backend, so chat-related requests fail.
2. Payment confirmation uses an invalid order status transition and is rejected by the lifecycle validator.
3. Order detail/status update endpoints do not enforce ownership checks, so users can access or mutate another user’s orders.
4. The supplier dashboard layout references undefined sidebar state and will fail to render correctly.
5. Seller-upgrade may fail on a fresh database because the profile insert uses columns that are not clearly present in the checked-in migrations.

---

## 1) Messaging feature is not wired to the backend

### Affected files

- [server/src/app.js](server/src/app.js)
- [server/src/routes/messagesRoutes.js](server/src/routes/messagesRoutes.js)
- [client/src/hooks/useChatList.jsx](client/src/hooks/useChatList.jsx)
- [client/src/hooks/useConversation.jsx](client/src/hooks/useConversation.jsx)

### Problem

The frontend sends requests to `/api/messages/...`, but the Express app never mounts the messages router.

### Evidence

In [server/src/app.js](server/src/app.js), the app mounts auth, product, dashboard, profile, and order routers only:

```js
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/orders", orderRoutes);
```

The frontend calls these endpoints:

```js
// client/src/hooks/useChatList.jsx
const res = await fetch(`/api/messages/chats`, {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});
```

```js
// client/src/hooks/useConversation.jsx
fetch(`/api/messages/${receiverId}/read`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});
```

### Impact

The messaging UI cannot load chat lists or conversation history correctly. Requests to `/api/messages/...` will not be routed to the intended handlers.

### Reproduction

1. Open the messages route in the app.
2. Observe the network calls to `/api/messages/chats` or `/api/messages/:id/read`.
3. The backend will not serve those endpoints because the router is not mounted.

### Status

Verified defect.

---

## 2) Payment confirmation breaks due to invalid order lifecycle transition

### Affected files

- [server/src/controllers/orderController.js](server/src/controllers/orderController.js)
- [server/src/services/orderStatusService.js](server/src/services/orderStatusService.js)

### Problem

The payment update flow maps `paymentStatus: "paid"` to the order status `payment_completed`, but the current order state (`pending`) cannot transition to that state according to the service validator.

### Evidence

In [server/src/controllers/orderController.js](server/src/controllers/orderController.js):

```js
const previousStatus = checkOrder.rows[0].status;
const nextOrderStatus = mapPaymentStatusToOrderStatus(paymentStatus);
const validation = validateStatusTransition(previousStatus, nextOrderStatus);
if (!validation.valid) {
  throw new Error(validation.message);
}
```

In [server/src/services/orderStatusService.js](server/src/services/orderStatusService.js):

```js
const mapPaymentStatusToOrderStatus = (paymentStatus) => {
  switch (paymentStatus) {
    case "paid":
    case "partial":
      return "payment_completed";
    case "pending":
      return "payment_pending";
    case "failed":
    case "cod":
      return "payment_failed";
    default:
      return "payment_pending";
  }
};
```

### Impact

When the payment flow tries to mark an order as paid, the transition is rejected and payment confirmation cannot complete.

### Reproduction

1. Create an order.
2. Call the payment-status update endpoint with `paymentStatus: "paid"`.
3. The request will fail because `pending -> payment_completed` is not allowed by the current lifecycle.

### Verification evidence

I ran the transition logic directly in the server workspace and got:

```text
prev: 'pending'
next: 'payment_completed'
valid: { valid: false, message: 'Cannot transition from pending to payment_completed. Valid transitions: payment_pending, cancelled' }
```

### Status

Verified defect.

---

## 3) Order detail/status update endpoints do not enforce ownership

### Affected files

- [server/src/routes/orderRoutes.js](server/src/routes/orderRoutes.js)
- [server/src/controllers/orderController.js](server/src/controllers/orderController.js)

### Problem

The order read and status-update endpoints do not verify that the requester is the owner of the order before returning data or modifying the status.

### Evidence

In [server/src/routes/orderRoutes.js](server/src/routes/orderRoutes.js):

```js
router.get("/:orderId", authenticateToken, getOrderById);
```

In [server/src/controllers/orderController.js](server/src/controllers/orderController.js):

```js
const result = await pool.query("SELECT * FROM orders WHERE id = $1", [
  req.params.orderId,
]);
```

```js
const orderLookup = await pool.query(
  "SELECT status FROM orders WHERE id = $1",
  [orderId],
);
```

### Impact

Any authenticated user can fetch another user’s order record, and a user with the wrong role can attempt to modify status on orders that do not belong to them.

### Reproduction

1. Obtain a valid token for user A.
2. Request `GET /api/orders/<order-id-from-user-B>`.
3. The order is returned without ownership enforcement.

### Status

Verified defect.

---

## 4) Supplier dashboard layout crashes because sidebar state is undefined

### Affected file

- [client/src/layouts/DashboardLayout.jsx](client/src/layouts/DashboardLayout.jsx)

### Problem

The component references `isSidebarOpen` and `setIsSidebarOpen` without creating state for them, so rendering the dashboard shell fails.

### Evidence

In [client/src/layouts/DashboardLayout.jsx](client/src/layouts/DashboardLayout.jsx):

```jsx
{
  isSidebarOpen && (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
      onClick={() => setIsSidebarOpen(false)}
    />
  );
}
```

```jsx
<aside
  className={`fixed inset-y-0 left-0 ... ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
>
```

### Impact

Navigation to `/dashboard` causes the layout to break during render.

### Reproduction

1. Navigate to `/dashboard`.
2. The component tries to read `isSidebarOpen` during render.
3. The page throws a rendering error.

### Status

Verified defect.

---

## 5) Seller upgrade may fail on a fresh database

### Affected files

- [server/src/controllers/authController.js](server/src/controllers/authController.js)
- [server/migrations/add_upi_id_field.sql](server/migrations/add_upi_id_field.sql)
- [server/migrations/enterprise_order_management.sql](server/migrations/enterprise_order_management.sql)

### Problem

The seller-upgrade flow inserts into `wholesaler_profiles` using columns such as `company_name`, `gstin`, `contact_phone`, `city`, and `is_verified`, but the checked-in migrations do not clearly establish those columns in the schema.

### Evidence

In [server/src/controllers/authController.js](server/src/controllers/authController.js):

```js
await pool.query(
  `INSERT INTO wholesaler_profiles (user_id, company_name, gstin, contact_phone, city, is_verified) 
   VALUES ($1, $2, $3, $4, $5, false)`,
  [userId, companyName, gstin, phone, city],
);
```

### Impact

On a fresh database created from the checked-in migrations, the upgrade flow may throw column-not-found errors.

### Reproduction

1. Create a new database from the checked-in migrations.
2. Trigger the seller-upgrade flow.
3. The insert can fail if the expected profile columns are missing.

### Status

Potential issue / needs live database verification.

---

## Validation results

### Backend tests

I ran:

```bash
node --test tests/orderStatusService.test.js
```

Result:

- 2 tests passed
- 0 failed

### Frontend build

I ran:

```bash
npm run build
```

Result:

- Vite production build completed successfully

---

## Suggested prompt for the next agent

Use the following prompt as a starting point:

> Review the defects documented in [BUGS_AND_ERRORS_README.md](BUGS_AND_ERRORS_README.md) and fix them one by one in the current project. Prioritize the verified issues first: (1) mount the messages router so `/api/messages` requests work, (2) fix the payment-status transition logic so payment confirmation no longer fails, (3) add ownership checks to order read/update routes, and (4) fix the dashboard sidebar state bug. Preserve existing behavior where possible and avoid introducing unrelated refactors.
