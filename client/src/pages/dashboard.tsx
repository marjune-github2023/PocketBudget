import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tablet, 
  Users, 
  HandHelping, 
  AlertTriangle, 
  ChevronRight,
  Clock,
  Plus,
  FileCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { Separator } from "@/components/ui/separator";

export default function Dashboard() {
  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });
  
  // Fetch recent activity
  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['/api/dashboard/recent-activity'],
  });
  
  // Get event badge color
  const getEventColor = (eventType: string) => {
    switch (eventType) {
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
  
  // Get event title
  const getEventTitle = (event: any) => {
    switch (event.eventType) {
      case "borrowed":
        return `${event.tablet.brand} ${event.tablet.model} borrowed by ${event.student?.name || 'Unknown'}`;
      case "returned":
        return `${event.tablet.brand} ${event.tablet.model} returned by ${event.student?.name || 'Unknown'}`;
      case "lost":
        return `${event.tablet.brand} ${event.tablet.model} reported as lost`;
      case "created":
        return `New tablet added to inventory: ${event.tablet.brand} ${event.tablet.model}`;
      case "status_change":
        return `${event.tablet.brand} ${event.tablet.model} status changed`;
      case "condition_change":
        return `${event.tablet.brand} ${event.tablet.model} condition updated`;
      default:
        return `Event: ${event.eventType}`;
    }
  };
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Stats Cards */}
          {isLoadingStats ? (
            <div className="h-48 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Tablets Card */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 rounded-md p-3 bg-primary-100">
                      <Tablet className="text-primary-600 h-6 w-6" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-500 truncate">Total Tablets</dt>
                        <dd>
                          <div className="text-lg font-semibold text-slate-900">{stats.totalTablets}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
                <div className="bg-slate-50 px-5 py-3">
                  <div className="text-sm">
                    <Link href="/tablets" className="font-medium text-primary-600 hover:text-primary-700">
                      View all tablets
                    </Link>
                  </div>
                </div>
              </Card>
              
              {/* Students Count Card */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 rounded-md p-3 bg-blue-100">
                      <Users className="text-blue-600 h-6 w-6" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-500 truncate">Total Students</dt>
                        <dd>
                          <div className="text-lg font-semibold text-slate-900">{stats.totalStudents}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
                <div className="bg-slate-50 px-5 py-3">
                  <div className="text-sm">
                    <Link href="/students" className="font-medium text-primary-600 hover:text-primary-700">
                      View all students
                    </Link>
                  </div>
                </div>
              </Card>
              
              {/* Borrowed Tablets Card */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 rounded-md p-3 bg-green-100">
                      <HandHelping className="text-green-600 h-6 w-6" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-500 truncate">Currently Borrowed</dt>
                        <dd>
                          <div className="text-lg font-semibold text-slate-900">{stats.borrowedTablets}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
                <div className="bg-slate-50 px-5 py-3">
                  <div className="text-sm">
                    <Link href="/borrowing" className="font-medium text-primary-600 hover:text-primary-700">
                      View borrowing records
                    </Link>
                  </div>
                </div>
              </Card>
              
              {/* Lost Tablets Card */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 rounded-md p-3 bg-amber-100">
                      <AlertTriangle className="text-amber-600 h-6 w-6" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-500 truncate">Lost Tablets</dt>
                        <dd>
                          <div className="text-lg font-semibold text-slate-900">{stats.lostTablets}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
                <div className="bg-slate-50 px-5 py-3">
                  <div className="text-sm">
                    <Link href="/reports" className="font-medium text-primary-600 hover:text-primary-700">
                      View reports
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          )}
          
          {/* Recent Activity */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-slate-900">Recent Activity</h2>
              <Link href="/reports">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            
            <Card>
              {isLoadingActivity ? (
                <div className="h-64 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : recentActivity && recentActivity.length > 0 ? (
                <ul className="divide-y divide-slate-200">
                  {recentActivity.map((activity: any) => (
                    <li key={activity.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-primary-600 truncate">
                            {getEventTitle(activity)}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <Badge className={getEventColor(activity.eventType)}>
                              {activity.eventType.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-slate-500">
                              <Tablet className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                              {activity.tablet?.brand} {activity.tablet?.model}
                            </p>
                            {activity.student && (
                              <p className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0 sm:ml-6">
                                <Users className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                                {activity.student.name}
                              </p>
                            )}
                          </div>
                          <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                            <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                            <p>
                              {format(parseISO(activity.date), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500">No recent activity found.</p>
                </div>
              )}
            </Card>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-slate-900">Register New Tablet</h3>
                <div className="mt-2 max-w-xl text-sm text-slate-500">
                  <p>Add a new tablet to the inventory system.</p>
                </div>
                <div className="mt-5">
                  <Link href="/tablets">
                    <Button className="inline-flex items-center">
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Add Tablet
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-slate-900">Add Student</h3>
                <div className="mt-2 max-w-xl text-sm text-slate-500">
                  <p>Register a new student in the system.</p>
                </div>
                <div className="mt-5">
                  <Link href="/students">
                    <Button className="inline-flex items-center">
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Add Student
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-slate-900">Process Transaction</h3>
                <div className="mt-2 max-w-xl text-sm text-slate-500">
                  <p>Borrow or return a tablet.</p>
                </div>
                <div className="mt-5 flex space-x-3">
                  <Link href="/borrowing">
                    <Button className="inline-flex items-center">
                      <HandHelping className="-ml-1 mr-2 h-5 w-5" />
                      Borrow
                    </Button>
                  </Link>
                  <Link href="/returns">
                    <Button variant="outline" className="inline-flex items-center">
                      <FileCheck className="-ml-1 mr-2 h-5 w-5" />
                      Return
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
