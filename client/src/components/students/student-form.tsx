import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertStudentSchema } from "@shared/schema";
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
import { User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// Extend the schema with more validations
const studentFormSchema = insertStudentSchema.extend({
  name: z.string().min(1, "Name is required"),
  studentId: z.string().min(1, "Student ID is required"),
});

interface StudentFormProps {
  onSuccess?: () => void;
  defaultValues?: z.infer<typeof studentFormSchema>;
  isEdit?: boolean;
  studentId?: number;
}

export function StudentForm({ 
  onSuccess,
  defaultValues,
  isEdit = false,
  studentId
}: StudentFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: defaultValues || {
      name: "",
      studentId: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof studentFormSchema>) => {
    setIsSubmitting(true);
    try {
      if (isEdit && studentId) {
        await apiRequest("PUT", `/api/students/${studentId}`, data);
        toast({
          title: "Student updated",
          description: "The student record has been updated successfully",
        });
      } else {
        await apiRequest("POST", "/api/students", data);
        toast({
          title: "Student added",
          description: "The student has been added to the system",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      if (onSuccess) onSuccess();
      if (!isEdit) form.reset();
    } catch (error) {
      console.error("Error submitting student form:", error);
      toast({
        title: "Error",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter student's full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="studentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student ID</FormLabel>
                <FormControl>
                  <Input placeholder="Enter unique student ID" {...field} />
                </FormControl>
                <FormDescription>
                  A unique identifier for the student (e.g., STU2023001)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="student@example.com" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Phone number" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Any additional information about the student" 
                    {...field} 
                    value={field.value || ""} 
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end space-x-2">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center"
            >
              <User className="mr-2 h-4 w-4" />
              {isEdit ? 'Update Student' : 'Add Student'}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
