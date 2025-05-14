import jsPDF from 'jspdf';
import { Student, Tablet } from '@shared/schema';
import { format } from 'date-fns';

// Types for PDF generation
type BorrowingAgreement = {
  student: Student;
  tablet: Tablet;
  borrowRecord: {
    dateBorrowed: Date;
    expectedReturnDate?: Date;
    accessories: {
      charger: boolean;
      cable: boolean;
      box: boolean;
    };
    condition: string;
    notes?: string;
  };
};

type PDFGenerationOptions = {
  type: 'borrowing-agreement';
  data: BorrowingAgreement;
};

/**
 * Generate and download a PDF document
 */
export const generatePDF = async (options: PDFGenerationOptions): Promise<void> => {
  try {
    switch (options.type) {
      case 'borrowing-agreement':
        return generateBorrowingAgreement(options.data);
      default:
        throw new Error(`Unsupported PDF type: ${options.type}`);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generate a borrowing agreement PDF
 */
const generateBorrowingAgreement = (data: BorrowingAgreement): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const { student, tablet, borrowRecord } = data;
      
      // Create a new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      
      // Helper for text centering
      const centerText = (text: string, y: number, size: number = 12) => {
        doc.setFontSize(size);
        const textWidth = doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, y);
      };
      
      // Helper for adding a line of text
      const addLine = (text: string, y: number, size: number = 12) => {
        doc.setFontSize(size);
        doc.text(text, 20, y);
        return y + (size < 12 ? 5 : 8);
      };
      
      // Title
      doc.setFont("helvetica", "bold");
      centerText("TABLET BORROWING AGREEMENT", yPos, 16);
      yPos += 12;
      
      // Date
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      centerText(`Date: ${format(new Date(), "MMMM d, yyyy")}`, yPos);
      yPos += 15;
      
      // Student information section
      doc.setFont("helvetica", "bold");
      yPos = addLine("STUDENT INFORMATION", yPos, 12);
      doc.setFont("helvetica", "normal");
      yPos = addLine(`Name: ${student.name}`, yPos);
      yPos = addLine(`Student ID: ${student.studentId}`, yPos);
      yPos = addLine(`Email: ${student.email || "N/A"}`, yPos);
      yPos = addLine(`Phone: ${student.phone || "N/A"}`, yPos);
      yPos += 5;
      
      // Tablet information section
      doc.setFont("helvetica", "bold");
      yPos = addLine("TABLET INFORMATION", yPos, 12);
      doc.setFont("helvetica", "normal");
      yPos = addLine(`Brand & Model: ${tablet.brand} ${tablet.model}`, yPos);
      yPos = addLine(`Serial Number: ${tablet.serialNumber}`, yPos);
      yPos = addLine(`IMEI: ${tablet.imei || "N/A"}`, yPos);
      yPos = addLine(`Color: ${tablet.color || "N/A"}`, yPos);
      yPos = addLine(`Condition: ${borrowRecord.condition}`, yPos);
      
      // Accessories
      let accessoriesText = "";
      if (borrowRecord.accessories.charger) accessoriesText += "Charger, ";
      if (borrowRecord.accessories.cable) accessoriesText += "Cable, ";
      if (borrowRecord.accessories.box) accessoriesText += "Box, ";
      accessoriesText = accessoriesText.replace(/, $/, "");
      if (!accessoriesText) accessoriesText = "None";
      
      yPos = addLine(`Accessories: ${accessoriesText}`, yPos);
      yPos += 5;
      
      // Borrowing details section
      doc.setFont("helvetica", "bold");
      yPos = addLine("BORROWING DETAILS", yPos, 12);
      doc.setFont("helvetica", "normal");
      yPos = addLine(`Date Borrowed: ${format(borrowRecord.dateBorrowed, "MMMM d, yyyy")}`, yPos);
      
      if (borrowRecord.expectedReturnDate) {
        yPos = addLine(`Expected Return Date: ${format(borrowRecord.expectedReturnDate, "MMMM d, yyyy")}`, yPos);
      } else {
        yPos = addLine("Expected Return Date: Not specified", yPos);
      }
      
      if (borrowRecord.notes) {
        yPos = addLine(`Notes: ${borrowRecord.notes}`, yPos);
      }
      
      yPos += 5;
      
      // Terms and conditions
      doc.setFont("helvetica", "bold");
      yPos = addLine("TERMS AND CONDITIONS", yPos, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      
      const terms = [
        "1. The borrower agrees to take proper care of the tablet at all times.",
        "2. The borrower agrees to return the tablet in the same condition as received.",
        "3. The borrower shall be responsible for any damage, loss, or theft of the tablet.",
        "4. The borrower shall not transfer the tablet to any other person.",
        "5. The borrower agrees to return the tablet on or before the expected return date.",
        "6. The borrower agrees to use the tablet for educational purposes only.",
        "7. The tablet remains the property of the institution at all times."
      ];
      
      terms.forEach(term => {
        yPos = addLine(term, yPos, 10);
      });
      
      yPos += 15;
      
      // Signature lines
      const signatureY = yPos + 25;
      doc.line(20, signatureY, 90, signatureY); // Student signature line
      doc.line(pageWidth - 90, signatureY, pageWidth - 20, signatureY); // Staff signature line
      
      doc.setFontSize(10);
      doc.text("Student Signature", 20, signatureY + 5);
      doc.text("Staff Signature", pageWidth - 90, signatureY + 5);
      
      // File name
      const fileName = `Borrowing_Agreement_${student.studentId}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      
      // Save the PDF
      doc.save(fileName);
      
      resolve();
    } catch (error) {
      console.error("Error generating borrowing agreement:", error);
      reject(error);
    }
  });
};
