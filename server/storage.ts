import {
  users,
  drivers,
  orders,
  customers,
  orderStatusHistory,
  activityLogs,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Driver operations
  createDriver(driver: InsertDriver): Promise<Driver>;
  getDriver(id: number): Promise<Driver | undefined>;
  getDriverByUserId(userId: string): Promise<Driver | undefined>;
  getAllDrivers(): Promise<Driver[]>;
  updateDriverStatus(id: number, status: string, location?: any): Promise<Driver>;
  getAvailableDrivers(): Promise<Driver[]>;
  
  // Customer operations
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getAllOrders(filters?: any): Promise<Order[]>;
  updateOrderStatus(orderId: number, statusUpdate: UpdateOrderStatus, updatedBy: string): Promise<Order>;
  assignOrderToDriver(orderId: number, driverId: number, assignedBy: string): Promise<Order>;
  getOrdersForDriver(driverId: number, status?: string): Promise<Order[]>;
  
  // Order status history
  getOrderStatusHistory(orderId: number): Promise<OrderStatusHistory[]>;
  
  // Activity logs
  logActivity(userId: string, action: string, description: string, metadata?: any): Promise<ActivityLog>;
  getRecentActivity(limit?: number): Promise<ActivityLog[]>;
  
  // Dashboard stats
  getDashboardStats(): Promise<any>;
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
}

export const storage = new DatabaseStorage();
