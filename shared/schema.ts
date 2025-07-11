import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  numeric,
  boolean,
  date,
  time,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
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
  role: varchar("role").notNull().default("client"), // super_admin, client, driver, staff
  clientId: integer("client_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Drivers table for additional driver-specific information
export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  licenseNumber: varchar("license_number"),
  vehicle: varchar("vehicle"),
  status: varchar("status").notNull().default("offline"), // online, offline, busy
  currentLocation: jsonb("current_location"),
  phoneNumber: varchar("phone_number"),
  isActive: boolean("is_active").notNull().default(true),
  zoneId: integer("zone_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number").notNull().unique(),
  clientId: integer("client_id"),
  customerId: integer("customer_id"),
  driverId: integer("driver_id"),
  zoneId: integer("zone_id"),
  customerName: varchar("customer_name").notNull(),
  customerPhone: varchar("customer_phone"),
  customerEmail: varchar("customer_email"),
  deliveryLine1: varchar("delivery_line1").notNull(),
  deliveryLine2: varchar("delivery_line2"),
  deliveryCity: varchar("delivery_city").notNull(),
  deliveryState: varchar("delivery_state").notNull(),
  deliveryZip: varchar("delivery_zip").notNull(),
  deliveryCountry: varchar("delivery_country").notNull().default("USA"),
  pickupDate: date("pickup_date").notNull(),
  packages: jsonb("packages").notNull(),
  weight: numeric("weight", { precision: 10, scale: 2 }),
  distance: numeric("distance", { precision: 10, scale: 2 }),
  specialInstructions: text("special_instructions"),
  status: varchar("status").notNull().default("pending"), // pending, assigned, in_transit, delivered, voided
  assignedAt: timestamp("assigned_at"),
  pickedUpAt: timestamp("picked_up_at"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  coordinates: jsonb("coordinates"),
  createdBy: varchar("created_by"),
  voidReason: varchar("void_reason"),
  voidedAt: timestamp("voided_at"),
  voidedBy: varchar("voided_by"),
  batchId: integer("batch_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  phone: varchar("phone"),
  email: varchar("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order status history table
export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  status: varchar("status").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  updatedBy: varchar("updated_by"),
  notes: text("notes"),
});

// Activity logs table
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  action: varchar("action").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Clients table for multi-tenant support
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address: text("address"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  loginUsername: varchar("login_username").unique().notNull(),
  loginPassword: varchar("login_password").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zones table for delivery zones
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  direction: varchar("direction").notNull(), // North, South, East, West
  radius: integer("radius").notNull().default(300), // miles
  centerLat: numeric("center_lat", { precision: 10, scale: 8 }),
  centerLng: numeric("center_lng", { precision: 11, scale: 8 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Route batches table for daily batch processing
export const routeBatches = pgTable("route_batches", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  cutoffTime: time("cutoff_time").notNull().default("14:30:00"), // 2:30 PM
  status: varchar("status").notNull().default("open"), // open, processing, completed
  totalOrders: integer("total_orders").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Optimized routes table
export const optimizedRoutes = pgTable("optimized_routes", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  zoneId: integer("zone_id").notNull(),
  driverId: integer("driver_id"),
  routeData: jsonb("route_data"),
  estimatedDistance: numeric("estimated_distance", { precision: 10, scale: 2 }),
  estimatedTime: integer("estimated_time"), // minutes
  status: varchar("status").default("pending"), // pending, assigned, in_progress, completed
  assignedAt: timestamp("assigned_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  driver: one(drivers, {
    fields: [users.id],
    references: [drivers.userId],
  }),
  activityLogs: many(activityLogs),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  orders: many(orders),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
  zone: one(zones, {
    fields: [drivers.zoneId],
    references: [zones.id],
  }),
  orders: many(orders),
  optimizedRoutes: many(optimizedRoutes),
}));

export const zonesRelations = relations(zones, ({ many }) => ({
  drivers: many(drivers),
  orders: many(orders),
  optimizedRoutes: many(optimizedRoutes),
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
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  zone: one(zones, {
    fields: [orders.zoneId],
    references: [zones.id],
  }),
  routeBatch: one(routeBatches, {
    fields: [orders.batchId],
    references: [routeBatches.id],
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
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const routeBatchesRelations = relations(routeBatches, ({ many }) => ({
  orders: many(orders),
  optimizedRoutes: many(optimizedRoutes),
}));

export const optimizedRoutesRelations = relations(optimizedRoutes, ({ one }) => ({
  batch: one(routeBatches, {
    fields: [optimizedRoutes.batchId],
    references: [routeBatches.id],
  }),
  zone: one(zones, {
    fields: [optimizedRoutes.zoneId],
    references: [zones.id],
  }),
  driver: one(drivers, {
    fields: [optimizedRoutes.driverId],
    references: [drivers.id],
  }),
}));

// Insert schemas
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
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  deliveryLine1: z.string().min(1, "Delivery address is required"),
  deliveryLine2: z.string().optional(),
  deliveryCity: z.string().min(1, "City is required"),
  deliveryState: z.string().min(1, "State is required"),
  deliveryZip: z.string().min(1, "Zip code is required"),
  deliveryCountry: z.string().default("USA"),
  pickupDate: z.string(),
  packages: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    weight: z.number().optional(),
    dimensions: z.string().optional(),
  })),
  weight: z.number().optional(),
  distance: z.number().optional(),
  specialInstructions: z.string().optional(),
  createdBy: z.string().optional(),
  clientId: z.number().optional(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "assigned", "in_transit", "delivered", "voided"]),
  notes: z.string().optional(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertZoneSchema = createInsertSchema(zones).omit({
  id: true,
  createdAt: true,
});

export const insertRouteBatchSchema = createInsertSchema(routeBatches).omit({
  id: true,
  createdAt: true,
});

export const insertOptimizedRouteSchema = createInsertSchema(optimizedRoutes).omit({
  id: true,
  createdAt: true,
});

export const voidOrderSchema = z.object({
  voidReason: z.string().min(1, "Void reason is required"),
});

export const clientLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
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

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Zone = typeof zones.$inferSelect;

export type InsertRouteBatch = z.infer<typeof insertRouteBatchSchema>;
export type RouteBatch = typeof routeBatches.$inferSelect;

export type InsertOptimizedRoute = z.infer<typeof insertOptimizedRouteSchema>;
export type OptimizedRoute = typeof optimizedRoutes.$inferSelect;

export type VoidOrder = z.infer<typeof voidOrderSchema>;
export type ClientLogin = z.infer<typeof clientLoginSchema>;