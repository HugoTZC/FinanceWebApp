-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'bank_transfer', 'other');
CREATE TYPE frequency_type AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
CREATE TYPE currency_type AS ENUM ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN');
CREATE TYPE language_type AS ENUM ('en', 'es');
CREATE TYPE theme_type AS ENUM ('light', 'dark', 'system');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    preferred_currency currency_type DEFAULT 'USD',
    preferred_language language_type DEFAULT 'en',
    preferred_theme theme_type DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    type transaction_type NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name, type)
);

-- Savings goals table
CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0,
    due_date DATE,
    due_date_day INTEGER CHECK (due_date_day BETWEEN 1 AND 31),
    monthly_contribution DECIMAL(12, 2),
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit cards table
CREATE TABLE credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    last_four VARCHAR(4) NOT NULL,
    balance DECIMAL(12, 2) DEFAULT 0,
    credit_limit DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    min_payment DECIMAL(12, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loans table
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    bank_number VARCHAR(50),
    balance DECIMAL(12, 2) NOT NULL,
    original_amount DECIMAL(12, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    monthly_payment DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    term VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring payments table
CREATE TABLE recurring_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    frequency frequency_type NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    type transaction_type NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    payment_method payment_method,
    credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
    savings_goal_id UUID REFERENCES savings_goals(id) ON DELETE SET NULL,
    recurring_payment_id UUID REFERENCES recurring_payments(id) ON DELETE SET NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget table
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category_id, year, month)
);

-- Notification settings table
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    due_date_reminders BOOLEAN DEFAULT TRUE,
    budget_alerts BOOLEAN DEFAULT TRUE,
    weekly_reports BOOLEAN DEFAULT FALSE,
    reminder_time VARCHAR(20) DEFAULT '1day',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly summary view
CREATE VIEW monthly_summary AS
SELECT 
    user_id,
    EXTRACT(YEAR FROM transaction_date) AS year,
    EXTRACT(MONTH FROM transaction_date) AS month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses,
    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS net_amount
FROM transactions
GROUP BY user_id, year, month
ORDER BY user_id, year, month;

-- Category spending view
CREATE VIEW category_spending AS
SELECT 
    t.user_id,
    EXTRACT(YEAR FROM t.transaction_date) AS year,
    EXTRACT(MONTH FROM t.transaction_date) AS month,
    c.id AS category_id,
    c.name AS category_name,
    c.color AS category_color,
    SUM(t.amount) AS total_amount,
    COUNT(t.id) AS transaction_count
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.type = 'expense'
GROUP BY t.user_id, year, month, c.id, c.name, c.color
ORDER BY t.user_id, year, month, total_amount DESC;

-- Budget progress view
CREATE VIEW budget_progress AS
SELECT 
    b.user_id,
    b.year,
    b.month,
    b.category_id,
    c.name AS category_name,
    c.color AS category_color,
    b.amount AS budgeted_amount,
    COALESCE(SUM(t.amount), 0) AS spent_amount,
    COALESCE(b.amount - SUM(t.amount), b.amount) AS remaining_amount,
    CASE 
        WHEN b.amount > 0 THEN COALESCE(SUM(t.amount) / b.amount * 100, 0)
        ELSE 0
    END AS percentage_used
FROM budgets b
LEFT JOIN categories c ON b.category_id = c.id
LEFT JOIN transactions t ON 
    t.category_id = b.category_id AND 
    t.user_id = b.user_id AND 
    EXTRACT(YEAR FROM t.transaction_date) = b.year AND 
    EXTRACT(MONTH FROM t.transaction_date) = b.month AND
    t.type = 'expense'
GROUP BY b.user_id, b.year, b.month, b.category_id, c.name, c.color, b.amount
ORDER BY b.user_id, b.year, b.month;

