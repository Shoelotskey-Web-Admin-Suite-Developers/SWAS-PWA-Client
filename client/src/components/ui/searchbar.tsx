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
      {/* Search Icon */}
      <div className="absolute top-1/2 -translate-y-1/2 z-10 bg-gray-200 rounded-full p-2 h-10 w-10 flex items-center justify-center border border-black">
        <Search className="text-gray-600 h-5 w-5" />
      </div>

      {/* Input */}
      <Input
        type="text"
        placeholder="Search..."
        value={value}            // <-- use parent's value
        onChange={(e) => onChange(e.target.value)} // <-- report changes to parent
        className="pl-12 pr-8"
      />

      {/* Clear Button */}
      {value && (
        <Button
          variant="unselected"
          size="icon"
          onClick={() => onChange("")}  // <-- clear parent's value
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 pl-2 pr-2 pt-0 pb-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
