import { z } from "zod";

export const leadSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  company: z.string().max(200).optional().or(z.literal("")),
  contact_name: z.string().max(200).optional().or(z.literal("")),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  website: z.string().max(500).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  country: z.string().max(120).optional().or(z.literal("")),
  source: z.string().max(120).optional().or(z.literal("")),
  source_url: z.string().max(1000).optional().or(z.literal("")),
  sales_project: z.string().min(1, "Sales project is required").max(120),
  ai_score: z.number().int().min(0).max(100).optional().nullable(),
  ai_summary: z.string().max(3000).optional().or(z.literal("")),
  contact_permission: z
    .enum(["unknown", "legitimate_interest", "consented", "opted_out"])
    .optional(),
  last_contact_method: z.enum(["phone", "email", "visit"]).optional().nullable(),
  next_follow_up_at: z.string().datetime().optional().nullable().or(z.literal("")),
  value: z.number().min(0, "Value must be positive"),
  stage: z.enum([
    "new",
    "contacted",
    "qualified",
    "proposal",
    "negotiation",
    "won",
    "lost",
  ]),
  notes: z.string().max(5000).optional().or(z.literal("")),
  assigned_to: z.string().uuid().optional().nullable().or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadSchema>;
