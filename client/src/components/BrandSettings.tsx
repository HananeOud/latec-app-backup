"use client";

import * as React from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyBrandStyles } from "@/lib/brandConfig";

interface BrandSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrandSettings({ open, onOpenChange }: BrandSettingsProps) {
  const [brandName, setBrandName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleApplyBrand = async () => {
    if (!brandName.trim()) {
      setError("Please enter a brand name");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/brand_config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ brand_name: brandName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch brand: ${response.statusText}`);
      }

      const brandConfig = await response.json();

      // Apply the brand styles
      applyBrandStyles(brandConfig);

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setBrandName("");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply brand");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-5" />
            Brand Styling
          </DialogTitle>
          <DialogDescription>
            Enter a brand name to apply its colors and logo. Powered by
            brand.dev.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="brand-name" className="text-sm font-medium">
              Brand Name
            </label>
            <Input
              id="brand-name"
              placeholder="e.g., Tesla, Apple, Nike"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplyBrand();
                }
              }}
              disabled={isLoading}
              className="text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-muted-foreground">
              Try: Tesla, Apple, Nike, Spotify, Netflix, Google
            </p>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              ✓ Brand styling applied successfully!
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApplyBrand}
            disabled={isLoading}
            className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {isLoading ? "Applying..." : "Apply Brand"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
