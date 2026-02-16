"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  ventas: "Ventas",
  compras: "Compras",
  liquidacion: "Liquidación",
  "notas-credito": "Notas de Crédito",
  retenciones: "Retenciones",
  assistant: "Carga Tributaria",
  clientes: "Clientes",
};

export function BreadcrumbNav() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Filter out "modules" since it's not a real page
  const displaySegments = segments.filter((s) => s !== "modules");

  if (displaySegments.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {displaySegments.map((segment, index) => {
          // Build the actual href (re-inserting "modules" for module pages)
          const isModulePage = segments.includes("modules") && segment !== "dashboard";
          const href = isModulePage
            ? `/modules/${segment}`
            : `/${segments.slice(0, segments.indexOf(segment) + 1).join("/")}`;

          const label = routeLabels[segment] || segment;
          const isLast = index === displaySegments.length - 1;

          return (
            <Fragment key={segment}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
