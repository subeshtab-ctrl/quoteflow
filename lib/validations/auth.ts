import { z } from 'zod';

/**
 * Server-side Zod validation for user and registrant names.
 * Defense-in-depth:
 * - Max 60 characters
 * - Allows Unicode letters, spaces, dots, apostrophes, and hyphens
 * - Strictly rejects HTML markup (< > " & / \), tags, and URL-like strings
 */
export const safeNameSchema = z
  .string({ required_error: 'Full name is required' })
  .trim()
  .min(1, 'Full name is required')
  .max(60, 'Full name must be 60 characters or fewer')
  .refine(
    (val) => !/[<>"&/\\]/.test(val),
    'Name cannot contain HTML or special characters (<, >, ", &, /, \\)'
  )
  .refine(
    (val) => !/(https?:\/\/|www\.|\.[a-z]{2,}\b)/i.test(val),
    'Name cannot contain web links or URLs'
  )
  .refine(
    (val) => /^[\p{L}\p{M}\s.'-]+$/u.test(val),
    'Name may only contain letters, spaces, dots, hyphens, and apostrophes'
  );

/**
 * Server-side Zod validation for company/organization names.
 */
export const safeCompanyNameSchema = z
  .string({ required_error: 'Company name is required' })
  .trim()
  .min(1, 'Company name is required')
  .max(100, 'Company name must be 100 characters or fewer')
  .refine(
    (val) => !/[<>"&/\\]/.test(val),
    'Company name cannot contain HTML or special characters (<, >, ", &, /, \\)'
  )
  .refine(
    (val) => !/(https?:\/\/|www\.|\.[a-z]{2,}\b)/i.test(val),
    'Company name cannot contain web links or URLs'
  );

/**
 * Registration request body validation schema
 */
export const registrationSchema = z.object({
  fullName: safeNameSchema,
  companyName: safeCompanyNameSchema,
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(254, 'Email must be 254 characters or fewer'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be 128 characters or fewer'),
  countryCode: z.string().optional().default('IN'),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
