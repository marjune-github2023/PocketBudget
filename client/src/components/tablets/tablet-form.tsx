import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTabletSchema } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tablet, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// Extend the schema with more validations
const tabletFormSchema = insertTabletSchema.extend({
  serialNumber: z.string().min(1, "Serial number is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
});

interface TabletFormProps {
  onSuccess?: () => void;
  defaultValues?: z.infer<typeof tabletFormSchema>;
  isEdit?: boolean;
  tabletId?: number;
}

export function TabletForm({ 
  onSuccess, 
  defaultValues,
  isEdit = false,
  tabletId
}: TabletFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof tabletFormSchema>>({
    resolver: zodResolver(tabletFormSchema),
    defaultValues: defaultValues || {
      brand: "",
      model: "",
      color: "",
      serialNumber: "",
      imei: "",
      status: "Serviceable",
      condition: "Good",
      hasCharger: false,
      hasCable: false,
      hasBox: false,
      notes: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof tabletFormSchema>) => {
    setIsSubmitting(true);
    try {
      if (isEdit && tabletId) {
        await apiRequest("PUT", `/api/tablets/${tabletId}`, data);
        toast({
          title: "Tablet updated",
          description: "The tablet has been updated successfully",
        });
      } else {
        await apiRequest("POST", "/api/tablets", data);
        toast({
          title: "Tablet added",
          description: "The tablet has been added to the inventory",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/tablets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      if (onSuccess) onSuccess();
      if (!isEdit) form.reset();
    } catch (error) {
      console.error("Error submitting tablet form:", error);
      toast({
        title: "Error",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mock function for QR code scanning (would be implemented with a real scanner in production)
  const handleScanCode = (field: 'serialNumber' | 'imei') => {
    toast({
      title: "Scanner not available",
      description: "QR/Barcode scanning would be implemented with a hardware device or webcam in production",
    });
  };

  return (
    <Card className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic tablet information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input placeholder="Apple, Samsung, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="iPad Pro, Galaxy Tab S7, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input placeholder="Space Gray, Silver, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Serviceable">Serviceable</SelectItem>
                      <SelectItem value="Unserviceable">Unserviceable</SelectItem>
                      <SelectItem value="Lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Identifiers with QR scanning */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <Input placeholder="Serial number" {...field} className="rounded-r-none" />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="rounded-l-none border-l-0"
                        onClick={() => handleScanCode('serialNumber')}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Unique identifier for the tablet
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="imei"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IMEI Number</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <Input placeholder="IMEI number" {...field} className="rounded-r-none" />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="rounded-l-none border-l-0"
                        onClick={() => handleScanCode('imei')}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    International Mobile Equipment Identity number
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Condition */}
          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition</FormLabel>
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
          
          {/* Accessories */}
          <div>
            <h3 className="text-base font-medium mb-2">Accessories</h3>
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="hasCharger"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Charger</FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hasCable"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Cable</FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hasBox"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Box (Carton)</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Additional information about the tablet" 
                    {...field} 
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center"
            >
              <Tablet className="mr-2 h-4 w-4" />
              {isEdit ? 'Update Tablet' : 'Add Tablet'}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
