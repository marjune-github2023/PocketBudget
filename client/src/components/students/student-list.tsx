
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Student } from "@/lib/types";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";

export function StudentList() {
  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await fetch("/api/students");
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    },
  });

  return (
    <div className="space-y-4">
      <DataTable 
        columns={columns} 
        data={students || []} 
        isLoading={isLoading}
      />
    </div>
  );
}
