import { BorrowingForm } from "@/components/borrowing/borrowing-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HandHelping } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Borrowing() {
  const [showBorrowingForm, setShowBorrowingForm] = useState(false);
  
  // Fetch active borrowing records
  const { data: borrowRecords, isLoading, error } = useQuery({
    queryKey: ['/api/borrow-records'],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?includeReturned=false`);
      if (!response.ok) throw new Error('Failed to fetch borrowing records');
      return response.json();
    },
  });
  
  // Define columns for the data table
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "tablet",
      header: "Tablet",
      cell: ({ row }) => {
        const tablet = row.original.tablet;
        return (
          <div>
            <div className="font-medium">{`${tablet.brand} ${tablet.model}`}</div>
            <div className="text-sm text-gray-500">SN: {tablet.serialNumber}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "student",
      header: "Student",
      cell: ({ row }) => {
        const student = row.original.student;
        return (
          <div>
            <div className="font-medium">
              {student.fullName || `${student.firstName || ''} ${student.lastName || ''}`}
            </div>
            <div className="text-sm text-gray-500">ID: {student.studentId}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "dateBorrowed",
      header: "Borrowed On",
      cell: ({ row }) => format(new Date(row.original.dateBorrowed), "MMM d, yyyy"),
    },
    {
      accessorKey: "expectedReturnDate",
      header: "Expected Return",
      cell: ({ row }) => row.original.expectedReturnDate 
        ? format(new Date(row.original.expectedReturnDate), "MMM d, yyyy") 
        : "Not specified",
    },
    {
      accessorKey: "condition",
      header: "Condition",
      cell: ({ row }) => row.original.condition,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className="bg-orange-100 text-orange-800">
          Borrowed
        </Badge>
      ),
    },
  ];
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900">Tablet Borrowing</h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button
              onClick={() => setShowBorrowingForm(!showBorrowingForm)} 
              className="flex items-center"
            >
              <HandHelping className="mr-2 h-4 w-4" />
              {showBorrowingForm ? "View Borrowings" : "New Borrowing"}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {showBorrowingForm ? (
            <BorrowingForm 
              onComplete={() => setShowBorrowingForm(false)} 
            />
          ) : (
            <div>
              <h2 className="text-xl font-medium text-slate-900 mb-4">Active Borrowings</h2>
              
              {isLoading ? (
                <div className="py-10 flex justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              ) : borrowRecords && borrowRecords.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={borrowRecords}
                  searchPlaceholder="Search borrowings by student or tablet..."
                />
              ) : (
                <div className="bg-white shadow overflow-hidden rounded-lg">
                  <div className="px-4 py-5 sm:p-6 text-center">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">
                      No active borrowings
                    </h3>
                    <div className="mt-2 max-w-xl text-sm text-slate-500 mx-auto">
                      <p>
                        There are currently no tablets checked out. Start a new borrowing using the 
                        button above.
                      </p>
                    </div>
                    <div className="mt-5">
                      <Button 
                        onClick={() => setShowBorrowingForm(true)}
                        className="flex items-center mx-auto"
                      >
                        <HandHelping className="mr-2 h-4 w-4" />
                        New Borrowing
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