-- Credit card spending view
CREATE VIEW credit_card_spending AS
SELECT 
    t.user_id,
    t.credit_card_id,
    cc.name AS credit_card_name,
    cc.last_four,
    EXTRACT(YEAR FROM t.transaction_date) AS year,
    EXTRACT(MONTH FROM t.transaction_date) AS month,
    SUM(t.amount) AS total_amount,
    COUNT(t.id) AS transaction_count
FROM transactions t
JOIN credit_cards cc ON t.credit_card_id = cc.id
WHERE t.type = 'expense' AND t.payment_method = 'credit_card'
GROUP BY t.user_id, t.credit_card_id, cc.name, cc.last_four, year, month
ORDER BY t.user_id, year, month, total_amount DESC;

-- Credit card category spending view
CREATE VIEW credit_card_category_spending AS
SELECT 
    t.user_id,
    t.credit_card_id,
    cc.name AS credit_card_name,
    EXTRACT(YEAR FROM t.transaction_date) AS year,
    EXTRACT(MONTH FROM t.transaction_date) AS month,
    c.id AS category_id,
    c.name AS category_name,
    SUM(t.amount) AS total_amount,
    COUNT(t.id) AS transaction_count
FROM transactions t
JOIN credit_cards cc ON t.credit_card_id = cc.id
JOIN categories c ON t.category_id = c.id
WHERE t.type = 'expense' AND t.payment_method = 'credit_card'
GROUP BY t.user_id, t.credit_card_id, cc.name, year, month, c.id, c.name
ORDER BY t.user_id, year, month, total_amount DESC;

-- Savings goal progress view
CREATE VIEW savings_goal_progress AS
SELECT 
    sg.id AS savings_goal_id,
    sg.user_id,
    sg.name,
    sg.target_amount,
    sg.current_amount,
    sg.due_date,
    sg.monthly_contribution,
    CASE 
        WHEN sg.target_amount > 0 THEN sg.current_amount / sg.target_amount * 100
        ELSE 0
    END AS percentage_complete,
    CASE 
        WHEN sg.due_date IS NOT NULL THEN 
            EXTRACT(DAY FROM (sg.due_date - CURRENT_DATE))
        ELSE NULL
    END AS days_remaining
FROM savings_goals sg
WHERE sg.is_completed = FALSE
ORDER BY sg.user_id, days_remaining;

-- Function to update credit card balance when a transaction is added
CREATE OR REPLACE FUNCTION update_credit_card_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_method = 'credit_card' AND NEW.credit_card_id IS NOT NULL THEN
        IF NEW.type = 'expense' THEN
            UPDATE credit_cards
            SET balance = balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.credit_card_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update credit card balance
CREATE TRIGGER trigger_update_credit_card_balance
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_credit_card_balance();

-- Function to update savings goal amount when a transaction is added
CREATE OR REPLACE FUNCTION update_savings_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.savings_goal_id IS NOT NULL THEN
        IF NEW.type = 'income' THEN
            UPDATE savings_goals
            SET current_amount = current_amount + NEW.amount,
                updated_at = NOW(),
                is_completed = CASE 
                    WHEN current_amount + NEW.amount >= target_amount THEN TRUE
                    ELSE FALSE
                END
            WHERE id = NEW.savings_goal_id;
        ELSIF NEW.type = 'expense' THEN
            UPDATE savings_goals
            SET current_amount = GREATEST(0, current_amount - NEW.amount),
                updated_at = NOW()
            WHERE id = NEW.savings_goal_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update savings goal amount
