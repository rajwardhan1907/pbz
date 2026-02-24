import { z } from "zod";
import { 
  insertCustomerSchema, customers,
  insertJobSchema, jobs,
  insertExpenseSchema, expenses,
  insertInventorySchema, inventory,
  insertNoteSchema, notes,
  insertTravelSchema, travel,
  insertWorkerSchema, workers,
  insertAttendanceSchema, attendance,
  insertUserSchema, users
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    me: {
      method: "GET" as const,
      path: "/api/auth/me",
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: z.null(),
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login",
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.validation,
      },
    },
    register: {
      method: "POST" as const,
      path: "/api/auth/register",
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout",
      responses: {
        200: z.void(),
      },
    },
  },
  customers: {
    list: {
      method: "GET" as const,
      path: "/api/customers",
      responses: {
        200: z.array(z.custom<typeof customers.$inferSelect>()),
      },
    },
    details: {
      method: "GET" as const,
      path: "/api/customers/:id",
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/customers",
      input: insertCustomerSchema,
      responses: {
        201: z.custom<typeof customers.$inferSelect>(),
      },
    },
  },
  jobs: {
    list: {
      method: "GET" as const,
      path: "/api/jobs",
      responses: {
        200: z.array(z.custom<typeof jobs.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/jobs",
      input: insertJobSchema,
      responses: {
        201: z.custom<typeof jobs.$inferSelect>(),
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/jobs/:id",
      input: insertJobSchema.partial(),
      responses: {
        200: z.custom<typeof jobs.$inferSelect>(),
      },
    },
  },
  expenses: {
    list: {
      method: "GET" as const,
      path: "/api/expenses",
      responses: {
        200: z.array(z.custom<typeof expenses.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/expenses",
      input: insertExpenseSchema,
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/expenses/:id",
      responses: {
        204: z.void(),
      },
    },
  },
  inventory: {
    list: {
      method: "GET" as const,
      path: "/api/inventory",
      responses: {
        200: z.array(z.custom<typeof inventory.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/inventory",
      input: insertInventorySchema,
      responses: {
        201: z.custom<typeof inventory.$inferSelect>(),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/inventory/:id",
      responses: {
        204: z.void(),
      },
    },
  },
  workers: {
    list: {
      method: "GET" as const,
      path: "/api/workers",
      responses: {
        200: z.array(z.custom<typeof workers.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/workers",
      input: insertWorkerSchema,
      responses: {
        201: z.custom<typeof workers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/workers/:id",
      input: insertWorkerSchema.partial(),
      responses: {
        200: z.custom<typeof workers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/workers/:id",
      responses: {
        204: z.void(),
      },
    },
  },
  attendance: {
    list: {
      method: "GET" as const,
      path: "/api/attendance",
      responses: {
        200: z.array(z.custom<typeof attendance.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/attendance",
      input: insertAttendanceSchema,
      responses: {
        201: z.custom<typeof attendance.$inferSelect>(),
      },
    },
  },
  travel: {
    list: {
      method: "GET" as const,
      path: "/api/travel",
      responses: {
        200: z.array(z.custom<typeof travel.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/travel",
      input: insertTravelSchema,
      responses: {
        201: z.custom<typeof travel.$inferSelect>(),
      },
    },
  },
  notes: {
    list: {
      method: "GET" as const,
      path: "/api/notes",
      responses: {
        200: z.array(z.custom<typeof notes.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/notes",
      input: insertNoteSchema,
      responses: {
        201: z.custom<typeof notes.$inferSelect>(),
      },
    },
  },
  chat: {
    query: {
      method: "POST" as const,
      path: "/api/chat",
      input: z.object({ message: z.string() }),
      responses: {
        200: z.object({ response: z.string() }),
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
