import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { ZodError } from "zod";
import { 
  insertStudentSchema, 
  insertTabletSchema, 
  insertBorrowRecordSchema, 
  updateBorrowRecordForReturnSchema,
  insertLostReportSchema
} from "@shared/schema";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

// Setup file upload
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage2 });

// Validate request body using Zod schema
function validateBody(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: Function) => {
    try {
      console.log("Validating request body:", JSON.stringify(req.body, null, 2));
      const result = schema.safeParse(req.body);
      if (!result.success) {
        console.error("Validation error:", result.error.errors);
        console.error("Failed validation for schema:", schema);
        return res.status(400).json({
          message: "Validation error",
          errors: result.error.errors,
        });
      }
      req.body = result.data;
      next();
    } catch (error) {
      console.error("Non-validation error during request validation:", error);
      next(error);
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Student routes
  app.get("/api/students", async (req, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(student);
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.post("/api/students", validateBody(insertStudentSchema), async (req, res) => {
    try {
      const student = await storage.createStudent(req.body);
      res.status(201).json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const student = await storage.updateStudent(id, req.body);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const success = await storage.deleteStudent(id);
      if (!success) {
        return res.status(400).json({ 
          message: "Cannot delete student with active borrowing records" 
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  app.post("/api/students/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = fs.readFileSync(req.file.path, "utf8");
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });

      // Helper function to safely parse date strings
      const safeParseDate = (dateStr: string | null | undefined): Date | null => {
        if (!dateStr) return null;
        try {
          // Check for obviously invalid date ranges first
          if (dateStr.includes('+043990') || dateStr.includes('0000-00-00')) {
            return null;
          }
          const parsed = new Date(dateStr);
          // Check if date is valid and within reasonable range
          if (isNaN(parsed.getTime()) || parsed.getFullYear() < 1900 || parsed.getFullYear() > 2100) {
            return null;
          }
          return parsed;
        } catch (e) {
          console.error(`Error parsing date: ${dateStr}`, e);
          return null;
        }
      };

      // Validate each record
      const students = records.map((record: any) => ({
        // Basic student information
        studentId: record.studentId || record["Student No."] || "",
        lastName: record.lastName || record["Last Name"] || "",
        firstName: record.firstName || record["First Name"] || "",
        middleName: record.middleName || record["Middle Name"] || null,
        suffixName: record.suffixName || record["Suffix Name"] || null,
        fullName: record.fullName || record["Full Name"] || `${record.firstName || record["First Name"] || ""} ${record.lastName || record["Last Name"] || ""}`,
        
        // Academic information
        collegeName: record.collegeName || record["College Name"] || null,
        programCode: record.programCode || record["Program Code"] || null,
        programName: record.programName || record["Program Name"] || record.course || "",
        majorName: record.majorName || record["Major Name"] || record.major || null,
        yearLevel: parseInt(record.yearLevel || record["Year Level"] || "1") || 1,
        
        // Dates - with safe parsing to prevent timezone errors
        dateRegistered: safeParseDate(record.dateRegistered || record["Registration Date"]) || new Date(),
        dateValidated: safeParseDate(record.dateValidated || record["Validation Date"]),
        dateAdmitted: safeParseDate(record.dateAdmitted || record["Date Admitted"]),
        
        // Enrollment information
        academicYear: record.academicYear || record["Academic Year"] || null,
        term: record.term || record["Term"] || null,
        campus: record.campus || record["Campus"] || null,
        studentStatus: record.studentStatus || record["Student Status"] || record.studentType || "Regular",
        
        // Personal information
        dateOfBirth: safeParseDate(record.dateOfBirth || record["Date Of Birth"]),
        age: parseInt(record.age || record["Age"] || "0") || null,
        placeOfBirth: record.placeOfBirth || record["Place Of Birth"] || null,
        gender: record.gender || record["Gender"] || "Undisclosed",
        civilStatus: record.civilStatus || record["Civil Status"] || null,
        mobileNo: record.mobileNo || record["Mobile No."] || record.phone || null,
        email: record.email || record["Email"] || null,
        residenceAddress: record.residenceAddress || record["Residence Address"] || null,
        
        // Guardian information
        guardianLastName: record.guardianLastName || record["Guardian Last Name"] || null,
        guardianFirstName: record.guardianFirstName || record["Guardian First Name"] || null,
        guardianMiddleName: record.guardianMiddleName || record["Guardian Middle Name"] || null,
        guardianFullName: record.guardianFullName || record["Guardian Full Name"] || null,
        guardianOccupation: record.guardianOccupation || record["Guardian Occupation"] || null,
        guardianTelNo: record.guardianTelNo || record["Guardian Tel No."] || null,
        guardianMobileNo: record.guardianMobileNo || record["Guardian Mobile No."] || null,
        guardianEmail: record.guardianEmail || record["Guardian Email"] || null,
        guardianAddress: record.guardianAddress || record["Guardian Address"] || null,
        
        // Additional fields
        notes: record.notes || record["Notes"] || null,
      }));

      // First check for duplicates without creating
      const existingStudents = await storage.checkDuplicateStudents(students);
      
      if (!req.query.confirmImport) {
        // Just return the analysis
        res.json({
          total: students.length,
          new: students.length - existingStudents.length,
          duplicates: existingStudents,
          records: students
        });
        return;
      }

      // If confirmImport=true, proceed with import
      const filtered = students.filter(student => 
        !existingStudents.find(e => e.studentId === student.studentId)
      );
      
      const result = await storage.bulkCreateStudents(filtered);
      
      // Delete the temporary file
      fs.unlinkSync(req.file.path);

      res.status(201).json({ 
        message: `Imported ${result.created.length} new students successfully.`,
        students: result.created
      });
    } catch (error) {
      console.error("Error importing students:", error);
      
      // Ensure temp file is deleted even if there's an error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ message: "Failed to import students" });
    }
  });

  app.get("/api/students/:id/borrow-records", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const borrowRecords = await storage.getBorrowRecordsByStudent(id);
      res.json(borrowRecords);
    } catch (error) {
      console.error("Error fetching student borrow records:", error);
      res.status(500).json({ message: "Failed to fetch borrow records" });
    }
  });

  // Tablet routes
  app.get("/api/tablets", async (req, res) => {
    try {
      const tablets = await storage.getTablets();
      res.json(tablets);
    } catch (error) {
      console.error("Error fetching tablets:", error);
      res.status(500).json({ message: "Failed to fetch tablets" });
    }
  });

  app.get("/api/tablets/available", async (req, res) => {
    try {
      const tablets = await storage.getAvailableTablets();
      res.json(tablets);
    } catch (error) {
      console.error("Error fetching available tablets:", error);
      res.status(500).json({ message: "Failed to fetch available tablets" });
    }
  });

  app.get("/api/tablets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tablet ID" });
      }

      const tablet = await storage.getTablet(id);
      if (!tablet) {
        return res.status(404).json({ message: "Tablet not found" });
      }

      res.json(tablet);
    } catch (error) {
      console.error("Error fetching tablet:", error);
      res.status(500).json({ message: "Failed to fetch tablet" });
    }
  });

  app.post("/api/tablets", validateBody(insertTabletSchema), async (req, res) => {
    try {
      const tablet = await storage.createTablet(req.body);
      res.status(201).json(tablet);
    } catch (error) {
      console.error("Error creating tablet:", error);
      res.status(500).json({ message: "Failed to create tablet" });
    }
  });

  app.put("/api/tablets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tablet ID" });
      }

      const tablet = await storage.updateTablet(id, req.body);
      if (!tablet) {
        return res.status(404).json({ message: "Tablet not found" });
      }

      res.json(tablet);
    } catch (error) {
      console.error("Error updating tablet:", error);
      res.status(500).json({ message: "Failed to update tablet" });
    }
  });

  app.delete("/api/tablets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tablet ID" });
      }

      const success = await storage.deleteTablet(id);
      if (!success) {
        return res.status(400).json({ 
          message: "Cannot delete tablet with borrowing records" 
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tablet:", error);
      res.status(500).json({ message: "Failed to delete tablet" });
    }
  });

  app.get("/api/tablets/:id/history", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tablet ID" });
      }

      const history = await storage.getTabletHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching tablet history:", error);
      res.status(500).json({ message: "Failed to fetch tablet history" });
    }
  });

  app.post("/api/tablets/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = fs.readFileSync(req.file.path, "utf8");
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });

      // Validate each record
      const tablets = records.map((record: any) => ({
        brand: record.brand,
        model: record.model,
        color: record.color || null,
        serialNumber: record.serialNumber,
        imei: record.imei || null,
        status: record.status || 'Serviceable',
        condition: record.condition || 'Good',
        hasCharger: record.hasCharger === 'true' || record.hasCharger === 'yes' || record.hasCharger === '1',
        hasCable: record.hasCable === 'true' || record.hasCable === 'yes' || record.hasCable === '1',
        hasBox: record.hasBox === 'true' || record.hasBox === 'yes' || record.hasBox === '1',
        notes: record.notes || null,
      }));

      const result = await storage.bulkCreateTablets(tablets);
      
      // Delete the temporary file
      fs.unlinkSync(req.file.path);

      const message = result.created.length > 0 || result.duplicates.length > 0
        ? `Imported ${result.created.length} tablets. ${result.duplicates.length > 0 ? `Skipped ${result.duplicates.length} duplicate serial numbers.` : ''}`
        : 'No tablets were imported.';

      res.status(201).json({ 
        message,
        tablets: result.created,
        duplicates: result.duplicates
      });
    } catch (error) {
      console.error("Error importing tablets:", error);
      
      // Ensure temp file is deleted even if there's an error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ message: "Failed to import tablets" });
    }
  });

  // Borrow record routes
  app.get("/api/borrow-records", async (req, res) => {
    try {
      const includeReturned = req.query.includeReturned !== 'false';
      const borrowRecords = await storage.getBorrowRecords(includeReturned);
      res.json(borrowRecords);
    } catch (error) {
      console.error("Error fetching borrow records:", error);
      res.status(500).json({ message: "Failed to fetch borrow records" });
    }
  });

  app.get("/api/borrow-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid borrow record ID" });
      }

      const borrowRecord = await storage.getBorrowRecord(id);
      if (!borrowRecord) {
        return res.status(404).json({ message: "Borrow record not found" });
      }

      res.json(borrowRecord);
    } catch (error) {
      console.error("Error fetching borrow record:", error);
      res.status(500).json({ message: "Failed to fetch borrow record" });
    }
  });

  app.post("/api/borrow-records", validateBody(insertBorrowRecordSchema), async (req, res) => {
    try {
      console.log("Creating borrow record with data:", JSON.stringify(req.body, null, 2));
      const borrowRecord = await storage.createBorrowRecord(req.body);
      console.log("Borrow record created successfully:", JSON.stringify(borrowRecord, null, 2));
      res.status(201).json(borrowRecord);
    } catch (error) {
      console.error("Error creating borrow record:", error);
      let errorMessage = "Failed to create borrow record";
      
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        message: errorMessage,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/borrow-records/:id/return", validateBody(updateBorrowRecordForReturnSchema), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid borrow record ID" });
      }

      const borrowRecord = await storage.processReturn(id, req.body);
      if (!borrowRecord) {
        return res.status(404).json({ message: "Borrow record not found" });
      }

      res.json(borrowRecord);
    } catch (error) {
      console.error("Error processing return:", error);
      res.status(500).json({ 
        message: "Failed to process return",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Lost report routes
  app.get("/api/lost-reports", async (req, res) => {
    try {
      const lostReports = await storage.getLostReports();
      res.json(lostReports);
    } catch (error) {
      console.error("Error fetching lost reports:", error);
      res.status(500).json({ message: "Failed to fetch lost reports" });
    }
  });

  app.post(
    "/api/lost-reports", 
    upload.single("document"), 
    async (req, res) => {
      try {
        let documentPath = null;
        if (req.file) {
          documentPath = req.file.path;
        }

        // Parse and validate the JSON body
        const lostReportData = insertLostReportSchema.parse({
          ...req.body,
          tabletId: parseInt(req.body.tabletId),
          studentId: parseInt(req.body.studentId),
          borrowRecordId: req.body.borrowRecordId ? parseInt(req.body.borrowRecordId) : undefined,
          dateReported: req.body.dateReported ? new Date(req.body.dateReported) : new Date(),
          documentPath
        });

        const lostReport = await storage.createLostReport(lostReportData);
        res.status(201).json(lostReport);
      } catch (error) {
        console.error("Error creating lost report:", error);
        
        // Ensure temp file is deleted if there's an error
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        if (error instanceof ZodError) {
          res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        } else {
          res.status(500).json({ 
            message: "Failed to create lost report",
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
  );

  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/recent-activity", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const recentActivity = await storage.getRecentActivity(limit);
      res.json(recentActivity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Templates routes
  app.get("/api/templates/students", (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_template.csv"');
    
    // Create header row with all possible fields
    const headers = [
      // Basic student information
      "Student No.", "Last Name", "First Name", "Middle Name", "Suffix Name", "Full Name",
      // Academic information
      "College Name", "Program Code", "Program Name", "Major Name", "Year Level",
      // Dates
      "Registration Date", "Validation Date", "Date Admitted",
      // Enrollment information
      "Academic Year", "Term", "Campus", "Student Status",
      // Personal information
      "Date Of Birth", "Age", "Place Of Birth", "Gender", "Civil Status", 
      "Mobile No.", "Email", "Residence Address",
      // Guardian information
      "Guardian Last Name", "Guardian First Name", "Guardian Middle Name", "Guardian Full Name",
      "Guardian Occupation", "Guardian Tel No.", "Guardian Mobile No.", 
      "Guardian Email", "Guardian Address",
      // Additional fields
      "Notes"
    ].join(',');
    
    // Create sample rows
    const sampleRow1 = [
      // Basic student information
      "2023001", "Doe", "John", "Andrew", "", "John Andrew Doe",
      // Academic information
      "College of Engineering", "BSCS", "BS Computer Science", "Software Engineering", "1",
      // Dates
      "2023-01-01", "2023-01-02", "2023-01-01",
      // Enrollment information
      "2023-2024", "First", "Main", "New",
      // Personal information
      "2000-05-15", "23", "Manila", "Male", "Single",
      "555-123-4567", "john.doe@example.com", "123 Main St, Apt 4B",
      // Guardian information
      "Doe", "Mary", "Susan", "Mary Susan Doe",
      "Engineer", "555-765-4321", "555-765-4322",
      "mary.doe@example.com", "123 Main St, Apt 4B",
      // Additional fields
      "Honor student"
    ].join(',');
    
    const sampleRow2 = [
      // Basic student information
      "2023002", "Smith", "Jane", "Elizabeth", "", "Jane Elizabeth Smith",
      // Academic information
      "College of Information Technology", "BSIT", "BS Information Technology", "Database Management", "2",
      // Dates
      "2023-02-01", "2023-02-02", "2022-06-01",
      // Enrollment information
      "2023-2024", "First", "Main", "Old",
      // Personal information
      "2001-10-20", "22", "Cebu", "Female", "Single",
      "555-987-6543", "jane.smith@example.com", "456 Oak Avenue",
      // Guardian information
      "Smith", "Robert", "James", "Robert James Smith",
      "Teacher", "555-123-7890", "555-123-7891",
      "robert.smith@example.com", "456 Oak Avenue",
      // Additional fields
      "Transfer student"
    ].join(',');
    
    res.send(`${headers}\n${sampleRow1}\n${sampleRow2}`);
  });

  app.get("/api/templates/tablets", (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tablets_template.csv"');
    res.send('brand,model,color,serialNumber,imei,status,condition,hasCharger,hasCable,hasBox,notes\nApple,iPad Pro (2021),Space Gray,DMQV32AABD3F,354856090324578,Serviceable,Good,true,true,false,"New tablet"\nSamsung,Galaxy Tab S7,Mystic Bronze,R9XN20BE456P,354912078906753,Serviceable,Good,true,false,true,"With stylus"');
  });

  const httpServer = createServer(app);
  return httpServer;
}
