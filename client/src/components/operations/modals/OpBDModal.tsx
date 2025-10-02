// src/components/MarkAsReadyModal.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function InProcessModal({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle><h3>Mark as In Process?</h3></AlertDialogTitle>
          <AlertDialogDescription>
            <p>You have selected {selectedCount} item(s). Please double-check before confirming.  
            If you make a mistake, the status can only be fixed via the database view.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel><h5 className="extra-bold">Cancel</h5></AlertDialogCancel>
          <AlertDialogAction
            className="bg-[#CE1616] hover:bg-[#b31212] text-white"
            onClick={() => {
              onConfirm()
              onOpenChange(false) // close modal after confirm
            }}
          >
            <h5 className="extra-bold">Mark as In Process</h5>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
