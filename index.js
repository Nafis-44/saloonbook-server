// import express from 'express'
// import { MongoClient } from 'mongodb'
// import 'dotenv/config'
// import cors from 'cors'

// const app = express()
// app.use(express.json())
// app.use(cors())
// const port = 5000

// const client = new MongoClient(process.env.MONGODB_URI)

// export async function connectToMongoDB() {
//     try {
//         await client.connect();
//         console.log("You successfully connected to MongoDB!");
//         return client;
//     } catch (err) {
//         console.dir(err);
//     }
// }
// const mongoclient = await connectToMongoDB();
// const db = mongoclient.db("saloonbook")



// app.get('/', (req, res) => {
//     res.send('Hello World!')
// })

// app.listen(port, () => {
//     console.log(`Example app listening on port ${port}`)
// })











// import express from 'express'
// import { MongoClient } from 'mongodb'
// import 'dotenv/config'
// import cors from 'cors'

// const app = express()
// app.use(express.json())
// app.use(cors())
// const port = 5000

// const client = new MongoClient(process.env.MONGODB_URI)

// export async function connectToMongoDB() {
//     try {
//         await client.connect();
//         console.log("You successfully connected to MongoDB!");
//         return client;
//     } catch (err) {
//         console.dir(err);
//     }
// }

// const mongoclient = await connectToMongoDB();
// const db = mongoclient.db("saloonbook")

// // Collections
// const users = db.collection("user")

// // Get all users
// app.get("/users", async (req, res) => {
//     try {
//         const cursor = users.find({});
//         const result = await cursor.toArray();
//         res.send(result);
//     } catch (error) {
//         res.status(500).send({ message: "Failed to get users" });
//     }
// })

// app.get('/', (req, res) => {
//     res.send('Hello World!')
// })

// app.listen(port, () => {
//     console.log(`Example app listening on port ${port}`)
// })










// import express from 'express';
// import { MongoClient, ObjectId } from 'mongodb';
// import 'dotenv/config';
// import cors from 'cors';

// const app = express();

// app.use(express.json());
// app.use(cors());

// const port = 5000;

// // MongoDB Connection
// const client = new MongoClient(process.env.MONGODB_URI);

// export async function connectToMongoDB() {
//     try {
//         await client.connect();

//         console.log("You successfully connected to MongoDB!");

//         return client;
//     } catch (error) {
//         console.error("MongoDB Connection Failed:", error);
//         throw error;
//     }
// }

// // Connect to Database
// const mongoclient = await connectToMongoDB();

// const db = mongoclient.db("saloonbook");

// // Collections
// const users = db.collection("user");
// const services = db.collection("services");


// // ======================================
// // HOME ROUTE
// // ======================================

// app.get('/', (req, res) => {
//     res.send('SalonBook Server Is Running!');
// });


// // ======================================
// // USER ROUTES
// // ======================================

// // Get All Users
// app.get("/users", async (req, res) => {
//     try {
//         const result = await users.find({}).toArray();

//         res.status(200).send(result);

//     } catch (error) {
//         console.error("Get Users Error:", error);

//         res.status(500).send({
//             message: "Failed to get users"
//         });
//     }
// });


// // ======================================
// // SERVICE ROUTES
// // ======================================


// // 1. GET ALL SERVICES
// app.get("/services", async (req, res) => {
//     try {
//         const result = await services
//             .find({})
//             .sort({ createdAt: -1 })
//             .toArray();

//         res.status(200).send(result);

//     } catch (error) {
//         console.error("Get Services Error:", error);

//         res.status(500).send({
//             message: "Failed to get services"
//         });
//     }
// });


// // 2. GET SINGLE SERVICE
// app.get("/services/:id", async (req, res) => {
//     try {
//         const { id } = req.params;

//         if (!ObjectId.isValid(id)) {
//             return res.status(400).send({
//                 message: "Invalid service ID"
//             });
//         }

//         const result = await services.findOne({
//             _id: new ObjectId(id)
//         });

//         if (!result) {
//             return res.status(404).send({
//                 message: "Service not found"
//             });
//         }

