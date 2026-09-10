-- Add price_status to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_status text DEFAULT 'active';
