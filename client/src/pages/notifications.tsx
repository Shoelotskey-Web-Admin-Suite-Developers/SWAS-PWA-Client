"use client";

import { useState } from "react";
// import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Notification {
  id: number;
  title: string;
  description: string;
  date: string;
  read?: boolean;
}

const dummyNotifications: Notification[] = [
  { id: 1, title: "Order Completed", description: "Your shoe service order #123 is complete.", date: "Sep 10, 2025" },
  { id: 2, title: "New Promo!", description: "Get 20% off your next service this week.", date: "Sep 9, 2025" },
  { id: 3, title: "Reminder", description: "Your appointment tomorrow at 10 AM.", date: "Sep 8, 2025" },
];

export default function NotificationsSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Show Notifications</Button>
      {/* <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent position="right" size="sm" className="p-0">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>Check your recent updates</SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[400px] px-4">
            {dummyNotifications.map((notif) => (
              <Card key={notif.id} className={`mb-2 ${notif.read ? "opacity-50" : ""}`}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{notif.title}</span>
                    <span className="text-xs text-gray-500">{notif.date}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{notif.description}</p>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>

          <SheetFooter className="px-4 py-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet> */}
    </>
  );
}