//         res.status(200).send(result);

//     } catch (error) {
//         console.error("Get Single Service Error:", error);

//         res.status(500).send({
//             message: "Failed to get service"
//         });
//     }
// });


// // 3. ADD NEW SERVICE
// app.post("/services", async (req, res) => {
//     try {
//         const {
//             name,
//             description,
//             price,
//             duration,
//             category,
//             image
//         } = req.body;

//         // Required Field Validation
//         if (
//             !name?.trim() ||
//             !description?.trim() ||
//             price === undefined ||
//             duration === undefined ||
//             !category?.trim()
//         ) {
//             return res.status(400).send({
//                 message: "Please provide all required service information"
//             });
//         }

//         const numericPrice = Number(price);
//         const numericDuration = Number(duration);

//         if (
//             !Number.isFinite(numericPrice) ||
//             numericPrice < 0
//         ) {
//             return res.status(400).send({
//                 message: "Please provide a valid service price"
//             });
//         }

//         if (
//             !Number.isInteger(numericDuration) ||
//             numericDuration <= 0
//         ) {
//             return res.status(400).send({
//                 message: "Please provide a valid service duration"
//             });
//         }

//         const newService = {
//             name: name.trim(),
//             description: description.trim(),
//             price: numericPrice,
//             duration: numericDuration,
//             category: category.trim(),
//             image: typeof image === "string" ? image.trim() : "",
//             createdAt: new Date(),
//             updatedAt: new Date()
//         };

//         const result = await services.insertOne(newService);

//         res.status(201).send({
//             success: true,
//             message: "Service added successfully",
//             insertedId: result.insertedId
//         });

//     } catch (error) {
//         console.error("Add Service Error:", error);

//         res.status(500).send({
//             message: "Failed to add service"
//         });
//     }
// });


// // 4. UPDATE SERVICE
// app.put("/services/:id", async (req, res) => {
//     try {
//         const { id } = req.params;

//         if (!ObjectId.isValid(id)) {
//             return res.status(400).send({
//                 message: "Invalid service ID"
//             });
//         }

//         const {
//             name,
//             description,
//             price,
//             duration,
//             category,
//             image
//         } = req.body;

//         if (
//             !name?.trim() ||
//             !description?.trim() ||
//             price === undefined ||
//             duration === undefined ||
//             !category?.trim()
//         ) {
//             return res.status(400).send({
//                 message: "Please provide all required service information"
//             });
//         }

//         const numericPrice = Number(price);
//         const numericDuration = Number(duration);

//         if (
//             !Number.isFinite(numericPrice) ||
//             numericPrice < 0 ||
//             !Number.isInteger(numericDuration) ||
//             numericDuration <= 0
//         ) {
//             return res.status(400).send({
//                 message: "Invalid price or duration"
//             });
//         }

//         const updatedService = {
//             name: name.trim(),
//             description: description.trim(),
//             price: numericPrice,
//             duration: numericDuration,
//             category: category.trim(),
//             image: typeof image === "string" ? image.trim() : "",
//             updatedAt: new Date()
//         };

//         const result = await services.updateOne(
//             { _id: new ObjectId(id) },
//             { $set: updatedService }
//         );

//         if (result.matchedCount === 0) {
//             return res.status(404).send({
//                 message: "Service not found"
//             });
//         }

//         const updatedData = await services.findOne({
//             _id: new ObjectId(id)
//         });

//         res.status(200).send({
//             success: true,
//             message: "Service updated successfully",
//             service: updatedData
//         });

//     } catch (error) {
//         console.error("Update Service Error:", error);

//         res.status(500).send({
//             message: "Failed to update service"
//         });
//     }
// });


// // 5. DELETE SERVICE
// app.delete("/services/:id", async (req, res) => {
//     try {
//         const { id } = req.params;

//         if (!ObjectId.isValid(id)) {
//             return res.status(400).send({
//                 message: "Invalid service ID"
//             });
//         }

//         const result = await services.deleteOne({
//             _id: new ObjectId(id)
//         });