CREATE TRIGGER trigger_update_savings_goal_amount
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_savings_goal_amount();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update timestamps
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_categories_timestamp
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_savings_goals_timestamp
BEFORE UPDATE ON savings_goals
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_credit_cards_timestamp
BEFORE UPDATE ON credit_cards
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_loans_timestamp
BEFORE UPDATE ON loans
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_recurring_payments_timestamp
BEFORE UPDATE ON recurring_payments
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_transactions_timestamp
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_budgets_timestamp
BEFORE UPDATE ON budgets
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_notification_settings_timestamp
BEFORE UPDATE ON notification_settings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Insert default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default expense categories
    INSERT INTO categories (user_id, name, color, type, is_default) VALUES
    (NEW.id, 'Housing', '#4ade80', 'expense', TRUE),
    (NEW.id, 'Food', '#60a5fa', 'expense', TRUE),
    (NEW.id, 'Transportation', '#f87171', 'expense', TRUE),
    (NEW.id, 'Entertainment', '#fbbf24', 'expense', TRUE),
    (NEW.id, 'Utilities', '#a78bfa', 'expense', TRUE),
    (NEW.id, 'Shopping', '#fb923c', 'expense', TRUE),
    (NEW.id, 'Healthcare', '#34d399', 'expense', TRUE),
    (NEW.id, 'Education', '#818cf8', 'expense', TRUE),
    (NEW.id, 'Personal', '#ec4899', 'expense', TRUE),
    (NEW.id, 'Other Expense', '#94a3b8', 'expense', TRUE);
    
    -- Insert default income categories
    INSERT INTO categories (user_id, name, color, type, is_default) VALUES
    (NEW.id, 'Salary', '#22c55e', 'income', TRUE),
    (NEW.id, 'Investment', '#3b82f6', 'income', TRUE),
    (NEW.id, 'Freelance', '#8b5cf6', 'income', TRUE),
    (NEW.id, 'Gift', '#ec4899', 'income', TRUE),
    (NEW.id, 'Other Income', '#94a3b8', 'income', TRUE);
    
    -- Create default notification settings
    INSERT INTO notification_settings (user_id) VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default categories for new users
CREATE TRIGGER trigger_create_default_categories
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_categories();

-- Function to generate monthly budgets based on previous month
CREATE OR REPLACE FUNCTION generate_monthly_budgets()
RETURNS VOID AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
    prev_year INTEGER;
    prev_month INTEGER;
    user_record RECORD;
BEGIN
    -- Calculate previous month
    IF current_month = 1 THEN
        prev_month := 12;
        prev_year := current_year - 1;
    ELSE
        prev_month := current_month - 1;
        prev_year := current_year;
    END IF;
    
    -- For each user
    FOR user_record IN SELECT id FROM users LOOP
        -- Copy budgets from previous month if they exist
        INSERT INTO budgets (user_id, category_id, amount, year, month)
        SELECT 
            user_id, 
            category_id, 
            amount, 
            current_year, 
            current_month
        FROM budgets
        WHERE 
            user_id = user_record.id AND 
            year = prev_year AND 
            month = prev_month
        ON CONFLICT (user_id, category_id, year, month) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check for upcoming due dates
CREATE OR REPLACE FUNCTION get_upcoming_due_dates(p_user_id UUID, p_days INTEGER)
RETURNS TABLE (
    item_type TEXT,
    item_id UUID,
    name TEXT,
    amount DECIMAL(12, 2),
    due_date DATE,
    days_until_due INTEGER
) AS $$
BEGIN
    -- Credit card payments
    RETURN QUERY
    SELECT 
        'credit_card'::TEXT AS item_type,
        cc.id AS item_id,
        cc.name,
        cc.min_payment AS amount,
        cc.due_date,
        (cc.due_date - CURRENT_DATE)::INTEGER AS days_until_due
    FROM credit_cards cc
    WHERE 
        cc.user_id = p_user_id AND
        cc.due_date >= CURRENT_DATE AND
        cc.due_date <= (CURRENT_DATE + p_days);
    
    -- Loan payments
    RETURN QUERY
    SELECT 
        'loan'::TEXT AS item_type,
        l.id AS item_id,
        l.name,
        l.monthly_payment AS amount,
        l.due_date,
        (l.due_date - CURRENT_DATE)::INTEGER AS days_until_due
    FROM loans l
    WHERE 
        l.user_id = p_user_id AND
        l.due_date >= CURRENT_DATE AND
        l.due_date <= (CURRENT_DATE + p_days);
    
    -- Recurring payments
    RETURN QUERY
    SELECT 
        'recurring_payment'::TEXT AS item_type,
        rp.id AS item_id,
        rp.name,
        rp.amount,
        rp.due_date,
        (rp.due_date - CURRENT_DATE)::INTEGER AS days_until_due
    FROM recurring_payments rp
    WHERE 
        rp.user_id = p_user_id AND
        rp.due_date >= CURRENT_DATE AND
        rp.due_date <= (CURRENT_DATE + p_days);
    
    -- Savings goals with due dates
    RETURN QUERY
    SELECT 
        'savings_goal'::TEXT AS item_type,
        sg.id AS item_id,
        sg.name,
        CASE 
            WHEN sg.monthly_contribution IS NOT NULL THEN sg.monthly_contribution
            ELSE sg.target_amount - sg.current_amount
        END AS amount,
        sg.due_date,
        (sg.due_date - CURRENT_DATE)::INTEGER AS days_until_due
    FROM savings_goals sg
    WHERE 
        sg.user_id = p_user_id AND
        sg.is_completed = FALSE AND
        sg.due_date IS NOT NULL AND
        sg.due_date >= CURRENT_DATE AND
        sg.due_date <= (CURRENT_DATE + p_days);
