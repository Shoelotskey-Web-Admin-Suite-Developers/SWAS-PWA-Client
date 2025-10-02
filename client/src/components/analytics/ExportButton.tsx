"use client"

import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Download, FileText, FileSpreadsheet } from "lucide-react"
import { getBranchType } from '@/utils/api/getBranchType'
import { getPairedRevenueDataDynamic } from '@/utils/api/getPairedRevenueDataDynamic'
import { getDailyRevenueDynamic } from '@/utils/api/getDailyRevenueDynamic'
import { getMonthlyRevenueDynamic } from '@/utils/api/getMonthlyRevenueDynamic'
import { getBranches } from '@/utils/api/getBranches'
import { buildBranchMeta, buildTotalMeta, BranchMeta } from '@/utils/analytics/branchMeta'
import { format } from "date-fns"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useState } from 'react'
import { Loader2 } from "lucide-react"


type ExportType = 'excel' | 'report'

export function ExportButton() {
  const [isExporting, setIsExporting] = useState<ExportType | null>(null)

  // Helper function to get branch info using API like analytics component
  const getBranchInfo = async () => {
    try {
      const branchId = sessionStorage.getItem('branch_id')
      console.log('Export: Raw branch_id from sessionStorage:', branchId)
      
      if (!branchId) {
        console.log('Export: No branch_id found in sessionStorage')
        return null
      }

      // Use getBranchType API like analytics component
      const branchType = await getBranchType(branchId)
      console.log('Export: Branch type from API:', branchType)
      
      // Parse session storage for additional branch info
      let branchData
      try {
        branchData = JSON.parse(branchId)
        console.log('Export: Parsed branch data:', branchData)
      } catch {
        // If it's just a string ID, create minimal object
        branchData = { id: branchId }
        console.log('Export: Using fallback branch data:', branchData)
      }
      
      const result = {
        branchType,
        branchId: branchData.id || branchId,
        branchName: branchData.name || branchData.branch_name || branchData.branch_id || 'Branch'
      }
      console.log('Export: Final branch info:', result)
      
      return result
    } catch (error) {
      console.error('Error getting branch info:', error)
      return null
    }
  }

  // NEW helper: build dynamic meta
  const buildMeta = async (): Promise<BranchMeta[]> => {
    try {
      const branches = await getBranches();
      const filtered = branches.filter((b:any)=> b.type === 'B');
      const meta = buildBranchMeta(filtered);
  return [...meta, buildTotalMeta()];
    } catch (e) {
      console.error('Export: failed to load branches, falling back to total only');
  return [buildTotalMeta()];
    }
  }

  const exportToExcel = async () => {
    try {
      setIsExporting('excel')
      const branchInfo = await getBranchInfo();
      const isSuper = !branchInfo || branchInfo.branchType === 'A';
      const meta = await buildMeta();
      const [dailyRaw, monthlyRaw, pairedRaw] = await Promise.all([
        getDailyRevenueDynamic(meta),
        getMonthlyRevenueDynamic(meta),
        getPairedRevenueDataDynamic(meta)
      ]);
      const filterDynamicData = (data: any[], bInfo: any) => {
        if (!bInfo || bInfo.branchType === 'A') return data;
        const target = meta.find(m => m.branch_id !== 'TOTAL' && (bInfo.branchId && m.branch_id.toUpperCase().includes(bInfo.branchId.toUpperCase())) )
          || meta.find(m => m.branch_id !== 'TOTAL' && (bInfo.branchName && m.branch_name.toUpperCase().includes(bInfo.branchName.toUpperCase())));
        if (!target) return data.map(r=> ({ date: r.date || r.month, month: r.month, total: r.total }));
        return data.map(r => {
          const base:any = { date: r.date || r.month };
          if (r.month) base.month = r.month;
          base[target.dataKey] = r[target.dataKey] ?? 0;
          if (r[target.forecastKey] != null) base[target.forecastKey] = r[target.forecastKey];
          base.total = r[target.dataKey] ?? 0;
          return base;
        });
      };
      const salesOverTimeData = filterDynamicData(dailyRaw, branchInfo);
      const monthlyGrowthData = filterDynamicData(monthlyRaw, branchInfo);
      const forecastData = filterDynamicData(pairedRaw, branchInfo);

      // Compute daily averages
      const validDailyData = salesOverTimeData.filter((item:any) => item.total && item.total > 0);
      const totalRevenue = validDailyData.reduce((sum:number, item:any) => sum + (item.total || 0), 0)
      const dailyAverage = validDailyData.length > 0 ? totalRevenue / validDailyData.length : 0

      // Dynamic branch averages
      const branchAverages: Record<string, number> = {};
      meta.filter(m=> m.branch_id !== 'TOTAL').forEach(m => {
        branchAverages[m.dataKey] = validDailyData.reduce((s:number,row:any)=> s + (row[m.dataKey]||0),0) / (validDailyData.length || 1);
      });

      // Sheet 1: Sales Over Time with Daily Performance (dynamic)
      const salesData = salesOverTimeData.map((item:any) => {
        const dailyTotal = item.total || 0;
        const vsAverage = dailyTotal > 0 && dailyAverage > 0 ? ((dailyTotal - dailyAverage) / dailyAverage * 100) : 0;
        const performance = dailyTotal >= dailyAverage * 1.1 ? 'Above Average' : dailyTotal >= dailyAverage * 0.9 ? 'Average' : 'Below Average';
        if (isSuper) {
          const base: any = { 'Date': item.date, 'Total Daily Revenue': Number(dailyTotal.toFixed(0)) };
          meta.filter(m=> m.branch_id !== 'TOTAL').forEach(m => {
            base[m.branch_name] = Number((item[m.dataKey]||0).toFixed(0));
            const avg = branchAverages[m.dataKey] || 0;
            base[`${m.branch_name} vs Avg`] = avg > 0 && item[m.dataKey] ? (((item[m.dataKey]-avg)/avg)*100).toFixed(2)+'%' : '0%';
          });
          base['Daily Average'] = Number(dailyAverage.toFixed(0));
          base['Vs Daily Average'] = vsAverage.toFixed(2)+'%';
          base['Performance'] = performance;
          return base;
        } else {
          const targetMeta = meta.find(m=> m.branch_id !== 'TOTAL' && item[m.dataKey] != null);
            const val = targetMeta ? item[targetMeta.dataKey] || 0 : dailyTotal;
            const avg = targetMeta ? branchAverages[targetMeta.dataKey] : dailyAverage;
            return {
              'Date': item.date,
              [targetMeta?.branch_name || 'Branch Revenue']: Number(val.toFixed?.(0) || val),
              'vs Average': (avg>0 && val>0) ? (((val-avg)/avg)*100).toFixed(2)+'%' : '0%',
              'Performance': performance
            };
        }
      });

      const workbook = XLSX.utils.book_new();
      const salesWorksheet = XLSX.utils.json_to_sheet(salesData);
      const salesRange = XLSX.utils.decode_range(salesWorksheet['!ref'] || 'A1');
      // Column widths
      if (isSuper) {
        const widthArray = [12]; // Date
        meta.filter(m=> m.branch_id !== 'TOTAL').forEach(()=> { widthArray.push(15); widthArray.push(12); });
        widthArray.push(18,15,15,15); // Total, Daily Avg, Vs Avg, Performance
        salesWorksheet['!cols'] = widthArray.map(w => ({ width: w }));
      } else {
        salesWorksheet['!cols'] = [ { width: 15 }, { width: 25 }, { width: 15 }, { width: 15 } ];
      }
      // Header styling
      for (let col = salesRange.s.c; col <= salesRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        if (!salesWorksheet[cellAddress]) continue
        salesWorksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, size: 12 },
          fill: { fgColor: { rgb: 'CE1616' } },
          border: { top:{style:'thick',color:{rgb:'000000'}}, bottom:{style:'thick',color:{rgb:'000000'}}, left:{style:'thick',color:{rgb:'000000'}}, right:{style:'thick',color:{rgb:'000000'}} },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // Data styling
      for (let row = 1; row <= salesRange.e.r; row++) {
        for (let col = salesRange.s.c; col <= salesRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!salesWorksheet[cellAddress]) continue;
          if (!salesWorksheet[cellAddress].s) salesWorksheet[cellAddress].s = {};
          const isEvenRow = row % 2 === 0;
          const performanceCol = isSuper ? salesRange.e.c : 3; // Last column for super includes Performance
          if (isEvenRow && col !== performanceCol) salesWorksheet[cellAddress].s.fill = { fgColor: { rgb: 'F9FAFB' } };
          salesWorksheet[cellAddress].s.border = { top:{style:'thin',color:{rgb:'E5E7EB'}}, bottom:{style:'thin',color:{rgb:'E5E7EB'}}, left:{style:'thin',color:{rgb:'E5E7EB'}}, right:{style:'thin',color:{rgb:'E5E7EB'}} };
          // Revenue columns: detect by header text pattern
          const header = XLSX.utils.encode_cell({ r:0, c:col });
          const headerVal = salesWorksheet[header]?.v as string;
          if (/Total Daily Revenue|Daily Average|vs Avg|Revenue$/.test(headerVal) || meta.some(m=> m.branch_name === headerVal)) {
            if (!/vs Avg/.test(headerVal) && !/Average/.test(headerVal)) {
              salesWorksheet[cellAddress].s.numFmt = '"PHP "#,##0';
            } else {
              salesWorksheet[cellAddress].s.alignment = { horizontal: 'center' };
            }
          }
          if (col === performanceCol) {
            const value = salesWorksheet[cellAddress].v;
            if (value === 'Above Average') {
              salesWorksheet[cellAddress].s.fill = { fgColor: { rgb: 'DCFCE7' } };
              salesWorksheet[cellAddress].s.font = { color: { rgb: '166534' }, bold: true };
              salesWorksheet[cellAddress].s.border = { ...salesWorksheet[cellAddress].s.border, left:{style:'thick',color:{rgb:'22C55E'}} };
            } else if (value === 'Below Average') {
              salesWorksheet[cellAddress].s.fill = { fgColor: { rgb: 'FEF2F2' } };
              salesWorksheet[cellAddress].s.font = { color: { rgb: 'DC2626' }, bold: true };
              salesWorksheet[cellAddress].s.border = { ...salesWorksheet[cellAddress].s.border, left:{style:'thick',color:{rgb:'EF4444'}} };
            } else {
              salesWorksheet[cellAddress].s.fill = { fgColor: { rgb: 'FEF3C7' } };
              salesWorksheet[cellAddress].s.font = { color: { rgb: '92400E' }, bold: true };
              salesWorksheet[cellAddress].s.border = { ...salesWorksheet[cellAddress].s.border, left:{style:'thick',color:{rgb:'F59E0B'}} };
            }
          }
        }
      }
      XLSX.utils.book_append_sheet(workbook, salesWorksheet, 'Sales Over Time');

      // Monthly sheet dynamic (Excel) -- reuse monthlyGrowthData already shaped
      const monthlySheetDataExcel = monthlyGrowthData.map((item:any, index:number) => {
        const prev = index>0 ? monthlyGrowthData[index-1] : null;
        if (isSuper) {
          const growthRate = prev && prev.total ? (((item.total||0)-(prev.total||0))/(prev.total||1)*100).toFixed(2)+'%' : 'N/A';
          const base:any = { 'Month': item.month };
          meta.filter(m=> m.branch_id !== 'TOTAL').forEach(m => { base[m.branch_name] = Number((item[m.dataKey]||0).toFixed(0)); });
          base['Total Monthly Revenue'] = Number((item.total||0).toFixed(0));
          base['Growth Rate (%)'] = growthRate;
          return base;
        } else {
          const targetMeta = meta.find(m=> m.branch_id !== 'TOTAL' && item[m.dataKey] != null);
          const prevVal = prev && targetMeta ? prev[targetMeta.dataKey] : 0;
          const val = targetMeta ? item[targetMeta.dataKey] || 0 : (item.total||0);
            const growth = prevVal ? (((val - prevVal)/prevVal)*100).toFixed(2)+'%' : 'N/A';
          return { 'Month': item.month, [targetMeta?.branch_name || 'Branch Revenue']: Number(val.toFixed?.(0) || val), 'Growth Rate (%)': growth };
        }
      });
      const monthlyWorksheet = XLSX.utils.json_to_sheet(monthlySheetDataExcel);
      const monthlyRange = XLSX.utils.decode_range(monthlyWorksheet['!ref'] || 'A1');
      if (isSuper) {
        const widths = [12]; // Month
        meta.filter(m=> m.branch_id !== 'TOTAL').forEach(()=> widths.push(15));
        widths.push(20,15); // Total, Growth
        monthlyWorksheet['!cols'] = widths.map(w=> ({ width: w }));
      } else {
        monthlyWorksheet['!cols'] = [ { width: 15 }, { width: 25 }, { width: 15 } ];
      }
      for (let c=monthlyRange.s.c; c<=monthlyRange.e.c; c++) {
        const addr = XLSX.utils.encode_cell({r:0,c});
        if (!monthlyWorksheet[addr]) continue;
        monthlyWorksheet[addr].s = { font:{bold:true,color:{rgb:'FFFFFF'},size:12}, fill:{fgColor:{rgb:'B91C1C'}}, border:{top:{style:'thick',color:{rgb:'000000'}},bottom:{style:'thick',color:{rgb:'000000'}},left:{style:'thick',color:{rgb:'000000'}},right:{style:'thick',color:{rgb:'000000'}}}, alignment:{horizontal:'center',vertical:'center'} };
      }
      for (let r=1; r<=monthlyRange.e.r; r++) {
        for (let c=monthlyRange.s.c; c<=monthlyRange.e.c; c++) {
          const addr = XLSX.utils.encode_cell({r,c});
          if (!monthlyWorksheet[addr]) continue;
          if (!monthlyWorksheet[addr].s) monthlyWorksheet[addr].s = {};
          const isEven = r % 2 === 0;
          const growthCol = isSuper ? monthlyRange.e.c : 2;
          if (isEven && c !== growthCol) monthlyWorksheet[addr].s.fill = { fgColor: { rgb: 'F9FAFB' } };
          monthlyWorksheet[addr].s.border = { top:{style:'thin',color:{rgb:'E5E7EB'}},bottom:{style:'thin',color:{rgb:'E5E7EB'}},left:{style:'thin',color:{rgb:'E5E7EB'}},right:{style:'thin',color:{rgb:'E5E7EB'}} };
          const headerAddr = XLSX.utils.encode_cell({r:0,c});
          const headerVal = monthlyWorksheet[headerAddr]?.v as string;
          if (/Monthly Revenue$|Revenue$|Total Monthly Revenue/.test(headerVal)) {
            monthlyWorksheet[addr].s.numFmt = '"PHP "#,##0';
          } else if (/Growth Rate/.test(headerVal)) {
            monthlyWorksheet[addr].s.alignment = { horizontal: 'center' };
          }
        }
      }
      XLSX.utils.book_append_sheet(workbook, monthlyWorksheet, 'Monthly Growth');

      // Forecast vs Actual dynamic sheet
      const forecastComparisonData = forecastData.map((item:any) => {
        if (isSuper) {
          const base:any = { 'Date': item.date };
          let actualSum = 0; let forecastSum = 0;
          meta.filter(m=> m.branch_id !== 'TOTAL').forEach(m => {
            const a = item[m.dataKey] || 0; const f = item[m.forecastKey] || 0;
            base[`${m.branch_name} Actual`] = Number(a.toFixed?.(0) || a);
            base[`${m.branch_name} Forecast`] = Number(f.toFixed?.(0) || f);
            base[`${m.branch_name} Variance`] = (f && a) ? (((a-f)/f)*100).toFixed(2)+'%' : 'N/A';
            actualSum += a; forecastSum += f;
          });
          base['Total Actual'] = Number(actualSum.toFixed(0));
          base['Total Forecast'] = Number(forecastSum.toFixed(0));
          base['Total Variance'] = (forecastSum && actualSum) ? (((actualSum-forecastSum)/forecastSum)*100).toFixed(2)+'%' : 'N/A';
          base['Accuracy'] = (forecastSum && actualSum) ? (100 - Math.abs(((actualSum-forecastSum)/forecastSum)*100)).toFixed(1)+'%' : 'N/A';
          return base;
        } else {
          const targetMeta = meta.find(m=> m.branch_id !== 'TOTAL' && item[m.dataKey] != null);
          const a = targetMeta ? item[targetMeta.dataKey] : null;
          const f = targetMeta ? item[targetMeta.forecastKey] : null;
          const variance = (f && a) ? (((a - f)/f)*100).toFixed(2)+'%' : 'N/A';
          const accuracy = (f && a) ? (100 - Math.abs(((a-f)/f)*100)).toFixed(1)+'%' : 'N/A';
          return { 'Date': item.date, 'Actual Revenue': a != null ? Number(a.toFixed?.(0) || a) : 'N/A', 'Forecast Revenue': f != null ? Number(f.toFixed?.(0) || f) : 'N/A', 'Variance': variance, 'Accuracy': accuracy };
        }
      });
      const hasForecastData = forecastComparisonData.some((row:any) => {
        if (isSuper) return Object.keys(row).some(k => /(Actual|Forecast)$/.test(k) && typeof row[k] === 'number' && row[k] > 0);
        const ar = row['Actual Revenue']; const fr = row['Forecast Revenue'];
        return (typeof ar === 'number' && ar>0) || (typeof fr === 'number' && fr>0);
      });
      if (hasForecastData) {
        const forecastWorksheet = XLSX.utils.json_to_sheet(forecastComparisonData);
        const forecastRange = XLSX.utils.decode_range(forecastWorksheet['!ref'] || 'A1');
        if (isSuper) {
          // dynamic columns: Date + per-branch Actual/Forecast/Variance + Totals + Accuracy
          const cols:number[] = [12];
          meta.filter(m=> m.branch_id !== 'TOTAL').forEach(()=> cols.push(15,15,15));
          cols.push(15,15,15,12);
          forecastWorksheet['!cols'] = cols.map(w=> ({ width: w }));
        } else {
          forecastWorksheet['!cols'] = [ { width: 15 }, { width: 20 }, { width: 20 }, { width: 15 }, { width: 15 } ];
        }
        for (let c=forecastRange.s.c; c<=forecastRange.e.c; c++) {
          const addr = XLSX.utils.encode_cell({r:0,c}); if (!forecastWorksheet[addr]) continue;
          forecastWorksheet[addr].s = { font:{bold:true,color:{rgb:'FFFFFF'},size:12}, fill:{fgColor:{rgb:'EF4444'}}, border:{top:{style:'thick',color:{rgb:'000000'}},bottom:{style:'thick',color:{rgb:'000000'}},left:{style:'thick',color:{rgb:'000000'}},right:{style:'thick',color:{rgb:'000000'}}}, alignment:{horizontal:'center',vertical:'center'} };
        }
        for (let r=1; r<=forecastRange.e.r; r++) {
          for (let c=forecastRange.s.c; c<=forecastRange.e.c; c++) {
            const addr = XLSX.utils.encode_cell({r,c}); if (!forecastWorksheet[addr]) continue;
            if (!forecastWorksheet[addr].s) forecastWorksheet[addr].s = {};
            const isEven = r % 2 === 0;
            // Detect variance/accuracy columns by header
            const headerAddr = XLSX.utils.encode_cell({r:0,c});
            const headerVal = forecastWorksheet[headerAddr]?.v as string;
            if (isEven && !/Variance|Accuracy/.test(headerVal)) forecastWorksheet[addr].s.fill = { fgColor:{rgb:'F9FAFB'} };
            forecastWorksheet[addr].s.border = { top:{style:'thin',color:{rgb:'E5E7EB'}},bottom:{style:'thin',color:{rgb:'E5E7EB'}},left:{style:'thin',color:{rgb:'E5E7EB'}},right:{style:'thin',color:{rgb:'E5E7EB'}} };
            if (/Actual$|Forecast$|Total Actual|Total Forecast/.test(headerVal)) forecastWorksheet[addr].s.numFmt = '"PHP "#,##0';
            if (/Variance|Accuracy/.test(headerVal)) forecastWorksheet[addr].s.alignment = { horizontal: 'center' };
            if (/Variance/.test(headerVal)) {
              const value = forecastWorksheet[addr].v;
              if (typeof value === 'string' && value.includes('%') && value !== 'N/A') {
                const pct = parseFloat(value); // approximate
                if (!isNaN(pct)) {
                  if (Math.abs(pct) <= 5) { forecastWorksheet[addr].s.fill = { fgColor:{rgb:'D1FAE5'} }; forecastWorksheet[addr].s.font = { color:{rgb:'065F46'}, bold:true }; }
                  else if (Math.abs(pct) > 20) { forecastWorksheet[addr].s.fill = { fgColor:{rgb:'FEE2E2'} }; forecastWorksheet[addr].s.font = { color:{rgb:'991B1B'}, bold:true }; }
                }
              }
            }
            if (/Accuracy/.test(headerVal)) {
              const value = forecastWorksheet[addr].v;
              if (typeof value === 'string' && value.includes('%') && value !== 'N/A') {
                const acc = parseFloat(value);
                if (!isNaN(acc)) {
                  if (acc >= 95) { forecastWorksheet[addr].s.fill = { fgColor:{rgb:'D1FAE5'} }; forecastWorksheet[addr].s.font = { color:{rgb:'065F46'}, bold:true }; }
                  else if (acc < 80) { forecastWorksheet[addr].s.fill = { fgColor:{rgb:'FEE2E2'} }; forecastWorksheet[addr].s.font = { color:{rgb:'991B1B'}, bold:true }; }
                }
              }
            }
          }
        }
        XLSX.utils.book_append_sheet(workbook, forecastWorksheet, 'Forecast Analysis');
      }

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Dynamic export failed', e);
    } finally {
      setIsExporting(null);
    }
  }

  const generateReport = async () => {
    try {
      setIsExporting('report')
      const branchInfo = await getBranchInfo();
      const isSuper = !branchInfo || branchInfo.branchType === 'A';
      const meta = await buildMeta();
      const [dailyRaw, monthlyRaw, pairedRaw] = await Promise.all([
        getDailyRevenueDynamic(meta),
        getMonthlyRevenueDynamic(meta),
        getPairedRevenueDataDynamic(meta)
      ]);
      const filterDynamicData = (data: any[], bInfo: any) => {
        if (!bInfo || bInfo.branchType === 'A') return data;
        const target = meta.find(m => m.branch_id !== 'TOTAL' && (bInfo.branchId && m.branch_id.toUpperCase().includes(bInfo.branchId.toUpperCase())) )
          || meta.find(m => m.branch_id !== 'TOTAL' && (bInfo.branchName && m.branch_name.toUpperCase().includes(bInfo.branchName.toUpperCase())));
        if (!target) return data.map(r=> ({ date: r.date || r.month, month: r.month, total: r.total }));
        return data.map(r => {
          const base:any = { date: r.date || r.month };
          if (r.month) base.month = r.month;
          base[target.dataKey] = r[target.dataKey] ?? 0;
          if (r[target.forecastKey] != null) base[target.forecastKey] = r[target.forecastKey];
          base.total = r[target.dataKey] ?? 0;
          return base;
        });
      };
      const salesOverTimeData = filterDynamicData(dailyRaw, branchInfo);
      const monthlyGrowthData = filterDynamicData(monthlyRaw, branchInfo);
      const forecastData = filterDynamicData(pairedRaw, branchInfo);

      const validDailyData = salesOverTimeData.filter((item:any) => item.total && item.total > 0);
      const totalRevenue = validDailyData.reduce((sum:number, item:any) => sum + (item.total || 0), 0)
      const dailyAverage = validDailyData.length > 0 ? totalRevenue / validDailyData.length : 0

      const branchTotals: Record<string, number> = {};
      meta.filter(m=> m.branch_id !== 'TOTAL').forEach(m => {
        branchTotals[m.branch_name] = validDailyData.reduce((s:number, row:any) => s + (row[m.dataKey]||0), 0);
      });

      // Init PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      // Colors using brand color #CE1616
      const primaryColor: [number, number, number] = [206, 22, 22] // Brand Red #CE1616
      const grayColor: [number, number, number] = [75, 85, 99] // Gray

      let yPosition = 20

      // Header with logo placeholder and title
      pdf.setFillColor(...primaryColor)
      pdf.rect(0, 0, pageWidth, 30, 'F')
      
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(24)
      pdf.text('SWAS ANALYTICS REPORT', pageWidth/2, 20, { align: 'center' })
      
      yPosition = 45

      // Report Info Box
      pdf.setFillColor(249, 250, 251)
      pdf.setDrawColor(229, 231, 235)
      pdf.rect(15, yPosition, pageWidth-30, 25, 'FD')
      
      pdf.setTextColor(...grayColor)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.text(`Generated: ${format(new Date(), "PPP")}`, 20, yPosition + 8)
      pdf.text(`Data Period: ${validDailyData.length} days`, 20, yPosition + 16)
      pdf.text(`Report Period: ${validDailyData[0]?.date} to ${validDailyData[validDailyData.length - 1]?.date}`, 20, yPosition + 24)

      yPosition += 35

      // Executive Summary
      pdf.setTextColor(0, 0, 0)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text('EXECUTIVE SUMMARY', 15, yPosition)
      yPosition += 10

      // Summary metrics in cards
      const cardWidth = (pageWidth - 45) / 2
      const cardHeight = 20

      // Total Revenue Card
      pdf.setFillColor(249, 250, 251)
      pdf.setDrawColor(156, 163, 175)
      pdf.rect(15, yPosition, cardWidth, cardHeight, 'FD')
      pdf.setTextColor(0, 0, 0)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.text('Total Revenue', 20, yPosition + 8)
      pdf.setFontSize(14)
      pdf.text(`PHP ${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, 20, yPosition + 16)

      // Daily Average Card
      pdf.setFillColor(249, 250, 251)
      pdf.setDrawColor(156, 163, 175)
      pdf.rect(15 + cardWidth + 15, yPosition, cardWidth, cardHeight, 'FD')
      pdf.setTextColor(0, 0, 0)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.text('Daily Average', 20 + cardWidth + 15, yPosition + 8)
      pdf.setFontSize(14)
      pdf.text(`PHP ${Math.round(dailyAverage).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, 20 + cardWidth + 15, yPosition + 16)

      yPosition += 35

      // Branch Performance Section (dynamic)
      pdf.setTextColor(0, 0, 0)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text('BRANCH PERFORMANCE', 15, yPosition)
      yPosition += 15

      const branchMetas = meta.filter(m => m.branch_id !== 'TOTAL')
      const averagePerBranch = branchMetas.length ? totalRevenue / branchMetas.length : 0
      const performanceFor = (value:number) => value >= averagePerBranch * 1.1 ? 'Above Average' : value <= averagePerBranch * 0.9 ? 'Below Average' : 'Average'

      if (isSuper) {
        const tableBody = branchMetas.map(m => {
          const sum = branchTotals[m.branch_name] || 0
            return [
              m.branch_name,
              `PHP ${sum.toLocaleString('en-US',{maximumFractionDigits:0})}`,
              totalRevenue ? `${(sum/totalRevenue*100).toFixed(1)}%` : '0%',
              performanceFor(sum)
            ]
        })
        autoTable(pdf, {
          startY: yPosition,
          head: [['Branch','Revenue','Percentage','Performance']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor:[206,22,22], textColor:[255,255,255], fontStyle:'bold', fontSize:11 },
          bodyStyles: { fontSize:10, textColor: grayColor },
          alternateRowStyles: { fillColor:[249,250,251] },
          styles: { cellPadding:4, lineColor:[229,231,235], lineWidth:0.5 },
          columnStyles: { 0:{cellWidth:45},1:{cellWidth:50,halign:'right'},2:{cellWidth:40,halign:'center'},3:{cellWidth:45,halign:'center'} },
          didParseCell: function(data){
            if (data.section==='body' && data.column.index===3) {
              const val = data.cell.text[0];
              if (val==='Above Average') { data.cell.styles.textColor=[5,150,105]; data.cell.styles.fontStyle='bold'; }
              if (val==='Below Average') { data.cell.styles.textColor=[239,68,68]; data.cell.styles.fontStyle='bold'; }
            }
          }
        })
      } else {
        const targetMeta = branchMetas.find(m => branchInfo?.branchId && m.branch_id.toUpperCase().includes(branchInfo.branchId.toUpperCase()))
          || branchMetas.find(m => branchInfo?.branchName && m.branch_name.toUpperCase().includes((branchInfo.branchName||'').toUpperCase()))
          || branchMetas[0]
        const sum = targetMeta ? (branchTotals[targetMeta.branch_name] || 0) : 0
        autoTable(pdf, {
          startY: yPosition,
          head: [['Branch','Revenue','Performance']],
          body: [[ targetMeta?.branch_name || 'Branch', `PHP ${sum.toLocaleString('en-US',{maximumFractionDigits:0})}`, performanceFor(sum) ]],
          theme: 'grid',
          headStyles: { fillColor:[206,22,22], textColor:[255,255,255], fontStyle:'bold', fontSize:11 },
          bodyStyles: { fontSize:10, textColor: grayColor },
          alternateRowStyles: { fillColor:[249,250,251] },
          styles: { cellPadding:4, lineColor:[229,231,235], lineWidth:0.5 },
          columnStyles: { 0:{cellWidth:60},1:{cellWidth:60,halign:'right'},2:{cellWidth:60,halign:'center'} }
        })
      }

      yPosition = (pdf as any).lastAutoTable.finalY + 20

      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage()
        yPosition = 20
      }

      // Sales Over Time - Complete Analysis (matching Excel export)
      pdf.setTextColor(0, 0, 0)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text('SALES OVER TIME ANALYSIS', 15, yPosition)
      yPosition += 15

      // Calculate performance indicators for PDF table (same logic as Excel)
      const recentDaily = validDailyData.slice(-15)
      const salesTableData = recentDaily.map((item:any) => {
        const dailyTotal = item.total || 0
        const vsAverage = dailyAverage ? ((dailyTotal - dailyAverage) / dailyAverage * 100) : 0
        const performance = dailyTotal >= dailyAverage * 1.1 ? 'Above Avg' : dailyTotal >= dailyAverage * 0.9 ? 'Average' : 'Below Avg'
        if (isSuper) {
          const branchCells = branchMetas.map(m => `PHP ${(item[m.dataKey]||0).toLocaleString('en-US',{maximumFractionDigits:0})}`)
          return [ item.date, ...branchCells, `PHP ${dailyTotal.toLocaleString('en-US',{maximumFractionDigits:0})}`, `${vsAverage.toFixed(1)}%`, performance ]
        } else {
          const targetMeta = branchMetas.find(m => item[m.dataKey] != null) || branchMetas[0]
          const val = targetMeta ? (item[targetMeta.dataKey]||0) : dailyTotal
          return [ item.date, `PHP ${val.toLocaleString('en-US',{maximumFractionDigits:0})}`, `${vsAverage.toFixed(1)}%`, performance ]
        }
      })

      autoTable(pdf, {
        startY: yPosition,
        head: [ isSuper ? ['Date', ...branchMetas.map(b=> b.branch_name), 'Total', 'vs Avg %', 'Performance'] : ['Date', branchInfo?.branchName || 'Branch Revenue', 'vs Avg %', 'Performance'] ],
        body: salesTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [185, 28, 28],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9,
          textColor: grayColor
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        styles: {
          cellPadding: 3,
          lineColor: [229, 231, 235],
          lineWidth: 0.5
        },
        columnStyles: isSuper ? {
          0: { cellWidth: 25 },
          1: { cellWidth: 26, halign: 'right' },
          2: { cellWidth: 26, halign: 'right' },
          3: { cellWidth: 26, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' }
        } : {
          0: { cellWidth: 40 },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' }
        },
        didParseCell: function(data) {
          // Color code performance column (different index for branch vs superadmin)
          const performanceColumnIndex = isSuper ? (branchMetas.length + 3) : 3
          if (data.section === 'body' && data.column.index === performanceColumnIndex) {
            if (data.cell.text[0] === 'Above Avg') {
              data.cell.styles.textColor = [5, 150, 105]
              data.cell.styles.fontStyle = 'bold'
            } else if (data.cell.text[0] === 'Below Avg') {
              data.cell.styles.textColor = [239, 68, 68]
              data.cell.styles.fontStyle = 'bold'
            }
          }
          // Color code vs Average percentage (different index for branch vs superadmin)
          const vsAvgColumnIndex = isSuper ? (branchMetas.length + 2) : 2
          if (data.section === 'body' && data.column.index === vsAvgColumnIndex) {
            const value = data.cell.text[0]
            if (typeof value === 'string' && value.includes('%')) {
              const percentage = parseFloat(value.replace('%', ''))
              if (percentage > 10) {
                data.cell.styles.textColor = [5, 150, 105]
              } else if (percentage < -10) {
                data.cell.styles.textColor = [239, 68, 68]
              }
            }
          }
        }
      })

      yPosition = (pdf as any).lastAutoTable.finalY + 20

      // Add new page for monthly data if needed
      if (yPosition > pageHeight - 80) {
        pdf.addPage()
        yPosition = 20
      }

      // Monthly Growth Analysis (dynamic)
      pdf.setTextColor(0,0,0);
      pdf.setFont('helvetica','bold');
      pdf.setFontSize(16);
      pdf.text('MONTHLY GROWTH ANALYSIS',15,yPosition);
      yPosition += 15;
      const filteredMonthlyPDF = monthlyGrowthData.filter((m:any)=> (m.total||0)>0);
      const monthlyHeadPDF = isSuper ? ['Month', ...meta.filter(m=> m.branch_id!=='TOTAL').map(m=> m.branch_name), 'Total', 'Growth %'] : ['Month', branchInfo?.branchName || 'Branch Revenue', 'Growth %'];
      const monthlyRowsPDF = filteredMonthlyPDF.map((m:any,i:number)=>{
        const prev = i>0 ? filteredMonthlyPDF[i-1] : null;
        if (isSuper) {
          const growth = prev && prev.total ? (((m.total - prev.total)/prev.total)*100).toFixed(1)+'%' : 'N/A';
          const branchVals = meta.filter(b=> b.branch_id!=='TOTAL').map(b=> `PHP ${(m[b.dataKey]||0).toLocaleString('en-US',{maximumFractionDigits:0})}`);
          return [ m.month, ...branchVals, `PHP ${(m.total||0).toLocaleString('en-US',{maximumFractionDigits:0})}`, growth ];
        } else {
          const targetMeta = meta.find(b=> b.branch_id!=='TOTAL' && m[b.dataKey] != null);
          const prevVal = prev && targetMeta ? prev[targetMeta.dataKey] : 0;
          const val = targetMeta ? m[targetMeta.dataKey] || 0 : (m.total||0);
          const growth = prevVal ? (((val - prevVal)/prevVal)*100).toFixed(1)+'%' : 'N/A';
          return [ m.month, `PHP ${val.toLocaleString('en-US',{maximumFractionDigits:0})}`, growth ];
        }
      });
      autoTable(pdf, {
        startY: yPosition,
        head: [monthlyHeadPDF],
        body: monthlyRowsPDF,
        theme: 'grid',
        headStyles: { fillColor:[206,22,22], textColor:[255,255,255], fontStyle:'bold', fontSize:10 },
        bodyStyles: { fontSize:9, textColor: grayColor },
        alternateRowStyles: { fillColor:[249,250,251] },
        styles: { cellPadding:3, lineColor:[229,231,235], lineWidth:0.5 },
        didParseCell: function(data){
          const growthIdx = monthlyHeadPDF.length -1;
          if (data.section==='body' && data.column.index===growthIdx) {
            const txt = data.cell.text[0];
            if (txt !== 'N/A' && txt.includes('%')) {
              const pct = parseFloat(txt.replace('%',''));
              if (pct>0) { data.cell.styles.textColor=[5,150,105]; data.cell.styles.fontStyle='bold'; }
              else if (pct<0) { data.cell.styles.textColor=[239,68,68]; data.cell.styles.fontStyle='bold'; }
            }
          }
        }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 20

      // Check if we need a new page for forecast section
      if (yPosition > pageHeight - 100) {
        pdf.addPage()
        yPosition = 20
      }

      // Forecast Analysis Section
      pdf.setTextColor(0, 0, 0)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text('FORECAST ANALYSIS', 15, yPosition)
      yPosition += 15

      // Process forecast data dynamically per branch
      const forecastBranches = isSuper ? branchMetas : branchMetas.filter(m => forecastData.some((row:any) => row[m.dataKey] != null || row[m.forecastKey] != null))
      for (const m of forecastBranches) {
        const branchForecastData = forecastData.map((row:any) => {
          const actual = row[m.dataKey]
          const forecast = row[m.forecastKey]
          const variance = (actual != null && forecast != null && forecast !== 0) ? (((actual - forecast)/forecast)*100).toFixed(1)+'%' : 'N/A'
          const accuracy = (actual != null && forecast != null && forecast !== 0) ? (100-Math.abs(((actual-forecast)/forecast)*100)).toFixed(1)+'%' : 'N/A'
          return [
            row.date,
            actual != null ? `PHP ${Number(actual).toLocaleString('en-US',{maximumFractionDigits:0})}` : 'N/A',
            forecast != null ? `PHP ${Number(forecast).toLocaleString('en-US',{maximumFractionDigits:0})}` : 'N/A',
            variance,
            accuracy
          ]
        })
        const hasMeaning = branchForecastData.some(r => (r[1] !== 'N/A' && r[1] !== 'PHP 0') || (r[2] !== 'N/A' && r[2] !== 'PHP 0'))
        if (!hasMeaning) continue
        if (yPosition > pageHeight - 100) { pdf.addPage(); yPosition = 20 }
        pdf.setFont('helvetica','bold'); pdf.setFontSize(14); pdf.text(m.branch_name,15,yPosition); yPosition += 10
        autoTable(pdf, {
          startY: yPosition,
          head: [['Date','Actual','Forecast','Variance %','Accuracy %']],
          body: branchForecastData,
          theme: 'grid',
          headStyles: { fillColor:[206,22,22], textColor:[255,255,255], fontStyle:'bold', fontSize:11 },
          bodyStyles: { fontSize:10, textColor:[75,85,99] },
          alternateRowStyles: { fillColor:[249,250,251] },
          styles: { cellPadding:4, lineColor:[229,231,235], lineWidth:0.5 },
          columnStyles: { 0:{cellWidth:32},1:{cellWidth:40,halign:'right'},2:{cellWidth:40,halign:'right'},3:{cellWidth:32,halign:'center'},4:{cellWidth:36,halign:'center'} },
          didParseCell: function(data){
            if (data.section==='body' && data.column.index===4) { // accuracy
              const val = data.cell.text[0];
              if (val.includes('%') && val !== 'N/A') {
                const pct = parseFloat(val); if (!isNaN(pct)) { if (pct>=95) { data.cell.styles.textColor=[5,150,105]; data.cell.styles.fontStyle='bold'; } else if (pct<80) { data.cell.styles.textColor=[239,68,68]; data.cell.styles.fontStyle='bold'; } }
              }
            }
            if (data.section==='body' && data.column.index===3) { // variance
              const val = data.cell.text[0];
              if (val.includes('%') && val !== 'N/A') {
                const pct = parseFloat(val); if (!isNaN(pct)) { if (Math.abs(pct) <=5) { data.cell.styles.textColor=[5,150,105]; } else if (Math.abs(pct)>20) { data.cell.styles.textColor=[239,68,68]; } }
              }
            }
          }
        })
        yPosition = (pdf as any).lastAutoTable.finalY + 15
      }

      // Footer
      const pageCount = (pdf as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFillColor(grayColor[0], grayColor[1], grayColor[2])
        pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.text('SWAS Analytics - Confidential', 15, pageHeight - 5)
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 5, { align: 'right' })
      }

      // Save PDF
      pdf.save(`swas-analytics-report-${format(new Date(), "yyyy-MM-dd")}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setIsExporting(null)
    }
  }



  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={isExporting !== null}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={exportToExcel}
          disabled={isExporting !== null}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {isExporting === 'excel' ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
              Exporting Excel...
            </>
          ) : (
            'Export to Excel'
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={generateReport}
          disabled={isExporting !== null}
        >
          <FileText className="h-4 w-4 mr-2" />
          {isExporting === 'report' ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
              Generating Report...
            </>
          ) : (
            'Generate Report'
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}