//         if (result.deletedCount === 0) {
//             return res.status(404).send({
//                 message: "Service not found"
//             });
//         }

//         res.status(200).send({
//             success: true,
//             message: "Service deleted successfully"
//         });

//     } catch (error) {
//         console.error("Delete Service Error:", error);

//         res.status(500).send({
//             message: "Failed to delete service"
//         });
//     }
// });


// // ======================================
// // START SERVER
// // ======================================

// app.listen(port, () => {
//     console.log(`SalonBook Server listening on port ${port}`);
// });












import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

const port = 5000;

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

// Home Route
app.get("/", (req, res) => {
    res.send("SalonBook Server is Running!");
});

// Get All Users
app.get("/users", async (req, res) => {
    try {
        const result = await users.find({}).toArray();

        res.status(200).json(result);
    } catch (error) {
        console.error("Get Users Error:", error);

        res.status(500).json({
            message: "Failed to get users",
        });
    }
});

// Get All Services (Admin)
app.get("/services", async (req, res) => {
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
app.post("/services", async (req, res) => {
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
app.get("/services/:id", async (req, res) => {
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
app.put("/services/:id", async (req, res) => {
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
app.delete("/services/:id", async (req, res) => {
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
app.post("/appointments", async (req, res) => {
    try {
        const {
            serviceId,
            appointmentDate,
            timeSlot,
            message,
        } = req.body;

        // Required Field Validation
        if (!serviceId || !appointmentDate || !timeSlot) {
            return res.status(400).json({
                message: "Please provide service, date and time.",
            });
        }

        // Validate Service ID
        if (!ObjectId.isValid(serviceId)) {
            return res.status(400).json({
                message: "Invalid service ID.",
            });
        }

        // Validate Date Format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
            return res.status(400).json({
                message: "Invalid appointment date.",
            });
        }

      // Check Real Calendar Date
const [year, month, day] = appointmentDate.split("-").map(Number);

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

// Check Past Date
const today = new Date();
today.setHours(0, 0, 0, 0);

if (selectedDate < today) {
    return res.status(400).json({
        message: "You cannot book an appointment in the past.",
    });
}

        // Validate Time Slot
        if (!timeSlots.includes(timeSlot)) {
            return res.status(400).json({
                message: "Invalid appointment time slot.",
            });
        }

        // Validate Message
        if (
            message !== undefined &&
            (typeof message !== "string" || message.length > 500)
        ) {
            return res.status(400).json({
                message: "Message must be a string of maximum 500 characters.",
            });
        }

        // Find Service
        const service = await services.findOne({
            _id: new ObjectId(serviceId),
        });

        if (!service) {
            return res.status(404).json({
                message: "Service not found.",
            });
        }

        // Check Service Status
        if (service.status && service.status !== "active") {
            return res.status(400).json({
                message: "This service is currently unavailable.",
            });
        }

        // Check Duplicate Active Appointment
        const existingAppointment = await appointments.findOne({
            appointmentDate,
            timeSlot,
            status: {
                $in: ["pending", "confirmed"],
            },
        });

        if (existingAppointment) {
            return res.status(409).json({
                message: "This time slot is already booked. Please choose another time.",
            });
        }

        // Create Appointment
        const newAppointment = {
            serviceId: new ObjectId(serviceId),

            // Temporary until Authentication is implemented
            customerId: null,

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
            message: "Appointment request submitted successfully!",
            appointmentId: result.insertedId,
        });

    } catch (error) {
        console.error("Create Appointment Error:", error);

        res.status(500).json({
            message: "Failed to create appointment.",
        });
    }
});

// Get All Appointments (Temporary Development Route)
app.get("/appointments", async (req, res) => {
    try {
        const result = await appointments
            .aggregate([
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
                    $sort: {
                        createdAt: -1,
                    },
                },
            ])
            .toArray();

        res.status(200).json(result);

    } catch (error) {
        console.error("Get Appointments Error:", error);

        res.status(500).json({
            message: "Failed to get appointments.",
        });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`SalonBook server listening on port ${port}`);
});
