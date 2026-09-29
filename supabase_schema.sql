CREATE TABLE IF NOT EXISTS public.cafe_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  drink_name VARCHAR(100) NOT NULL,
  size VARCHAR(10) NOT NULL DEFAULT 'M' CHECK (size IN ('S', 'M', 'L')),
  options TEXT[] NOT NULL DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 10),
  requests TEXT,
  total_price INTEGER NOT NULL CHECK (total_price >= 0),
  order_status VARCHAR(20) NOT NULL DEFAULT '접수완료',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cafe_menu ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON TABLE public.cafe_menu TO anon;

DROP POLICY IF EXISTS "Allow anonymous order submissions" ON public.cafe_menu;
CREATE POLICY "Allow anonymous order submissions"
  ON public.cafe_menu
  FOR INSERT
  TO anon
  WITH CHECK (true);