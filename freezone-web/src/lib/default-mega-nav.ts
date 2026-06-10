import type { NavItemResolved } from "@/lib/nav-types";
import { Gamepad2, Monitor, Shield, Battery, HardDrive, Smartphone } from "lucide-react";

/**
 * Default mega-menu when CMS `navItems` is empty.
 * Six commerce groups — Iraq / MENA electronics marketplace structure.
 */
export const DEFAULT_NAV_ITEMS: NavItemResolved[] = [
  {
    id: "personal-devices",
    label: "Personal Devices",
    icon: Smartphone,
    href: "/products?cat=laptops",
    columns: [
      {
        title: "Laptops & AIO",
        items: [
          { label: "All Laptops", href: "/products?cat=laptops" },
          { label: "Gaming Laptops", href: "/products?cat=gaming" },
          { label: "Business & Study", href: "/products?cat=laptops&q=business" },
          { label: "All-in-One PCs", href: "/products?cat=all-in-one" },
          { label: "Apple MacBook", href: "/products?brand=Apple&cat=laptops" },
        ],
      },
      {
        title: "Mobile",
        items: [
          { label: "Smartphones", href: "/products?cat=phones" },
          { label: "Tablets & iPad", href: "/products?cat=tablets" },
          { label: "Mobile Accessories", href: "/products?cat=accessories&q=mobile" },
        ],
      },
      {
        title: "Featured",
        highlight: true,
        items: [
          { label: "New Arrivals", href: "/products?isNew=true" },
          { label: "Best Sellers", href: "/products?featured=true" },
        ],
      },
    ],
  },
  {
    id: "gaming-pc",
    label: "Gaming & PC",
    icon: Gamepad2,
    href: "/products?cat=gaming",
    columns: [
      {
        title: "Gaming Systems",
        items: [
          { label: "Gaming PCs", href: "/products?cat=gaming" },
          { label: "PC Builder", href: "/pc-builder" },
          { label: "Consoles — PS5 / Xbox / Switch", href: "/products?cat=components&q=console" },
        ],
      },
      {
        title: "Components",
        items: [
          { label: "Graphics Cards", href: "/products?cat=components&q=GPU" },
          { label: "Processors (CPU)", href: "/products?cat=components&q=CPU" },
          { label: "RAM & Storage", href: "/products?cat=components&q=RAM" },
          { label: "Cases & Cooling", href: "/products?cat=components&q=case" },
        ],
      },
      {
        title: "Gaming Gear",
        highlight: true,
        items: [
          { label: "Gaming Accessories", href: "/products?cat=accessories&q=gaming" },
          { label: "Controllers & Headsets", href: "/products?cat=accessories&q=controller" },
        ],
      },
    ],
  },
  {
    id: "display-audio",
    label: "Display & Audio",
    icon: Monitor,
    href: "/products?cat=monitors",
    columns: [
      {
        title: "Displays",
        items: [
          { label: "Monitors — Gaming & Office", href: "/products?cat=monitors" },
          { label: "Projectors / Data Show", href: "/products?cat=monitors&q=projector" },
          { label: "Monitor Accessories", href: "/products?cat=accessories&q=monitor" },
        ],
      },
      {
        title: "Audio",
        items: [
          { label: "Headsets & Earbuds", href: "/products?cat=accessories&q=audio" },
          { label: "Speakers", href: "/products?cat=accessories&q=speaker" },
        ],
      },
      {
        title: "Pro & Creative",
        highlight: true,
        items: [
          { label: "High-refresh Gaming", href: "/products?cat=monitors&q=144hz" },
          { label: "4K & Ultrawide", href: "/products?cat=monitors&q=4K" },
        ],
      },
    ],
  },
  {
    id: "security-smart",
    label: "Security & Smart",
    icon: Shield,
    href: "/products?cat=cctv",
    columns: [
      {
        title: "CCTV & Surveillance",
        items: [
          { label: "IP / CCTV Cameras", href: "/products?cat=cctv" },
          { label: "NVR / DVR Systems", href: "/products?cat=security" },
          { label: "Camera Accessories", href: "/products?cat=accessories&q=camera" },
        ],
      },
      {
        title: "Smart Home",
        items: [
          { label: "Smart Home Hubs", href: "/products?cat=smart-home" },
          { label: "Sensors & Automation", href: "/products?cat=smart-home&q=automation" },
        ],
      },
      {
        title: "Business Security",
        highlight: true,
        items: [
          { label: "Retail & Office CCTV", href: "/products?cat=security&q=office" },
        ],
      },
    ],
  },
  {
    id: "power-solutions",
    label: "Power Solutions",
    icon: Battery,
    href: "/products?cat=power-solutions",
    columns: [
      {
        title: "UPS & Protection",
        items: [
          { label: "UPS — Home & Office", href: "/products?cat=power-solutions&q=UPS" },
          { label: "Line-interactive / Online", href: "/products?cat=power-solutions" },
        ],
      },
      {
        title: "Solar & Energy",
        items: [
          { label: "Solar Energy Kits", href: "/products?cat=electric&q=solar" },
          { label: "Power Accessories", href: "/products?cat=electric" },
        ],
      },
      {
        title: "Iraq-ready",
        highlight: true,
        cta: true,
        items: [
          { label: "Protect devices from outages", href: "/products?cat=power-solutions" },
        ],
      },
    ],
  },
  {
    id: "storage-accessories",
    label: "Storage & Accessories",
    icon: HardDrive,
    href: "/products?cat=accessories",
    columns: [
      {
        title: "Storage",
        items: [
          { label: "SSD / HDD / NAS", href: "/products?cat=accessories&q=storage" },
          { label: "External Drives", href: "/products?cat=accessories&q=external" },
        ],
      },
      {
        title: "Accessories Hub",
        items: [
          { label: "Laptop Accessories", href: "/products?cat=accessories&q=laptop" },
          { label: "PC & Desk Accessories", href: "/products?cat=accessories&q=pc" },
          { label: "Cables & Adapters", href: "/products?cat=accessories&q=cable" },
          { label: "Keyboards & Mice", href: "/products?cat=accessories&q=keyboard" },
        ],
      },
      {
        title: "Also shop",
        highlight: true,
        items: [
          { label: "Printers & Supplies", href: "/products?cat=printers" },
          { label: "Networking", href: "/products?cat=networking" },
        ],
      },
    ],
  },
];
