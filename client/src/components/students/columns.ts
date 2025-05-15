
import { ColumnDef } from "@tanstack/react-table";
import { Student } from "@/lib/types";

export const columns: ColumnDef<Student>[] = [
  {
    accessorKey: "studentId",
    header: "Student ID",
  },
  {
    accessorKey: "fullName",
    header: "Name",
  },
  {
    accessorKey: "programCode",
    header: "Course",
  },
  {
    accessorKey: "yearLevel",
    header: "Year Level",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "mobileNo",
    header: "Mobile",
  }
];
