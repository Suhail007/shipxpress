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
  time,
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
  role: varchar("role").notNull().default("client"), // super_admin, client, driver, staff
  clientId: integer("client_id"),
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
  assignedZoneId: integer("assigned_zone_id").references(() => zones.id), // One zone per driver
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  clientId: integer("client_id").references(() => clients.id),
  driverId: integer("driver_id").references(() => drivers.id),
  status: varchar("status").notNull().default("pending"), // pending, assigned, picked, in_transit, delivered, failed, voided
  
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
  deliveryCoordinates: jsonb("delivery_coordinates"), // {lat, lng}
  
  // Package Information - support multiple boxes
  packages: jsonb("packages").notNull(), // Array of {type, weight, dimensions: {length, width, height}}
  
  pickupDate: varchar("pickup_date").notNull(), // Only date as string YYYY-MM-DD
  specialInstructions: text("special_instructions").default(""),
  
  // Route optimization
  batchId: integer("batch_id").references(() => routeBatches.id),
  zoneId: integer("zone_id").references(() => zones.id),
  routeSequence: integer("route_sequence"), // Order in optimized route
  
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  deliveryProofUrl: varchar("delivery_proof_url"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Void functionality
  voidedAt: timestamp("voided_at"),
  voidedBy: varchar("voided_by").references(() => users.id),
  voidReason: text("void_reason"),
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

// Client management table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address: text("address").notNull(),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  loginUsername: varchar("login_username").unique(),
  loginPassword: varchar("login_password"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zone management for route optimization
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // A, B, C, D
  direction: varchar("direction").notNull(), // north, south, east, west
  maxDistance: integer("max_distance").default(300), // miles
  baseAddress: text("base_address").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Route batches for cutoff time management
export const routeBatches = pgTable("route_batches", {
  id: serial("id").primaryKey(),
  batchDate: date("batch_date").notNull(),
  cutoffTime: varchar("cutoff_time").default("14:30:00"), // 2:30 PM
  status: varchar("status").default("pending"), // pending, optimized, assigned, completed
  orderCount: integer("order_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  optimizedAt: timestamp("optimized_at"),
});

// Optimized routes for each zone
export const optimizedRoutes = pgTable("optimized_routes", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  zoneId: integer("zone_id").notNull(),
  driverId: integer("driver_id"),
  routeData: jsonb("route_data"), // Contains optimized order sequence
  estimatedDistance: decimal("estimated_distance", { precision: 10, scale: 2 }),
  estimatedTime: integer("estimated_time"), // minutes
  status: varchar("status").default("pending"), // pending, assigned, in_progress, completed
  createdAt: timestamp("created_at").defaultNow(),
  assignedAt: timestamp("assigned_at"),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  driver: one(drivers, {
    fields: [users.id],
    references: [drivers.userId],
  }),
  client: one(clients, {
    fields: [users.clientId],
    references: [clients.id],
  }),
  createdOrders: many(orders),
  activityLogs: many(activityLogs),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  users: many(users),
  orders: many(orders),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
  assignedZone: one(zones, {
    fields: [drivers.assignedZoneId],
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
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  driver: one(drivers, {
    fields: [orders.driverId],
    references: [drivers.id],
  }),
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  batch: one(routeBatches, {
    fields: [orders.batchId],
    references: [routeBatches.id],
  }),
  zone: one(zones, {
    fields: [orders.zoneId],
    references: [zones.id],
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
// Zod schemas for validation
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
  optimizedAt: true,
});

export const insertOptimizedRouteSchema = createInsertSchema(optimizedRoutes).omit({
  id: true,
  createdAt: true,
  assignedAt: true,
});

export const voidOrderSchema = z.object({
  reason: z.string().min(1, "Void reason is required"),
});

// Type definitions
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

// New types for route optimization
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Zone = typeof zones.$inferSelect;
export type InsertRouteBatch = z.infer<typeof insertRouteBatchSchema>;
export type RouteBatch = typeof routeBatches.$inferSelect;
export type InsertOptimizedRoute = z.infer<typeof insertOptimizedRouteSchema>;
export type OptimizedRoute = typeof optimizedRoutes.$inferSelect;
export type VoidOrder = z.infer<typeof voidOrderSchema>;
