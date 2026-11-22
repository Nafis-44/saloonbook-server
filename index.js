import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";
import stripe from "./config/stripe.js";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();

app.use(cors());

const port = 5000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const stripeCurrency = process.env.STRIPE_CURRENCY || "bdt";

const client = new MongoClient(process.env.MONGODB_URI);

async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        process.exit(1);
    }
}

const mongoclient = await connectToMongoDB();
const db = mongoclient.db("saloonbook");

// Collections
const users = db.collection("user");
const services = db.collection("services");
const appointments = db.collection("appointments");
const transactions = db.collection("transactions");


const verifytoken = async (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ msg: "Unauthorized!" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).send({ msg: "Unauthorized!" });
    }

    const JWKS = createRemoteJWKSet(
        new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`)
    );

    try {
        const { payload } = await jwtVerify(token, JWKS);

        req.user = payload;

        next();

    } catch (error) {
        return res.status(401).send({ msg: "Invalid or expired token!" });
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).send({
            msg: "Forbidden! Admin access required.",
        });
    }

    next();
};


// ========================================
// STRIPE WEBHOOK API
// Must be before express.json()
// ========================================

app.post(
    "/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error("STRIPE_WEBHOOK_SECRET is missing.");
            return res.status(500).send("Webhook secret is missing.");
        }

        const signature = req.headers["stripe-signature"];

        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                signature,
                webhookSecret
            );
        } catch (error) {
            console.error("Stripe Webhook Signature Error:", error.message);
            return res.status(400).send(
                `Webhook Error: ${error.message}`
            );
        }

        try {
            // Handle successful Checkout payments
            if (
                event.type === "checkout.session.completed" ||
                event.type === "checkout.session.async_payment_succeeded"
            ) {
                const session = event.data.object;

                // Confirm payment is actually successful
                if (session.payment_status !== "paid") {
                    console.log(
                        "Checkout Session is not paid yet:",
                        session.id
                    );

                    return res.status(200).json({
                        received: true,
                        message: "Payment is not completed yet.",
                    });
                }

                const appointmentId = session.metadata?.appointmentId;
                const customerId = session.metadata?.customerId;

                if (!appointmentId || !ObjectId.isValid(appointmentId)) {
                    console.error(
                        "Invalid appointment ID in Stripe metadata."
                    );

                    return res.status(200).json({
                        received: true,
                        message: "Invalid appointment metadata.",
                    });
                }

                // Find the matching appointment and update payment status
                const paymentIntentId =
                    typeof session.payment_intent === "string"
                        ? session.payment_intent
                        : session.payment_intent?.id || null;

                const updateResult = await appointments.updateOne(
                    {
                        _id: new ObjectId(appointmentId),
                        stripeSessionId: session.id,
                    },
                    {
                        $set: {
                            paymentStatus: "paid",
                            stripePaymentIntentId: paymentIntentId,
                            paidAt: new Date(),
                            updatedAt: new Date(),
                        },
                    }
                );

                if (updateResult.matchedCount === 0) {
                    console.error(
                        "Appointment not found for Stripe Session:",
                        session.id
                    );

                    // Return 500 so Stripe can retry delivery
                    return res.status(500).json({
                        message: "Matching appointment not found.",
                    });
                }

                // Save transaction without creating duplicates
                await transactions.updateOne(
                    {
                        stripeSessionId: session.id,
                    },
                    {
                        $set: {
                            stripePaymentIntentId: paymentIntentId,
                            appointmentId: new ObjectId(appointmentId),
                            customerId:
                                customerId && ObjectId.isValid(customerId)
                                    ? new ObjectId(customerId)
                                    : null,
                            amountTotal: session.amount_total,
                            currency: session.currency,
                            paymentStatus: "paid",
                            updatedAt: new Date(),
                        },
                        $setOnInsert: {
                            stripeEventId: event.id,
                            stripeSessionId: session.id,
                            createdAt: new Date(),
                        },
                    },
                    {
                        upsert: true,
                    }
                );

                console.log(
                    "Payment successful. Appointment updated:",
                    appointmentId
                );
            }

            res.status(200).json({
                received: true,
            });
        } catch (error) {
            console.error("Stripe Webhook Processing Error:", error);

            res.status(500).json({
                message: "Webhook processing failed.",
            });
        }
    }
);

// Normal JSON parser must come after Stripe Webhook
app.use(express.json());

// Available Time Slots
const timeSlots = [
    "09:00 AM",
    "10:30 AM",
    "12:00 PM",
    "01:30 PM",
    "03:00 PM",
    "04:30 PM",
    "06:00 PM",
];

// ========================================
// HOME ROUTE
// ========================================

app.get("/", (req, res) => {
    res.send("SalonBook Server is Running!");
});

// ========================================
// USER APIs
// ========================================

// // Get All Users
// app.get("/users", async (req, res) => {
//     try {
//         const result = await users.find({}).toArray();
//         res.status(200).json(result);
//     } catch (error) {
//         console.error("Get Users Error:", error);
//         res.status(500).json({
//             message: "Failed to get users",
//         });
//     }
// });

// Get All Customers (Admin)
app.get("/admin/users", verifytoken, verifyAdmin, async (req, res) => {
    try {
        const customerList = await users
            .find({ role: { $ne: "admin" } })
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json(customerList);
    } catch (error) {
        console.error("Get Customers Error:", error);
        res.status(500).json({
            message: "Failed to fetch customers.",
        });
    }
});

// Block / Unblock Customer
app.patch("/admin/users/:id/status", verifytoken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isBlocked } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid user ID.",
            });
        }

        if (typeof isBlocked !== "boolean") {
            return res.status(400).json({
                message: "Please provide a valid block status.",
            });
        }

        const customer = await users.findOne({
            _id: new ObjectId(id),
        });

        if (!customer) {
            return res.status(404).json({
                message: "Customer not found.",
            });
        }

        if (customer.role === "admin") {
            return res.status(403).json({
                message: "Admin accounts cannot be blocked here.",
            });
        }

        await users.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    isBlocked,
                    updatedAt: new Date(),
                },
            }
        );

        res.status(200).json({
            message: isBlocked
                ? "Customer blocked successfully!"
                : "Customer unblocked successfully!",
            isBlocked,
        });
    } catch (error) {
        console.error("Update Customer Status Error:", error);
        res.status(500).json({
            message: "Failed to update customer status.",
        });
    }
});

// ========================================
// ADMIN DASHBOARD STATISTICS API
// ========================================

app.get("/admin/dashboard/stats", verifytoken, verifyAdmin, async (req, res) => {
    try {
        const totalServices = await services.countDocuments({});

        const activeServices = await services.countDocuments({
            $or: [
                { status: "active" },
                { status: { $exists: false } },
            ],
        });

        const totalCustomers = await users.countDocuments({
            role: { $ne: "admin" },
        });

        const totalAppointments = await appointments.countDocuments({});

        const pendingAppointments = await appointments.countDocuments({
            status: "pending",
        });

        const confirmedAppointments = await appointments.countDocuments({
            status: "confirmed",
        });

        const recentAppointments = await appointments.aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "service",
                },
            },
            {
                $unwind: {
                    path: "$service",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "user",
                    localField: "customerId",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            {
                $unwind: {
                    path: "$customer",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    appointmentDate: 1,
                    timeSlot: 1,
                    status: 1,
                    paymentStatus: 1,
                    servicePrice: 1,
                    createdAt: 1,
                    serviceName: "$service.name",
                    customerName: "$customer.name",
                    customerEmail: "$customer.email",
                },
            },
        ]).toArray();

        const revenueResult = await appointments.aggregate([
            {
                $match: {
                    paymentStatus: "paid",
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: "$servicePrice",
                    },
                },
            },
        ]).toArray();

        const totalRevenue = revenueResult[0]?.totalRevenue || 0;

        res.status(200).json({
            totalServices,
            activeServices,
            totalCustomers,
            totalAppointments,
            pendingAppointments,
            confirmedAppointments,
            totalRevenue,
            recentAppointments,
        });
    } catch (error) {
        console.error("Admin Dashboard Statistics Error:", error);
        res.status(500).json({
            message: "Failed to fetch dashboard statistics.",
        });
    }
});

// ========================================
// SERVICE APIs
// ========================================

// Get All Services (Admin)
app.get("/services", verifytoken, verifyAdmin, async (req, res) => {
    try {
        const result = await services.find({}).toArray();
        res.status(200).json(result);
    } catch (error) {
        console.error("Get Services Error:", error);
        res.status(500).json({
            message: "Failed to get services",
        });
    }
});

// Get Active Services (Public / Customer)
app.get("/public/services", async (req, res) => {
    try {
        const result = await services.find({
            $or: [
                { status: "active" },
                { status: { $exists: false } },
            ],
        }).toArray();

        res.status(200).json(result);
    } catch (error) {
        console.error("Get Public Services Error:", error);
        res.status(500).json({
            message: "Failed to get active services",
        });
    }
});

// Add New Service
app.post("/services", verifytoken, verifyAdmin, async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            price,
            duration,
            image,
            status,
        } = req.body;

        if (
            !name?.trim() ||
            !description?.trim() ||
            !category ||
            price === undefined ||
            duration === undefined
        ) {
            return res.status(400).json({
                message: "Please provide all required service information.",
            });
        }

        const serviceStatus = status || "active";

        if (!["active", "inactive"].includes(serviceStatus)) {
            return res.status(400).json({
                message: "Invalid service status.",
            });
        }

        const newService = {
            name: name.trim(),
            description: description.trim(),
            category,
            price: Number(price),
            duration: Number(duration),
            image: image || "",
            status: serviceStatus,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        if (
            !Number.isFinite(newService.price) ||
            newService.price < 0 ||
            !Number.isInteger(newService.duration) ||
            newService.duration <= 0
        ) {
            return res.status(400).json({
                message: "Please provide a valid price and duration.",
            });
        }

        const result = await services.insertOne(newService);

        res.status(201).json({
            message: "Service added successfully!",
            insertedId: result.insertedId,
        });
    } catch (error) {
        console.error("Add Service Error:", error);
        res.status(500).json({
            message: "Failed to add service.",
        });
    }
});

// Get Single Service by ID
app.get("/services/:id", verifytoken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid service ID.",
            });
        }

        const result = await services.findOne({
            _id: new ObjectId(id),
        });

        if (!result) {
            return res.status(404).json({
                message: "Service not found.",
            });
        }

        res.status(200).json(result);
    } catch (error) {
        console.error("Get Single Service Error:", error);
        res.status(500).json({
            message: "Failed to get service details.",
        });
    }
});

// Update Service
app.put("/services/:id", verifytoken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            description,
            category,
            price,
            duration,
            image,
            status,
        } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid service ID.",
            });
        }

        if (
            !name?.trim() ||
            !description?.trim() ||
            !category ||
            price === undefined ||
            duration === undefined
        ) {
            return res.status(400).json({
                message: "Please provide all required service information.",
            });
        }

        const updatedPrice = Number(price);
        const updatedDuration = Number(duration);

        if (
            !Number.isFinite(updatedPrice) ||
            updatedPrice < 0 ||
            !Number.isInteger(updatedDuration) ||
            updatedDuration <= 0
        ) {
            return res.status(400).json({
                message: "Please provide a valid price and duration.",
            });
        }

        const updatedService = {
            name: name.trim(),
            description: description.trim(),
            category,
            price: updatedPrice,
            duration: updatedDuration,
            updatedAt: new Date(),
        };

        if (status !== undefined) {
            if (!["active", "inactive"].includes(status)) {
                return res.status(400).json({
                    message: "Invalid service status.",
                });
            }

            updatedService.status = status;
        }

        if (image !== undefined) {
            updatedService.image = image;
        }

        const result = await services.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedService }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: "Service not found.",
            });
        }

        res.status(200).json({
            message: "Service updated successfully!",
        });
    } catch (error) {
        console.error("Update Service Error:", error);
        res.status(500).json({
            message: "Failed to update service.",
        });
    }
});

// Delete Service
app.delete("/services/:id", verifytoken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid service ID.",
            });
        }

        const result = await services.deleteOne({
            _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Service not found.",
            });
        }

        res.status(200).json({
            message: "Service deleted successfully!",
        });
    } catch (error) {
        console.error("Delete Service Error:", error);
        res.status(500).json({
            message: "Failed to delete service.",
        });
    }
});

// ========================================
// APPOINTMENT APIs
// ========================================

// Create New Appointment

app.post("/appointments", verifytoken, async (req, res) => {
    try {
        // Only Customer can book appointments
        if (req.user?.role !== "customer") {
            return res.status(403).json({
                message: "Only customers can book appointments.",
            });
        }

        // Get Customer ID from verified JWT token
        const customerId = req.user.sub;

        if (!ObjectId.isValid(customerId)) {
            return res.status(400).json({
                message: "Invalid customer ID.",
            });
        }

        const {
            serviceId,
            appointmentDate,
            timeSlot,
            message,
        } = req.body;

        if (!serviceId || !appointmentDate || !timeSlot) {
            return res.status(400).json({
                message: "Service, date and time slot are required.",
            });
        }

        if (!ObjectId.isValid(serviceId)) {
            return res.status(400).json({
                message: "Invalid service ID.",
            });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
            return res.status(400).json({
                message: "Invalid appointment date.",
            });
        }

        const [year, month, day] = appointmentDate
            .split("-")
            .map(Number);

        const selectedDate = new Date(year, month - 1, day);

        if (
            selectedDate.getFullYear() !== year ||
            selectedDate.getMonth() !== month - 1 ||
            selectedDate.getDate() !== day
        ) {
            return res.status(400).json({
                message: "Invalid calendar date.",
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            return res.status(400).json({
                message: "You cannot book an appointment for a past date.",
            });
        }

        if (!timeSlots.includes(timeSlot)) {
            return res.status(400).json({
                message: "Invalid time slot.",
            });
        }

        if (message && message.length > 500) {
            return res.status(400).json({
                message: "Message cannot exceed 500 characters.",
            });
        }

        const service = await services.findOne({
            _id: new ObjectId(serviceId),
        });

        if (!service) {
            return res.status(404).json({
                message: "Service not found.",
            });
        }

        if (service.status && service.status !== "active") {
            return res.status(400).json({
                message: "This service is currently unavailable.",
            });
        }

        const existingAppointment = await appointments.findOne({
            appointmentDate,
            timeSlot,
            status: {
                $in: ["pending", "confirmed"],
            },
        });

        if (existingAppointment) {
            return res.status(409).json({
                message: "This time slot is already booked.",
            });
        }

        const newAppointment = {
            serviceId: new ObjectId(serviceId),
            customerId: new ObjectId(customerId),
            appointmentDate,
            timeSlot,
            message: message?.trim() || "",
            servicePrice: service.price,
            paymentStatus: "unpaid",
            status: "pending",
            createdAt: new Date(),
        };

        const result = await appointments.insertOne(newAppointment);

        res.status(201).json({
            success: true,
            message: "Appointment created successfully!",
            insertedId: result.insertedId,
        });

    } catch (error) {
        console.error("Create Appointment Error:", error);

        res.status(500).json({
            message: "Failed to create appointment.",
        });
    }
});


// Get All Appointments (Temporary Development Route)
app.get("/appointments", verifytoken, verifyAdmin, async (req, res) => {
    try {
        const result = await appointments.aggregate([
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "service",
                },
            },
            {
                $unwind: {
                    path: "$service",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "user",
                    localField: "customerId",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            {
                $unwind: {
                    path: "$customer",
                    preserveNullAndEmptyArrays: true,
                },
            },
            { $sort: { createdAt: -1 } },
        ]).toArray();

        res.status(200).json(result);
    } catch (error) {
        console.error("Get Appointments Error:", error);
        res.status(500).json({
            message: "Failed to get appointments.",
        });
    }
});

// ========================================
// CUSTOMER APPOINTMENTS API
// ========================================

// Get Appointments of a Specific Customer
app.get("/customer/appointments/:customerId", verifytoken, async (req, res) => {
    try {
        const { customerId } = req.params;

        if (!ObjectId.isValid(customerId)) {
            return res.status(400).json({
                message: "Invalid customer ID.",
            });
        }
        if (req.user?.role !== "customer") {
            return res.status(403).json({
                message: "Forbidden! Customer access required.",
            });
        }

        if (req.user?.sub !== customerId) {
            return res.status(403).json({
                message: "You can only view your own appointments.",
            });
        }

        const customerAppointments = await appointments.aggregate([
            {
                $match: {
                    customerId: new ObjectId(customerId),
                },
            },
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "service",
                },
            },
            {
                $unwind: {
                    path: "$service",
                    preserveNullAndEmptyArrays: true,
                },
            },
            { $sort: { createdAt: -1 } },
        ]).toArray();

        const totalAppointments = customerAppointments.length;

        const pendingAppointments = customerAppointments.filter(
            (appointment) => appointment.status === "pending"
        ).length;

        const confirmedAppointments = customerAppointments.filter(
            (appointment) => appointment.status === "confirmed"
        ).length;

        const cancelledAppointments = customerAppointments.filter(
            (appointment) => appointment.status === "cancelled"
        ).length;

        res.status(200).json({
            totalAppointments,
            pendingAppointments,
            confirmedAppointments,
            cancelledAppointments,
            appointments: customerAppointments,
        });
    } catch (error) {
        console.error("Get Customer Appointments Error:", error);
        res.status(500).json({
            message: "Failed to fetch customer appointments.",
        });
    }
});

// ========================================
// CUSTOMER CANCEL APPOINTMENT API
// ========================================


app.patch("/customer/appointments/:id/cancel", verifytoken, async (req, res) => {
    try {
        const { id } = req.params;

        // Only Customer can cancel appointments
        if (req.user?.role !== "customer") {
            return res.status(403).json({
                message: "Only customers can cancel appointments.",
            });
        }

        // Get Customer ID from verified JWT token
        const customerId = req.user.sub;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid appointment ID.",
            });
        }

        if (!ObjectId.isValid(customerId)) {
            return res.status(400).json({
                message: "Invalid customer ID.",
            });
        }

        const appointment = await appointments.findOne({
            _id: new ObjectId(id),
            customerId: new ObjectId(customerId),
        });

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found.",
            });
        }

        if (appointment.status !== "pending") {
            return res.status(400).json({
                message: "Only pending appointments can be cancelled.",
            });
        }

        await appointments.updateOne(
            {
                _id: new ObjectId(id),
                customerId: new ObjectId(customerId),
                status: "pending",
            },
            {
                $set: {
                    status: "cancelled",
                    updatedAt: new Date(),
                },
            }
        );

        res.status(200).json({
            success: true,
            message: "Appointment cancelled successfully!",
        });

    } catch (error) {
        console.error("Customer Cancel Appointment Error:", error);

        res.status(500).json({
            message: "Failed to cancel appointment.",
        });
    }
});

// ========================================
// ADMIN UPDATE APPOINTMENT STATUS
// ========================================

app.patch("/appointments/:id/status", verifytoken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid appointment ID.",
            });
        }

        if (!["confirmed", "cancelled"].includes(status)) {
            return res.status(400).json({
                message: "Invalid appointment status.",
            });
        }

        const appointment = await appointments.findOne({
            _id: new ObjectId(id),
        });

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found.",
            });
        }

        if (
            appointment.status === "cancelled" ||
            (appointment.status === "confirmed" && status === "confirmed")
        ) {
            return res.status(400).json({
                message: "This appointment status cannot be changed.",
            });
        }

        await appointments.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status,
                    updatedAt: new Date(),
                },
            }
        );

        res.status(200).json({
            message: `Appointment ${status} successfully!`,
        });
    } catch (error) {
        console.error("Update Appointment Status Error:", error);
        res.status(500).json({
            message: "Failed to update appointment status.",
        });
    }
});


// ========================================
// STRIPE CHECKOUT SESSION API
// ========================================

app.post("/create-checkout-session", verifytoken, async (req, res) => {
    try {
        // Only Customer can create checkout session
        if (req.user?.role !== "customer") {
            return res.status(403).json({
                message: "Only customers can make payments.",
            });
        }

        const { appointmentId } = req.body;

        // Get customer ID from verified JWT
        const customerId = req.user.sub;

        if (
            !appointmentId ||
            !customerId ||
            !ObjectId.isValid(appointmentId) ||
            !ObjectId.isValid(customerId)
        ) {
            return res.status(400).json({
                message: "Invalid appointment or customer ID.",
            });
        }

        // Find only this customer's appointment
        const appointment = await appointments.findOne({
            _id: new ObjectId(appointmentId),
            customerId: new ObjectId(customerId),
        });

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found.",
            });
        }

        // Only confirmed appointments can be paid
        if (appointment.status !== "confirmed") {
            return res.status(400).json({
                message: "Only confirmed appointments can be paid.",
            });
        }

        // Prevent duplicate payment
        if (appointment.paymentStatus === "paid") {
            return res.status(400).json({
                message: "This appointment has already been paid.",
            });
        }

        const price = Number(appointment.servicePrice);

        if (!Number.isFinite(price) || price <= 0) {
            return res.status(400).json({
                message: "Invalid appointment price.",
            });
        }

        const service = await services.findOne({
            _id: appointment.serviceId,
        });

        if (!service) {
            return res.status(404).json({
                message: "Service not found.",
            });
        }

        const customer = await users.findOne({
            _id: new ObjectId(customerId),
        });

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: "payment",

            line_items: [
                {
                    price_data: {
                        currency: stripeCurrency.toLowerCase(),
                        product_data: {
                            name: service.name,
                            description: `SalonBook Appointment - ${appointment.appointmentDate} at ${appointment.timeSlot}`,
                        },
                        unit_amount: Math.round(price * 100),
                    },
                    quantity: 1,
                },
            ],

            ...(customer?.email
                ? { customer_email: customer.email }
                : {}),

            metadata: {
                appointmentId: appointmentId,
                customerId: customerId,
                serviceId: appointment.serviceId.toString(),
            },

            success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url: `${frontendUrl}/payment/cancel?appointmentId=${appointmentId}`,
        });

        await appointments.updateOne(
            {
                _id: new ObjectId(appointmentId),
                customerId: new ObjectId(customerId),
            },
            {
                $set: {
                    stripeSessionId: checkoutSession.id,
                    updatedAt: new Date(),
                },
            }
        );

        res.status(200).json({
            success: true,
            message: "Stripe Checkout Session created successfully!",
            sessionId: checkoutSession.id,
            url: checkoutSession.url,
        });

    } catch (error) {
        console.error("Stripe Checkout Session Error:", error);

        res.status(500).json({
            message: "Failed to create Stripe Checkout Session.",
            error: error.message,
        });
    }
});




// ========================================
// VERIFY PAYMENT FOR SUCCESS PAGE
// ========================================

app.get("/payment/verify/:sessionId", verifytoken, async (req, res) => {
    try {
        // Only Customer can verify their payment
        if (req.user?.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Forbidden! Customer access required.",
            });
        }

        const { sessionId } = req.params;
        const customerId = req.user.sub;

        if (!sessionId || !sessionId.startsWith("cs_")) {
            return res.status(400).json({
                success: false,
                message: "Invalid Stripe Session ID.",
            });
        }

        // Find verified transaction saved by Stripe Webhook
        const transaction = await transactions.findOne({
            stripeSessionId: sessionId,
            paymentStatus: "paid",
        });

        if (!transaction) {
            return res.status(202).json({
                success: false,
                pending: true,
                message: "Payment confirmation is still processing.",
            });
        }

        // Check transaction ownership
        if (
            !transaction.customerId ||
            String(transaction.customerId) !== String(customerId)
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view this payment.",
            });
        }

        // Find the related appointment
        const appointment = await appointments.findOne({
            _id: transaction.appointmentId,
            stripeSessionId: sessionId,
            paymentStatus: "paid",
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Verified appointment not found.",
            });
        }

        // Check appointment ownership
        if (String(appointment.customerId) !== String(customerId)) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view this appointment.",
            });
        }

        // Find service information
        const service = await services.findOne({
            _id: appointment.serviceId,
        });

        return res.status(200).json({
            success: true,
            paymentStatus: "paid",
            transaction: {
                amountTotal: transaction.amountTotal,
                currency: transaction.currency,
                stripeSessionId: transaction.stripeSessionId,
                stripePaymentIntentId:
                    transaction.stripePaymentIntentId,
                appointmentId: appointment._id,
                paidAt: transaction.createdAt,
                serviceName: service?.name || "Salon Service",
                appointmentDate: appointment.appointmentDate,
                timeSlot: appointment.timeSlot,
            },
        });
    } catch (error) {
        console.error("Payment Verification Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to verify payment.",
        });
    }
});



// ========================================
// CUSTOMER PAYMENT HISTORY API
// ========================================

app.get("/customer/transactions/:customerId", verifytoken, async (req, res) => {
    try {
        const { customerId } = req.params;

        if (!ObjectId.isValid(customerId)) {
            return res.status(400).json({
                message: "Invalid customer ID.",
            });
        }

        const customerTransactions = await transactions
            .find({
                customerId: new ObjectId(customerId),
                paymentStatus: "paid",
            })
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            totalTransactions: customerTransactions.length,
            transactions: customerTransactions,
        });
    } catch (error) {
        console.error("Get Customer Transactions Error:", error);

        res.status(500).json({
            message: "Failed to fetch payment history.",
        });
    }
});


// ========================================
// START SERVER
// ========================================

app.listen(port, () => {
    console.log(`SalonBook server listening on port ${port}`);
});
export default app;