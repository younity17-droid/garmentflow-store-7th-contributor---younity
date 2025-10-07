import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  FolderOpen,
  Ruler,
  LogOut,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Products', url: '/products', icon: Package },
  { title: 'Categories', url: '/categories', icon: FolderOpen },
  { title: 'Sizes', url: '/sizes', icon: Ruler },
  { title: 'Invoices', url: '/invoices', icon: Receipt },
  { title: 'Settings', url: '/settings', icon: Settings },
];

function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { open } = useSidebar();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Package className="h-4 w-4 text-primary-foreground" />
              </div>
              {open && <span className="font-semibold">GarmentFlow</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-4">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <div className="mt-auto p-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {open && <span>Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4 gap-4">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Inventory Management</h1>
            </div>
          </header>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
