import { useQuery } from "@tanstack/react-query";
import { TabletWithBorrowInfo } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabletIcon, Clock } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";

interface TabletDetailProps {
  tablet: TabletWithBorrowInfo;
}

export function TabletDetail({ tablet }: TabletDetailProps) {
  const { data: tabletHistory, isLoading } = useQuery({
    queryKey: [`/api/tablets/${tablet.id}/history`],
  });

  // Format the accessories into a readable string
  const formatAccessories = () => {
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

  // Get the status badge color
  const getEventColor = (event: string) => {
    switch (event) {
      case "created":
        return "bg-blue-100 text-blue-800";
      case "borrowed":
        return "bg-orange-100 text-orange-800";
      case "returned":
        return "bg-green-100 text-green-800";
      case "lost":
        return "bg-red-100 text-red-800";
      case "status_change":
      case "condition_change":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <TabletIcon className="h-5 w-5 mr-2" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Brand</dt>
                <dd className="mt-1 text-sm text-gray-900">{tablet.brand}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Model</dt>
                <dd className="mt-1 text-sm text-gray-900">{tablet.model}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Color</dt>
                <dd className="mt-1 text-sm text-gray-900">{tablet.color || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <Badge className={getStatusColor(tablet.status)} variant="outline">
                    {tablet.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Condition</dt>
                <dd className="mt-1 text-sm text-gray-900">{tablet.condition}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Accessories</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatAccessories()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Identifiers</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{tablet.serialNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">IMEI</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{tablet.imei || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Current Location</dt>
                <dd className="mt-1 text-sm text-gray-900">
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
              {tablet.notes && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">{tablet.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Tablet history */}
      <div>
        <h3 className="text-lg font-medium mb-4">Tablet History</h3>
        
        {isLoading ? (
          <LoadingSpinner className="py-10" />
        ) : tabletHistory && tabletHistory.length > 0 ? (
          <ul className="space-y-4">
            {tabletHistory.map((event: any) => (
              <li key={event.id} className="bg-white shadow rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {event.eventType === "borrowed" && "Tablet borrowed"}
                        {event.eventType === "returned" && "Tablet returned"}
                        {event.eventType === "lost" && "Tablet reported lost"}
                        {event.eventType === "created" && "Tablet added to inventory"}
                        {event.eventType === "status_change" && "Status changed"}
                        {event.eventType === "condition_change" && "Condition changed"}
                      </p>
                      <Badge className={getEventColor(event.eventType)} variant="outline">
                        {event.eventType.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {format(new Date(event.date), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {event.student && (
                      <p className="mt-2 text-sm text-gray-700">
                        Student: <strong>{event.student.name}</strong> ({event.student.studentId})
                      </p>
                    )}
                    {event.condition && (
                      <p className="text-sm text-gray-700">
                        Condition: <strong>{event.condition}</strong>
                      </p>
                    )}
                    {event.notes && (
                      <p className="mt-2 text-sm text-gray-700">
                        Notes: {event.notes}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center py-10 text-gray-500">No history records found for this tablet.</p>
        )}
      </div>
    </div>
  );
}
