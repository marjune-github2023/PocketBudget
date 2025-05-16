import { useState, useRef } from "react";
import { BorrowingSteps } from "./borrowing-steps";
import { 
  Student, 
  Tablet, 
  insertBorrowRecordSchema 
} from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { generatePDF } from "@/lib/pdf";
import UsufructAgreementPDF from './UsufructAgreementPDF';

// Define the steps for the borrowing process
export type BorrowingStep = "student" | "tablet" | "details" | "confirmation";

// Extended form schema for the entire borrowing process
const borrowingFormSchema = z.object({
  // Step 1: Student selection
  studentId: z.number({
    required_error: "Please select a student",
  }),
  
  // Step 2: Tablet selection
  tabletId: z.number({
    required_error: "Please select a tablet",
  }),
  
  // Step 3: Borrowing details
  condition: z.enum(["New / Excellent", "Good", "Fair", "Poor", "Defective"], {
    required_error: "Please select the tablet condition",
  }),
  dateBorrowed: z.string().min(1, "Borrowing date is required"),
  expectedReturnDate: z.string().optional(),
  hasCharger: z.boolean().default(false),
  hasCable: z.boolean().default(false),
  hasBox: z.boolean().default(false),
  notes: z.string().optional(),
});

export type BorrowingFormData = z.infer<typeof borrowingFormSchema>;

interface BorrowingFormProps {
  onComplete?: () => void;
}

export function BorrowingForm({ onComplete }: BorrowingFormProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<BorrowingStep>("student");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTablet, setSelectedTablet] = useState<Tablet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState(false);
  const agreementRef = useRef<{ exportPDF: () => void }>(null);
  
  // Initialize form with validation
  const form = useForm<BorrowingFormData>({
    resolver: zodResolver(borrowingFormSchema),
    defaultValues: {
      dateBorrowed: new Date().toISOString().split('T')[0],
      hasCharger: false,
      hasCable: false,
      hasBox: false,
      condition: "Good",
    },
  });
  
  // Handle student selection
  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    form.setValue("studentId", student.id);
  };
  
  // Handle tablet selection
  const handleTabletSelect = (tablet: Tablet) => {
    setSelectedTablet(tablet);
    form.setValue("tabletId", tablet.id);
    
    // Set defaults based on tablet accessories
    form.setValue("hasCharger", !!tablet.hasCharger);
    form.setValue("hasCable", !!tablet.hasCable);
    form.setValue("hasBox", !!tablet.hasBox);
    form.setValue("condition", tablet.condition);
  };
  
  // Handle form submission
  const onSubmit = async (data: BorrowingFormData) => {
    setIsSubmitting(true);
    
    try {
      // Create accessories object
      const accessories = {
        charger: data.hasCharger === true || false,
        cable: data.hasCable === true || false,
        box: data.hasBox === true || false,
      };
      
      // Format data for the API
      const borrowRecord = {
        tabletId: data.tabletId,
        studentId: data.studentId,
        dateBorrowed: new Date(data.dateBorrowed),
        expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : undefined,
        accessories,
        condition: data.condition,
        notes: data.notes,
      };
      
      // Submit to the API
      const response = await apiRequest("POST", "/api/borrow-records", borrowRecord);
      
      // Show success message
      toast({
        title: "Borrowing recorded",
        description: "The tablet has been assigned to the student successfully.",
      });
      
      // Update the UI
      setBorrowSuccess(true);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/tablets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/borrow-records'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-activity'] });
      
      // Call completion callback
      if (onComplete) {
        onComplete();
      }
      
      setTimeout(() => {
        agreementRef.current?.exportPDF();
      }, 1000);
    } catch (error) {
      console.error("Error submitting borrowing record:", error);
      // Get more details from the error
      let errorMessage = "There was an error assigning the tablet. Please try again.";
      
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          console.error("API error details:", errorData);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          if (errorData.errors) {
            console.error("Validation errors:", errorData.errors);
            errorMessage = `Validation error: ${errorData.errors.map((e: any) => e.message).join(', ')}`;
          }
        } catch (jsonError) {
          console.error("Failed to parse error response:", jsonError);
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Navigate to next step
  const goToNextStep = () => {
    switch (currentStep) {
      case "student":
        if (form.getValues().studentId) {
          setCurrentStep("tablet");
        } else {
          form.setError("studentId", {
            type: "manual",
            message: "Please select a student",
          });
        }
        break;
        
      case "tablet":
        if (form.getValues().tabletId) {
          setCurrentStep("details");
        } else {
          form.setError("tabletId", {
            type: "manual",
            message: "Please select a tablet",
          });
        }
        break;
        
      case "details":
        // Validate date fields
        const dateBorrowed = form.getValues().dateBorrowed;
        const expectedReturnDate = form.getValues().expectedReturnDate;
        
        if (!dateBorrowed) {
          form.setError("dateBorrowed", {
            type: "manual",
            message: "Borrowing date is required",
          });
          return;
        }
        
        // If expectedReturnDate is provided, make sure it's after dateBorrowed
        if (expectedReturnDate && new Date(expectedReturnDate) <= new Date(dateBorrowed)) {
          form.setError("expectedReturnDate", {
            type: "manual",
            message: "Expected return date must be after borrowing date",
          });
          return;
        }
        
        setCurrentStep("confirmation");
        break;
        
      case "confirmation":
        form.handleSubmit(onSubmit)();
        break;
    }
  };
  
  // Navigate to previous step
  const goToPreviousStep = () => {
    switch (currentStep) {
      case "tablet":
        setCurrentStep("student");
        break;
      case "details":
        setCurrentStep("tablet");
        break;
      case "confirmation":
        setCurrentStep("details");
        break;
    }
  };
  
  return (
    <Card className="p-0 overflow-hidden">
      <BorrowingSteps
        currentStep={currentStep}
        form={form}
        onSubmit={onSubmit}
        goToNextStep={goToNextStep}
        goToPreviousStep={goToPreviousStep}
        selectedStudent={selectedStudent}
        selectedTablet={selectedTablet}
        onStudentSelect={handleStudentSelect}
        onTabletSelect={handleTabletSelect}
        isSubmitting={isSubmitting}
        borrowSuccess={borrowSuccess}
      />
      {borrowSuccess && selectedStudent && selectedTablet && (
        <>
          <UsufructAgreementPDF
            ref={agreementRef}
            borrowDetails={{
              dateBorrowedFormatted: new Date(form.getValues().dateBorrowed || Date.now()).toLocaleDateString(),
            }}
            student={{
              fullName: selectedStudent.fullName || '',
              age: typeof selectedStudent.age === 'number' ? selectedStudent.age : 0,
              residenceAddress: selectedStudent.residenceAddress || '',
              isMinor: typeof selectedStudent.age === 'number' ? selectedStudent.age < 18 : false,
              guardianFullName: selectedStudent.guardianFullName || undefined,
              guardianAddress: selectedStudent.guardianAddress || undefined,
              programName: selectedStudent.programName || '',
              collegeName: selectedStudent.collegeName || '',
            }}
            tablet={{
              brand: selectedTablet.brand || '',
              color: selectedTablet.color || '',
              model: selectedTablet.model || '',
              serialNumber: selectedTablet.serialNumber || '',
            }}
          />
          <button onClick={() => agreementRef.current?.exportPDF()} className="btn btn-secondary mt-2">
            Test Export PDF
          </button>
        </>
      )}
    </Card>
  );
}
