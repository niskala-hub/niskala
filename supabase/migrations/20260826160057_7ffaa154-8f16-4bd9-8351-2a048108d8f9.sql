ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.limit_product_images()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.image_urls IS NULL THEN
    NEW.image_urls := '{}';
  END IF;
  IF array_length(NEW.image_urls, 1) > 4 THEN
    RAISE EXCEPTION 'Maksimal 4 gambar per produk';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_limit_images ON public.products;
CREATE TRIGGER trg_products_limit_images
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.limit_product_images();

UPDATE public.products
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND coalesce(array_length(image_urls, 1), 0) = 0;