END;
$$ LANGUAGE plpgsql;

-- Create a function to get budget analysis data
CREATE OR REPLACE FUNCTION get_budget_analysis(
    p_user_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
    total_income DECIMAL(12, 2),
    total_expenses DECIMAL(12, 2),
    total_budget DECIMAL(12, 2),
    total_savings DECIMAL(12, 2),
    budget_used_percentage DECIMAL(5, 2),
    savings_percentage DECIMAL(5, 2)
) AS $$
DECLARE
    v_total_income DECIMAL(12, 2);
    v_total_expenses DECIMAL(12, 2);
    v_total_budget DECIMAL(12, 2);
    v_total_savings DECIMAL(12, 2);
    v_budget_used_percentage DECIMAL(5, 2);
    v_savings_percentage DECIMAL(5, 2);
BEGIN
    -- Get total income for the month
    SELECT COALESCE(SUM(amount), 0) INTO v_total_income
    FROM transactions
    WHERE 
        user_id = p_user_id AND
        type = 'income' AND
        EXTRACT(YEAR FROM transaction_date) = p_year AND
        EXTRACT(MONTH FROM transaction_date) = p_month;
    
    -- Get total expenses for the month
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM transactions
    WHERE 
        user_id = p_user_id AND
        type = 'expense' AND
        EXTRACT(YEAR FROM transaction_date) = p_year AND
        EXTRACT(MONTH FROM transaction_date) = p_month;
    
    -- Get total budget for the month
    SELECT COALESCE(SUM(amount), 0) INTO v_total_budget
    FROM budgets
    WHERE 
        user_id = p_user_id AND
        year = p_year AND
        month = p_month;
    
    -- Calculate total savings
    v_total_savings := v_total_income - v_total_expenses;
    
    -- Calculate percentages
    IF v_total_budget > 0 THEN
        v_budget_used_percentage := (v_total_expenses / v_total_budget) * 100;
    ELSE
        v_budget_used_percentage := 0;
    END IF;
    
    IF v_total_income > 0 THEN
        v_savings_percentage := (v_total_savings / v_total_income) * 100;
    ELSE
        v_savings_percentage := 0;
    END IF;
    
    RETURN QUERY SELECT 
        v_total_income,
        v_total_expenses,
        v_total_budget,
        v_total_savings,
        v_budget_used_percentage,
        v_savings_percentage;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get weekly financial analysis
