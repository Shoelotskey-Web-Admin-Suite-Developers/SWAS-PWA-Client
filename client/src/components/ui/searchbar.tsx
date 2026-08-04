import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Search } from "lucide-react"

interface SearchBarProps {
  value: string
  onChange: (val: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <div className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center bg-white text-slate-500">
        <Search className="h-5 w-5" />
      </div>

      <Input
        type="text"
        placeholder="Receipt ID, Customer, Staff..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl border-[#d6dbe3] bg-white pl-14 pr-11 text-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-400"
      />

      {value && (
        <Button
          variant="unselected"
          size="icon"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full text-slate-500 hover:text-slate-800"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}