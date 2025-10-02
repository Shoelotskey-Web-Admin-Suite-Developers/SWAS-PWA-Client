// utils/exportCSV.ts
import type { CustomerRow } from "@/pages/database-view/CustomerInformation"

export async function exportCSV(rows: CustomerRow[], fileName = "customers.csv"): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!rows || rows.length === 0) {
      reject(new Error("No rows to export"));
      return;
    }

    try {
      const header = Object.keys(rows[0]).join(",");
      const csv = [
        header,
        ...rows.map((r) =>
          Object.values(r)
            .map((v) => `"${v?.toString().replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\r\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      resolve();
    } catch (err) {
      reject(err);
    }
  });
}
