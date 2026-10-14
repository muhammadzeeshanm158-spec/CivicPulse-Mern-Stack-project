import cron from "node-cron";
import pool from "../config/db.js";
import { getIO } from "../config/socket.js";
import { notificationModel } from "../models/notificationModel.js";

// Store cron instance taake graceful shutdown par stop kar sakein
let slaTask: ReturnType<typeof cron.schedule> | null = null;

export const initSLAScheduler = () => {

  // ============================================================
  // 🔄 SLA SCHEDULER — Har 15 minute - PDF ka sabse imp feature
  // ============================================================
  // Kaam:
  // 1. Deadline cross issues ko slaBreached=TRUE
  // 2. Priority recalc (severity*10 + upvotes + hours/6)
  // 3. Manager + reporter ko notify + socket emit
  slaTask = cron.schedule("*/15 * * * *", async () => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 🚨 STEP A: Naye breached issues detect karo - FOR UPDATE lock se duplicate notify rokna
      // FOR UPDATE = Dusra instance same row ko lock nahi kar payega
      const [newBreaches]: any = await connection.execute(
        `SELECT id, ticketNo, user_id, category_id, assigned_to
         FROM issues
         WHERE deadline < NOW()
         AND slaBreached = FALSE
         AND status NOT IN ('Resolved', 'Closed', 'Rejected', 'Duplicate')
         FOR UPDATE`
      );

      // 🚨 STEP B: Breach flag update
      const [breachResult]: any = await connection.execute(
        `UPDATE issues
         SET slaBreached = TRUE
         WHERE deadline < NOW()
         AND slaBreached = FALSE
         AND status NOT IN ('Resolved', 'Closed', 'Rejected', 'Duplicate')`
      );

      // 📈 STEP C: Priority recalculate - Har 15 min me time factor badhta hai
      // Formula: severity*10 + upvotes + hours/6
      await connection.execute(
        `UPDATE issues i
         JOIN categories c ON i.category_id = c.id
         SET i.priorityScore = (c.severityLevel * 10) + i.upvoteCount + FLOOR(TIMESTAMPDIFF(HOUR, i.createdAt, NOW()) / 6)
         WHERE i.status NOT IN ('Resolved', 'Closed', 'Rejected', 'Duplicate')`
      );

      // 💥 STEP D: Notifications - Sirf naye breaches ke liye
      if (newBreaches.length > 0) {
        // ✅ FIX: Manager ID dynamically - Hardcode user 1 nahi
        const categoryIds = newBreaches.map((b: any) => b.category_id);
        let managers: any[] = [];
        if (categoryIds.length > 0) {
          const [mgrRows]: any = await connection.execute(
            `SELECT DISTINCT d.manager_id
             FROM departments d
             JOIN categories c ON c.department_id = d.id
             WHERE c.id IN (${categoryIds.map(() => '?').join(',')}) AND d.manager_id IS NOT NULL`,
            categoryIds
          );
          managers = mgrRows;
        }

        for (const ticket of newBreaches) {
          const alertMessage = `🚨 CRITICAL SLA BREACH: Ticket #${ticket.ticketNo} has breached its deadline!`;

          for (const mgr of managers) {
            await notificationModel.createNotification(mgr.manager_id, "sla_breached", ticket.id, alertMessage);
          }

          if (ticket.user_id) {
            await notificationModel.createNotification(
              ticket.user_id, "sla_breached", ticket.id,
              `Aapki report #${ticket.ticketNo} ka SLA breach ho gaya hai. Manager ko notify kar diya gaya hai.`
            );
          }

          // ⚡ Socket - ✅ FIX: Colon format `user:` - Privacy safe
          try {
            const io = getIO();
            for (const mgr of managers) {
              io.to(`user:${mgr.manager_id}`).emit("notification:new", { type: "sla_breached", issueId: ticket.id, ticketNo: ticket.ticketNo, message: alertMessage });
            }
            if (ticket.user_id) {
              io.to(`user:${ticket.user_id}`).emit("notification:new", { type: "sla_breached", issueId: ticket.id, message: alertMessage });
            }
          } catch (socketError) {
            console.log("Scheduler socket broadcast error:", socketError);
          }
        }
      }

      await connection.commit();
      connection.release();

      if (breachResult.affectedRows > 0) {
        console.log(`⚠ [SLA Alert] ${breachResult.affectedRows} new issue(s) breached deadline and all scores refreshed!`);
      }
    } catch (error) {
      if (connection) { await connection.rollback(); connection.release(); }
      console.error("Error in SLA Background Scheduler:", error);
    }
  });

  console.log("🚀 SLA Automated Scheduler (15 Min Interval) with Live Priority Engine is running...");
  return slaTask;
};

// ✅ Graceful shutdown ke liye - server.ts me call karo
export const stopSLAScheduler = () => {
  if (slaTask) {
    slaTask.stop();
    console.log("🛑 SLA Scheduler stopped gracefully.");
  }
};