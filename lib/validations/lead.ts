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
