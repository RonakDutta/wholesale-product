const pool = require("../config/db");
const { Queue, QueueScheduler, Worker } = require("bullmq");
const redis = require("../config/redis");
const { sendEmail } = require("./emailService");
const { sendSms } = require("./smsService");
const { sendPushNotification } = require("./pushService");
const { sendWhatsApp } = require("./whatsappService");
const { emitUserNotification, emitUnreadCount } = require("./socketService");

let notificationQueue = null;
let notificationWorker = null;
let notificationScheduler = null;
let redisReady = false;

const initNotificationQueue = () => {
  if (!redis) {
    console.warn("Redis not configured; notification queue disabled.");
    return;
  }

  if (redisReady || notificationQueue || notificationWorker || notificationScheduler) {
    return;
  }

  try {
    notificationQueue = new Queue("notificationQueue", { connection: redis });
    notificationScheduler = new QueueScheduler("notificationQueue", { connection: redis });
    notificationWorker = new Worker(
      "notificationQueue",
      async (job) => {
        try {
          return await deliverNotification(job.data);
        } catch (err) {
          console.error("Notification worker failed:", err);
          throw err;
        }
      },
      { connection: redis, autorun: true },
    );

    notificationWorker.on("failed", async (job, err) => {
      console.error("Notification job failed:", job?.id, err?.message || err);
    });

    notificationWorker.on("error", (error) => {
      console.error("Notification worker error:", error?.message || error);
    });

    redisReady = true;
    console.log("Notification queue initialized using Redis.");
  } catch (err) {
    notificationQueue = null;
    notificationWorker = null;
    notificationScheduler = null;
    redisReady = false;
    console.error("Notification queue setup failed. Notifications will be delivered immediately.", err?.message || err);
  }
};

if (redis) {
  redis.on("ready", () => {
    if (!redisReady) {
      initNotificationQueue();
    }
  });

  redis.on("error", (error) => {
    console.error("Redis connection error for notifications:", error?.message || error);
    redisReady = false;
  });

  if (redis.status === "ready") {
    initNotificationQueue();
  }
}

const NOTIFICATION_CHANNELS = {
  IN_APP: "in_app",
  EMAIL: "email",
  SMS: "sms",
  PUSH: "push",
  WHATSAPP: "whatsapp",
};

const NOTIFICATION_TYPES = {
  order_update: "order_update",
  payment_update: "payment_update",
  promotion: "promotion",
  inventory: "inventory",
  review: "review",
  auth: "auth",
};

const QUEUE_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: true,
  removeOnFail: false,
};

const createNotificationRecord = async ({ userId, title, message, notificationType, channel, referenceId = null, referenceType = null, priority = "normal" }) => {
  const query = `INSERT INTO notifications (user_id, title, message, notification_type, channel, reference_id, reference_type, priority, is_read, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,NOW()) RETURNING *`;
  const { rows } = await pool.query(query, [userId, title, message, notificationType, channel, referenceId, referenceType, priority]);
  return rows[0];
};

