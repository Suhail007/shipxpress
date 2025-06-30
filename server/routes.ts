import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertOrderSchema, insertCustomerSchema, insertDriverSchema, updateOrderStatusSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get driver info if user is a driver
      let driver = null;
      if (user?.role === "driver") {
        driver = await storage.getDriverByUserId(userId);
      }
      
      res.json({ ...user, driver });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Orders routes
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const { status, search } = req.query;
      const user = req.user.claims;
      
      let orders;
      if (user.role === "driver") {
        const driver = await storage.getDriverByUserId(user.sub);
        if (!driver) {
          return res.status(404).json({ message: "Driver profile not found" });
        }
        orders = await storage.getOrdersForDriver(driver.id, status);
      } else {
        orders = await storage.getAllOrders({ status, search });
      }
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const userId = req.user.claims.sub;
      
      // Create or find customer
      let customer = await storage.getCustomerByPhone(req.body.customerPhone);
      if (!customer) {
        customer = await storage.createCustomer({
          name: req.body.customerName,
          phone: req.body.customerPhone,
          email: req.body.customerEmail,
        });
      }
      
      const order = await storage.createOrder({
        ...orderData,
        createdBy: userId,
      });
      
      // Log activity
      await storage.logActivity(
        userId,
        "ORDER_CREATED",
        `Created order ${order.orderNumber}`,
        { orderId: order.id }
      );
      
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.patch("/api/orders/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const statusUpdate = updateOrderStatusSchema.parse(req.body);
      const userId = req.user.claims.sub;
      
      const order = await storage.updateOrderStatus(orderId, statusUpdate, userId);
      
      // Log activity
      await storage.logActivity(
        userId,
        "ORDER_STATUS_UPDATED",
        `Updated order ${order.orderNumber} status to ${statusUpdate.status}`,
        { orderId: order.id, newStatus: statusUpdate.status }
      );
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Update order status by order number (for barcode scanning)
  app.patch("/api/orders/:orderNumber/status", isAuthenticated, async (req: any, res) => {
    try {
      const orderNumber = req.params.orderNumber;
      const statusUpdate = updateOrderStatusSchema.parse(req.body);
      const userId = req.user.claims.sub;
      
      // Find order by order number
      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(order.id, statusUpdate, userId);
      
      // Log activity
      await storage.logActivity(
        userId,
        "ORDER_STATUS_SCANNED",
        `Scanned and updated order ${orderNumber} status to ${statusUpdate.status}`,
        { orderId: order.id, newStatus: statusUpdate.status, scanMethod: "barcode" }
      );
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status via scan:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.patch("/api/orders/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { driverId } = req.body;
      const userId = req.user.claims.sub;
      
      if (!driverId) {
        return res.status(400).json({ message: "Driver ID is required" });
      }
      
      const order = await storage.assignOrderToDriver(orderId, driverId, userId);
      
      // Log activity
      await storage.logActivity(
        userId,
        "ORDER_ASSIGNED",
        `Assigned order ${order.orderNumber} to driver #${driverId}`,
        { orderId: order.id, driverId }
      );
      
      res.json(order);
    } catch (error) {
      console.error("Error assigning order:", error);
      res.status(500).json({ message: "Failed to assign order" });
    }
  });

  // Drivers routes
  app.get("/api/drivers", isAuthenticated, async (req, res) => {
    try {
      const drivers = await storage.getAllDrivers();
      res.json(drivers);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      res.status(500).json({ message: "Failed to fetch drivers" });
    }
  });

  app.get("/api/drivers/available", isAuthenticated, async (req, res) => {
    try {
      const drivers = await storage.getAvailableDrivers();
      res.json(drivers);
    } catch (error) {
      console.error("Error fetching available drivers:", error);
      res.status(500).json({ message: "Failed to fetch available drivers" });
    }
  });

  app.post("/api/drivers", isAuthenticated, async (req: any, res) => {
    try {
      const driverData = insertDriverSchema.parse(req.body);
      const userId = req.user.claims.sub;
      
      const driver = await storage.createDriver(driverData);
      
      // Log activity
      await storage.logActivity(
        userId,
        "DRIVER_CREATED",
        `Created driver profile for ${driverData.userId}`,
        { driverId: driver.id }
      );
      
      res.json(driver);
    } catch (error) {
      console.error("Error creating driver:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid driver data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create driver" });
    }
  });

  app.patch("/api/drivers/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const driverId = parseInt(req.params.id);
      const { status, location } = req.body;
      const userId = req.user.claims.sub;
      
      const driver = await storage.updateDriverStatus(driverId, status, location);
      
      // Log activity
      await storage.logActivity(
        userId,
        "DRIVER_STATUS_UPDATED",
        `Updated driver #${driverId} status to ${status}`,
        { driverId, newStatus: status }
      );
      
      res.json(driver);
    } catch (error) {
      console.error("Error updating driver status:", error);
      res.status(500).json({ message: "Failed to update driver status" });
    }
  });

  // Activity logs
  app.get("/api/activity", isAuthenticated, async (req, res) => {
    try {
      const { limit } = req.query;
      const activities = await storage.getRecentActivity(limit ? parseInt(limit as string) : undefined);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Customer routes
  app.post("/api/customers", isAuthenticated, async (req: any, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
