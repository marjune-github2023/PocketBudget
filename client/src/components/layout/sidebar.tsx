import { useLocation, Link } from "wouter";
import { 
  Tablet, 
  Users, 
  HandHelping, 
  RotateCcw, 
  BarChart3, 
  Gauge, 
  LayoutDashboard 
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onClick?: () => void;
}

const NavItem = ({ href, icon: Icon, children, onClick }: NavItemProps) => {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href}>
      <button
        onClick={onClick}
        className={`group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer ${
          isActive
            ? "bg-slate-900 text-white"
            : "text-slate-300 hover:bg-slate-700 hover:text-white"
        }`}
      >
        <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-slate-300" : "text-slate-400"}`} />
        {children}
      </button>
    </Link>
  );
};

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-slate-600 bg-opacity-75 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div 
        className={`
          md:hidden fixed inset-y-0 left-0 z-40 w-64 transition ease-in-out duration-300 transform bg-slate-800
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="absolute top-0 right-0 -mr-12 pt-2">
          <button
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            onClick={() => setIsOpen(false)}
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-slate-900">
            <h1 className="text-white font-semibold text-lg">Tablet Management</h1>
          </div>
          <nav className="mt-5 px-2 space-y-1">
            <NavItem href="/" icon={LayoutDashboard} onClick={() => setIsOpen(false)}>
              Dashboard
            </NavItem>
            <NavItem href="/tablets" icon={Tablet} onClick={() => setIsOpen(false)}>
              Tablets
            </NavItem>
            <NavItem href="/students" icon={Users} onClick={() => setIsOpen(false)}>
              Students
            </NavItem>
            <NavItem href="/borrowing" icon={HandHelping} onClick={() => setIsOpen(false)}>
              Borrowing
            </NavItem>
            <NavItem href="/returns" icon={RotateCcw} onClick={() => setIsOpen(false)}>
              Returns
            </NavItem>
            <NavItem href="/reports" icon={BarChart3} onClick={() => setIsOpen(false)}>
              Reports
            </NavItem>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-slate-800">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-slate-900">
              <h1 className="text-white font-semibold text-lg">Tablet Management</h1>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                <NavItem href="/" icon={LayoutDashboard}>
                  Dashboard
                </NavItem>
                <NavItem href="/tablets" icon={Tablet}>
                  Tablets
                </NavItem>
                <NavItem href="/students" icon={Users}>
                  Students
                </NavItem>
                <NavItem href="/borrowing" icon={HandHelping}>
                  Borrowing
                </NavItem>
                <NavItem href="/returns" icon={RotateCcw}>
                  Returns
                </NavItem>
                <NavItem href="/reports" icon={BarChart3}>
                  Reports
                </NavItem>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
