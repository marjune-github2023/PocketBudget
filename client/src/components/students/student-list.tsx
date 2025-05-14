import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StudentWithBorrowInfo } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreHorizontal, User, History, AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StudentForm } from "./student-form";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function StudentList() {
  const { toast } = useToast();
  const [currentStudent, setCurrentStudent] = useState<StudentWithBorrowInfo | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBorrowingsDialog, setShowBorrowingsDialog] = useState(false);
  
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['/api/students'],
  });

  const { data: borrowRecords, isLoading: isBorrowingsLoading } = useQuery({
    queryKey: [`/api/students/${currentStudent?.id}/borrow-records`],
    enabled: showBorrowingsDialog && !!currentStudent?.id,
  });

  if (isLoading) {
    return <LoadingSpinner className="py-10" size="lg" />;
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium">Error loading students</h3>
        <p className="text-gray-500">
          There was a problem fetching the student data. Please try again.
        </p>
      </div>
    );
  }

  // Handle student actions
  const handleEditStudent = (student: StudentWithBorrowInfo) => {
    setCurrentStudent(student);
    setShowEditDialog(true);
  };

  const handleViewBorrowings = (student: StudentWithBorrowInfo) => {
    setCurrentStudent(student);
    setShowBorrowingsDialog(true);
  };

  const handleDeleteStudent = async (student: StudentWithBorrowInfo) => {
    try {
      if (student.activeBorrowings > 0) {
        toast({
          title: "Cannot delete student",
          description: "This student has active borrowings. Return all tablets first.",
          variant: "destructive",
        });
        return;
      }

      await apiRequest("DELETE", `/api/students/${student.id}`);
      
      toast({
        title: "Student deleted",
        description: "The student has been deleted successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        title: "Error",
        description: "Failed to delete student. They may have borrowing history.",
        variant: "destructive",
      });
    }
  };

  // Define columns for the data table
  const columns: ColumnDef<StudentWithBorrowInfo>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "studentId",
      header: "Student ID",
      cell: ({ row }) => <div>{row.original.studentId}</div>,
    },
    {
      accessorKey: "contactInfo",
      header: "Contact Info",
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div>
            {student.email && <div className="text-sm">{student.email}</div>}
            {student.phone && <div className="text-sm text-gray-500">{student.phone}</div>}
          </div>
        );
      },
    },
    {
      accessorKey: "activeBorrowings",
      header: "Current Tablets",
      cell: ({ row }) => {
        const student = row.original;
        if (student.activeBorrowings > 0) {
          return (
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              {student.activeBorrowings} active {student.activeBorrowings === 1 ? 'borrowing' : 'borrowings'}
            </Badge>
          );
        }
        return <div className="text-sm text-gray-500">No active tablets</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleViewBorrowings(row.original)}>
              <History className="mr-2 h-4 w-4" />
              View Borrowing History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditStudent(row.original)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDeleteStudent(row.original)} 
              disabled={row.original.activeBorrowings > 0}
              className={row.original.activeBorrowings > 0 ? "text-gray-400" : "text-red-600"}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={students}
        searchPlaceholder="Search students by name or ID..."
        searchColumn="name"
      />

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {currentStudent && (
            <StudentForm 
              defaultValues={currentStudent} 
              isEdit={true} 
              studentId={currentStudent.id}
              onSuccess={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Borrowings History Dialog */}
      <Dialog open={showBorrowingsDialog} onOpenChange={setShowBorrowingsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Borrowing History: {currentStudent?.name} ({currentStudent?.studentId})
            </DialogTitle>
          </DialogHeader>
          
          {isBorrowingsLoading ? (
            <LoadingSpinner className="py-10" />
          ) : borrowRecords && borrowRecords.length > 0 ? (
            <div className="space-y-4">
              {borrowRecords.map((record: any) => (
                <Card key={record.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className={`px-4 py-3 ${record.isReturned ? 'bg-green-50' : 'bg-orange-50'}`}>
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">
                          {record.tablet.brand} {record.tablet.model}
                        </h3>
                        <Badge variant="outline" className={record.isReturned ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                          {record.isReturned ? 'Returned' : 'Borrowed'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">Serial: {record.tablet.serialNumber}</p>
                    </div>
                    
                    <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-500">Borrowed On</p>
                        <p>{new Date(record.dateBorrowed).toLocaleDateString()}</p>
                      </div>
                      
                      {record.isReturned ? (
                        <div>
                          <p className="font-medium text-gray-500">Returned On</p>
                          <p>{new Date(record.returnDate).toLocaleDateString()}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-gray-500">Expected Return</p>
                          <p>{record.expectedReturnDate ? new Date(record.expectedReturnDate).toLocaleDateString() : 'Not specified'}</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="font-medium text-gray-500">Borrowed Condition</p>
                        <p>{record.condition}</p>
                      </div>
                      
                      {record.isReturned && (
                        <div>
                          <p className="font-medium text-gray-500">Returned Condition</p>
                          <p>{record.returnCondition}</p>
                        </div>
                      )}
                      
                      {record.notes && (
                        <div className="col-span-2">
                          <p className="font-medium text-gray-500">Notes</p>
                          <p>{record.notes}</p>
                        </div>
                      )}
                      
                      {record.isReturned && record.returnNotes && (
                        <div className="col-span-2">
                          <p className="font-medium text-gray-500">Return Notes</p>
                          <p>{record.returnNotes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              No borrowing records found for this student.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
