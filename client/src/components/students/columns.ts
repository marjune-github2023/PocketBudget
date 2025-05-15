
import { ColumnDef } from "@tanstack/react-table";
import { Student } from "@/lib/types";

export const columns: ColumnDef<Student>[] = [
  {
    accessorKey: "studentId",
    header: "Student ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "studentType",
    header: "Type",
  },
  {
    accessorKey: "dateRegistered",
    header: "Registration Date",
  }
];