const createNotificationPreference = async (userId) => {
  await pool.query(
    `INSERT INTO notification_preferences (user_id, email_enabled, sms_enabled, push_enabled, whatsapp_enabled, marketing_enabled, order_updates_enabled, inventory_enabled) VALUES ($1, true, false, false, false, false, true, true) ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
};

const getUserPreferences = async (userId) => {
  const { rows } = await pool.query("SELECT * FROM notification_preferences WHERE user_id = $1", [userId]);
  return rows[0] || null;
};

const ensureNotificationPreferences = async (userId) => {
  let preferences = await getUserPreferences(userId);
  if (!preferences) {
    await createNotificationPreference(userId);
    preferences = await getUserPreferences(userId);
  }
  return preferences;
};

const enqueueNotification = async (payload, opts = {}) => {
  if (!notificationQueue || !redisReady) {
    console.warn("Notification queue is unavailable; delivering immediately.");
    return await deliverNotification(payload);
  }

  return await notificationQueue.add("sendNotification", payload, { ...QUEUE_OPTIONS, ...opts });
};

const deliverNotification = async (payload) => {
  const {
    userId,
    title,
    message,
    notificationType,
    referenceId,
    referenceType,
    channels = [NOTIFICATION_CHANNELS.IN_APP],
    smsPayload,
    emailPayload,
    pushPayload,
    whatsappPayload,
    priority = "normal",
  } = payload;

  const preferences = await ensureNotificationPreferences(userId);
  if (!preferences) {
    throw new Error("Notification preferences were not found for user");
  }

  const deliveredChannels = [];
  const notificationRecord = await createNotificationRecord({
    userId,
    title,
    message,
    notificationType,
    channel: channels.join(","),
    referenceId,
    referenceType,
    priority,
  });

  if (channels.includes(NOTIFICATION_CHANNELS.EMAIL) && preferences.email_enabled) {
    if (emailPayload?.to) {
      const emailResult = await sendEmail({
        to: emailPayload.to,
        subject: emailPayload.subject || title,
        templateName: emailPayload.templateName || notificationType,
        variables: emailPayload.variables || {},
      });
      await logNotification(notificationRecord.id, NOTIFICATION_CHANNELS.EMAIL, "sent", emailResult);
      deliveredChannels.push(NOTIFICATION_CHANNELS.EMAIL);
    }
  }

  if (channels.includes(NOTIFICATION_CHANNELS.SMS) && preferences.sms_enabled) {
    if (smsPayload?.to) {
      const smsResult = await sendSms({ to: smsPayload.to, body: smsPayload.body });
      await logNotification(notificationRecord.id, NOTIFICATION_CHANNELS.SMS, "sent", smsResult);
      deliveredChannels.push(NOTIFICATION_CHANNELS.SMS);
    }
  }

  if (channels.includes(NOTIFICATION_CHANNELS.PUSH) && preferences.push_enabled) {
    const tokens = await getDeviceTokens(userId);
    if (tokens.length > 0) {
      const pushResult = await sendPushNotification({
        tokens,
        topic: pushPayload?.topic,
        title: pushPayload?.title || title,
        body: pushPayload?.body || message,
        data: pushPayload?.data || {},
      });
      await logNotification(notificationRecord.id, NOTIFICATION_CHANNELS.PUSH, "sent", pushResult);
      deliveredChannels.push(NOTIFICATION_CHANNELS.PUSH);
    }
  }

  if (channels.includes(NOTIFICATION_CHANNELS.WHATSAPP) && preferences.whatsapp_enabled) {
    if (whatsappPayload?.to) {
      const whatsappResult = await sendWhatsApp({
        to: whatsappPayload.to,
        body: whatsappPayload.body,
        templateName: whatsappPayload.templateName,
        variables: whatsappPayload.variables,
      });
      await logNotification(notificationRecord.id, NOTIFICATION_CHANNELS.WHATSAPP, "sent", whatsappResult);
      deliveredChannels.push(NOTIFICATION_CHANNELS.WHATSAPP);
    }
  }

  await emitUserNotification(userId, notificationRecord);
  await emitUnreadCount(userId, async (targetUserId) => {
    const { rows } = await pool.query("SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false", [targetUserId]);
    return Number(rows[0].count || 0);
  });

  return { notificationRecord, deliveredChannels };
};

const logNotification = async (notificationId, channel, status, providerResponse) => {
  await pool.query(
    `INSERT INTO notification_logs (notification_id, channel, status, provider_response, sent_at) VALUES ($1,$2,$3,$4,NOW())`,
    [notificationId, channel, status, JSON.stringify(providerResponse || {})],
  );
};

const getDeviceTokens = async (userId) => {
  const { rows } = await pool.query("SELECT token FROM device_tokens WHERE user_id = $1 AND token IS NOT NULL", [userId]);
  return rows.map((item) => item.token);
};

module.exports = {
  notificationQueue,
  enqueueNotification,
  deliverNotification,
  getUserPreferences,
  ensureNotificationPreferences,
  getDeviceTokens,
  createNotificationRecord,
  createNotificationPreference,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
};
