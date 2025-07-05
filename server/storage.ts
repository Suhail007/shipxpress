import {
  users,
  drivers,
  orders,
  customers,
  orderStatusHistory,
  activityLogs,
  clients,
  zones,
  routeBatches,
  optimizedRoutes,
  type User,
  type UpsertUser,
  type Driver,
  type InsertDriver,
  type Order,
  type InsertOrder,
  type Customer,
  type InsertCustomer,
  type OrderStatusHistory,
  type ActivityLog,
  type UpdateOrderStatus,
  type Client,
  type InsertClient,
  type Zone,
  type InsertZone,
  type RouteBatch,
  type InsertRouteBatch,
  type OptimizedRoute,
  type InsertOptimizedRoute,
  type VoidOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Client operations
  createClient(client: InsertClient): Promise<Client>;
  getClient(id: number): Promise<Client | undefined>;
  getClientByCredentials(username: string, password: string): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;
  updateClient(id: number, updates: Partial<InsertClient>): Promise<Client>;
  
  // Zone operations
  createZone(zone: InsertZone): Promise<Zone>;
  getZone(id: number): Promise<Zone | undefined>;
  getAllZones(): Promise<Zone[]>;
  updateZone(id: number, updates: Partial<InsertZone>): Promise<Zone>;
  
  // Driver operations
  createDriver(driver: InsertDriver): Promise<Driver>;
  getDriver(id: number): Promise<Driver | undefined>;
  getDriverByUserId(userId: string): Promise<Driver | undefined>;
  getAllDrivers(): Promise<Driver[]>;
  updateDriverStatus(id: number, status: string, location?: any): Promise<Driver>;
  getAvailableDrivers(): Promise<Driver[]>;
  assignDriverToZone(driverId: number, zoneId: number): Promise<Driver>;
  getDriversByZone(zoneId: number): Promise<Driver[]>;
  
  // Customer operations
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getAllOrders(filters?: any): Promise<Order[]>;
  getOrdersForClient(clientId: number, filters?: any): Promise<Order[]>;
  updateOrderStatus(orderId: number, statusUpdate: UpdateOrderStatus, updatedBy: string): Promise<Order>;
  assignOrderToDriver(orderId: number, driverId: number, assignedBy: string): Promise<Order>;
  getOrdersForDriver(driverId: number, status?: string): Promise<Order[]>;
  voidOrder(orderId: number, voidData: VoidOrder, voidedBy: string): Promise<Order>;
  
  // Route batch operations
  createRouteBatch(batch: InsertRouteBatch): Promise<RouteBatch>;
  getCurrentBatch(date: string): Promise<RouteBatch | undefined>;
  getRouteBatch(id: number): Promise<RouteBatch | undefined>;
  addOrderToBatch(orderId: number, batchId: number): Promise<void>;
  optimizeBatch(batchId: number): Promise<OptimizedRoute[]>;
  
  // Optimized route operations
  createOptimizedRoute(route: InsertOptimizedRoute): Promise<OptimizedRoute>;
  getOptimizedRoute(id: number): Promise<OptimizedRoute | undefined>;
  getRoutesByBatch(batchId: number): Promise<OptimizedRoute[]>;
  assignRouteToDriver(routeId: number, driverId: number): Promise<OptimizedRoute>;
  
  // Order status history
  getOrderStatusHistory(orderId: number): Promise<OrderStatusHistory[]>;
  
  // Activity logs
  logActivity(userId: string, action: string, description: string, metadata?: any): Promise<ActivityLog>;
  getRecentActivity(limit?: number): Promise<ActivityLog[]>;
  
  // Dashboard stats
  getDashboardStats(): Promise<any>;
  getSuperAdminStats(): Promise<any>;
  getClientStats(clientId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Client operations
  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(clientData).returning();
    return client;
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByCredentials(username: string, password: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(
      and(
        eq(clients.loginUsername, username),
        eq(clients.loginPassword, password)
      )
    );
    return client;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.isActive, true)).orderBy(clients.name);
  }

  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  // Zone operations
  async createZone(zoneData: InsertZone): Promise<Zone> {
    const [zone] = await db.insert(zones).values(zoneData).returning();
    return zone;
  }

  async getZone(id: number): Promise<Zone | undefined> {
    const [zone] = await db.select().from(zones).where(eq(zones.id, id));
    return zone;
  }

  async getAllZones(): Promise<Zone[]> {
    return await db.select().from(zones).where(eq(zones.isActive, true)).orderBy(zones.name);
  }

  async updateZone(id: number, updates: Partial<InsertZone>): Promise<Zone> {
    const [zone] = await db
      .update(zones)
      .set(updates)
      .where(eq(zones.id, id))
      .returning();
    return zone;
  }

  async createDriver(driverData: InsertDriver): Promise<Driver> {
    const [driver] = await db
      .insert(drivers)
      .values(driverData)
      .returning();
    return driver;
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver;
  }

  async getDriverByUserId(userId: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, userId));
    return driver;
  }

  async getAllDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers).orderBy(desc(drivers.createdAt));
  }

  async updateDriverStatus(id: number, status: string, location?: any): Promise<Driver> {
    const [driver] = await db
      .update(drivers)
      .set({
        status,
        location,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, id))
      .returning();
    return driver;
  }

  async getAvailableDrivers(): Promise<Driver[]> {
    return await db
      .select()
      .from(drivers)
      .where(and(eq(drivers.isAvailable, true), eq(drivers.status, "online")));
  }

  async assignDriverToZone(driverId: number, zoneId: number): Promise<Driver> {
    const [driver] = await db
      .update(drivers)
      .set({
        assignedZoneId: zoneId,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, driverId))
      .returning();
    return driver;
  }

  async getDriversByZone(zoneId: number): Promise<Driver[]> {
    return await db.select().from(drivers).where(eq(drivers.assignedZoneId, zoneId));
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values(customerData)
      .returning();
    return customer;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
    return customer;
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    // Generate order number
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    // First create or find customer
    let customer = await this.getCustomerByPhone(orderData.customerPhone);
    if (!customer) {
      customer = await this.createCustomer({
        name: orderData.customerName,
        phone: orderData.customerPhone,
        email: orderData.customerEmail || null,
      });
    }
    
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId: customer.id,
        status: "pending",
        deliveryLine1: orderData.deliveryLine1,
        deliveryLine2: orderData.deliveryLine2,
        deliveryCity: orderData.deliveryCity,
        deliveryState: orderData.deliveryState,
        deliveryZip: orderData.deliveryZip,
        deliveryCountry: orderData.deliveryCountry,
        packages: orderData.packages,
        pickupDate: orderData.pickupDate,
        specialInstructions: orderData.specialInstructions,
        createdBy: orderData.createdBy,
      })
      .returning();
    
    return order;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order;
  }

  async getAllOrders(filters?: any): Promise<Order[]> {
    if (filters?.status && filters?.search) {
      return await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.status, filters.status),
            or(
              like(orders.orderNumber, `%${filters.search}%`),
              like(orders.deliveryLine1, `%${filters.search}%`),
              like(orders.deliveryCity, `%${filters.search}%`)
            )
          )
        )
        .orderBy(desc(orders.createdAt));
    }
    
    if (filters?.status && filters.status !== "all") {
      return await db
        .select()
        .from(orders)
        .where(eq(orders.status, filters.status))
        .orderBy(desc(orders.createdAt));
    }
    
    if (filters?.search) {
      return await db
        .select()
        .from(orders)
        .where(
          or(
            like(orders.orderNumber, `%${filters.search}%`),
            like(orders.deliveryLine1, `%${filters.search}%`),
            like(orders.deliveryCity, `%${filters.search}%`)
          )
        )
        .orderBy(desc(orders.createdAt));
    }
    
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(orderId: number, statusUpdate: UpdateOrderStatus, updatedBy: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({
        status: statusUpdate.status,
        updatedAt: new Date(),
        ...(statusUpdate.status === "delivered" && { actualDeliveryTime: new Date() }),
      })
      .where(eq(orders.id, orderId))
      .returning();

    // Add to status history
    await db.insert(orderStatusHistory).values({
      orderId,
      status: statusUpdate.status,
      notes: statusUpdate.notes,
      location: statusUpdate.location,
      updatedBy,
    });

    return order;
  }

  async assignOrderToDriver(orderId: number, driverId: number, assignedBy: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({
        driverId,
        status: "assigned",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    // Add to status history
    await db.insert(orderStatusHistory).values({
      orderId,
      status: "assigned",
      notes: `Assigned to driver #${driverId}`,
      updatedBy: assignedBy,
    });

    return order;
  }

  async getOrdersForDriver(driverId: number, status?: string): Promise<Order[]> {
    if (status) {
      return await db
        .select()
        .from(orders)
        .where(and(eq(orders.driverId, driverId), eq(orders.status, status)))
        .orderBy(desc(orders.createdAt));
    }
    
    return await db
      .select()
      .from(orders)
      .where(eq(orders.driverId, driverId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrderStatusHistory(orderId: number): Promise<OrderStatusHistory[]> {
    return await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.timestamp));
  }

  async logActivity(userId: string, action: string, description: string, metadata?: any): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values({
        userId,
        action,
        description,
        metadata,
      })
      .returning();
    return log;
  }

  async getRecentActivity(limit = 20): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  async getDashboardStats(): Promise<any> {
    const [totalOrders] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const [pendingOrders] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "pending"));
    const [inTransitOrders] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "in_transit"));
    const [deliveredToday] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(
      and(
        eq(orders.status, "delivered"),
        sql`DATE(actual_delivery_time) = CURRENT_DATE`
      )
    );
    const [activeDrivers] = await db.select({ count: sql<number>`count(*)` }).from(drivers).where(eq(drivers.status, "online"));

    return {
      totalOrders: totalOrders.count,
      pendingOrders: pendingOrders.count,
      inTransitOrders: inTransitOrders.count,
      deliveredToday: deliveredToday.count,
      activeDrivers: activeDrivers.count,
    };
  }

  // Additional methods for multi-tenant route optimization
  async getOrdersForClient(clientId: number, filters?: any): Promise<Order[]> {
    if (filters?.status) {
      return await db.select().from(orders)
        .where(and(eq(orders.clientId, clientId), eq(orders.status, filters.status)))
        .orderBy(desc(orders.createdAt));
    }
    
    return await db.select().from(orders)
      .where(eq(orders.clientId, clientId))
      .orderBy(desc(orders.createdAt));
  }

  async voidOrder(orderId: number, voidData: VoidOrder, voidedBy: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({
        status: "voided",
        voidedAt: new Date(),
        voidedBy,
        voidReason: voidData.reason,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  // Route batch operations
  async createRouteBatch(batchData: InsertRouteBatch): Promise<RouteBatch> {
    const [batch] = await db.insert(routeBatches).values(batchData).returning();
    return batch;
  }

  async getCurrentBatch(date: string): Promise<RouteBatch | undefined> {
    const [batch] = await db.select().from(routeBatches).where(eq(routeBatches.batchDate, date));
    return batch;
  }

  async getRouteBatch(id: number): Promise<RouteBatch | undefined> {
    const [batch] = await db.select().from(routeBatches).where(eq(routeBatches.id, id));
    return batch;
  }

  async addOrderToBatch(orderId: number, batchId: number): Promise<void> {
    await db
      .update(orders)
      .set({ batchId, updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  }

  async optimizeBatch(batchId: number): Promise<OptimizedRoute[]> {
    // Get all orders for this batch
    const batchOrders = await db.select().from(orders).where(eq(orders.batchId, batchId));
    
    // Group orders by zones based on delivery state
    const zoneGroups = new Map<number, any[]>();
    
    for (const order of batchOrders) {
      const zone = this.determineZone(order.deliveryState || "", order.deliveryCoordinates);
      if (!zoneGroups.has(zone)) {
        zoneGroups.set(zone, []);
      }
      zoneGroups.get(zone)?.push(order);
    }

    const optimizedRoutes: OptimizedRoute[] = [];
    
    for (const [zoneId, zoneOrders] of zoneGroups.entries()) {
      const routeData = {
        orders: zoneOrders.map((order: any, index: number) => ({
          orderId: order.id,
          sequence: index + 1,
          address: `${order.deliveryLine1}, ${order.deliveryCity}, ${order.deliveryState} ${order.deliveryZip}`,
        })),
      };

      const [route] = await db
        .insert(optimizedRoutes)
        .values({
          batchId,
          zoneId,
          routeData,
          estimatedDistance: (zoneOrders.length * 15).toString(),
          estimatedTime: zoneOrders.length * 30,
        })
        .returning();

      optimizedRoutes.push(route);

      // Update orders with zone and route sequence
      for (let i = 0; i < zoneOrders.length; i++) {
        await db
          .update(orders)
          .set({ zoneId, routeSequence: i + 1 })
          .where(eq(orders.id, zoneOrders[i].id));
      }
    }

    // Mark batch as optimized
    await db
      .update(routeBatches)
      .set({ status: "optimized", optimizedAt: new Date() })
      .where(eq(routeBatches.id, batchId));

    return optimizedRoutes;
  }

  private determineZone(state: string, coordinates?: any): number {
    // Simplified zone determination - in production, this would use proper geolocation
    const northStates = ["IL", "WI", "MN", "IA", "IN", "MI", "OH"];
    const southStates = ["TX", "FL", "GA", "NC", "SC", "TN", "AL", "MS", "LA", "AR"];
    const eastStates = ["NY", "PA", "NJ", "CT", "MA", "RI", "VT", "NH", "ME", "MD", "DE", "VA", "WV"];
    const westStates = ["CA", "NV", "AZ", "UT", "CO", "NM", "WY", "MT", "ID", "WA", "OR"];

    if (northStates.includes(state)) return 1; // Zone A - North
    if (southStates.includes(state)) return 2; // Zone B - South  
    if (eastStates.includes(state)) return 3; // Zone C - East
    if (westStates.includes(state)) return 4; // Zone D - West
    
    return 1; // Default to Zone A
  }

  // Optimized route operations
  async createOptimizedRoute(routeData: InsertOptimizedRoute): Promise<OptimizedRoute> {
    const [route] = await db.insert(optimizedRoutes).values(routeData).returning();
    return route;
  }

  async getOptimizedRoute(id: number): Promise<OptimizedRoute | undefined> {
    const [route] = await db.select().from(optimizedRoutes).where(eq(optimizedRoutes.id, id));
    return route;
  }

  async getRoutesByBatch(batchId: number): Promise<OptimizedRoute[]> {
    return await db.select().from(optimizedRoutes).where(eq(optimizedRoutes.batchId, batchId));
  }

  async assignRouteToDriver(routeId: number, driverId: number): Promise<OptimizedRoute> {
    const [route] = await db
      .update(optimizedRoutes)
      .set({
        driverId,
        status: "assigned",
        assignedAt: new Date(),
      })
      .where(eq(optimizedRoutes.id, routeId))
      .returning();
    return route;
  }

  // Super admin and client-specific stats
  async getSuperAdminStats(): Promise<any> {
    const [totalClients] = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const [totalDrivers] = await db.select({ count: sql<number>`count(*)` }).from(drivers);
    const [totalZones] = await db.select({ count: sql<number>`count(*)` }).from(zones);
    const [todayBatches] = await db.select({ count: sql<number>`count(*)` }).from(routeBatches).where(sql`DATE(batch_date) = CURRENT_DATE`);
    
    return {
      totalClients: totalClients.count,
      totalDrivers: totalDrivers.count,
      totalZones: totalZones.count,
      todayBatches: todayBatches.count,
    };
  }

  async getClientStats(clientId: number): Promise<any> {
    const [totalOrders] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.clientId, clientId));
    const [pendingOrders] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(and(eq(orders.clientId, clientId), eq(orders.status, "pending")));
    const [deliveredOrders] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(and(eq(orders.clientId, clientId), eq(orders.status, "delivered")));
    
    return {
      totalOrders: totalOrders.count,
      pendingOrders: pendingOrders.count,
      deliveredOrders: deliveredOrders.count,
    };
  }
}

export const storage = new DatabaseStorage();
