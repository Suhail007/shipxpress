import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("admin"), // admin, driver, staff, viewer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Drivers table for additional driver-specific information
export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  vehicleType: varchar("vehicle_type"), // van, truck, bike
  vehicleNumber: varchar("vehicle_number"),
  licenseNumber: varchar("license_number"),
  phone: varchar("phone"),
  status: varchar("status").notNull().default("offline"), // online, offline, on_delivery, break
  location: jsonb("location"), // {lat, lng, address}
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  driverId: integer("driver_id").references(() => drivers.id),
  status: varchar("status").notNull().default("pending"), // pending, assigned, picked, in_transit, delivered, failed
  priority: varchar("priority").default("standard"), // standard, high, urgent
  packageType: varchar("package_type"),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  pickupDateTime: timestamp("pickup_date_time"),
  deliveryDateTime: timestamp("delivery_date_time"),
  specialInstructions: text("special_instructions"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  deliveryProofUrl: varchar("delivery_proof_url"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order status history
export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  status: varchar("status").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  notes: text("notes"),
  location: jsonb("location"), // {lat, lng, address}
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  driver: one(drivers, {
    fields: [users.id],
    references: [drivers.userId],
  }),
  createdOrders: many(orders),
  activityLogs: many(activityLogs),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  driver: one(drivers, {
    fields: [orders.driverId],
    references: [drivers.id],
  }),
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  statusHistory: many(orderStatusHistory),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
  updatedByUser: one(users, {
    fields: [orderStatusHistory.updatedBy],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "assigned", "picked", "in_transit", "delivered", "failed"]),
  notes: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }).optional(),
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type UpdateOrderStatus = z.infer<typeof updateOrderStatusSchema>;
