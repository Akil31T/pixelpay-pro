
-- Helper: is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin')
  )
$$;

-- INVOICES
DROP POLICY IF EXISTS "own invoices all" ON public.invoices;
DROP POLICY IF EXISTS "invoices select scoped" ON public.invoices;
DROP POLICY IF EXISTS "invoices insert own" ON public.invoices;
DROP POLICY IF EXISTS "invoices update scoped" ON public.invoices;
DROP POLICY IF EXISTS "invoices delete scoped" ON public.invoices;

CREATE POLICY "invoices select scoped" ON public.invoices
FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "invoices insert own" ON public.invoices
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoices update scoped" ON public.invoices
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "invoices delete scoped" ON public.invoices
FOR DELETE USING (auth.uid() = user_id OR public.is_admin_or_super(auth.uid()));

-- INVOICE ITEMS
DROP POLICY IF EXISTS "own invoice items all" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items select scoped" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items insert own" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items update scoped" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items delete scoped" ON public.invoice_items;

CREATE POLICY "invoice_items select scoped" ON public.invoice_items
FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "invoice_items insert own" ON public.invoice_items
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoice_items update scoped" ON public.invoice_items
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "invoice_items delete scoped" ON public.invoice_items
FOR DELETE USING (auth.uid() = user_id OR public.is_admin_or_super(auth.uid()));

-- CUSTOMERS
DROP POLICY IF EXISTS "own customers all" ON public.customers;
DROP POLICY IF EXISTS "customers select scoped" ON public.customers;
DROP POLICY IF EXISTS "customers insert own" ON public.customers;
DROP POLICY IF EXISTS "customers update scoped" ON public.customers;
DROP POLICY IF EXISTS "customers delete scoped" ON public.customers;

CREATE POLICY "customers select scoped" ON public.customers
FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "customers insert own" ON public.customers
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers update scoped" ON public.customers
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "customers delete scoped" ON public.customers
FOR DELETE USING (auth.uid() = user_id OR public.is_admin_or_super(auth.uid()));
