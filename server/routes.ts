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

  // Distance calculation using Google Maps API
  app.post("/api/calculate-distance", async (req, res) => {
    const { pickup, delivery } = req.body;
    
    if (!pickup || !delivery) {
      return res.status(400).json({ error: "Pickup and delivery addresses required" });
    }

    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google Maps API key not configured" });
      }

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${encodeURIComponent(pickup)}&destinations=${encodeURIComponent(delivery)}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
        const distanceText = data.rows[0].elements[0].distance.text;
        const distance = parseFloat(distanceText.replace(/[^\d.]/g, '')); // Extract numeric value
        
        res.json({ 
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          distanceText 
        });
      } else {
        res.json({ distance: 25, distanceText: "25 mi" }); // Default fallback
      }
    } catch (error) {
      console.error('Distance calculation error:', error);
      res.json({ distance: 25, distanceText: "25 mi" }); // Default fallback
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
      const user = await storage.getUser(userId);
      
      // Create or find customer
      let customer = await storage.getCustomerByPhone(req.body.customerPhone);
      if (!customer) {
        customer = await storage.createCustomer({
          name: req.body.customerName,
          phone: req.body.customerPhone,
          email: req.body.customerEmail,
        });
      }

      // Calculate total weight from packages
      const totalWeight = orderData.packages.reduce((sum, pkg) => sum + pkg.weight, 0);
      
      // For now, set distance to 0 - will be calculated during route optimization
      const distance = 0;

      // Get client ID for client users
      let clientId = null;
      if (user?.clientId) {
        clientId = user.clientId;
      }
      
      const order = await storage.createOrder({
        ...orderData,
        weight: totalWeight.toString(),
        distance: distance.toString(),
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

  // Super Admin Routes
  app.get('/api/super-admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const stats = await storage.getSuperAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching super admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Client Management Routes
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const client = await storage.createClient(req.body);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Zone Management Routes
  app.get('/api/zones', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const zones = await storage.getAllZones();
      res.json(zones);
    } catch (error) {
      console.error("Error fetching zones:", error);
      res.status(500).json({ message: "Failed to fetch zones" });
    }
  });

  // Driver Zone Assignment
  app.post('/api/drivers/:id/assign-zone', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const driverId = parseInt(req.params.id);
      const { zoneId } = req.body;
      
      const driver = await storage.assignDriverToZone(driverId, zoneId);
      res.json(driver);
    } catch (error) {
      console.error("Error assigning zone:", error);
      res.status(500).json({ message: "Failed to assign zone" });
    }
  });

  // Route Batch Management
  app.get('/api/route-batches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Return empty array for now - would implement proper batch fetching
      res.json([]);
    } catch (error) {
      console.error("Error fetching batches:", error);
      res.status(500).json({ message: "Failed to fetch batches" });
    }
  });

  app.post('/api/route-batches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const batch = await storage.createRouteBatch(req.body);
      res.json(batch);
    } catch (error) {
      console.error("Error creating batch:", error);
      res.status(500).json({ message: "Failed to create batch" });
    }
  });

  // Client Login Route
  app.post('/api/client/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }
      
      const client = await storage.getClientByCredentials(username, password);
      if (!client) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Create a user session for the client
      const user = await storage.upsertUser({
        id: `client_${client.id}`,
        email: client.contactEmail,
        firstName: client.name.split(' ')[0],
        lastName: client.name.split(' ').slice(1).join(' '),
        profileImageUrl: null,
        role: 'client',
        clientId: client.id,
      });
      
      // Set up session similar to OAuth flow
      req.login({ claims: { sub: user.id }, client }, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Session error' });
        }
        res.json({ user, client });
      });
      
    } catch (error) {
      console.error("Error logging in client:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Client impersonation endpoint (super admin only)
  app.post('/api/impersonate-client/:clientId', isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { clientId } = req.params;
    
    try {
      // Check if user is super admin
      const currentUser = await storage.getUser(userId);
      if (!currentUser || currentUser.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only super admins can impersonate clients' });
      }
      
      const client = await storage.getClient(parseInt(clientId));
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Create a user session for the client
      const user = await storage.upsertUser({
        id: `client_${client.id}`,
        email: client.contactEmail,
        firstName: client.name.split(' ')[0],
        lastName: client.name.split(' ').slice(1).join(' '),
        profileImageUrl: null,
        role: 'client',
        clientId: client.id,
      });
      
      // Update the passport session to impersonate the client
      const impersonationUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
        access_token: 'impersonated',
        refresh_token: 'impersonated',
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      };

      // Update both req.user and the session
      req.user = impersonationUser;
      req.session.passport = { user: impersonationUser };

      // Save the session data
      req.session.save((err: any) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: 'Session update failed' });
        }
        res.json({ message: 'Client impersonation successful', user });
      });
    } catch (error) {
      console.error('Client impersonation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Void Order Route
  app.post('/api/orders/:id/void', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only clients and super admins can void orders
      if (!['client', 'super_admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const orderId = parseInt(req.params.id);
      const order = await storage.voidOrder(orderId, req.body, userId);
      
      await storage.logActivity(
        userId,
        "ORDER_VOIDED",
        `Order ${order.orderNumber} was voided`,
        { orderId, reason: req.body.reason }
      );
      
      res.json(order);
    } catch (error) {
      console.error("Error voiding order:", error);
      res.status(500).json({ message: "Failed to void order" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
