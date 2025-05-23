import {
  students,
  tablets,
  borrowRecords,
  lostReports,
  tabletHistory,
  type Student,
  type InsertStudent,
  type Tablet,
  type InsertTablet,
  type BorrowRecord,
  type InsertBorrowRecord,
  type UpdateBorrowRecordForReturn,
  type LostReport,
  type InsertLostReport,
  type TabletHistory,
  type TabletWithBorrowInfo,
  type BorrowRecordWithDetails,
  type StudentWithBorrowInfo,
  admin
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, desc, sql, inArray, not, asc } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Student operations
  getStudents(): Promise<StudentWithBorrowInfo[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByStudentId(studentId: string): Promise<Student | undefined>;
  checkDuplicateStudents(students: InsertStudent[]): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  bulkCreateStudents(studentsList: InsertStudent[]): Promise<{ created: Student[]; duplicates: string[] }>;

  // Tablet operations
  getTablets(): Promise<TabletWithBorrowInfo[]>;
  getTablet(id: number): Promise<Tablet | undefined>;
  getTabletBySerialNumber(serialNumber: string): Promise<Tablet | undefined>;
  getAvailableTablets(): Promise<Tablet[]>;
  createTablet(tablet: InsertTablet): Promise<Tablet>;
  updateTablet(id: number, tablet: Partial<InsertTablet>): Promise<Tablet | undefined>;
  deleteTablet(id: number): Promise<boolean>;
  bulkCreateTablets(tabletsList: InsertTablet[]): Promise<{ created: Tablet[]; duplicates: string[] }>;

  // Borrowing operations
  getBorrowRecords(includeReturned?: boolean): Promise<BorrowRecordWithDetails[]>;
  getBorrowRecordsByStudent(studentId: number): Promise<BorrowRecordWithDetails[]>;
  getBorrowRecordsByTablet(tabletId: number): Promise<BorrowRecordWithDetails[]>;
  getBorrowRecord(id: number): Promise<BorrowRecordWithDetails | undefined>;
  createBorrowRecord(borrowRecord: InsertBorrowRecord): Promise<BorrowRecord>;
  processReturn(id: number, returnData: UpdateBorrowRecordForReturn): Promise<BorrowRecord | undefined>;

  // Lost tablet operations
  getLostReports(): Promise<LostReport[]>;
  getLostReport(id: number): Promise<LostReport | undefined>;
  createLostReport(lostReport: InsertLostReport): Promise<LostReport>;

  // History operations
  getTabletHistory(tabletId: number): Promise<TabletHistory[]>;
  
  // Dashboard data
  getDashboardStats(): Promise<{
    totalTablets: number;
    totalStudents: number;
    borrowedTablets: number;
    lostTablets: number;
  }>;
  getRecentActivity(limit?: number): Promise<any[]>;

  // Admin operations
  getAdminByUsername(username: string): Promise<{ id: number; username: string; passwordHash: string } | undefined>;
  createAdmin(username: string, password: string): Promise<void>;
  updateAdminPassword(id: number, newPassword: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Student operations
  async getStudents(): Promise<StudentWithBorrowInfo[]> {
    // Apply a sort order by ID
    const allStudents = await db.select()
      .from(students)
      .orderBy(students.id);
    
    // Get active borrowings count for each student
    const activeBorrowings = await db.select({
      studentId: borrowRecords.studentId,
      count: sql<number>`count(*)`,
    })
    .from(borrowRecords)
    .where(eq(borrowRecords.isReturned, false))
    .groupBy(borrowRecords.studentId);
    
    const borrowingMap = new Map(activeBorrowings.map(item => [item.studentId, item.count]));
    
    return allStudents.map(student => ({
      ...student,
      activeBorrowings: borrowingMap.get(student.id) || 0
    }));
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudentByStudentId(studentId: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.studentId, studentId));
    return student;
  }
  
  async checkDuplicateStudents(studentsList: InsertStudent[]): Promise<Student[]> {
    if (studentsList.length === 0) return [];

    // Get all existing student IDs from the new list
    const studentIds = studentsList.map(s => s.studentId);
    
    // Find any matching students in the database
    const existingStudents = await db
      .select()
      .from(students)
      .where(inArray(students.studentId, studentIds));
    
    return existingStudents;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students).values(student).returning();
    return newStudent;
  }

  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined> {
    const [updatedStudent] = await db
      .update(students)
      .set({ ...student, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    // Check if student has any borrowing records
    const [hasBorrowings] = await db
      .select({ count: sql<number>`count(*)` })
      .from(borrowRecords)
      .where(eq(borrowRecords.studentId, id));
    
    if (hasBorrowings.count > 0) {
      return false; // Cannot delete student with borrowing records
    }
    
    await db.delete(students).where(eq(students.id, id));
    return true;
  }

  async bulkCreateStudents(studentsList: InsertStudent[]): Promise<{ created: Student[]; duplicates: string[] }> {
    if (studentsList.length === 0) return { created: [], duplicates: [] };

    // Get all existing student IDs
    const existingStudents = await db
      .select({ studentId: students.studentId })
      .from(students)
      .where(inArray(
        students.studentId, 
        studentsList.map(s => s.studentId)
      ));

    const existingIds = new Set(existingStudents.map(s => s.studentId));
    const duplicateIds: string[] = [];
    const newStudents: InsertStudent[] = [];

    // Filter out duplicates
    studentsList.forEach(student => {
      if (existingIds.has(student.studentId)) {
        duplicateIds.push(student.studentId);
      } else {
        newStudents.push(student);
      }
    });

    // Insert only new students
    const created = newStudents.length > 0 
      ? await db.insert(students).values(newStudents).returning()
      : [];

    return {
      created,
      duplicates: duplicateIds
    };
  }

  // Tablet operations
  async getTablets(): Promise<TabletWithBorrowInfo[]> {
    const allTablets = await db.select().from(tablets).orderBy(desc(tablets.createdAt));
    
    // Get current borrower info for each tablet
    const activeBorrowings = await db
      .select({
        tabletId: borrowRecords.tabletId,
        studentId: borrowRecords.studentId,
        studentName: students.fullName,
        dateBorrowed: borrowRecords.dateBorrowed
      })
      .from(borrowRecords)
      .innerJoin(students, eq(borrowRecords.studentId, students.id))
      .where(eq(borrowRecords.isReturned, false));
    
    const borrowingMap = new Map(activeBorrowings.map(item => [item.tabletId, {
      studentId: item.studentId,
      studentName: item.studentName,
      dateBorrowed: item.dateBorrowed
    }]));
    
    return allTablets.map(tablet => ({
      ...tablet,
      currentBorrower: borrowingMap.get(tablet.id)
    }));
  }

  async getTablet(id: number): Promise<Tablet | undefined> {
    const [tablet] = await db.select().from(tablets).where(eq(tablets.id, id));
    return tablet;
  }

  async getTabletBySerialNumber(serialNumber: string): Promise<Tablet | undefined> {
    const [tablet] = await db.select().from(tablets).where(eq(tablets.serialNumber, serialNumber));
    return tablet;
  }

  async getAvailableTablets(): Promise<Tablet[]> {
    // Get IDs of tablets that are currently borrowed
    const borrowedTabletIds = await db
      .select({ id: borrowRecords.tabletId })
      .from(borrowRecords)
      .where(eq(borrowRecords.isReturned, false));
    
    const borrowedIds = borrowedTabletIds.map(record => record.id);
    
    // Get tablets that are serviceable and not currently borrowed
    let condition: any = undefined;
    if (borrowedIds.length > 0) {
      condition = and(eq(tablets.status, 'Serviceable'), not(inArray(tablets.id, borrowedIds)));
    } else {
      condition = eq(tablets.status, 'Serviceable');
    }
    return condition
      ? db.select().from(tablets).where(condition)
      : db.select().from(tablets);
  }

  async createTablet(tablet: InsertTablet): Promise<Tablet> {
    const [newTablet] = await db.insert(tablets).values(tablet).returning();
    
    // Add to tablet history
    await db.insert(tabletHistory).values({
      tabletId: newTablet.id,
      eventType: 'created',
      date: new Date(),
      condition: newTablet.condition,
      notes: 'Tablet added to inventory'
    });
    
    return newTablet;
  }

  async updateTablet(id: number, tablet: Partial<InsertTablet>): Promise<Tablet | undefined> {
    const [oldTablet] = await db.select().from(tablets).where(eq(tablets.id, id));
    
    if (!oldTablet) return undefined;
    
    const [updatedTablet] = await db
      .update(tablets)
      .set({ ...tablet, updatedAt: new Date() })
      .where(eq(tablets.id, id))
      .returning();
    
    // Add to history if status or condition changed
    if (tablet.status && tablet.status !== oldTablet.status) {
      await db.insert(tabletHistory).values({
        tabletId: id,
        eventType: 'status_change',
        date: new Date(),
        condition: updatedTablet.condition,
        notes: `Status changed from ${oldTablet.status} to ${updatedTablet.status}`
      });
    }
    
    if (tablet.condition && tablet.condition !== oldTablet.condition) {
      await db.insert(tabletHistory).values({
        tabletId: id,
        eventType: 'condition_change',
        date: new Date(),
        condition: updatedTablet.condition,
        notes: `Condition changed from ${oldTablet.condition} to ${updatedTablet.condition}`
      });
    }
    
    return updatedTablet;
  }

  async deleteTablet(id: number): Promise<boolean> {
    // Check if tablet has any borrowing records
    const [hasBorrowings] = await db
      .select({ count: sql<number>`count(*)` })
      .from(borrowRecords)
      .where(eq(borrowRecords.tabletId, id));
    
    if (hasBorrowings.count > 0) {
      return false; // Cannot delete tablet with borrowing records
    }
    
    await db.delete(tablets).where(eq(tablets.id, id));
    return true;
  }

  async bulkCreateTablets(tabletsList: InsertTablet[]): Promise<{ created: Tablet[]; duplicates: string[] }> {
    if (tabletsList.length === 0) return { created: [], duplicates: [] };

    // Get all existing serial numbers
    const existingTablets = await db
      .select({ serialNumber: tablets.serialNumber })
      .from(tablets)
      .where(inArray(
        tablets.serialNumber,
        tabletsList.map(t => t.serialNumber)
      ));

    const existingSerials = new Set(existingTablets.map(t => t.serialNumber));
    const duplicateSerials: string[] = [];
    const newTablets: InsertTablet[] = [];

    // Filter out duplicates
    tabletsList.forEach(tablet => {
      if (existingSerials.has(tablet.serialNumber)) {
        duplicateSerials.push(tablet.serialNumber);
      } else {
        newTablets.push(tablet);
      }
    });

    // Insert only new tablets
    const created = newTablets.length > 0 
      ? await db.insert(tablets).values(newTablets).returning()
      : [];

    // Add history entries for new tablets
    if (created.length > 0) {
      const historyEntries = created.map(tablet => ({
        tabletId: tablet.id,
        eventType: 'created',
        date: new Date(),
        condition: tablet.condition,
        notes: 'Tablet added to inventory in bulk import'
      }));
      
      await db.insert(tabletHistory).values(historyEntries);
    }

    return {
      created,
      duplicates: duplicateSerials
    };
  }

  // Borrowing operations
  async getBorrowRecords(includeReturned: boolean = true): Promise<BorrowRecordWithDetails[]> {
    let condition = undefined;
    if (!includeReturned) {
      condition = eq(borrowRecords.isReturned, false);
    }
    const query = condition
      ? db.select().from(borrowRecords).where(condition).orderBy(desc(borrowRecords.dateBorrowed))
      : db.select().from(borrowRecords).orderBy(desc(borrowRecords.dateBorrowed));
    const records = await query;
    
    // Get tablet and student details
    const tabletIds = Array.from(new Set(records.map(r => r.tabletId)));
    const studentIds = Array.from(new Set(records.map(r => r.studentId)));
    
    const tabletDetails = await db
      .select()
      .from(tablets)
      .where(inArray(tablets.id, tabletIds));
    
    const studentDetails = await db
      .select()
      .from(students)
      .where(inArray(students.id, studentIds));
    
    const tabletsMap = new Map(tabletDetails.map(t => [t.id, t]));
    const studentsMap = new Map(studentDetails.map(s => [s.id, s]));
    
    return records.map(record => ({
      ...record,
      tablet: tabletsMap.get(record.tabletId)!,
      student: studentsMap.get(record.studentId)!
    }));
  }

  async getBorrowRecordsByStudent(studentId: number): Promise<BorrowRecordWithDetails[]> {
    const records = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.studentId, studentId))
      .orderBy(desc(borrowRecords.dateBorrowed));
    
    // Get tablet details
    const tabletIds = Array.from(new Set(records.map(r => r.tabletId)));
    
    const tabletDetails = await db
      .select()
      .from(tablets)
      .where(inArray(tablets.id, tabletIds));
    
    const tabletsMap = new Map(tabletDetails.map(t => [t.id, t]));
    
    // Get student details (will be the same for all records)
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId));
    
    return records.map(record => ({
      ...record,
      tablet: tabletsMap.get(record.tabletId)!,
      student: student
    }));
  }

  async getBorrowRecordsByTablet(tabletId: number): Promise<BorrowRecordWithDetails[]> {
    const records = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.tabletId, tabletId))
      .orderBy(desc(borrowRecords.dateBorrowed));
    
    // Get student details
    const studentIds = Array.from(new Set(records.map(r => r.studentId)));
    
    const studentDetails = await db
      .select()
      .from(students)
      .where(inArray(students.id, studentIds));
    
    const studentsMap = new Map(studentDetails.map(s => [s.id, s]));
    
    // Get tablet details (will be the same for all records)
    const [tablet] = await db
      .select()
      .from(tablets)
      .where(eq(tablets.id, tabletId));
    
    return records.map(record => ({
      ...record,
      tablet: tablet,
      student: studentsMap.get(record.studentId)!
    }));
  }

  async getBorrowRecord(id: number): Promise<BorrowRecordWithDetails | undefined> {
    const [record] = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.id, id));
    
    if (!record) return undefined;
    
    const [tablet] = await db
      .select()
      .from(tablets)
      .where(eq(tablets.id, record.tabletId));
    
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, record.studentId));
    
    return {
      ...record,
      tablet,
      student
    };
  }

  async createBorrowRecord(borrowRecord: InsertBorrowRecord): Promise<BorrowRecord> {
    console.log("Creating borrow record with data:", JSON.stringify(borrowRecord, null, 2));
    
    // Validate student ID 
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, borrowRecord.studentId));
    
    if (!student) {
      throw new Error(`Student with ID ${borrowRecord.studentId} not found`);
    }
    console.log("Student found:", student.id, student.fullName || `${student.firstName} ${student.lastName}`);
    
    // Format accessories if it's a string
    let accessories = borrowRecord.accessories;
    if (typeof accessories === 'string') {
      try {
        accessories = JSON.parse(accessories);
      } catch (e) {
        console.error("Failed to parse accessories JSON:", e);
        throw new Error("Invalid accessories format");
      }
    }
    
    // Start transaction
    return await db.transaction(async (tx) => {
      // Check if tablet is available (not currently borrowed)
      const [activeRecord] = await tx
        .select()
        .from(borrowRecords)
        .where(
          and(
            eq(borrowRecords.tabletId, borrowRecord.tabletId),
            eq(borrowRecords.isReturned, false)
          )
        );
      
      if (activeRecord) {
        throw new Error('Tablet is already borrowed');
      }
      
      // Check if tablet exists and is serviceable
      const [tablet] = await tx
        .select()
        .from(tablets)
        .where(eq(tablets.id, borrowRecord.tabletId));
      
      if (!tablet) {
        throw new Error('Tablet not found');
      }
      
      if (tablet.status !== 'Serviceable') {
        throw new Error(`Tablet is not serviceable: ${tablet.status}`);
      }
      
      console.log("Tablet found and is available:", tablet.id, `${tablet.brand} ${tablet.model}`);
      
      // Prepare the data for insertion
      const borrowData = {
        ...borrowRecord,
        accessories: accessories,
        expectedReturnDate: borrowRecord.expectedReturnDate instanceof Date
          ? borrowRecord.expectedReturnDate.toISOString().slice(0, 10)
          : borrowRecord.expectedReturnDate ?? null
      };
      
      console.log("Inserting borrow record:", JSON.stringify(borrowData, null, 2));
      
      // Create borrow record
      const [newBorrowRecord] = await tx
        .insert(borrowRecords)
        .values(borrowData)
        .returning();
      
      console.log("Borrow record created:", newBorrowRecord.id);
      
      // Add to tablet history with detailed information
      await tx.insert(tabletHistory).values({
        tabletId: borrowRecord.tabletId,
        studentId: borrowRecord.studentId,
        borrowRecordId: newBorrowRecord.id,
        eventType: 'borrowed',
        date: newBorrowRecord.dateBorrowed,
        condition: borrowRecord.condition,
        accessories: accessories,
        notes: `Borrowed by ${student.fullName || `${student.firstName} ${student.lastName}`} (${student.studentId}). Accessories: ${JSON.stringify(accessories)}`
      });
      
      console.log("Tablet history updated");
      
      return newBorrowRecord;
    });
  }

  async processReturn(id: number, returnData: UpdateBorrowRecordForReturn): Promise<BorrowRecord | undefined> {
    // Start transaction
    return await db.transaction(async (tx) => {
      // Get the borrow record with student details
      const [borrowRecord] = await tx
        .select()
        .from(borrowRecords)
        .where(eq(borrowRecords.id, id));
      
      if (!borrowRecord) {
        throw new Error('Borrow record not found');
      }
      
      if (borrowRecord.isReturned) {
        throw new Error('Tablet has already been returned');
      }

      // Get student details
      const [student] = await tx
        .select()
        .from(students)
        .where(eq(students.id, borrowRecord.studentId));

      if (!student) {
        throw new Error('Student not found');
      }
      
      // Update the borrow record
      const [updatedRecord] = await tx
        .update(borrowRecords)
        .set({
          isReturned: returnData.isReturned,
          returnDate: returnData.returnDate instanceof Date ? returnData.returnDate : new Date(returnData.returnDate),
          returnCondition: returnData.returnCondition,
          returnNotes: returnData.returnNotes,
          updatedAt: new Date()
        })
        .where(eq(borrowRecords.id, id))
        .returning();
      
      // Update tablet condition if different from current
      await tx
        .update(tablets)
        .set({
          condition: returnData.returnCondition,
          updatedAt: new Date()
        })
        .where(eq(tablets.id, borrowRecord.tabletId));
      
      // Add to tablet history with detailed return information
      await tx.insert(tabletHistory).values({
        tabletId: borrowRecord.tabletId,
        studentId: borrowRecord.studentId,
        borrowRecordId: id,
        eventType: 'returned',
        date: updatedRecord.returnDate!,
        condition: returnData.returnCondition,
        accessories: borrowRecord.accessories, // Include the accessories that were returned
        notes: `Returned by ${student.fullName || `${student.firstName} ${student.lastName}`} (${student.studentId}). Return condition: ${returnData.returnCondition}. Accessories returned: ${JSON.stringify(borrowRecord.accessories)}`
      });
      
      return updatedRecord;
    });
  }

  // Lost tablet operations
  async getLostReports(): Promise<LostReport[]> {
    return db
      .select()
      .from(lostReports)
      .orderBy(desc(lostReports.dateReported));
  }

  async getLostReport(id: number): Promise<LostReport | undefined> {
    const [report] = await db
      .select()
      .from(lostReports)
      .where(eq(lostReports.id, id));
    
    return report;
  }

  async createLostReport(lostReport: InsertLostReport): Promise<LostReport> {
    // Start transaction
    return await db.transaction(async (tx) => {
      // Update tablet status to Lost
      await tx
        .update(tablets)
        .set({
          status: 'Lost',
          updatedAt: new Date()
        })
        .where(eq(tablets.id, lostReport.tabletId));
      
      // If there's an active borrowing, mark it as returned
      if (lostReport.borrowRecordId) {
        const [borrowRecord] = await tx
          .select()
          .from(borrowRecords)
          .where(eq(borrowRecords.id, lostReport.borrowRecordId));
        
        if (borrowRecord && !borrowRecord.isReturned) {
          await tx
            .update(borrowRecords)
            .set({
              isReturned: true,
              returnDate: lostReport.dateReported,
              returnNotes: 'Tablet reported as lost',
              updatedAt: new Date()
            })
            .where(eq(borrowRecords.id, lostReport.borrowRecordId));
        }
      }
      
      // Create lost report
      const [newLostReport] = await tx
        .insert(lostReports)
        .values(lostReport)
        .returning();
      
      // Add to tablet history
      await tx.insert(tabletHistory).values({
        tabletId: lostReport.tabletId,
        studentId: lostReport.studentId,
        borrowRecordId: lostReport.borrowRecordId,
        eventType: 'lost',
        date: lostReport.dateReported,
        notes: lostReport.details || 'Tablet reported as lost'
      });
      
      return newLostReport;
    });
  }

  // History operations
  async getTabletHistory(tabletId: number): Promise<TabletHistory[]> {
    const history = await db
      .select({
        id: tabletHistory.id,
        tabletId: tabletHistory.tabletId,
        studentId: tabletHistory.studentId,
        borrowRecordId: tabletHistory.borrowRecordId,
        eventType: tabletHistory.eventType,
        date: tabletHistory.date,
        condition: tabletHistory.condition,
        accessories: tabletHistory.accessories,
        notes: tabletHistory.notes,
        createdAt: tabletHistory.createdAt,
        // Include student details
        student: {
          id: students.id,
          studentId: students.studentId,
          fullName: students.fullName,
          firstName: students.firstName,
          lastName: students.lastName,
        }
      })
      .from(tabletHistory)
      .leftJoin(students, eq(tabletHistory.studentId, students.id))
      .where(eq(tabletHistory.tabletId, tabletId))
      .orderBy(desc(tabletHistory.date));

    return history.map(record => ({
      id: record.id,
      tabletId: record.tabletId,
      studentId: record.studentId,
      borrowRecordId: record.borrowRecordId,
      eventType: record.eventType,
      date: record.date,
      condition: record.condition,
      accessories: record.accessories as { charger: boolean; cable: boolean; box: boolean } | null,
      notes: record.notes,
      createdAt: record.createdAt,
      student: record.student || undefined
    })) as unknown as TabletHistory[];
  }
  
  // Dashboard operations
  async getDashboardStats(): Promise<{
    totalTablets: number;
    totalStudents: number;
    borrowedTablets: number;
    lostTablets: number;
  }> {
    const [tabletsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tablets);
    
    const [studentsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students);
    
    const [borrowedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(borrowRecords)
      .where(eq(borrowRecords.isReturned, false));
    
    const [lostCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tablets)
      .where(eq(tablets.status, 'Lost'));
    
    return {
      totalTablets: tabletsCount.count,
      totalStudents: studentsCount.count,
      borrowedTablets: borrowedCount.count,
      lostTablets: lostCount.count
    };
  }
  
  async getRecentActivity(limit: number = 10): Promise<any[]> {
    const recentHistory = await db
      .select({
        id: tabletHistory.id,
        eventType: tabletHistory.eventType,
        date: tabletHistory.date,
        tabletId: tabletHistory.tabletId,
        studentId: tabletHistory.studentId,
        notes: tabletHistory.notes,
      })
      .from(tabletHistory)
      .orderBy(desc(tabletHistory.date))
      .limit(limit);
    
    // Get related tablet and student info
    const tabletIds = Array.from(new Set(recentHistory.map(h => h.tabletId)));
    const studentIds = Array.from(new Set(recentHistory.filter(h => h.studentId).map(h => h.studentId!)));
    
    const tabletDetails = await db
      .select({
        id: tablets.id,
        brand: tablets.brand,
        model: tablets.model,
        serialNumber: tablets.serialNumber,
      })
      .from(tablets)
      .where(inArray(tablets.id, tabletIds));
    
    let studentDetails: any[] = [];
    if (studentIds.length > 0) {
      studentDetails = await db
        .select({
          id: students.id,
          name: students.fullName,
          studentId: students.studentId,
        })
        .from(students)
        .where(inArray(students.id, studentIds));
    }
    
    const tabletsMap = new Map(tabletDetails.map(t => [t.id, t]));
    const studentsMap = new Map(studentDetails.map(s => [s.id, s]));
    
    return recentHistory.map(history => ({
      ...history,
      tablet: tabletsMap.get(history.tabletId),
      student: history.studentId ? studentsMap.get(history.studentId) : null
    }));
  }

  // Admin operations
  async getAdminByUsername(username: string) {
    const [adminUser] = await db.select().from(admin).where(eq(admin.username, username));
    return adminUser;
  }

  async createAdmin(username: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(admin).values({ username, passwordHash }).onConflictDoNothing();
  }

  async updateAdminPassword(id: number, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(admin).set({ passwordHash, updatedAt: new Date() }).where(eq(admin.id, id));
  }
}

export const storage = new DatabaseStorage();
