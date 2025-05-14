import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateBorrowRecordForReturnSchema, BorrowRecordWithDetails } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertCircle, 
  ArrowLeftRight, 
  Calendar, 
  CheckCircle2, 
  Tablet 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const returnFormSchema = updateBorrowRecordForReturnSchema.extend({
  isReturned: z.literal(true).default(true),
  returnDate: z.string().min(1, "Return date is required"),
});

type ReturnFormData = z.infer<typeof returnFormSchema>;

interface ReturnFormProps {
  borrowRecord: BorrowRecordWithDetails;
  onSuccess?: () => void;
}

export function ReturnForm({ borrowRecord, onSuccess }: ReturnFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      isReturned: true,
      returnDate: new Date().toISOString().split('T')[0],
      returnCondition: borrowRecord.condition,
      returnNotes: "",
    },
  });

  const onSubmit = async (data: ReturnFormData) => {
    setIsSubmitting(true);
    try {
      // Format data for API
      const returnData = {
        isReturned: data.isReturned,
        returnDate: data.returnDate,
        returnCondition: data.returnCondition,
        returnNotes: data.returnNotes,
      };
      
      // Submit to API
      await apiRequest(
        "POST", 
        `/api/borrow-records/${borrowRecord.id}/return`, 
        returnData
      );
      
      // Show success message
      toast({
        title: "Return processed",
        description: "The tablet return has been processed successfully.",
      });
      
      // Update UI
      setReturnSuccess(true);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/tablets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/borrow-records'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-activity'] });
      
      // Call completion callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error processing return:", error);
      toast({
        title: "Error",
        description: "There was an error processing the return. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Parse accessories if they exist
  const accessories = borrowRecord.accessories 
    ? typeof borrowRecord.accessories === 'string' 
      ? JSON.parse(borrowRecord.accessories as string) 
      : borrowRecord.accessories
    : { charger: false, cable: false, box: false };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ArrowLeftRight className="mr-2 h-5 w-5" />
          Process Tablet Return
        </CardTitle>
        <CardDescription>
          Record the return of a borrowed tablet and update its condition
        </CardDescription>
      </CardHeader>
      <CardContent>
        {returnSuccess ? (
          <Alert className="bg-green-50 border-green-200 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <AlertTitle className="text-lg font-medium text-green-800">
                  Return processed successfully
                </AlertTitle>
                <AlertDescription className="mt-2 text-sm text-green-700">
                  The tablet has been marked as returned and is now available in the inventory.
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ) : (
          <>
            {/* Borrowing record summary */}
            <div className="mb-6">
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="text-base font-medium">
                      {borrowRecord.tablet.brand} {borrowRecord.tablet.model}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Serial: {borrowRecord.tablet.serialNumber}
                    </p>
                  </div>
                  <Badge className="self-start sm:self-center bg-orange-100 text-orange-800 whitespace-nowrap">
                    Borrowed
                  </Badge>
                </div>
                
                <Separator className="my-3" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">Student:</p>
                    <p>{borrowRecord.student.name} ({borrowRecord.student.studentId})</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Borrowed On:</p>
                    <p>{format(new Date(borrowRecord.dateBorrowed), "MMMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Original Condition:</p>
                    <p>{borrowRecord.condition}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Borrowed Accessories:</p>
                    <p>
                      {[
                        accessories.charger && "Charger",
                        accessories.cable && "Cable",
                        accessories.box && "Box"
                      ].filter(Boolean).join(", ") || "None"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Return form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="returnDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="returnCondition"
                  render={({ field }) => (
                    <FormItem>
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
                      <FormDescription>
                        Note any changes in the tablet's condition since it was borrowed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="returnNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any observations or issues with the returned tablet..." 
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Document any damages, missing accessories, or other issues
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex items-center"
                  >
                    {isSubmitting ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Tablet className="mr-2 h-4 w-4" />
                        Process Return
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
