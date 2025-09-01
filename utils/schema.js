import {
  pgTable,
  serial,
  text,
  varchar,
  numeric,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums for strong constraints instead of free text
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);
export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  // Nullable for Google accounts
  password: text("password"),
  provider: varchar("provider", { length: 20 }).notNull().default("email"),
  googleId: varchar("google_id", { length: 255 }).unique(),
  phone: varchar("phone", { length: 30 }),
  company: varchar("company", { length: 100 }),
  bio: text("bio"),
  profilePhoto: text("profile_photo"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Wallets table
export const wallets = pgTable(
  "wallets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 10 }).notNull().default("USD"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      // Avoid duplicate wallet names per user
      walletsUserUniqueName: uniqueIndex("wallets_user_unique_name").on(table.userId, table.name),
      walletsUserIdIdx: index("idx_wallets_user_id").on(table.userId),
    };
  }
);

// Categories table
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    type: categoryTypeEnum("type").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      // Avoid duplicate category per user and type
      categoriesUniquePerUser: uniqueIndex("categories_unique_per_user").on(
        table.userId,
        table.name,
        table.type
      ),
      categoriesUserIdIdx: index("idx_categories_user_id").on(table.userId),
    };
  }
);

// Transactions table
export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    walletId: integer("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    category: varchar("category", { length: 50 }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    transactionDate: timestamp("transaction_date").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      transactionsWalletIdIdx: index("idx_transactions_wallet_id").on(table.walletId),
      transactionsCategoryIdIdx: index("idx_transactions_category_id").on(table.categoryId),
    };
  }
);
