const fs = require("fs").promises;
const path = require("path");

class PaymentLogger {
  constructor() {
    this.logDir = path.join(__dirname, "../logs");
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create log directory:", error);
    }
  }

  async logPaymentRequest(req, res, next) {
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    };

    // Mask sensitive data
    if (logData.body && logData.body.signature) {
      logData.body.signature = "***MASKED***";
    }

    await this.writeLog("payment_requests", logData);
    next();
  }

  async logPaymentResult(data, type = "payment_results") {
    const logData = {
      timestamp: new Date().toISOString(),
      type,
      data: data,
    };

    // Mask sensitive data
    if (logData.data && logData.data.signature) {
      logData.data.signature = "***MASKED***";
    }

    await this.writeLog(type, logData);
  }

  async writeLog(filename, data) {
    try {
      const logFile = path.join(
        this.logDir,
        `${filename}_${this.getDateString()}.log`
      );
      const logLine = JSON.stringify(data) + "\n";
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error("Failed to write log:", error);
    }
  }

  getDateString() {
    return new Date().toISOString().split("T")[0];
  }

  // Middleware for monitoring payment endpoints
  paymentMonitor(req, res, next) {
    // Log request
    this.logPaymentRequest(req, res, () => {});

    // Override res.json to log responses
    const originalJson = res.json;
    res.json = (data) => {
      this.logPaymentResult(
        {
          url: req.url,
          method: req.method,
          response: data,
          statusCode: res.statusCode,
        },
        "payment_responses"
      );

      return originalJson.call(res, data);
    };

    next();
  }

  // Log security events
  async logSecurityEvent(event, data) {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      data,
      severity: "HIGH",
    };

    await this.writeLog("security_events", logData);

    // In production, you might want to send alerts here
    if (process.env.NODE_ENV === "production") {
      console.error("SECURITY EVENT:", event, data);
    }
  }
}

module.exports = new PaymentLogger();
