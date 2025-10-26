"use client";

import * as React from "react";
import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BrandSettings } from "@/components/BrandSettings";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const [brandSettingsOpen, setBrandSettingsOpen] = React.useState(false);

  return (
    <>
      <SidebarGroup {...props}>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild={item.title !== "Settings"}
                  size="sm"
                  onClick={() => {
                    if (item.title === "Settings") {
                      setBrandSettingsOpen(true);
                    }
                  }}
                >
                  {item.title === "Settings" ? (
                    <div className="cursor-pointer flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </div>
                  ) : (
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <BrandSettings
        open={brandSettingsOpen}
        onOpenChange={setBrandSettingsOpen}
      />
    </>
  );
}
