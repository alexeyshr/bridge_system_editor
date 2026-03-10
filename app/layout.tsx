import type {Metadata} from 'next';
import { JetBrains_Mono, Geist } from 'next/font/google';
import './globals.css'; // Global styles
import { AuthProvider } from '@/components/AuthProvider';
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Bridge Bidding IDE',
  description: 'IDE-style editor for bridge bidding systems',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn(jetbrainsMono.variable, "font-sans", geist.variable)}>
      <body suppressHydrationWarning className="font-sans antialiased">
        <TooltipProvider>
          <AuthProvider>{children}</AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
