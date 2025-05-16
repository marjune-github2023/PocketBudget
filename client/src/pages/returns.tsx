import { useState } from "react";
import { ReturnForm } from "@/components/returns/return-form";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowLeftRight, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Returns() {
  const [search, setSearch] = useState("");
  const [selectedBorrow, setSelectedBorrow] = useState<any>(null);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  
  // Fetch active borrowing records for returns
  const { data: borrowRecords, isLoading, error } = useQuery({
    queryKey: ['/api/borrow-records'],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?includeReturned=false`);
      if (!response.ok) throw new Error('Failed to fetch borrowing records');
      return response.json();
    },
  });
  
  // Filter records based on search
  const filteredRecords = borrowRecords?.filter((record: any) => {
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    const studentName = `${record.student?.firstName || ''} ${record.student?.lastName || ''}`.toLowerCase();
    return (
      studentName.includes(searchLower) ||
      record.student?.studentId?.toLowerCase().includes(searchLower) ||
      record.tablet?.brand?.toLowerCase().includes(searchLower) ||
      record.tablet?.model?.toLowerCase().includes(searchLower) ||
      record.tablet?.serialNumber?.toLowerCase().includes(searchLower)
    );
  });
  
  const handleReturn = (record: any) => {
    setSelectedBorrow(record);
    setIsReturnDialogOpen(true);
  };
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Process Returns</h1>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Return a Tablet</CardTitle>
              <CardDescription>
                Select a borrowed tablet to process its return
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-md shadow-sm mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search by student name, ID, tablet model, or serial number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {isLoading ? (
                <div className="py-10 flex justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              ) : filteredRecords && filteredRecords.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRecords.map((record: any) => (
                    <Card key={record.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="px-4 py-3 bg-orange-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">
                                {record.tablet?.brand} {record.tablet?.model}
                              </h3>
                              <p className="text-sm text-gray-500">Serial: {record.tablet?.serialNumber}</p>
                            </div>
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">
                              Borrowed
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-500">Student Information</p>
                            <p className="font-medium">
                              {record.student?.firstName} {record.student?.lastName}
                            </p>
                            <p className="text-sm text-gray-500">ID: {record.student?.studentId}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                            <div>
                              <p className="font-medium text-gray-500">Borrowed On</p>
                              <p>{format(new Date(record.dateBorrowed), "MMM d, yyyy")}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-500">Condition</p>
                              <p>{record.condition}</p>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => handleReturn(record)} 
                            className="w-full"
                          >
                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                            Process Return
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white border border-slate-200 rounded-md">
                  <p className="text-slate-500">
                    {search ? "No matching borrowings found." : "No active borrowings to return."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Return Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Tablet Return</DialogTitle>
          </DialogHeader>
          {selectedBorrow && (
            <ReturnForm 
              borrowRecord={selectedBorrow}
              onSuccess={() => {
                setIsReturnDialogOpen(false);
                // We don't need to clear selectedBorrow here as the form will refresh the data
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
