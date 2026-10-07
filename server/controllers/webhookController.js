import { verifyWebhook } from "@clerk/express/webhooks";
import { sql } from "../config/db.js";

export const handleClerkWebhook = async (req, res) => {
  try {
    const evt = await verifyWebhook(req);

    const { type, data } = evt;

    console.log("CLERK WEBHOOK RECEIVED:", type);
    console.log("CLERK USER ID:", data?.id);

    switch (type) {
      case "user.created": {
        const userId = data.id;

        const primaryEmail =
          data.email_addresses?.find(
            (email) => email.id === data.primary_email_address_id
          )?.email_address ||
          data.email_addresses?.[0]?.email_address ||
          "";

        const name =
          `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
          "User";

        const image = data.image_url || "";

        await sql`
          INSERT INTO users (
            id,
            name,
            email,
            image,
            plan
          )
          VALUES (
            ${userId},
            ${name},
            ${primaryEmail},
            ${image},
            'free'
          )
          ON CONFLICT (id)
          DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            image = EXCLUDED.image,
            updated_at = NOW()
        `;

        console.log("✅ USER INSERTED INTO NEON:", userId);

        break;
      }

      case "user.updated": {
        const userId = data.id;

        const primaryEmail =
          data.email_addresses?.find(
            (email) => email.id === data.primary_email_address_id
          )?.email_address ||
          data.email_addresses?.[0]?.email_address ||
          "";

        const name =
          `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
          "User";

        const image = data.image_url || "";

        const result = await sql`
          UPDATE users
          SET
            name = ${name},
            email = ${primaryEmail},
            image = ${image},
            updated_at = NOW()
          WHERE id = ${userId}
          RETURNING id
        `;

        console.log("✅ USER UPDATED:", result);

        break;
      }

      case "user.deleted": {
        const userId = data.id;

        await sql`
          DELETE FROM users
          WHERE id = ${userId}
        `;

        console.log("✅ USER DELETED:", userId);

        break;
      }

      default:
        console.log("Unhandled Clerk event:", type);
    }

    return res.status(200).json({
      success: true,
      eventType: type,
    });
  } catch (error) {
    console.error("❌ CLERK WEBHOOK ERROR:");
    console.error(error);

    return res.status(400).json({
      success: false,
      error: error.message || "Webhook verification failed",
    });
  }
};