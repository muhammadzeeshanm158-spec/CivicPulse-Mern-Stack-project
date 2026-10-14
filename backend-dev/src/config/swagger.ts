import swaggerJSDoc from "swagger-jsdoc";
import type { SwaggerOptions } from "swagger-ui-express";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CivicPulse API Documentation",
      version: "1.0.0",
      description: "Production-ready backend API for CivicPulse civic issue management system.",
    },
    servers: [
      {
        // ✅ FIX: /api/v1 use karo (routes ke mutabiq)
        url: "http://localhost:5000/api/v1",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token in the format: Bearer <token>",
        },
      },
      // ✅ ADD: Reusable schemas
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { type: "object" },
            meta: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string" },
          },
        },
        Issue: {
          type: "object",
          properties: {
            id: { type: "integer" },
            ticketNo: { type: "string", example: "CP-2026-000001" },
            title: { type: "string" },
            description: { type: "string" },
            status: { type: "string" },
            priorityScore: { type: "integer" },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);