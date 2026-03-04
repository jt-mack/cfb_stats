"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-muted-foreground h-full data-[orientation=vertical]:h-fit data-[orientation=vertical]:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors",
        "hover:text-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        "group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "group-data-[variant=line]/tabs-list:relative group-data-[variant=line]/tabs-list:data-[state=active]:after:absolute group-data-[variant=line]/tabs-list:data-[state=active]:after:inset-x-0 group-data-[variant=line]/tabs-list:data-[state=active]:after:bottom-0 group-data-[variant=line]/tabs-list:data-[state=active]:after:h-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:bg-foreground",
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
