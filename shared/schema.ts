import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  varchar,
  date,
  pgEnum,
  json
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Define enums
export const tabletStatusEnum = pgEnum('tablet_status', ['Serviceable', 'Unserviceable', 'Lost']);
export const tabletConditionEnum = pgEnum('tablet_condition', ['New / Excellent', 'Good', 'Fair', 'Poor', 'Defective']);

// Student table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  // Basic student information
  studentId: text("student_id").notNull().unique(), // Student No.
  lastName: text("last_name").notNull(),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  suffixName: text("suffix_name"),
  fullName: text("full_name").notNull(),
  // Academic information
  collegeName: text("college_name"),
  programCode: text("program_code"),
  programName: text("program_name").notNull(), // Previously course
  majorName: text("major_name"), // Previously major
  yearLevel: integer("year_level").notNull(),
  // Dates
  dateRegistered: timestamp("date_registered").notNull().defaultNow(),
  dateValidated: timestamp("date_validated"),
  dateAdmitted: timestamp("date_admitted"),
  // Enrollment information
  academicYearTerm: text("academic_year"),
  campus: text("campus"),
  studentStatus: text("student_status").notNull(), // Previously studentType
  // Personal information
  dateOfBirth: timestamp("date_of_birth"),
  age: integer("age"),
  placeOfBirth: text("place_of_birth"),
  gender: text("gender").notNull(),
  civilStatus: text("civil_status"),
  mobileNo: text("mobile_no"), // Previously phone
  email: text("email"),
  residenceAddress: text("residence_address"),
  // Guardian information
  guardianLastName: text("guardian_last_name"),
  guardianFirstName: text("guardian_first_name"),
  guardianMiddleName: text("guardian_middle_name"),
  guardianFullName: text("guardian_full_name"),
  guardianOccupation: text("guardian_occupation"),
  guardianTelNo: text("guardian_tel_no"),
  guardianMobileNo: text("guardian_mobile_no"),
  guardianEmail: text("guardian_email"),
  guardianAddress: text("guardian_address"),
  // System fields
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tablets table
export const tablets = pgTable("tablets", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  color: text("color"),
  serialNumber: text("serial_number").notNull().unique(),
  imei: text("imei").unique(),
  status: tabletStatusEnum("status").notNull().default('Serviceable'),
  condition: tabletConditionEnum("condition").notNull().default('Good'),
  hasCharger: boolean("has_charger").default(false),
  hasCable: boolean("has_cable").default(false),
  hasBox: boolean("has_box").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Borrowing records table
export const borrowRecords = pgTable("borrow_records", {
  id: serial("id").primaryKey(),
  tabletId: integer("tablet_id").notNull().references(() => tablets.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  dateBorrowed: timestamp("date_borrowed").notNull().defaultNow(),
  expectedReturnDate: date("expected_return_date"),
  accessories: json("accessories").default({}),
  condition: tabletConditionEnum("condition").notNull(),
  notes: text("notes"),
  isReturned: boolean("is_returned").default(false),
  returnDate: timestamp("return_date"),
  returnCondition: tabletConditionEnum("return_condition"),
  returnNotes: text("return_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lost reports table
export const lostReports = pgTable("lost_reports", {
  id: serial("id").primaryKey(),
  tabletId: integer("tablet_id").notNull().references(() => tablets.id),
  borrowRecordId: integer("borrow_record_id").references(() => borrowRecords.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  dateReported: timestamp("date_reported").notNull().defaultNow(),
  details: text("details"),
  documentPath: text("document_path"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tablet history table for tracking changes
export const tabletHistory = pgTable("tablet_history", {
  id: serial("id").primaryKey(),
  tabletId: integer("tablet_id").notNull().references(() => tablets.id),
  studentId: integer("student_id").references(() => students.id),
  borrowRecordId: integer("borrow_record_id").references(() => borrowRecords.id),
  eventType: text("event_type").notNull(), // 'borrowed', 'returned', 'lost', 'status_change', etc.
  date: timestamp("date").notNull().defaultNow(),
  condition: tabletConditionEnum("condition"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const studentsRelations = relations(students, ({ many }) => ({
  borrowRecords: many(borrowRecords),
  lostReports: many(lostReports),
  tabletHistory: many(tabletHistory),
}));

export const tabletsRelations = relations(tablets, ({ many }) => ({
  borrowRecords: many(borrowRecords),
  lostReports: many(lostReports),
  tabletHistory: many(tabletHistory),
}));

export const borrowRecordsRelations = relations(borrowRecords, ({ one, many }) => ({
  tablet: one(tablets, {
    fields: [borrowRecords.tabletId],
    references: [tablets.id],
  }),
  student: one(students, {
    fields: [borrowRecords.studentId],
    references: [students.id],
  }),
  lostReports: many(lostReports),
  tabletHistory: many(tabletHistory),
}));

export const lostReportsRelations = relations(lostReports, ({ one }) => ({
  tablet: one(tablets, {
    fields: [lostReports.tabletId],
    references: [tablets.id],
  }),
  student: one(students, {
    fields: [lostReports.studentId],
    references: [students.id],
  }),
  borrowRecord: one(borrowRecords, {
    fields: [lostReports.borrowRecordId],
    references: [borrowRecords.id],
  }),
}));

export const tabletHistoryRelations = relations(tabletHistory, ({ one }) => ({
  tablet: one(tablets, {
    fields: [tabletHistory.tabletId],
    references: [tablets.id],
  }),
  student: one(students, {
    fields: [tabletHistory.studentId],
    references: [students.id],
  }),
  borrowRecord: one(borrowRecords, {
    fields: [tabletHistory.borrowRecordId],
    references: [borrowRecords.id],
  }),
}));

// Create Zod schemas for insert and select operations
export const insertStudentSchema = createInsertSchema(students).omit({ id: true, createdAt: true, updatedAt: true });
export const selectStudentSchema = createSelectSchema(students);

export const insertTabletSchema = createInsertSchema(tablets).omit({ id: true, createdAt: true, updatedAt: true });
export const selectTabletSchema = createSelectSchema(tablets);

export const insertBorrowRecordSchema = createInsertSchema(borrowRecords).omit({ id: true, createdAt: true, updatedAt: true, isReturned: true, returnDate: true, returnCondition: true, returnNotes: true });
export const selectBorrowRecordSchema = createSelectSchema(borrowRecords);

export const insertLostReportSchema = createInsertSchema(lostReports).omit({ id: true, createdAt: true, updatedAt: true });
export const selectLostReportSchema = createSelectSchema(lostReports);

export const updateBorrowRecordForReturnSchema = z.object({
  isReturned: z.boolean(),
  returnDate: z.date().or(z.string()),
  returnCondition: tabletConditionEnum,
  returnNotes: z.string().optional(),
});

// Define types
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Tablet = typeof tablets.$inferSelect;
export type InsertTablet = z.infer<typeof insertTabletSchema>;

export type BorrowRecord = typeof borrowRecords.$inferSelect;
export type InsertBorrowRecord = z.infer<typeof insertBorrowRecordSchema>;
export type UpdateBorrowRecordForReturn = z.infer<typeof updateBorrowRecordForReturnSchema>;

export type LostReport = typeof lostReports.$inferSelect;
export type InsertLostReport = z.infer<typeof insertLostReportSchema>;

export type TabletHistory = typeof tabletHistory.$inferSelect;

// Extended types for frontend use
export type TabletWithBorrowInfo = Tablet & {
  currentBorrower?: {
    studentId: number;
    studentName: string;
    dateBorrowed: Date;
  };
};

export type BorrowRecordWithDetails = BorrowRecord & {
  tablet: Tablet;
  student: Student;
};

export type StudentWithBorrowInfo = Student & {
  activeBorrowings: number;
};