CREATE OR REPLACE FUNCTION get_weekly_analysis(
    p_user_id UUID,
    p_weeks_back INTEGER DEFAULT 4
)
RETURNS TABLE (
    week_start DATE,
    week_end DATE,
    income DECIMAL(12, 2),
    expenses DECIMAL(12, 2),
    savings DECIMAL(12, 2),
    savings_target DECIMAL(12, 2),
    savings_percentage DECIMAL(5, 2)
) AS $$
DECLARE
    v_current_date DATE := CURRENT_DATE;
    v_week_start DATE;
    v_week_end DATE;
    v_income DECIMAL(12, 2);
    v_expenses DECIMAL(12, 2);
    v_savings DECIMAL(12, 2);
    v_savings_target DECIMAL(12, 2);
    v_savings_percentage DECIMAL(5, 2);
    v_monthly_obligations DECIMAL(12, 2);
    v_weekly_target DECIMAL(12, 2);
    i INTEGER;
BEGIN
    -- Calculate monthly obligations (recurring payments + credit card min payments + loan payments)
    SELECT 
        COALESCE(SUM(rp.amount), 0) + 
        COALESCE(SUM(cc.min_payment), 0) + 
        COALESCE(SUM(l.monthly_payment), 0)
    INTO v_monthly_obligations
    FROM users u
    LEFT JOIN recurring_payments rp ON u.id = rp.user_id
    LEFT JOIN credit_cards cc ON u.id = cc.user_id
    LEFT JOIN loans l ON u.id = l.user_id
    WHERE u.id = p_user_id;
    
    -- Calculate weekly savings target (monthly obligations / 4)
    v_weekly_target := v_monthly_obligations / 4;
    
    -- For each week
    FOR i IN 0..(p_weeks_back-1) LOOP
        -- Calculate week start and end dates
        v_week_end := v_current_date - (i * 7);
        v_week_start := v_week_end - 6;
        
        -- Get income for the week
        SELECT COALESCE(SUM(amount), 0) INTO v_income
        FROM transactions
        WHERE 
            user_id = p_user_id AND
            type = 'income' AND
            transaction_date BETWEEN v_week_start AND v_week_end;
        
        -- Get expenses for the week
        SELECT COALESCE(SUM(amount), 0) INTO v_expenses
        FROM transactions
        WHERE 
            user_id = p_user_id AND
            type = 'expense' AND
            transaction_date BETWEEN v_week_start AND v_week_end;
        
        -- Calculate savings
        v_savings := v_income - v_expenses;
        
        -- Calculate savings percentage
        IF v_weekly_target > 0 THEN
            v_savings_percentage := (v_savings / v_weekly_target) * 100;
        ELSE
            v_savings_percentage := 0;
        END IF;
        
        RETURN QUERY SELECT 
            v_week_start,
            v_week_end,
            v_income,
            v_expenses,
            v_savings,
            v_weekly_target,
            v_savings_percentage;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Sample data insertion function (for development/testing)
CREATE OR REPLACE FUNCTION insert_sample_data()
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_housing_id UUID;
    v_food_id UUID;
    v_transportation_id UUID;
    v_entertainment_id UUID;
    v_utilities_id UUID;
    v_salary_id UUID;
    v_investment_id UUID;
    v_credit_card_id UUID;
    v_savings_goal_id UUID;
