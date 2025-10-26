"use client";

import * as React from "react";
import { Settings, Bot, Database, Link } from "lucide-react";

import { NavDocuments } from "@/components/nav-documents";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { type Endpoint } from "@/endpoints";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getBrandLogoUrl, getBrandName } from "@/lib/brandConfig";

const data = {
  user: {
    name: "Developer",
    email: "dev@databricks.com",
    avatar: "/avatars/assistant.png",
  },
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
  ],
  documents: [
    {
      name: "Agent Configuration",
      url: "#",
      icon: Bot,
    },
    {
      name: "MLFlow Experiment",
      url: "#",
      icon: Database,
    },
    {
      name: "API Endpoints",
      url: "#",
      icon: Link,
    },
  ],
};

export function AppSidebar({
  children,
  selectedAgent,
  setSelectedAgent,
  setMessages,
  experiment,
  experimentIsLoading,
  endpoints,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  children?: React.ReactNode;
  selectedAgent: string;
  setSelectedAgent: (value: string) => void;
  setMessages: (value: any) => void;
  experiment: any;
  experimentIsLoading: boolean;
  endpoints: Endpoint[];
}) {
  const [brandLogo, setBrandLogo] = React.useState<string | null>(null);
  const [brandName, setBrandName] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Get brand logo and name from sessionStorage
    setBrandLogo(getBrandLogoUrl());
    setBrandName(getBrandName());

    // Listen for storage events to update when brand changes
    const handleStorageChange = () => {
      setBrandLogo(getBrandLogoUrl());
      setBrandName(getBrandName());
    };

    // Listen for both storage events and custom brand update events
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("brandConfigUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("brandConfigUpdated", handleStorageChange);
    };
  }, []);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div
                className={`flex aspect-square size-8 items-center justify-center rounded-lg ${
                  brandLogo
                    ? "bg-transparent"
                    : "bg-sidebar-primary text-sidebar-primary-foreground"
                }`}
              >
                {brandLogo ? (
                  <img
                    src={brandLogo}
                    alt={brandName || "Brand Logo"}
                    className="size-8 object-contain rounded-lg"
                  />
                ) : (
                  <Bot className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {brandName || "Databricks Agent"}
                </span>
                <span className="truncate text-xs">AI Assistant</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {children}
        <NavDocuments
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          setMessages={setMessages}
          experiment={experiment}
          experimentIsLoading={experimentIsLoading}
          endpoints={endpoints}
        />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
