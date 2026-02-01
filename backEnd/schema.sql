-- Finance Database Schema for Supabase

-- Using public schema (default for Supabase)

-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  second_last_name VARCHAR(100),
  nickname VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User settings
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'en',
  currency VARCHAR(10) DEFAULT 'USD',
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  budget_email BOOLEAN DEFAULT true,
  payment_email BOOLEAN DEFAULT true,
  savings_email BOOLEAN DEFAULT true,
  credit_email BOOLEAN DEFAULT true,
  budget_push BOOLEAN DEFAULT true,
  payment_push BOOLEAN DEFAULT true,
  savings_push BOOLEAN DEFAULT true,
  credit_push BOOLEAN DEFAULT true
);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category_group VARCHAR(100),
  icon VARCHAR(100),
  color VARCHAR(20),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User categories
CREATE TABLE public.user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category_group VARCHAR(100),
  icon VARCHAR(100),
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bank accounts
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50),
  account_type VARCHAR(50) NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Credit cards
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  last_four VARCHAR(4),
  card_type VARCHAR(50),
  balance DECIMAL(15,2) DEFAULT 0,
  credit_limit DECIMAL(15,2),
  interest_rate DECIMAL(5,2),
  due_date DATE,
  min_payment DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Loans
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  loan_type VARCHAR(50) DEFAULT 'personal',
  bank_number VARCHAR(50),
  original_amount DECIMAL(15,2),
  balance DECIMAL(15,2),
  interest_rate DECIMAL(5,2),
  term INTEGER,
  monthly_payment DECIMAL(15,2),
  due_date DATE,
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Savings goals
CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  start_date TIMESTAMP DEFAULT NOW(),
  target_date TIMESTAMP,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Recurring payments
CREATE TABLE public.recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  due_date DATE,
  frequency VARCHAR(50),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  user_category_id UUID REFERENCES public.user_categories(id),
  payment_method VARCHAR(50),
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  credit_card_id UUID REFERENCES public.credit_cards(id),
  comment TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_transaction_id UUID,
  savings_goal_id UUID REFERENCES public.savings_goals(id),
  recurring_payment_id UUID REFERENCES public.recurring_payments(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Budget periods
CREATE TABLE public.budget_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- Budget categories
CREATE TABLE public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),      
  budget_period_id UUID REFERENCES public.budget_periods(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  user_category_id UUID REFERENCES public.user_categories(id),
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (
    (category_id IS NOT NULL AND user_category_id IS NULL) OR
    (category_id IS NULL AND user_category_id IS NOT NULL)
  )
);

-- Budget alerts
CREATE TABLE public.budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  budget_category_id UUID REFERENCES public.budget_categories(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  related_id UUID,
  related_type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  notification_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default categories
INSERT INTO public.categories (name, type, category_group, icon, color, is_default) VALUES
('Groceries', 'expense', 'Food & Dining', 'shopping-cart', '#FF6B6B', true),
('Transportation', 'expense', 'Transportation', 'car', '#4ECDC4', true),
('Entertainment', 'expense', 'Entertainment', 'film', '#45B7D1', true),
('Utilities', 'expense', 'Bills & Utilities', 'zap', '#FFA07A', true),
('Healthcare', 'expense', 'Health & Fitness', 'heart', '#98D8C8', true),
('Education', 'expense', 'Education', 'book', '#F7DC6F', true),
('Shopping', 'expense', 'Shopping', 'shopping-bag', '#BB8FCE', true),
('Travel', 'expense', 'Travel', 'plane', '#85C1E9', true),
('Salary', 'income', 'Income', 'dollar-sign', '#82E0AA', true),
('Freelance', 'income', 'Income', 'briefcase', '#F8C471', true),
('Investment', 'income', 'Income', 'trending-up', '#AED6F1', true);