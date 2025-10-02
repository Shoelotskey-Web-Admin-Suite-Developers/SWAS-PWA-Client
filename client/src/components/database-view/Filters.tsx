"use client"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { useMediaQuery } from "@/hooks/useMediaQuery"

type PaymentStatus = "PAID" | "PARTIAL" | "NP"
type Branch = "SM Valenzuela" | "Valenzuela" | "SM Grand"
type BranchLocation = "Valenzuela City" | "Caloocan City"

type FiltersProps = {
  dateIn?: Date
  dateOut?: Date
  setDateIn: (d?: Date) => void
  setDateOut: (d?: Date) => void
  clearDates: () => void
  branch: Branch | ""
  setBranch: (b: Branch | "") => void
  paymentStatus: PaymentStatus | ""
  setPaymentStatus: (p: PaymentStatus | "") => void
  branchLocation: BranchLocation | ""
  setBranchLocation: (b: BranchLocation | "") => void
  receivedBy: string
  setReceivedBy: (r: string) => void
  advanced: boolean
  setAdvanced: (v: boolean) => void
}

export function Filters({
  dateIn,
  dateOut,
  setDateIn,
  setDateOut,
  clearDates,
  branch,
  setBranch,
  paymentStatus,
  setPaymentStatus,
  branchLocation,
  setBranchLocation,
  receivedBy,
  setReceivedBy,
  advanced,
  setAdvanced,
}: FiltersProps) {
  const isMobile = useMediaQuery("(max-width: 767px)")

  return (
    <div className="date-advanced">
      {/* Desktop/Tablet layout */}
      {!isMobile && (
        <div className="date-filter w-[70%] width-full-1088">
          <div className="cv-filter-row w-[50%] width-full-767 items-end">
            <div className="w-[40%]">
              <Label>Date In</Label>
              <DatePicker date={dateIn} onChange={setDateIn} />
            </div>

            <div className="w-[40%]">
              <Label>Date Out</Label>
              <DatePicker date={dateOut} onChange={setDateOut} />
            </div>

            <div className="width-full-465 self-end">
              <Button
                variant="outline"
                onClick={clearDates}
                className="rounded-full w-full"
              >
                Clear dates
              </Button>
            </div>
          </div>

          <div className="cv-filters w-[50%] width-full-767">
            <div className="w-[50%]">
              <Label>Branch</Label>
              <Select
                value={branch}
                onValueChange={(v) =>
                  setBranch(v === "none" ? "" : (v as Branch))
                }
              >
                <SelectTrigger className="cv-select">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  <SelectItem value="SM Valenzuela">SM Valenzuela</SelectItem>
                  <SelectItem value="Valenzuela">Valenzuela</SelectItem>
                  <SelectItem value="SM Grand">SM Grand</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[50%]">
              <Label>Payment Status</Label>
              <Select
                value={paymentStatus}
                onValueChange={(v) =>
                  setPaymentStatus(v === "none" ? "" : (v as PaymentStatus))
                }
              >
                <SelectTrigger className="cv-select">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  <SelectItem value="PAID">PAID</SelectItem>
                  <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                  <SelectItem value="NP">NP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters (mobile: includes all, desktop: only extra ones) */}
      <div className="cv-advanced-toggle gap-0 w-[30%] width-full-1088">
        <div className="cv-advanced-checkbox w-fit">
          <Checkbox
            id="advanced"
            checked={advanced}
            onCheckedChange={(v) => setAdvanced(!!v)}
          />
          <Label htmlFor="advanced" className="cv-advanced-label">
            Advanced Filters
          </Label>
        </div>

        {advanced && (
          <div className="cv-advanced w-full flex flex-col">
            {isMobile && (
              <>
                <div className="date-filter w-[100%] width-full-1088  items-end">
                  <div className="cv-filter-row w-[100%] width-full-767">
                    <div className="w-[50%] width-full-465">
                      <Label>Date In</Label>
                      <DatePicker date={dateIn} onChange={setDateIn} />
                    </div>

                    <div className="w-[50%] width-full-465">
                      <Label>Date Out</Label>
                      <DatePicker date={dateOut} onChange={setDateOut} />
                    </div>

                    <div className="width-full-465 self-end">
                      <Button
                        variant="outline"
                        onClick={clearDates}
                        className="rounded-full w-full"
                      >
                        Clear dates
                      </Button>
                    </div>
                  </div>

                  <div className="flex w-full cv-filter-row">
                    <div className="w-[100%]">
                      <Label>Branch</Label>
                      <Select
                        value={branch}
                        onValueChange={(v) =>
                          setBranch(v === "none" ? "" : (v as Branch))
                        }
                      >
                        <SelectTrigger className="cv-select">
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">All</SelectItem>
                          <SelectItem value="SM Valenzuela">SM Valenzuela</SelectItem>
                          <SelectItem value="Valenzuela">Valenzuela</SelectItem>
                          <SelectItem value="SM Grand">SM Grand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[100%]">
                      <Label>Payment Status</Label>
                      <Select
                        value={paymentStatus}
                        onValueChange={(v) =>
                          setPaymentStatus(v === "none" ? "" : (v as PaymentStatus))
                        }
                      >
                        <SelectTrigger className="cv-select">
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">All</SelectItem>
                          <SelectItem value="PAID">PAID</SelectItem>
                          <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                          <SelectItem value="NP">NP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
              </div>
              </>
            )}

            <div className="flex cv-filter-row">
              <div className="w-[100%]">
                <Label>Branch Location</Label>
                <Select
                  value={branchLocation}
                  onValueChange={(v) =>
                    setBranchLocation(v === "none" ? "" : (v as BranchLocation))
                  }
                >
                  <SelectTrigger className="cv-select">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All</SelectItem>
                    <SelectItem value="Valenzuela City">Valenzuela City</SelectItem>
                    <SelectItem value="Caloocan City">Caloocan City</SelectItem>
                  </SelectContent>
                </Select>
                
              </div>
              <div className="w-[100%]">
                <Label>Received By</Label>
                <Select
                  value={receivedBy}
                  onValueChange={(v) => setReceivedBy(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="cv-select">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All</SelectItem>
                    <SelectItem value="JSantos">@JSantos</SelectItem>
                    <SelectItem value="KUy">@KUy</SelectItem>
                    <SelectItem value="VRamos">@VRamos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ----------------- Local Date Picker ----------------- */
function DatePicker({
  date,
  onChange,
}: {
  date?: Date
  onChange: (d?: Date) => void
}) {
  return (
    <Input
      type="date"
      className="cv-date-btn rounded-full"
      value={date ? format(date, "yyyy-MM-dd") : ""}
      onChange={(e) => {
        const val = e.target.value
        onChange(val ? new Date(val) : undefined)
      }}
    />
  )
}
