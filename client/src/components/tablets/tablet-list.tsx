import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TabletWithBorrowInfo } from "@shared/schema";
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
import { Edit, MoreHorizontal, Tablet, History, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TabletDetail } from "./tablet-detail";
import { LostTabletForm } from "./lost-tablet-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TabletForm } from "./tablet-form";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function TabletList() {
  const { toast } = useToast();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [currentTablet, setCurrentTablet] = useState<TabletWithBorrowInfo | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  
  const { data: tablets, isLoading, error } = useQuery({
    queryKey: ['/api/tablets'],
  });

  if (isLoading) {
    return <LoadingSpinner className="py-10" size="lg" />;
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium">Error loading tablets</h3>
        <p className="text-gray-500">
          There was a problem fetching the tablet data. Please try again.
        </p>
      </div>
    );
  }

  // Format the accessories into a readable string
  const formatAccessories = (tablet: TabletWithBorrowInfo) => {
    const accessories = [];
    if (tablet.hasCharger) accessories.push("Charger");
    if (tablet.hasCable) accessories.push("Cable");
    if (tablet.hasBox) accessories.push("Box");
    return accessories.length ? accessories.join(", ") : "None";
  };

  // Get the status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Serviceable":
        return "bg-green-100 text-green-800";
      case "Unserviceable":
        return "bg-amber-100 text-amber-800";
      case "Lost":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle tablet actions
  const handleViewDetails = (tablet: TabletWithBorrowInfo) => {
    setCurrentTablet(tablet);
    setShowDetailDialog(true);
  };

  const handleEditTablet = (tablet: TabletWithBorrowInfo) => {
    setCurrentTablet(tablet);
    setShowEditDialog(true);
  };

  const handleReportLost = (tablet: TabletWithBorrowInfo) => {
    if (tablet.status === "Lost") {
      toast({
        title: "Already reported as lost",
        description: "This tablet has already been marked as lost.",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentTablet(tablet);
    setShowLostDialog(true);
  };

  // Define columns for the data table
  const columns: ColumnDef<TabletWithBorrowInfo>[] = [
    {
      accessorKey: "brand",
      header: "Device",
      cell: ({ row }) => {
        const tablet = row.original;
        return (
          <div>
            <div className="font-medium">{`${tablet.brand} ${tablet.model}`}</div>
            <div className="text-sm text-gray-500">{tablet.color}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "serialNumber",
      header: "Serial / IMEI",
      cell: ({ row }) => {
        const tablet = row.original;
        return (
          <div>
            <div className="text-sm">{tablet.serialNumber}</div>
            {tablet.imei && <div className="text-xs text-gray-500">{tablet.imei}</div>}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge className={getStatusColor(status)} variant="outline">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "currentBorrower",
      header: "Current Location",
      cell: ({ row }) => {
        const tablet = row.original;
        if (tablet.currentBorrower) {
          return (
            <div className="text-sm">
              With{" "}
              <span className="font-medium">
                {tablet.currentBorrower.studentName}
              </span>
              <div className="text-xs text-gray-500">
                Since {format(new Date(tablet.currentBorrower.dateBorrowed), "MMM d, yyyy")}
              </div>
            </div>
          );
        }
        return <div className="text-sm text-gray-500">In storage</div>;
      },
    },
    {
      accessorKey: "accessories",
      header: "Accessories",
      cell: ({ row }) => (
        <div className="text-sm text-gray-500">
          {formatAccessories(row.original)}
        </div>
      ),
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
            <DropdownMenuItem onClick={() => handleViewDetails(row.original)}>
              <Tablet className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditTablet(row.original)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleReportLost(row.original)}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report Lost
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      {/* View toggle */}
      <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")} className="w-full">
        <TabsList className="grid w-[200px] grid-cols-2 mb-4">
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        {/* Grid View */}
        <TabsContent value="grid" className="mt-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tablets.map((tablet: TabletWithBorrowInfo) => (
            <div key={tablet.id} className="bg-white overflow-hidden shadow rounded-lg divide-y divide-slate-200">
              <div className="px-4 py-5 sm:px-6 flex justify-between">
                <h3 className="text-lg font-medium text-slate-900">
                  {tablet.brand} {tablet.model}
                </h3>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(tablet.status)}`}>
                  {tablet.status}
                </span>
              </div>
              <div className="px-4 py-4 sm:px-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-slate-500">Serial Number</dt>
                    <dd className="mt-1 text-sm text-slate-900">{tablet.serialNumber}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-slate-500">IMEI</dt>
                    <dd className="mt-1 text-sm text-slate-900">{tablet.imei || "N/A"}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-slate-500">Color</dt>
                    <dd className="mt-1 text-sm text-slate-900">{tablet.color || "N/A"}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-slate-500">Accessories</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {formatAccessories(tablet)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-slate-500">Status</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {tablet.currentBorrower ? (
                        <>
                          Currently with{" "}
                          <span className="font-medium">
                            {tablet.currentBorrower.studentName}
                          </span>{" "}
                          (borrowed on {format(new Date(tablet.currentBorrower.dateBorrowed), "MMM d, yyyy")})
                        </>
                      ) : (
                        "In storage"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="px-4 py-4 sm:px-6 bg-slate-50">
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(tablet)}
                  >
                    <History className="h-4 w-4 mr-1" /> History
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTablet(tablet)}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-0">
          <DataTable
            columns={columns}
            data={tablets}
            searchPlaceholder="Search tablets by serial number, model, or status..."
            searchColumn="serialNumber"
          />
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tablet Details</DialogTitle>
          </DialogHeader>
          {currentTablet && <TabletDetail tablet={currentTablet} />}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tablet</DialogTitle>
          </DialogHeader>
          {currentTablet && (
            <TabletForm 
              defaultValues={currentTablet} 
              isEdit={true} 
              tabletId={currentTablet.id}
              onSuccess={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Lost Tablet Dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Tablet as Lost</DialogTitle>
          </DialogHeader>
          {currentTablet && (
            <LostTabletForm 
              tablet={currentTablet} 
              onSuccess={() => setShowLostDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
