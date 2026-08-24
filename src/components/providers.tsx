"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
      <TooltipProvider>
        <StoreProvider>
          {children}
          <Toaster />
        </StoreProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
