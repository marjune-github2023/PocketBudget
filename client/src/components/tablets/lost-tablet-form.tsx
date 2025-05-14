import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TabletWithBorrowInfo } from "@shared/schema";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

// Schema for lost tablet report
const lostTabletSchema = z.object({
  details: z.string().min(1, "Details are required"),
  document: z.instanceof(FileList).optional().refine(
    (files) => {
      if (!files || files.length === 0) return true;
      return files[0]?.type === "application/pdf" || 
             files[0]?.type === "image/jpeg" || 
             files[0]?.type === "image/png";
    },
    { message: "Document must be a PDF or image file" }
  ),
  dateReported: z.string().min(1, "Date is required"),
});

interface LostTabletFormProps {
  tablet: TabletWithBorrowInfo;
  onSuccess?: () => void;
}

export function LostTabletForm({ tablet, onSuccess }: LostTabletFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the current borrow record if this tablet is borrowed
  const { data: borrowRecords } = useQuery({
    queryKey: [`/api/tablets/${tablet.id}/borrow-records`], 
    enabled: !!tablet.currentBorrower,
  });

  const form = useForm<z.infer<typeof lostTabletSchema>>({
    resolver: zodResolver(lostTabletSchema),
    defaultValues: {
      details: "",
      dateReported: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const onSubmit = async (data: z.infer<typeof lostTabletSchema>) => {
    setIsSubmitting(true);
    
    try {
      let borrowRecordId = null;
      let studentId = null;
      
      // If the tablet is currently borrowed, use that borrow record and student
      if (tablet.currentBorrower && borrowRecords?.length > 0) {
        const activeRecord = borrowRecords.find((record: any) => !record.isReturned);
        if (activeRecord) {
          borrowRecordId = activeRecord.id;
          studentId = activeRecord.studentId;
        }
      }
      
      // If we don't have a borrower, we can't proceed
      if (!studentId && !tablet.currentBorrower) {
        toast({
          title: "Missing information",
          description: "Cannot determine which student lost this tablet. Please specify a student.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      const formData = new FormData();
      formData.append("tabletId", tablet.id.toString());
      formData.append("studentId", (studentId || tablet.currentBorrower?.studentId).toString());
      if (borrowRecordId) {
        formData.append("borrowRecordId", borrowRecordId.toString());
      }
      formData.append("dateReported", new Date(data.dateReported).toISOString());
      formData.append("details", data.details);
      
      // Append document if present
      if (data.document && data.document.length > 0) {
        formData.append("document", data.document[0]);
      }
      
      const response = await fetch("/api/lost-reports", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit report");
      }
      
      toast({
        title: "Report submitted",
        description: "The tablet has been reported as lost.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/tablets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tablets/${tablet.id}`] });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting lost tablet report:", error);
      toast({
        title: "Error",
        description: "There was an error submitting your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Reporting this tablet as lost will mark it as unavailable in the system 
          and record the loss against the student's record. This action cannot be easily undone.
        </AlertDescription>
      </Alert>
      
      <div className="mb-6">
        <h3 className="text-base font-semibold">Tablet Information</h3>
        <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Device</p>
            <p className="text-sm text-gray-900">{tablet.brand} {tablet.model}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Serial Number</p>
            <p className="text-sm text-gray-900">{tablet.serialNumber}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Current Status</p>
            <p className="text-sm text-gray-900">{tablet.status}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Last Borrowed By</p>
            <p className="text-sm text-gray-900">
              {tablet.currentBorrower ? tablet.currentBorrower.studentName : "N/A"}
            </p>
          </div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="dateReported"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date Reported Lost</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Details of Loss</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Provide details about how and where the tablet was lost" 
                    {...field} 
                    rows={4}
                  />
                </FormControl>
                <FormDescription>
                  Include information about the circumstances of the loss, location, and any attempts to recover the device.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="document"
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel>Supporting Document</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    onChange={(e) => onChange(e.target.files)}
                    {...rest}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </FormControl>
                <FormDescription>
                  Optional: Upload Affidavit of Loss or Police Blotter (PDF or image)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              variant="destructive"
              disabled={isSubmitting}
              className="flex items-center"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report Tablet as Lost
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
