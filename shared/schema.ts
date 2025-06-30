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
  date,
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
  
  // Customer info for labels and display
  customerName: varchar("customer_name"),
  customerPhone: varchar("customer_phone"),
  customerEmail: varchar("customer_email"),
  
  // Delivery Address - structured fields
  deliveryLine1: varchar("delivery_line1").notNull(),
  deliveryLine2: varchar("delivery_line2").default(""),
  deliveryCity: varchar("delivery_city").notNull(),
  deliveryState: varchar("delivery_state").notNull(),
  deliveryZip: varchar("delivery_zip").notNull(),
  deliveryCountry: varchar("delivery_country").notNull().default("US"),
  
  // Package Information - support multiple boxes
  packages: jsonb("packages").notNull(), // Array of {type, weight, dimensions: {length, width, height}}
  
  pickupDate: varchar("pickup_date").notNull(), // Only date as string YYYY-MM-DD
  specialInstructions: text("special_instructions").default(""),
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

export const insertOrderSchema = z.object({
  // Customer info for form
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(10, "Phone number is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  
  // Delivery address fields
  deliveryLine1: z.string().min(1, "Address line 1 is required"),
  deliveryLine2: z.string().optional().default(""),
  deliveryCity: z.string().min(1, "City is required"),
  deliveryState: z.string().min(1, "State is required"),
  deliveryZip: z.string().min(1, "ZIP code is required"),
  deliveryCountry: z.string().default("US"),
  
  // Pickup date
  pickupDate: z.string().min(1, "Pickup date is required"),
  
  // Package array validation
  packages: z.array(z.object({
    type: z.string().min(1, "Package type is required"),
    weight: z.number().min(0.1, "Weight must be greater than 0"),
    dimensions: z.object({
      length: z.number().min(1, "Length is required"),
      width: z.number().min(1, "Width is required"), 
      height: z.number().min(1, "Height is required"),
    })
  })).min(1, "At least one package is required"),
  
  // Optional fields
  specialInstructions: z.string().optional().default(""),
  createdBy: z.string().optional(),
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
