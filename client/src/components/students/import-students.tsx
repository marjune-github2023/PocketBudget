import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, Upload, FileText, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { queryClient } from "@/lib/queryClient";

export function ImportStudents({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith('.csv')) {
        setError("Please select a CSV file");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type !== "text/csv" && !droppedFile.name.endsWith('.csv')) {
        setError("Please select a CSV file");
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/templates/students");
      if (!response.ok) throw new Error("Failed to download template");
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const a = document.createElement("a");
      a.href = url;
      a.download = "students_template.csv";
      document.body.appendChild(a);
      
      // Trigger the download
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template downloaded",
        description: "The student template has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [analysis, setAnalysis] = useState(null);
  
  const handleAnalyze = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/students/import", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to analyze file");
      }
      
      const result = await response.json();
      setAnalysis(result);
      
    } catch (error) {
      console.error("Error analyzing file:", error);
      setError(error instanceof Error ? error.message : "Failed to analyze file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("file", file!);
      
      const response = await fetch("/api/students/import?confirmImport=true", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to import students");
      }
      
      const result = await response.json();
      
      toast({
        title: "Import completed",
        description: result.message,
      });
      
      setImportSuccess(true);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Invalidate student queries
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error importing students:", error);
      setError(error instanceof Error ? error.message : "Failed to import students");
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "There was an error importing the students",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Import Students from CSV
        </CardTitle>
        <CardDescription>
          Upload a CSV file with student information to bulk import into the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {importSuccess && (
          <Alert className="mb-4 bg-green-50 border-green-300">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Students imported successfully! You can now manage them in the system.
            </AlertDescription>
          </Alert>
        )}
        
        <div 
          className={`
            mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md
            ${error ? 'border-red-300' : 'border-slate-300'}
            ${file ? 'border-green-300 bg-green-50' : ''}
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            {file ? (
              <div className="flex flex-col items-center">
                <FileText className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-1 text-sm text-green-700 font-medium">{file.name}</p>
                <p className="text-xs text-green-600">{(file.size / 1024).toFixed(2)} KB</p>
                <div className="mt-2 flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                  <Button size="sm" onClick={handleAnalyze} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-1" /> Analyzing...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" /> Analyze File
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".csv"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-500">
                  CSV file up to 10MB
                </p>
              </>
            )}
          </div>
        </div>

        {analysis && (
          <div className="mt-4 p-4 border rounded-md bg-slate-50">
            <h3 className="font-medium mb-2">Import Analysis</h3>
            <div className="space-y-2 text-sm">
              <p>Total records: {analysis.total}</p>
              <p>New records: {analysis.new}</p>
              <p>Duplicate records: {analysis.duplicates.length}</p>
              {analysis.duplicates.length > 0 && (
                <div>
                  <p className="font-medium">Duplicate Student IDs:</p>
                  <p className="text-slate-600">{analysis.duplicates.map(d => d.studentId).join(', ')}</p>
                </div>
              )}
              <div className="mt-4 flex space-x-2">
                <Button onClick={handleConfirmImport} disabled={isLoading}>
                  Import New Records Only
                </Button>
                <Button variant="outline" onClick={() => setAnalysis(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {!analysis && (
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              onClick={handleDownloadTemplate}
              className="flex items-center"
            >
              <Download className="mr-2 h-4 w-4" />
              Download template file
            </Button>
          </div>
        )}
        
        <div className="mt-4 text-sm text-slate-500">
          <p className="font-medium mb-1">CSV file should include these columns:</p>
          
          <p className="font-medium mt-3 mb-1">Basic Student Information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-medium">Student No.</span> - Unique identifier for the student</li>
            <li><span className="font-medium">Last Name</span> - Student's last name/surname</li>
            <li><span className="font-medium">First Name</span> - Student's first name</li>
            <li><span className="font-medium">Middle Name</span> - Student's middle name (optional)</li>
            <li><span className="font-medium">Suffix Name</span> - Student's name suffix (optional)</li>
            <li><span className="font-medium">Full Name</span> - Student's complete name</li>
          </ul>
          
          <p className="font-medium mt-3 mb-1">Academic Information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-medium">College Name</span> - College/department name (optional)</li>
            <li><span className="font-medium">Program Code</span> - Program or course code (optional)</li>
            <li><span className="font-medium">Program Name</span> - Full program or course name</li>
            <li><span className="font-medium">Major Name</span> - Student's specialization (optional)</li>
            <li><span className="font-medium">Year Level</span> - Academic year level</li>
          </ul>
          
          <p className="font-medium mt-3 mb-1">Enrollment Information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-medium">Registration Date</span> - Date of registration</li>
            <li><span className="font-medium">Validation Date</span> - Date of validation (optional)</li>
            <li><span className="font-medium">Date Admitted</span> - Original admission date (optional)</li>
            <li><span className="font-medium">Academic Year & Term</span> - Current academic year (optional)</li>  
            <li><span className="font-medium">Campus</span> - Campus location (optional)</li>
            <li><span className="font-medium">Student Status</span> - Student status (New/Old/Regular/Irregular)</li>
          </ul>
          
          <p className="font-medium mt-3 mb-1">Personal Information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-medium">Date Of Birth</span> - Student's birth date (optional)</li>
            <li><span className="font-medium">Age</span> - Student's age (optional)</li>
            <li><span className="font-medium">Place Of Birth</span> - Student's birthplace (optional)</li>
            <li><span className="font-medium">Gender</span> - Student's gender</li>
            <li><span className="font-medium">Civil Status</span> - Marital status (optional)</li>
            <li><span className="font-medium">Mobile No.</span> - Contact phone number (optional)</li>
            <li><span className="font-medium">Email</span> - Email address (optional)</li>
            <li><span className="font-medium">Residence Address</span> - Current address (optional)</li>
          </ul>
          
          <p className="font-medium mt-3 mb-1">Guardian Information (all optional):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-medium">Guardian Last Name</span> - Guardian's last name</li>
            <li><span className="font-medium">Guardian First Name</span> - Guardian's first name</li>
            <li><span className="font-medium">Guardian Middle Name</span> - Guardian's middle name</li>
            <li><span className="font-medium">Guardian Full Name</span> - Guardian's complete name</li>
            <li><span className="font-medium">Guardian Occupation</span> - Guardian's job</li>
            <li><span className="font-medium">Guardian Tel No.</span> - Guardian's telephone</li>
            <li><span className="font-medium">Guardian Mobile No.</span> - Guardian's mobile number</li>
            <li><span className="font-medium">Guardian Email</span> - Guardian's email address</li>
            <li><span className="font-medium">Guardian Address</span> - Guardian's address</li>
          </ul>
          
          <p className="font-medium mt-3 mb-1">Additional Information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-medium">Notes</span> - Any additional information (optional)</li>
          </ul>
          
          <p className="mt-3 italic">Note: Download the template for an example CSV format with all fields.</p>
        </div>
      </CardContent>
    </Card>
  );
}
