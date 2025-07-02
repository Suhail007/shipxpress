import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set - email notifications disabled");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("Email not sent - SENDGRID_API_KEY not configured");
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendOrderStatusNotification(
  order: any,
  newStatus: string,
  customerEmail?: string
): Promise<boolean> {
  if (!customerEmail) {
    console.log("No customer email provided - notification not sent");
    return false;
  }

  const statusMessages = {
    pending: "Your order has been received and is being processed",
    assigned: "Your order has been assigned to a driver",
    picked: "Your order has been picked up and is on its way",
    in_transit: "Your order is currently in transit",
    delivered: "Your order has been successfully delivered",
    failed: "There was an issue with your delivery - we'll contact you soon",
    voided: "Your order has been cancelled"
  };

  const subject = `ShippXpress Order Update - ${order.orderNumber}`;
  const message = statusMessages[newStatus as keyof typeof statusMessages] || "Your order status has been updated";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #f97316 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">ShippXpress</h1>
        <p style="color: white; margin: 10px 0 0 0;">Logistics Management Platform</p>
      </div>
      
      <div style="padding: 20px; background: #f9fafb;">
        <h2 style="color: #1e3a8a; margin-top: 0;">Order Status Update</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Customer:</strong> ${order.customerName}</p>
          <p><strong>Status:</strong> <span style="color: #f97316; font-weight: bold;">${newStatus.replace('_', ' ').toUpperCase()}</span></p>
          <p><strong>Update:</strong> ${message}</p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e3a8a; margin-top: 0;">Delivery Details</h3>
          <p><strong>Address:</strong><br>
             ${order.deliveryLine1}<br>
             ${order.deliveryCity}, ${order.deliveryState} ${order.deliveryZip}
          </p>
          ${order.weight ? `<p><strong>Weight:</strong> ${order.weight} lbs</p>` : ''}
          ${order.distance ? `<p><strong>Distance:</strong> ${order.distance} miles</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
          <p style="color: #6b7280;">Thank you for choosing ShippXpress!</p>
          <p style="color: #6b7280; font-size: 14px;">For support, please contact your account representative.</p>
        </div>
      </div>
    </div>
  `;

  const text = `
ShippXpress Order Update

Order Number: ${order.orderNumber}
Customer: ${order.customerName}
Status: ${newStatus.replace('_', ' ').toUpperCase()}
Update: ${message}

Delivery Address:
${order.deliveryLine1}
${order.deliveryCity}, ${order.deliveryState} ${order.deliveryZip}

${order.weight ? `Weight: ${order.weight} lbs` : ''}
${order.distance ? `Distance: ${order.distance} miles` : ''}

Thank you for choosing ShippXpress!
  `;

  return await sendEmail({
    to: customerEmail,
    from: 'notifications@shippxpress.com',
    subject,
    text,
    html
  });
}

export async function sendBatchNotification(
  clientEmail: string,
  batchInfo: any
): Promise<boolean> {
  const subject = `ShippXpress Batch Processing Complete - ${batchInfo.date}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #f97316 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">ShippXpress</h1>
        <p style="color: white; margin: 10px 0 0 0;">Batch Processing Complete</p>
      </div>
      
      <div style="padding: 20px; background: #f9fafb;">
        <h2 style="color: #1e3a8a; margin-top: 0;">Daily Batch Summary</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Batch Date:</strong> ${batchInfo.date}</p>
          <p><strong>Orders Processed:</strong> ${batchInfo.orderCount}</p>
          <p><strong>Routes Created:</strong> ${batchInfo.routeCount}</p>
          <p><strong>Processing Time:</strong> ${batchInfo.processingTime}</p>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
          <p style="color: #16a34a; font-weight: bold;">All orders have been optimized and assigned to drivers</p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: clientEmail,
    from: 'notifications@shippxpress.com',
    subject,
    text: `ShippXpress Batch Processing Complete\n\nBatch Date: ${batchInfo.date}\nOrders Processed: ${batchInfo.orderCount}\nRoutes Created: ${batchInfo.routeCount}\n\nAll orders have been optimized and assigned to drivers.`,
    html
  });
}