SalonBook – Backend API
The backend API for SalonBook, an online salon booking platform. It provides the server-side functionality for salon services, appointments, user-related operations, and Stripe payment processing.
Project Overview
This repository contains the REST API built with Node.js and Express.js. It connects to MongoDB for data storage and integrates with Stripe to process and verify appointment payments.
Important Features
- RESTful API built with Express.js
- MongoDB database integration
- Salon services API
- Appointment and booking operations
- Authentication-related API support
- Stripe Checkout payment integration
- Stripe webhook event handling
- Payment verification endpoint
- Appointment payment-status updates
Technology Stack
- Node.js
- Express.js
- MongoDB
- Stripe
- JavaScript
- dotenv
- CORS
Installation Instructions
1. Clone the repository
git clone https://github.com/Nafis-44/saloonbook-server.git
cd saloonbook-server
2. Install dependencies
npm install
Required Environment Variables
Create a .env file in the root of the backend project.

MONGODB_URL=
STRIPE_CURRENCY
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CLIENT_URL=
Use the exact variable names expected by your backend code and deployment configuration.

Important: Never share or commit actual MongoDB credentials, Stripe secret keys, webhook secrets, or .env files. Add secret values privately in your hosting provider's environment-variable settings.
How to Run the Project Locally
Start the backend development server using the script configured in package.json:
npm run dev
The backend API runs at:
http://localhost:5000
If your package.json does not define a dev script, use the start command configured for your project.
Important API Endpoint
The Stripe webhook endpoint receives Stripe payment events:
POST /stripe-webhook
The payment verification endpoint is:
GET /payment/verify/:sessionId
Live Backend
Deployed Backend URL: ADD_YOUR_DEPLOYED_BACKEND_URL_HERE
Client and Server Repositories
- Client Repository: https://github.com/Nafis-44/saloonbook-frontend
- Server Repository: https://github.com/Nafis-44/saloonbook-server