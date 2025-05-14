import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tablet, BorrowRecord, LostReport } from "@shared/schema";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  FilePieChart, 
  Download, 
  FileText, 
  Clock, 
  Tablet as TabletIcon,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, subMonths } from "date-fns";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { exportToCSV } from "@/lib/csv";

export default function Reports() {
  const [tabletStatus, setTabletStatus] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<string>("30days");
  const [activeTab, setActiveTab] = useState<string>("tablets");
  
  // Get date range based on selected time period
  const getDateRange = () => {
    const today = new Date();
    let startDate;
    
    switch (timePeriod) {
      case "7days":
        startDate = subDays(today, 7);
        break;
      case "30days":
        startDate = subDays(today, 30);
        break;
      case "90days":
        startDate = subDays(today, 90);
        break;
      case "6months":
        startDate = subMonths(today, 6);
        break;
      case "1year":
        startDate = subMonths(today, 12);
        break;
      default:
        startDate = subDays(today, 30);
    }
    
    return { startDate, endDate: today };
  };
  
  // Fetch tablets
  const { data: tablets, isLoading: isLoadingTablets } = useQuery({
    queryKey: ['/api/tablets'],
  });
  
  // Fetch all borrow records
  const { data: borrowRecords, isLoading: isLoadingBorrowRecords } = useQuery({
    queryKey: ['/api/borrow-records'],
  });
  
  // Fetch lost reports
  const { data: lostReports, isLoading: isLoadingLostReports } = useQuery({
    queryKey: ['/api/lost-reports'],
  });
  
  // Filter tablets based on status
  const filteredTablets = tablets?.filter((tablet: Tablet) => {
    if (tabletStatus === "all") return true;
    return tablet.status === tabletStatus;
  });
  
  // Filter borrow records based on time period
  const filteredBorrowRecords = borrowRecords?.filter((record: BorrowRecord) => {
    const { startDate } = getDateRange();
    const recordDate = new Date(record.dateBorrowed);
    return recordDate >= startDate;
  });
  
  // Filter lost reports based on time period
  const filteredLostReports = lostReports?.filter((report: LostReport) => {
    const { startDate } = getDateRange();
    const reportDate = new Date(report.dateReported);
    return reportDate >= startDate;
  });
  
  // Prepare tablet inventory stats
  const getTabletStats = () => {
    if (!tablets) return { total: 0, serviceable: 0, unserviceable: 0, lost: 0, borrowed: 0 };
    
    const stats = {
      total: tablets.length,
      serviceable: tablets.filter(t => t.status === 'Serviceable').length,
      unserviceable: tablets.filter(t => t.status === 'Unserviceable').length,
      lost: tablets.filter(t => t.status === 'Lost').length,
      borrowed: 0
    };
    
    // Calculate currently borrowed tablets
    if (borrowRecords) {
      stats.borrowed = borrowRecords.filter(r => !r.isReturned).length;
    }
    
    return stats;
  };
  
  // Prepare tablet activity stats
  const getActivityStats = () => {
    const { startDate, endDate } = getDateRange();
    
    if (!borrowRecords) {
      return { borrowings: 0, returns: 0, lost: 0, avgBorrowTime: 0 };
    }
    
    const periodBorrowings = borrowRecords.filter(r => {
      const date = new Date(r.dateBorrowed);
      return date >= startDate && date <= endDate;
    });
    
    const periodReturns = borrowRecords.filter(r => {
      if (!r.isReturned || !r.returnDate) return false;
      const date = new Date(r.returnDate);
      return date >= startDate && date <= endDate;
    });
    
    const periodLost = lostReports?.filter(r => {
      const date = new Date(r.dateReported);
      return date >= startDate && date <= endDate;
    }) || [];
    
    // Calculate average borrow time for returned items
    let totalBorrowDays = 0;
    let returnCount = 0;
    
    periodReturns.forEach(record => {
      if (record.returnDate && record.dateBorrowed) {
        const borrowDate = new Date(record.dateBorrowed);
        const returnDate = new Date(record.returnDate);
        const days = Math.round((returnDate.getTime() - borrowDate.getTime()) / (1000 * 60 * 60 * 24));
        totalBorrowDays += days;
        returnCount++;
      }
    });
    
    const avgBorrowTime = returnCount > 0 ? Math.round(totalBorrowDays / returnCount) : 0;
    
    return {
      borrowings: periodBorrowings.length,
      returns: periodReturns.length,
      lost: periodLost.length,
      avgBorrowTime
    };
  };
  
  // Define columns for Tablets table
  const tabletColumns: ColumnDef<any>[] = [
    {
      accessorKey: "serialNumber",
      header: "Serial Number",
    },
    {
      accessorKey: "model",
      header: "Model",
      cell: ({ row }) => {
        return `${row.original.brand} ${row.original.model}`;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        let badgeClass = "";
        
        switch (status) {
          case "Serviceable":
            badgeClass = "bg-green-100 text-green-800";
            break;
          case "Unserviceable":
            badgeClass = "bg-amber-100 text-amber-800";
            break;
          case "Lost":
            badgeClass = "bg-red-100 text-red-800";
            break;
          default:
            badgeClass = "bg-gray-100 text-gray-800";
        }
        
        return (
          <Badge className={badgeClass} variant="outline">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "condition",
      header: "Condition",
    },
    {
      accessorKey: "currentBorrower",
      header: "Current Status",
      cell: ({ row }) => {
        const tablet = row.original;
        if (tablet.currentBorrower) {
          return (
            <span>
              Borrowed by {tablet.currentBorrower.studentName}
            </span>
          );
        } else if (tablet.status === "Lost") {
          return <span className="text-red-600">Lost</span>;
        } else if (tablet.status === "Unserviceable") {
          return <span className="text-amber-600">Maintenance needed</span>;
        } else {
          return <span className="text-green-600">Available</span>;
        }
      },
    },
  ];
  
  // Define columns for Borrowings table
  const borrowingColumns: ColumnDef<any>[] = [
    {
      accessorKey: "tablet",
      header: "Tablet",
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div>
            <div className="font-medium">{record.tablet.brand} {record.tablet.model}</div>
            <div className="text-sm text-gray-500">SN: {record.tablet.serialNumber}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "student",
      header: "Student",
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div>
            <div className="font-medium">{record.student.name}</div>
            <div className="text-sm text-gray-500">ID: {record.student.studentId}</div>
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
      accessorKey: "returnDate",
      header: "Returned On",
      cell: ({ row }) => {
        const record = row.original;
        return record.isReturned && record.returnDate
          ? format(new Date(record.returnDate), "MMM d, yyyy")
          : "Not returned";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const record = row.original;
        return (
          <Badge
            className={record.isReturned ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
          >
            {record.isReturned ? "Returned" : "Borrowed"}
          </Badge>
        );
      },
    },
  ];
  
  // Define columns for Lost Tablets table
  const lostColumns: ColumnDef<any>[] = [
    {
      accessorKey: "tabletId",
      header: "Tablet",
      cell: ({ row }) => {
        const tablet = tablets?.find(t => t.id === row.original.tabletId);
        return tablet ? (
          <div>
            <div className="font-medium">{tablet.brand} {tablet.model}</div>
            <div className="text-sm text-gray-500">SN: {tablet.serialNumber}</div>
          </div>
        ) : (
          "Unknown Tablet"
        );
      },
    },
    {
      accessorKey: "studentId",
      header: "Reported By",
      cell: ({ row }) => {
        const students = borrowRecords?.map(r => r.student);
        const student = students?.find(s => s.id === row.original.studentId);
        return student ? (
          <div>
            <div className="font-medium">{student.name}</div>
            <div className="text-sm text-gray-500">ID: {student.studentId}</div>
          </div>
        ) : (
          "Unknown Student"
        );
      },
    },
    {
      accessorKey: "dateReported",
      header: "Date Reported",
      cell: ({ row }) => format(new Date(row.original.dateReported), "MMM d, yyyy"),
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => row.original.details || "No details provided",
    },
  ];
  
  // Handle export to CSV
  const handleExportTablets = () => {
    if (!filteredTablets) return;
    
    const data = filteredTablets.map(tablet => ({
      "Serial Number": tablet.serialNumber,
      "IMEI": tablet.imei || "",
      "Brand": tablet.brand,
      "Model": tablet.model,
      "Color": tablet.color || "",
      "Status": tablet.status,
      "Condition": tablet.condition,
      "Has Charger": tablet.hasCharger ? "Yes" : "No",
      "Has Cable": tablet.hasCable ? "Yes" : "No",
      "Has Box": tablet.hasBox ? "Yes" : "No",
      "Notes": tablet.notes || ""
    }));
    
    exportToCSV(data, `tablet-inventory-${format(new Date(), "yyyy-MM-dd")}`);
  };
  
  const handleExportBorrowings = () => {
    if (!filteredBorrowRecords) return;
    
    const data = filteredBorrowRecords.map(record => {
      // Parse accessories from JSON if needed
      let accessories = { charger: false, cable: false, box: false };
      if (record.accessories) {
        if (typeof record.accessories === 'string') {
          try {
            accessories = JSON.parse(record.accessories);
          } catch (e) {
            console.error("Error parsing accessories JSON:", e);
          }
        } else {
          accessories = record.accessories;
        }
      }
      
      return {
        "Student Name": record.student.name,
        "Student ID": record.student.studentId,
        "Tablet Brand": record.tablet.brand,
        "Tablet Model": record.tablet.model,
        "Serial Number": record.tablet.serialNumber,
        "Date Borrowed": format(new Date(record.dateBorrowed), "yyyy-MM-dd"),
        "Expected Return Date": record.expectedReturnDate 
          ? format(new Date(record.expectedReturnDate), "yyyy-MM-dd") 
          : "",
        "Return Date": record.returnDate 
          ? format(new Date(record.returnDate), "yyyy-MM-dd") 
          : "",
        "Status": record.isReturned ? "Returned" : "Borrowed",
        "Borrowing Condition": record.condition,
        "Return Condition": record.returnCondition || "",
        "Charger": accessories.charger ? "Yes" : "No",
        "Cable": accessories.cable ? "Yes" : "No",
        "Box": accessories.box ? "Yes" : "No",
        "Notes": record.notes || ""
      };
    });
    
    exportToCSV(data, `borrowing-records-${format(new Date(), "yyyy-MM-dd")}`);
  };
  
  const handleExportLostTablets = () => {
    if (!filteredLostReports || !tablets || !borrowRecords) return;
    
    const data = filteredLostReports.map(report => {
      // Find tablet and student details
      const tablet = tablets.find(t => t.id === report.tabletId);
      const students = borrowRecords.map(r => r.student);
      const student = students.find(s => s.id === report.studentId);
      
      return {
        "Tablet Brand": tablet?.brand || "Unknown",
        "Tablet Model": tablet?.model || "Unknown",
        "Serial Number": tablet?.serialNumber || "Unknown",
        "Student Name": student?.name || "Unknown",
        "Student ID": student?.studentId || "Unknown",
        "Date Reported": format(new Date(report.dateReported), "yyyy-MM-dd"),
        "Details": report.details || ""
      };
    });
    
    exportToCSV(data, `lost-tablets-${format(new Date(), "yyyy-MM-dd")}`);
  };
  
  // Show loading state when data is being fetched
  if (isLoadingTablets || isLoadingBorrowRecords || isLoadingLostReports) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <div className="py-10 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }
  
  const tabletStats = getTabletStats();
  const activityStats = getActivityStats();
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Tablet Inventory Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
            <Card className="bg-white shadow overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Total Tablets</div>
                  <div className="mt-1 text-3xl font-semibold text-slate-900">{tabletStats.total}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <TabletIcon className="text-blue-600 h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Serviceable</div>
                  <div className="mt-1 text-3xl font-semibold text-green-600">{tabletStats.serviceable}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Currently Borrowed</div>
                  <div className="mt-1 text-3xl font-semibold text-orange-600">{tabletStats.borrowed}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Users className="text-orange-600 h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Unserviceable</div>
                  <div className="mt-1 text-3xl font-semibold text-amber-600">{tabletStats.unserviceable}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Lost</div>
                  <div className="mt-1 text-3xl font-semibold text-red-600">{tabletStats.lost}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="text-red-600 h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Time period selection */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h2 className="text-lg font-medium text-slate-900 mr-4">Activity Report</h2>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="6months">Last 6 months</SelectItem>
                  <SelectItem value="1year">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Activity Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="bg-white overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">New Borrowings</div>
                  <div className="mt-1 text-3xl font-semibold text-blue-600">{activityStats.borrowings}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Returns</div>
                  <div className="mt-1 text-3xl font-semibold text-green-600">{activityStats.returns}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Lost Tablets</div>
                  <div className="mt-1 text-3xl font-semibold text-red-600">{activityStats.lost}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="text-red-600 h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Avg. Borrow Time</div>
                  <div className="mt-1 text-3xl font-semibold text-purple-600">
                    {activityStats.avgBorrowTime} <span className="text-base font-normal">days</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="text-purple-600 h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Data Tabs */}
          <Tabs defaultValue="tablets" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="tablets">Tablet Inventory</TabsTrigger>
                <TabsTrigger value="borrowings">Borrowing Records</TabsTrigger>
                <TabsTrigger value="lost">Lost Tablets</TabsTrigger>
              </TabsList>
              
              <div>
                {activeTab === "tablets" && (
                  <div className="flex items-center space-x-3">
                    <Select value={tabletStatus} onValueChange={setTabletStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Serviceable">Serviceable</SelectItem>
                        <SelectItem value="Unserviceable">Unserviceable</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="outline" 
                      onClick={handleExportTablets}
                      className="flex items-center"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                )}
                
                {activeTab === "borrowings" && (
                  <Button 
                    variant="outline" 
                    onClick={handleExportBorrowings}
                    className="flex items-center"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                )}
                
                {activeTab === "lost" && (
                  <Button 
                    variant="outline" 
                    onClick={handleExportLostTablets}
                    className="flex items-center"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>
            
            <TabsContent value="tablets" className="mt-0">
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg flex items-center">
                    <TabletIcon className="mr-2 h-5 w-5" />
                    Tablet Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={tabletColumns}
                    data={filteredTablets || []}
                    searchPlaceholder="Search tablets by serial number or model..."
                    searchColumn="serialNumber"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="borrowings" className="mt-0">
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Borrowing Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={borrowingColumns}
                    data={filteredBorrowRecords || []}
                    searchPlaceholder="Search borrowings by student or tablet..."
                    searchColumn="student.name"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="lost" className="mt-0">
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Lost Tablets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredLostReports && filteredLostReports.length > 0 ? (
                    <DataTable
                      columns={lostColumns}
                      data={filteredLostReports}
                      searchPlaceholder="Search lost tablets..."
                    />
                  ) : (
                    <div className="text-center py-10">
                      <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No lost tablets reported</h3>
                      <p className="text-gray-500 mt-2">
                        There are no lost tablets reported in the selected time period.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