BEGIN
    -- Insert a sample user
    INSERT INTO users (email, password_hash, full_name)
    VALUES ('john.doe@example.com', 'hashed_password', 'John Doe')
    RETURNING id INTO v_user_id;
    
    -- Get category IDs
    SELECT id INTO v_housing_id FROM categories WHERE user_id = v_user_id AND name = 'Housing';
    SELECT id INTO v_food_id FROM categories WHERE user_id = v_user_id AND name = 'Food';
    SELECT id INTO v_transportation_id FROM categories WHERE user_id = v_user_id AND name = 'Transportation';
    SELECT id INTO v_entertainment_id FROM categories WHERE user_id = v_user_id AND name = 'Entertainment';
    SELECT id INTO v_utilities_id FROM categories WHERE user_id = v_user_id AND name = 'Utilities';
    SELECT id INTO v_salary_id FROM categories WHERE user_id = v_user_id AND name = 'Salary';
    SELECT id INTO v_investment_id FROM categories WHERE user_id = v_user_id AND name = 'Investment';
    
    -- Insert a credit card
    INSERT INTO credit_cards (user_id, name, last_four, credit_limit, due_date, min_payment, interest_rate)
    VALUES (v_user_id, 'Chase Sapphire', '4567', 10000, CURRENT_DATE + 15, 75, 18.99)
    RETURNING id INTO v_credit_card_id;
    
    -- Insert a savings goal
    INSERT INTO savings_goals (user_id, name, target_amount, current_amount, due_date, monthly_contribution)
    VALUES (v_user_id, 'Emergency Fund', 10000, 5000, CURRENT_DATE + 180, 500)
    RETURNING id INTO v_savings_goal_id;
    
    -- Insert budgets
    INSERT INTO budgets (user_id, category_id, amount, year, month)
    VALUES 
    (v_user_id, v_housing_id, 2000, EXTRACT(YEAR FROM CURRENT_DATE), EXTRACT(MONTH FROM CURRENT_DATE)),
    (v_user_id, v_food_id, 1000, EXTRACT(YEAR FROM CURRENT_DATE), EXTRACT(MONTH FROM CURRENT_DATE)),
    (v_user_id, v_transportation_id, 800, EXTRACT(YEAR FROM CURRENT_DATE), EXTRACT(MONTH FROM CURRENT_DATE)),
    (v_user_id, v_entertainment_id, 500, EXTRACT(YEAR FROM CURRENT_DATE), EXTRACT(MONTH FROM CURRENT_DATE)),
    (v_user_id, v_utilities_id, 400, EXTRACT(YEAR FROM CURRENT_DATE), EXTRACT(MONTH FROM CURRENT_DATE));
    
    -- Insert income transactions
    INSERT INTO transactions (user_id, title, amount, transaction_date, type, category_id)
    VALUES 
    (v_user_id, 'Salary Deposit', 7500, CURRENT_DATE - 15, 'income', v_salary_id),
    (v_user_id, 'Dividend Payment', 350, CURRENT_DATE - 10, 'income', v_investment_id);
    
    -- Insert expense transactions
    INSERT INTO transactions (user_id, title, amount, transaction_date, type, category_id, payment_method)
    VALUES 
    (v_user_id, 'Monthly Rent', 1800, CURRENT_DATE - 12, 'expense', v_housing_id, 'bank_transfer'),
    (v_user_id, 'Grocery Store', 250, CURRENT_DATE - 8, 'expense', v_food_id,  'bank_transfer'),
    (v_user_id, 'Grocery Store', 250, CURRENT_DATE - 8, 'expense', v_food_id, 'cash'),
    (v_user_id, 'Gas Station', 45, CURRENT_DATE - 5, 'expense', v_transportation_id, 'credit_card'),
    (v_user_id, 'Movie Tickets', 30, CURRENT_DATE - 3, 'expense', v_entertainment_id, 'credit_card'),
    (v_user_id, 'Electricity Bill', 120, CURRENT_DATE - 7, 'expense', v_utilities_id, 'bank_transfer');
    
    -- Insert credit card transactions
    INSERT INTO transactions (user_id, title, amount, transaction_date, type, category_id, payment_method, credit_card_id)
    VALUES 
    (v_user_id, 'Restaurant Dinner', 85, CURRENT_DATE - 6, 'expense', v_food_id, 'credit_card', v_credit_card_id),
    (v_user_id, 'Online Shopping', 120, CURRENT_DATE - 4, 'expense', v_entertainment_id, 'credit_card', v_credit_card_id);
    
    -- Insert savings goal transaction
    INSERT INTO transactions (user_id, title, amount, transaction_date, type, savings_goal_id)
    VALUES 
    (v_user_id, 'Emergency Fund Contribution', 500, CURRENT_DATE - 2, 'expense', v_savings_goal_id);
END;
$$ LANGUAGE plpgsql;

