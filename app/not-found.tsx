import Link from "next/link";
import { Button } from "@/components/ui/button";
import { House } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center">
          <House className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/search">Browse Listings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
