import { BorrowingStep, BorrowingFormData } from "./borrowing-form";
import { Student, Tablet } from "@shared/schema";
import { useForm, UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  CheckCircle2, 
  User, 
  Tablet as TabletIcon, 
  Calendar, 
  FileCheck 
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";

interface BorrowingStepsProps {
  currentStep: BorrowingStep;
  form: UseFormReturn<BorrowingFormData>;
  onSubmit: (data: BorrowingFormData) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  selectedStudent: Student | null;
  selectedTablet: Tablet | null;
  onStudentSelect: (student: Student) => void;
  onTabletSelect: (tablet: Tablet) => void;
  isSubmitting: boolean;
  borrowSuccess: boolean;
}

export function BorrowingSteps({
  currentStep,
  form,
  onSubmit,
  goToNextStep,
  goToPreviousStep,
  selectedStudent,
  selectedTablet,
  onStudentSelect,
  onTabletSelect,
  isSubmitting,
  borrowSuccess
}: BorrowingStepsProps) {
  const [studentSearch, setStudentSearch] = useState("");
  const [tabletSearch, setTabletSearch] = useState("");
  
  // Fetch students and tablets
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['/api/students'],
  });
  
  const { data: tablets, isLoading: isLoadingTablets } = useQuery({
    queryKey: ['/api/tablets/available'],
  });
  
  // Filter students based on search
  const filteredStudents = students?.filter((student: Student) => {
    if (!studentSearch) return true;
    
    const searchLower = studentSearch.toLowerCase();
    
    // Create a display name from the available fields
    const displayName = student.fullName || 
                        `${student.firstName || ''} ${student.lastName || ''}` || 
                        '';
    
    return (
      displayName.toLowerCase().includes(searchLower) ||
      student.studentId.toLowerCase().includes(searchLower)
    );
  });
  
  // Filter tablets based on search
  const filteredTablets = tablets?.filter((tablet: Tablet) => {
    if (!tabletSearch) return true;
    
    const searchLower = tabletSearch.toLowerCase();
    return (
      tablet.brand.toLowerCase().includes(searchLower) ||
      tablet.model.toLowerCase().includes(searchLower) ||
      tablet.serialNumber.toLowerCase().includes(searchLower) ||
      (tablet.imei && tablet.imei.toLowerCase().includes(searchLower))
    );
  });
  
  // Step indicators
  const steps = [
    { id: "student", label: "Select Student", icon: User },
    { id: "tablet", label: "Select Tablet", icon: TabletIcon },
    { id: "details", label: "Borrowing Details", icon: Calendar },
    { id: "confirmation", label: "Confirmation", icon: FileCheck },
  ];
  
  return (
    <div className="flex flex-col">
      {/* Steps indicator */}
      <div className="p-6 border-b border-slate-200">
        <nav aria-label="Progress" className="mb-0">
          <ol className="border border-slate-200 rounded-md divide-y divide-slate-200 md:flex md:divide-y-0">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isPast = 
                (currentStep === "tablet" && step.id === "student") ||
                (currentStep === "details" && (step.id === "student" || step.id === "tablet")) ||
                (currentStep === "confirmation" && step.id !== "confirmation");
              
              return (
                <li key={step.id} className="relative md:flex-1 md:flex">
                  <div 
                    className={`
                      group flex items-center w-full cursor-pointer px-6 py-4
                      ${isActive ? 'cursor-default' : isPast ? 'cursor-pointer' : 'cursor-not-allowed pointer-events-none'}
                    `}
                    onClick={() => {
                      if (isPast) {
                        // Navigate to clicked step
                        switch (step.id) {
                          case "student":
                            goToPreviousStep();
                            if (currentStep === "details") goToPreviousStep();
                            if (currentStep === "confirmation") {
                              goToPreviousStep();
                              goToPreviousStep();
                            }
                            break;
                          case "tablet":
                            if (currentStep === "student") goToNextStep();
                            if (currentStep === "confirmation") goToPreviousStep();
                            if (currentStep === "details") goToPreviousStep();
                            break;
                          case "details":
                            if (currentStep === "student") {
                              goToNextStep();
                              goToNextStep();
                            }
                            if (currentStep === "tablet") goToNextStep();
                            if (currentStep === "confirmation") goToPreviousStep();
                            break;
                        }
                      }
                    }}
                  >
                    <span className="flex items-center">
                      <span 
                        className={`
                          flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full
                          ${isActive ? 'bg-primary-600 text-white' : 
                            isPast ? 'bg-primary-600 text-white' : 'bg-slate-300 text-white'}
                        `}
                      >
                        {isPast ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <StepIcon className="w-5 h-5" />
                        )}
                      </span>
                      <span 
                        className={`
                          ml-4 text-sm font-medium
                          ${isActive ? 'text-primary-600' : 
                            isPast ? 'text-slate-900' : 'text-slate-500'}
                        `}
                      >
                        {step.label}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
      
      {/* Current step content */}
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Select Student */}
            {currentStep === "student" && (
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Select Student</h3>
                
                <div className="mb-4">
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search students by name or ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {isLoadingStudents ? (
                  <LoadingSpinner className="py-10" />
                ) : filteredStudents && filteredStudents.length > 0 ? (
                  <div className="overflow-hidden bg-white border border-slate-200 rounded-md">
                    <ul className="divide-y divide-slate-200">
                      {filteredStudents.map((student: Student) => (
                        <li
                          key={student.id}
                          className={`
                            relative bg-white py-5 px-4 hover:bg-slate-50 focus-within:ring-2 
                            focus-within:ring-inset focus-within:ring-primary-600 cursor-pointer
                            ${selectedStudent?.id === student.id ? 'bg-primary-50 border-l-4 border-primary-600' : ''}
                          `}
                          onClick={() => onStudentSelect(student)}
                        >
                          <div className="flex justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {student.fullName || `${student.firstName || ''} ${student.lastName || ''}`}
                              </p>
                              <p className="text-sm text-slate-500">{student.studentId}</p>
                            </div>
                            <div className="ml-2 flex-shrink-0 flex">
                              <Badge variant="outline" className={
                                student.activeBorrowings > 0 
                                  ? "bg-amber-100 text-amber-800" 
                                  : "bg-green-100 text-green-800"
                              }>
                                {student.activeBorrowings > 0 
                                  ? `${student.activeBorrowings} Active Borrowings` 
                                  : "No Active Borrowings"}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-1">
                            <p className="line-clamp-2 text-sm text-slate-600">
                              {student.email && `${student.email} • `}
                              {student.mobileNo || ''}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-white border border-slate-200 rounded-md">
                    <p className="text-slate-500">No students found matching your search.</p>
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Step 2: Select Tablet */}
            {currentStep === "tablet" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-slate-900">Select Tablet</h3>
                  {selectedStudent && (
                    <div className="text-sm font-medium text-slate-600 bg-slate-100 p-2 rounded">
                      Selected Student: <span className="text-primary-600">{selectedStudent.name} ({selectedStudent.studentId})</span>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search available tablets by brand, model, or serial number..."
                      value={tabletSearch}
                      onChange={(e) => setTabletSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {isLoadingTablets ? (
                  <LoadingSpinner className="py-10" />
                ) : filteredTablets && filteredTablets.length > 0 ? (
                  <div className="overflow-hidden bg-white border border-slate-200 rounded-md">
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <span className="text-sm font-medium text-slate-700">Available Tablets</span>
                    </div>
                    <ul className="divide-y divide-slate-200">
                      {filteredTablets.map((tablet: Tablet) => (
                        <li
                          key={tablet.id}
                          className={`
                            relative bg-white py-4 px-4 hover:bg-slate-50 focus-within:ring-2 
                            focus-within:ring-inset focus-within:ring-primary-600 cursor-pointer
                            ${selectedTablet?.id === tablet.id ? 'bg-primary-50 border-l-4 border-primary-600' : ''}
                          `}
                          onClick={() => onTabletSelect(tablet)}
                        >
                          <div className="flex justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{tablet.brand} {tablet.model}</p>
                              <p className="text-sm text-slate-500">S/N: {tablet.serialNumber}</p>
                            </div>
                            <div className="ml-2 flex-shrink-0 flex">
                              <Badge 
                                variant="outline" 
                                className="bg-green-100 text-green-800"
                              >
                                Serviceable
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-slate-500">
                            <span className="truncate">
                              {tablet.color && `${tablet.color} • `}
                              Accessories: {
                                [
                                  tablet.hasCharger && "Charger",
                                  tablet.hasCable && "Cable",
                                  tablet.hasBox && "Box"
                                ].filter(Boolean).join(", ") || "None"
                              }
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-white border border-slate-200 rounded-md">
                    <p className="text-slate-500">No available tablets found matching your search.</p>
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="tabletId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Step 3: Borrowing Details */}
            {currentStep === "details" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-slate-900">Borrowing Details</h3>
                  <div className="text-sm font-medium text-slate-600 bg-slate-100 p-2 rounded">
                    <div>Student: <span className="text-primary-600">
                      {selectedStudent?.fullName || 
                       `${selectedStudent?.firstName || ''} ${selectedStudent?.lastName || ''}`} 
                      ({selectedStudent?.studentId})
                    </span></div>
                    <div>Device: <span className="text-primary-600">{selectedTablet?.brand} {selectedTablet?.model} - {selectedTablet?.serialNumber}</span></div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden border border-slate-200 rounded-lg mb-6">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <FormField
                        control={form.control}
                        name="dateBorrowed"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-3">
                            <FormLabel>Borrowing Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="expectedReturnDate"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-3">
                            <FormLabel>Expected Return Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>
                              Optional: When the tablet is expected to be returned
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="condition"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-6">
                            <FormLabel>Current Condition</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="New / Excellent">New / Excellent</SelectItem>
                                <SelectItem value="Good">Good</SelectItem>
                                <SelectItem value="Fair">Fair</SelectItem>
                                <SelectItem value="Poor">Poor</SelectItem>
                                <SelectItem value="Defective">Defective</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="sm:col-span-6">
                        <h4 className="block text-sm font-medium text-slate-700 mb-2">Accessories Being Borrowed</h4>
                        <div className="mt-2 space-y-2">
                          <FormField
                            control={form.control}
                            name="hasCharger"
                            render={({ field }) => (
                              <FormItem className="flex items-start">
                                <FormControl>
                                  <div className="flex items-center h-5">
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </div>
                                </FormControl>
                                <div className="ml-3 text-sm">
                                  <FormLabel className="font-medium text-slate-700">Charger</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="hasCable"
                            render={({ field }) => (
                              <FormItem className="flex items-start">
                                <FormControl>
                                  <div className="flex items-center h-5">
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </div>
                                </FormControl>
                                <div className="ml-3 text-sm">
                                  <FormLabel className="font-medium text-slate-700">Cable</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="hasBox"
                            render={({ field }) => (
                              <FormItem className="flex items-start">
                                <FormControl>
                                  <div className="flex items-center h-5">
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </div>
                                </FormControl>
                                <div className="ml-3 text-sm">
                                  <FormLabel className="font-medium text-slate-700">Box (Carton)</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-6">
                            <FormLabel>Additional Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any special conditions or instructions..." 
                                rows={3}
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                <Alert className="bg-amber-50 border-amber-300 mb-6">
                  <AlertTitle className="text-amber-800 flex items-center">
                    <FileCheck className="h-4 w-4 mr-2 text-amber-700" />
                    Agreement will be generated
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Upon confirmation, a usufruct agreement will be generated for the student 
                    to sign acknowledging receipt and responsibility for the device.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Step 4: Confirmation */}
            {currentStep === "confirmation" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-slate-900">Confirm Borrowing</h3>
                </div>
                
                {borrowSuccess ? (
                  <Alert className="bg-green-50 border-green-200 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="ml-3">
                        <AlertTitle className="text-lg font-medium text-green-800">
                          Borrowing completed successfully
                        </AlertTitle>
                        <AlertDescription className="mt-2 text-sm text-green-700">
                          The tablet has been assigned to the student and the borrowing record has been created.
                          A PDF agreement has been downloaded for printing.
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ) : (
                  <Alert className="bg-green-50 border-green-200 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="ml-3">
                        <AlertTitle className="text-lg font-medium text-green-800">
                          Ready to complete the borrowing process
                        </AlertTitle>
                        <AlertDescription className="mt-2 text-sm text-green-700">
                          Please review the details below and confirm to complete the borrowing process.
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}
                
                <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
                  <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">Borrowing Summary</h3>
                  </div>
                  <div className="px-4 py-5 sm:p-6">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-slate-500">Student</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {selectedStudent?.name}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-slate-500">Student ID</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {selectedStudent?.studentId}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-slate-500">Tablet</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {selectedTablet?.brand} {selectedTablet?.model}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-slate-500">Serial Number</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {selectedTablet?.serialNumber}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-slate-500">Borrowing Date</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {form.getValues().dateBorrowed && format(new Date(form.getValues().dateBorrowed), "MMMM d, yyyy")}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-slate-500">Expected Return Date</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {form.getValues().expectedReturnDate 
                            ? format(new Date(form.getValues().expectedReturnDate), "MMMM d, yyyy")
                            : "Not specified"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-slate-500">Condition</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {form.getValues().condition}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-slate-500">Accessories</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {[
                            form.getValues().hasCharger && "Charger",
                            form.getValues().hasCable && "Cable",
                            form.getValues().hasBox && "Box"
                          ].filter(Boolean).join(", ") || "None"}
                        </dd>
                      </div>
                      {form.getValues().notes && (
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-slate-500">Notes</dt>
                          <dd className="mt-1 text-sm text-slate-900">
                            {form.getValues().notes}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation buttons */}
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              {!borrowSuccess && (
                <Button
                  type={currentStep === "confirmation" ? "submit" : "button"}
                  onClick={currentStep !== "confirmation" ? goToNextStep : undefined}
                  disabled={isSubmitting}
                  className="w-full sm:ml-3 sm:w-auto"
                >
                  {isSubmitting && currentStep === "confirmation" ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  {currentStep === "confirmation" ? "Complete Borrowing" : "Next"}
                  {!isSubmitting && currentStep !== "confirmation" && (
                    <ChevronRight className="ml-2 h-4 w-4" />
                  )}
                </Button>
              )}
              
              {currentStep !== "student" && !borrowSuccess && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPreviousStep}
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
