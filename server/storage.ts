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
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
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
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async getClientByCredentials(username: string, password: string): Promise<Client | undefined> {
    const result = await db.select().from(clients)
      .where(and(
        or(
          eq(clients.loginUsername, username),
          eq(clients.contactEmail, username)
        ),
        eq(clients.loginPassword, password)
      )).limit(1);
    return result[0];
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client> {
    const [client] = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
    return client;
  }

  // Zone operations
  async createZone(zoneData: InsertZone): Promise<Zone> {
    const [zone] = await db.insert(zones).values(zoneData).returning();
    return zone;
  }

  async getZone(id: number): Promise<Zone | undefined> {
    const result = await db.select().from(zones).where(eq(zones.id, id)).limit(1);
    return result[0];
  }

  async getAllZones(): Promise<Zone[]> {
    return await db.select().from(zones);
  }

  async updateZone(id: number, updates: Partial<InsertZone>): Promise<Zone> {
    const [zone] = await db.update(zones).set(updates).where(eq(zones.id, id)).returning();
    return zone;
  }

  // Driver operations
  async createDriver(driverData: InsertDriver): Promise<Driver> {
    const [driver] = await db.insert(drivers).values(driverData).returning();
    return driver;
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    const result = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
    return result[0];
  }

  async getDriverByUserId(userId: string): Promise<Driver | undefined> {
    const result = await db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1);
    return result[0];
  }

  async getAllDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers);
  }

  async updateDriverStatus(id: number, status: string, location?: any): Promise<Driver> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (location) {
      updateData.currentLocation = location;
    }

    const [driver] = await db.update(drivers).set(updateData).where(eq(drivers.id, id)).returning();
    return driver;
  }

  async getAvailableDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers)
      .where(and(
        eq(drivers.status, "online"),
        eq(drivers.isActive, true)
      ));
  }

  async assignDriverToZone(driverId: number, zoneId: number): Promise<Driver> {
    const [driver] = await db.update(drivers)
      .set({
        zoneId: zoneId,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, driverId))
      .returning();
    return driver;
  }

  async getDriversByZone(zoneId: number): Promise<Driver[]> {
    return await db.select().from(drivers).where(eq(drivers.zoneId, zoneId));
  }

  // Customer operations
  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(customerData).returning();
    return customer;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return result[0];
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
    return result[0];
  }

  // Order operations
  async createOrder(orderData: InsertOrder): Promise<Order> {
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const insertData = {
      ...orderData,
      orderNumber,
      pickupDate: orderData.pickupDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [order] = await db.insert(orders).values(insertData).returning();
    return order;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
    return result[0];
  }

  async getAllOrders(filters?: any): Promise<Order[]> {
    let query = db.select().from(orders);
    
    if (filters?.status) {
      query = query.where(eq(orders.status, filters.status));
    }
    
    return query.orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(orderId: number, statusUpdate: UpdateOrderStatus, updatedBy: string): Promise<Order> {
    const updateData: any = {
      status: statusUpdate.status,
      updatedAt: new Date(),
    };

    // Add timestamp fields based on status
    if (statusUpdate.status === "assigned") {
      updateData.assignedAt = new Date();
    } else if (statusUpdate.status === "in_transit") {
      updateData.pickedUpAt = new Date();
    } else if (statusUpdate.status === "delivered") {
      updateData.actualDeliveryTime = new Date();
    }

    const [order] = await db.update(orders).set(updateData).where(eq(orders.id, orderId)).returning();

    // Add to status history
    await db.insert(orderStatusHistory).values({
      orderId: orderId,
      status: statusUpdate.status,
      updatedBy: updatedBy,
      notes: statusUpdate.notes,
      timestamp: new Date(),
    });

    return order;
  }

  async assignOrderToDriver(orderId: number, driverId: number, assignedBy: string): Promise<Order> {
    const [order] = await db.update(orders)
      .set({
        driverId: driverId,
        status: "assigned",
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return order;
  }

  async getOrdersForDriver(driverId: number, status?: string): Promise<Order[]> {
    let whereClause = eq(orders.driverId, driverId);
    
    if (status) {
      whereClause = and(whereClause, eq(orders.status, status));
    }
    
    return await db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt));
  }

  async getOrderStatusHistory(orderId: number): Promise<OrderStatusHistory[]> {
    return await db.select().from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.timestamp));
  }

  async logActivity(userId: string, action: string, description: string, metadata?: any): Promise<ActivityLog> {
    const [activity] = await db.insert(activityLogs).values({
      userId,
      action,
      description,
      metadata,
      timestamp: new Date(),
    }).returning();

    return activity;
  }

  async getRecentActivity(limit = 20): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  async getDashboardStats(): Promise<any> {
    const totalOrders = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const pendingOrders = await db.select({ count: sql<number>`count(*)` }).from(orders)
      .where(eq(orders.status, 'pending'));
    const activeDrivers = await db.select({ count: sql<number>`count(*)` }).from(drivers)
      .where(eq(drivers.status, 'online'));

    return {
      totalOrders: totalOrders[0]?.count || 0,
      pendingOrders: pendingOrders[0]?.count || 0,
      activeDrivers: activeDrivers[0]?.count || 0,
    };
  }

  async getOrdersForClient(clientId: number, filters?: any): Promise<Order[]> {
    let whereClause = eq(orders.clientId, clientId);
    
    if (filters?.status) {
      whereClause = and(whereClause, eq(orders.status, filters.status));
    }
    
    return await db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt));
  }

  async voidOrder(orderId: number, voidData: VoidOrder, voidedBy: string): Promise<Order> {
    const [order] = await db.update(orders)
      .set({
        status: "voided",
        voidReason: voidData.voidReason,
        voidedAt: new Date(),
        voidedBy: voidedBy,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return order;
  }

  async createRouteBatch(batchData: InsertRouteBatch): Promise<RouteBatch> {
    const [batch] = await db.insert(routeBatches).values(batchData).returning();
    return batch;
  }

  async getCurrentBatch(date: string): Promise<RouteBatch | undefined> {
    const result = await db.select().from(routeBatches)
      .where(eq(routeBatches.date, date))
      .limit(1);
    return result[0];
  }

  async getRouteBatch(id: number): Promise<RouteBatch | undefined> {
    const result = await db.select().from(routeBatches).where(eq(routeBatches.id, id)).limit(1);
    return result[0];
  }

  async addOrderToBatch(orderId: number, batchId: number): Promise<void> {
    await db.update(orders)
      .set({ batchId: batchId })
      .where(eq(orders.id, orderId));
  }

  async optimizeBatch(batchId: number): Promise<OptimizedRoute[]> {
    // Get all orders for this batch
    const batchOrders = await db.select().from(orders)
      .where(eq(orders.batchId, batchId));

    // Group orders by zone
    const ordersByZone = new Map();
    for (const order of batchOrders) {
      if (!order.zoneId) continue;
      
      if (!ordersByZone.has(order.zoneId)) {
        ordersByZone.set(order.zoneId, []);
      }
      ordersByZone.get(order.zoneId).push(order);
    }

    // Create optimized routes for each zone
    const routes = [];
    for (const [zoneId, zoneOrders] of ordersByZone) {
      const [route] = await db.insert(optimizedRoutes).values({
        batchId,
        zoneId,
        routeData: zoneOrders,
        estimatedDistance: "50", // Placeholder calculation
        estimatedTime: zoneOrders.length * 30, // 30 min per order
        createdAt: new Date(),
      }).returning();
      
      routes.push(route);
    }

    return routes;
  }

  private determineZone(state: string, coordinates?: any): number {
    // Simple zone determination logic based on state
    const northStates = ['WI', 'MI', 'MN', 'ND', 'SD'];
    const southStates = ['TX', 'FL', 'GA', 'AL', 'MS', 'LA', 'SC', 'NC', 'TN', 'KY'];
    const eastStates = ['NY', 'NJ', 'PA', 'CT', 'MA', 'VT', 'NH', 'ME', 'RI'];
    
    if (northStates.includes(state)) return 1; // North zone
    if (southStates.includes(state)) return 2; // South zone  
    if (eastStates.includes(state)) return 3; // East zone
    return 4; // West zone (default)
  }

  async createOptimizedRoute(routeData: InsertOptimizedRoute): Promise<OptimizedRoute> {
    const [route] = await db.insert(optimizedRoutes).values(routeData).returning();
    return route;
  }

  async getOptimizedRoute(id: number): Promise<OptimizedRoute | undefined> {
    const result = await db.select().from(optimizedRoutes).where(eq(optimizedRoutes.id, id)).limit(1);
    return result[0];
  }

  async getRoutesByBatch(batchId: number): Promise<OptimizedRoute[]> {
    return await db.select().from(optimizedRoutes).where(eq(optimizedRoutes.batchId, batchId));
  }

  async assignRouteToDriver(routeId: number, driverId: number): Promise<OptimizedRoute> {
    const [route] = await db.update(optimizedRoutes)
      .set({
        driverId: driverId,
        status: "assigned",
        assignedAt: new Date(),
      })
      .where(eq(optimizedRoutes.id, routeId))
      .returning();

    return route;
  }

  async getSuperAdminStats(): Promise<any> {
    const totalClients = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const totalDrivers = await db.select({ count: sql<number>`count(*)` }).from(drivers);
    const totalZones = await db.select({ count: sql<number>`count(*)` }).from(zones);
    const totalOrders = await db.select({ count: sql<number>`count(*)` }).from(orders);

    return {
      totalClients: totalClients[0]?.count || 0,
      totalDrivers: totalDrivers[0]?.count || 0,
      totalZones: totalZones[0]?.count || 0,
      totalOrders: totalOrders[0]?.count || 0,
    };
  }

  async getClientStats(clientId: number): Promise<any> {
    const totalOrders = await db.select({ count: sql<number>`count(*)` }).from(orders)
      .where(eq(orders.clientId, clientId));
    const pendingOrders = await db.select({ count: sql<number>`count(*)` }).from(orders)
      .where(and(eq(orders.clientId, clientId), eq(orders.status, 'pending')));
    const deliveredOrders = await db.select({ count: sql<number>`count(*)` }).from(orders)
      .where(and(eq(orders.clientId, clientId), eq(orders.status, 'delivered')));

    return {
      totalOrders: totalOrders[0]?.count || 0,
      pendingOrders: pendingOrders[0]?.count || 0,
      deliveredOrders: deliveredOrders[0]?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();